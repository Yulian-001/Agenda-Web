import { teamManagers } from '../config/barberRoles';
// services/appointment.service.js
import { prisma } from '../utils/prisma';
import { acceptsAppointmentLink, appointmentStart } from '../utils/mail.mjs';
import { queueBookingEmails, queueCancellationEmails } from './appointment-mail';
import { ensureBarberInOperation } from './user.service';

import { civilDate, scheduleNow, slotKey } from '../config/schedule';
import { dailySlots, loadDailySchedule } from './schedule.service';

const strikeWindowMs = 12 * 60 * 60 * 1000;
const blockDurationMs = 7 * 24 * 60 * 60 * 1000;
const strikeLimit = 3;
const blockLimit = 3;
const bogotaDateTime = new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota', hourCycle: 'h23'
});

export const createAppointmentService = async (data) => {
    const { clientEmail, clientName, clientPhone, barberId, serviceId, date } = data;
    const timeSlot = slotKey(data.timeSlot);
    const bookingDate = civilDate(date);
    const [today, now] = scheduleNow();
    if (date < today || (date === today && timeSlot < now)) {
        throw { statusCode: 400, message: 'Ese horario ya pasó.' };
    }

    try {
        const appointment = await prisma.$transaction(async tx => {
            // La reserva mantiene activo al profesional hasta que termine su escritura.
            const [barber] = await tx.$queryRaw`
                SELECT "id" FROM "User" WHERE "id" = ${barberId} AND "state" = true AND "archivedAt" IS NULL AND ("role" IN ('BARBER_BOSS', 'BARBER_AFFILIATE') OR ("role" = 'BARBER_INDEPENDENT' AND "isOwner")) FOR SHARE
            `;
            if (!barber) throw { statusCode: 400, code: 'SELECTION_UNAVAILABLE', message: 'El barbero ya no está disponible para reservar. Elige otro barbero.' };

            let client = await tx.clients.findUnique({ where: { phone: clientPhone } });
            if (client?.isBanned) {
                throw { statusCode: 403, code: 'CLIENT_BANNED', message: 'Este número está bloqueado permanentemente por cancelaciones reiteradas.' };
            }
            if (client?.blockedUntil > new Date()) {
                throw {
                    statusCode: 403, code: 'CLIENT_BLOCKED',
                    message: `Este número está bloqueado temporalmente hasta el ${bogotaDateTime.format(client.blockedUntil)}.`
                };
            }

            const schedule = await loadDailySchedule(tx, barberId, bookingDate);
            const enabled = dailySlots(schedule).some(slot => slot.timeSlot === timeSlot && slot.isActive);
            if (!enabled) throw { statusCode: 400, message: 'El barbero no está disponible en este horario.' };

            const timeVariants = timeSlot.startsWith('0') ? [timeSlot, timeSlot.slice(1)] : [timeSlot];
            const booked = await tx.appointment.findFirst({
                where: { barberId, date: bookingDate, timeSlot: { in: timeVariants }, state: { not: 'CANCELLED' } },
                select: { id: true }
            });
            if (booked) throw { statusCode: 409, message: 'Este horario ya está ocupado.' };

            // Comparte el bloqueo con la actualización del servicio durante la reserva.
            const [service] = await tx.$queryRaw`
                SELECT s."name", s."price" FROM "Services" s
                JOIN "ServicesBarbers" sb ON sb."serviceId" = s."id"
                WHERE s."id" = ${serviceId} AND s."isActive" = true AND s."archivedAt" IS NULL AND sb."barberId" = ${barberId}
                FOR SHARE OF s
            `;
            if (!service) throw { statusCode: 400, code: 'SELECTION_UNAVAILABLE', message: 'El servicio ya no está disponible con este barbero. Vuelve a elegir para continuar.' };

            if (!client) {
                client = await tx.clients.upsert({
                    where: { phone: clientPhone },
                    create: { name: clientName, phone: clientPhone },
                    update: { phone: clientPhone }
                });
            }

            const newAppointment = await tx.appointment.create({
                data: {
                    date: bookingDate,
                    timeSlot,
                    priceAtBooking: service.price,
                    clientEmail,
                    clientId: client.id,
                    barberId,
                    serviceId,
                    historyAppointment: { create: { state: 'PENDING', barberId, serviceId } }
                }
            });
            await queueBookingEmails(tx, newAppointment);
            return newAppointment;
        });
        return appointment;
    } catch (error) {
        if (error.code === 'P2002') {
            throw { statusCode: 409, message: 'Este horario acaba de ser ocupado por otro cliente. Por favor elige otro.' };
        }
        throw error;
    }
};

const cancellationSelect = { changedAt: true, actorName: true, actorRole: true };
const openStates = ['PENDING', 'CONFIRMED'];

export const getAppointmentsService = async (user, { date, view }) => {
    // Una consulta por fecha incluye el historial de quienes ya salieron del equipo.
    const where = date ? {} : { barber: { archivedAt: null } };
    if (date) {
        const start = civilDate(date);
        where.date = { gte: start, lt: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
    }

    const canViewTeam = teamManagers.includes(user.role);
    if (view !== 'team' || !canViewTeam) where.barberId = user.id;
    else where.barber = { ...where.barber, role: { not: 'BARBER_INDEPENDENT' } };

    const appointments = await prisma.appointment.findMany({
        where,
        include: {
            client: { select: { name: true, phone: true } },
            service: { select: { name: true } },
            barber: { select: { name: true, photo: true } },
            historyAppointment: {
                where: { state: 'CANCELLED' },
                select: cancellationSelect,
                orderBy: [{ changedAt: 'desc' }, { id: 'desc' }],
                take: 1
            }
        },
        orderBy: [{ date: 'asc' }, { timeSlot: 'asc' }, { id: 'asc' }]
    });

    return appointments.map(app => ({
        id: app.id, date: app.date, timeSlot: slotKey(app.timeSlot), state: app.state, clientConfirmedAt: app.clientConfirmedAt,
        priceAtBooking: app.priceAtBooking, clientName: app.client.name, clientPhone: app.client.phone,
        barberId: app.barberId, barberName: app.barber.name, barberPhoto: app.barber.photo,
        serviceId: app.serviceId, serviceName: app.service.name,
        cancellation: app.state === 'CANCELLED' ? (app.historyAppointment[0] ?? null) : null
    })).sort((a, b) => a.date - b.date || a.timeSlot.localeCompare(b.timeSlot));
};

async function changeAppointmentState(tx, appointment, state, actor, financeSnapshot) {
    const { count } = await tx.appointment.updateMany({
        where: { id: appointment.id, state: { in: state === 'CONFIRMED' ? ['PENDING'] : openStates } },
        data: { state, ...financeSnapshot }
    });
    if (!count) {
        throw { statusCode: 409, message: 'La cita ya cambió de estado. Revisa su estado actual.' };
    }

    return tx.historyAppointment.create({
        data: {
            state, barberId: appointment.barberId, appointmentId: appointment.id, serviceId: appointment.serviceId,
            ...actor
        },
        select: cancellationSelect
    });
}

export const updateAppointmentStatusService = (appointmentId, newState, user) => prisma.$transaction(async tx => {
    const appointment = await tx.appointment.findUnique({ where: { id: appointmentId } });
    if (!appointment) throw { statusCode: 404, message: 'Cita no encontrada' };

    if (appointment.barberId !== user.id && !teamManagers.includes(user.role)) {
        throw { statusCode: 403, message: 'No tienes permiso para modificar esta cita.' };
    }

    await ensureBarberInOperation(tx, appointment.barberId);
    let financeSnapshot;
    if (newState === 'COMPLETED') {
        const [today, now] = scheduleNow();
        const day = appointment.date.toISOString().slice(0, 10);
        if (day > today || (day === today && slotKey(appointment.timeSlot) > now)) {
            throw { statusCode: 409, message: 'Solo puedes completar una cita cuando llegue su hora de inicio.' };
        }
        const barber = await tx.user.findUnique({
            where: { id: appointment.barberId },
            select: { role: true, commissionRate: true, settlementDirection: true }
        });
        financeSnapshot = {
            commissionRateApplied: barber.role === 'BARBER_INDEPENDENT' ? 1 : barber.commissionRate,
            settlementDirectionApplied: barber.settlementDirection
        };
    }
    const history = await changeAppointmentState(tx, appointment, newState, {
        actorUserId: user.id, actorName: user.name, actorRole: user.role
    }, financeSnapshot);
    if (newState === 'CANCELLED') await queueCancellationEmails(tx, appointment, false);
    const updated = await tx.appointment.findUnique({ where: { id: appointment.id } });
    return { ...updated, cancellation: newState === 'CANCELLED' ? history : null };
});

// La cancelación por el cliente conserva las reglas de faltas y registra su origen.
export const cancelAppointmentService = (appointmentId, clientPhone, token) => prisma.$transaction(async tx => {
    const appointment = await tx.appointment.findUnique({ where: { id: appointmentId } });
    if (!appointment) throw { statusCode: 404, message: 'Cita no encontrada' };
    if (token && !acceptsAppointmentLink(appointment, token)) throw invalidAppointmentLink;
    await ensureBarberInOperation(tx, appointment.barberId);

    const [client] = await tx.$queryRaw`
        SELECT "name", "phone", "strikes", "blockCount", "blockedUntil", "isBanned"
        FROM "Clients" WHERE "id" = ${appointment.clientId} FOR UPDATE
    `;
    if (!token && client.phone !== clientPhone) throw { statusCode: 403, message: 'Número de teléfono no coincide con la cita.' };

    await changeAppointmentState(tx, appointment, 'CANCELLED', { actorName: client.name, actorRole: 'CLIENT' });
    const startsAt = appointmentStart(appointment);
    const now = new Date();
    const remaining = startsAt - now;
    const isLate = remaining > 0 && remaining < strikeWindowMs;
    await queueCancellationEmails(tx, appointment, isLate);
    if (!isLate) return { message: 'Cita cancelada.', strikeApplied: false };

    const effective = {
        strikes: client.strikes + 1, blockCount: client.blockCount,
        blockedUntil: client.blockedUntil, isBanned: client.isBanned, lastStrikeAt: now
    };
    if (effective.strikes >= strikeLimit) {
        effective.strikes = 0;
        effective.blockCount += 1;
        effective.isBanned ||= effective.blockCount >= blockLimit;
        effective.blockedUntil = effective.isBanned ? null : new Date(now.getTime() + blockDurationMs);
    }
    await tx.clients.update({ where: { id: appointment.clientId }, data: effective });

    let message = `Cita cancelada. Se registró una falta por cancelar con menos de 12 horas de anticipación (${effective.strikes} de ${strikeLimit}).`;
    let sanction = 'STRIKE';
    if (effective.isBanned) {
        message = 'Cita cancelada. El número quedó bloqueado permanentemente por cancelaciones tardías reiteradas.';
        sanction = 'BANNED';
    } else if (effective.blockedUntil > now) {
        message = `Cita cancelada. El número está bloqueado para nuevas reservas hasta el ${bogotaDateTime.format(effective.blockedUntil)}.`;
        sanction = 'BLOCKED';
    }
    return { message, strikeApplied: true, sanction };
});

const invalidAppointmentLink = { statusCode: 400, message: 'El enlace de la cita ya no es válido.' };

export function respondToAppointment(id, token, action) {
    if (action === 'cancel') return cancelAppointmentService(id, null, token);
    return prisma.$transaction(async tx => {
        await tx.$queryRaw`SELECT "id" FROM "Appointment" WHERE "id" = ${id} FOR UPDATE`;
        const appointment = await tx.appointment.findUnique({
            where: { id }, include: { client: { select: { name: true } } }
        });
        if (!appointment || !acceptsAppointmentLink(appointment, token)) throw invalidAppointmentLink;
        if (!openStates.includes(appointment.state)) throw { statusCode: 409, message: 'La cita ya fue cerrada.' };
        if (!appointment.clientConfirmedAt) {
            if (appointment.state === 'PENDING') {
                await changeAppointmentState(tx, appointment, 'CONFIRMED', { actorName: appointment.client.name, actorRole: 'CLIENT' });
            }
            await tx.appointment.update({ where: { id }, data: { clientConfirmedAt: new Date() } });
        }
        return { message: 'Tu asistencia quedó confirmada.' };
    });
}
