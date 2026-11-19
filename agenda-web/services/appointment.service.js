// services/appointment.service.js
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import { ensureBarberInOperation } from './user.service';

import { civilDate, scheduleNow, slotKey } from '../config/schedule';
import { dailySlots, loadDailySchedule } from './schedule.service';

export const createAppointmentService = async (data) => {
    const { clientName, clientPhone, barberId, serviceId, date } = data;
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
                SELECT "id" FROM "User" WHERE "id" = ${barberId} AND "state" = true AND "archivedAt" IS NULL FOR SHARE
            `;
            if (!barber) throw { statusCode: 400, message: 'El barbero no está disponible.' };

            let client = await tx.clients.findUnique({ where: { phone: clientPhone } });
            if (client?.isBanned) {
                throw { statusCode: 403, message: 'Este número está bloqueado permanentemente por cancelaciones reiteradas.' };
            }
            if (client?.blockedUntil > new Date()) {
                throw { statusCode: 403, message: `Este número está bloqueado temporalmente hasta el ${client.blockedUntil.toLocaleDateString()}.` };
            }

            const schedule = await loadDailySchedule(tx, barberId, bookingDate);
            const enabled = dailySlots(schedule).some(slot => slot.timeSlot === timeSlot && slot.isActive);
            if (!enabled) throw { statusCode: 400, message: 'El barbero no está disponible en este horario.' };

            const timeVariants = timeSlot.startsWith('0') ? [timeSlot, timeSlot.slice(1)] : [timeSlot];
            const booked = await tx.appointment.findFirst({
                where: { barberId, date: bookingDate, timeSlot: { in: timeVariants } },
                select: { id: true }
            });
            if (booked) throw { statusCode: 409, message: 'Este horario ya está ocupado.' };

            const service = await tx.services.findFirst({
                where: { id: serviceId, isActive: true, barbers: { some: { barberId } } },
                select: { name: true, price: true }
            });
            if (!service) throw { statusCode: 400, message: 'El barbero no tiene asignado este servicio activo.' };

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
                    clientId: client.id,
                    barberId,
                    serviceId,
                    historyAppointment: { create: { state: 'PENDING', barberId, serviceId } }
                }
            });
            return { data: newAppointment, serviceName: service.name };
        });
        logger.dev(`📱 WhatsApp a ${clientPhone}: Hola ${clientName}, tu cita para ${appointment.serviceName} ha sido agendada.`);
        return appointment.data;
    } catch (error) {
        if (error.code === 'P2002') {
            throw { statusCode: 409, message: 'Este horario acaba de ser ocupado por otro cliente. Por favor elige otro.' };
        }
        throw error;
    }
};

export const getAppointmentsService = async (user, filters) => {
    const { date, view } = filters;
    const whereClause = { barber: { archivedAt: null } };

    if (date) {
        const startOfDay = new Date(date + 'T00:00:00.000Z');
        const endOfDay = new Date(date + 'T23:59:59.999Z');
        whereClause.date = { gte: startOfDay, lte: endOfDay };
    }

    const isAdminOrBoss = ['ADMIN', 'BARBER_BOSS'].includes(user.role);
    if (view === 'personal' || !isAdminOrBoss) {
        whereClause.barberId = user.id;
    }

    const appointments = await prisma.appointment.findMany({
        where: whereClause,
        include: {
            client: { select: { name: true, phone: true } },
            service: { select: { name: true, duration: true, price: true } },
            barber: { select: { name: true, photo: true } }
        },
        orderBy: [{ date: 'asc' }, { timeSlot: 'asc' }]
    });

    return appointments.map(app => ({
        id: app.id, date: app.date, timeSlot: app.timeSlot, state: app.state,
        priceAtBooking: app.priceAtBooking, clientName: app.client.name,
        clientPhone: app.client.phone, serviceName: app.service.name,
        barberName: app.barber.name, barberPhoto: app.barber.photo
    }));
};

export const updateAppointmentStatusService = async (appointmentId, newState, user) => {
    const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
    if (!appointment) throw { statusCode: 404, message: 'Cita no encontrada' };

    const isAdminOrBoss = ['ADMIN', 'BARBER_BOSS'].includes(user.role);
    const isAssignedBarber = appointment.barberId === user.id;

    if (!isAdminOrBoss && !isAssignedBarber) {
        throw { statusCode: 403, message: 'No tienes permiso para modificar esta cita.' };
    }

    return prisma.$transaction(async tx => {
        await ensureBarberInOperation(tx, appointment.barberId);
        return tx.appointment.update({
            where: { id: appointmentId },
            data: {
                state: newState,
                historyAppointment: {
                    create: { state: newState, barberId: appointment.barberId, serviceId: appointment.serviceId }
                }
            }
        });
    });
};

//  Cancelación Pública por parte del Cliente (Aplica Strikes)
export const cancelAppointmentService = async (appointmentId, clientPhone) => {
    const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: { client: true }
    });

    if (!appointment) throw { statusCode: 404, message: 'Cita no encontrada' };
    if (appointment.client.phone !== clientPhone) throw { statusCode: 403, message: 'Número de teléfono no coincide con la cita.' };
    if (appointment.state === 'CANCELLED' || appointment.state === 'COMPLETED') {
        throw { statusCode: 400, message: 'Esta cita ya fue cancelada o completada.' };
    }

    // Calcular diferencia de horas
    const apptDate = new Date(appointment.date);
    const [hours, minutes] = appointment.timeSlot.split(':');
    apptDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    const diffInHours = (apptDate - new Date()) / (1000 * 60 * 60);
    const isLate = diffInHours < 12; // Si falta menos de 12h, aplica strike

    let newStrikes = appointment.client.strikes;
    let blockCount = appointment.client.blockCount;
    let blockedUntil = appointment.client.blockedUntil;
    let isBanned = appointment.client.isBanned;

    if (isLate) {
        newStrikes += 1;
        if (newStrikes >= 3) {
            blockCount += 1;
            newStrikes = 0;
            if (blockCount >= 3) {
                isBanned = true; // Baneo permanente
            } else {
                blockedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días de bloqueo
            }
        }
    }

    await prisma.$transaction([
        prisma.appointment.update({
            where: { id: appointmentId },
            data: { state: 'CANCELLED' }
        }),
        prisma.clients.update({
            where: { id: appointment.clientId },
            data: { strikes: newStrikes, blockCount, blockedUntil, isBanned }
        })
    ]);

    return { message: "Cita cancelada", strikeApplied: isLate };
};
