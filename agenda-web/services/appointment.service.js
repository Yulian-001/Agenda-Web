// services/appointment.service.js
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

const getDayOfWeekEnum = (dateString) => {
    const date = new Date(dateString + 'T00:00:00');
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    return days[date.getDay()];
};

export const createAppointmentService = async (data) => {
    const { clientName, clientPhone, barberId, serviceId, date, timeSlot } = data;

    // ANTI-SABOTAJE (Cliente baneado o bloqueado)
    let client = await prisma.clients.findUnique({ where: { phone: clientPhone } });

    if (client) {
        if (client.isBanned) {
            throw { statusCode: 403, message: 'Este número está bloqueado permanentemente por cancelaciones reiteradas.' };
        }
        if (client.blockedUntil && client.blockedUntil > new Date()) {
            throw { statusCode: 403, message: `Este número está bloqueado temporalmente hasta el ${client.blockedUntil.toLocaleDateString()}.` };
        }
    }

    // 2. Validar que el Barbero tenga habilitada esa hora en su agenda
    const dayEnum = getDayOfWeekEnum(date);
    const businessHour = await prisma.businessHour.findFirst({
        where: { barberId, day: dayEnum, timeSlot, isActive: true }
    });
    if (!businessHour) throw { statusCode: 400, message: 'El barbero no está disponible en este horario.' };

    // 3. Obtener servicio
    const service = await prisma.services.findUnique({ where: { id: serviceId } });
    if (!service) throw { statusCode: 404, message: 'Servicio no encontrado' };

    // 4. Buscar o crear el cliente
    if (!client) {
        client = await prisma.clients.create({
            data: { name: clientName, phone: clientPhone }
        });
    }

    // 5. Crear la cita (Atrapando error de concurrencia P2002)
    const dateObj = new Date(date + 'T00:00:00Z');

    try {
        const newAppointment = await prisma.appointment.create({
            data: {
                date: dateObj, timeSlot, priceAtBooking: service.price,
                clientId: client.id, barberId, serviceId,
            }
        });

        await prisma.historyAppointment.create({
            data: { state: 'PENDING', barberId, appointmentId: newAppointment.id, serviceId }
        });

        // Simulación WhatsApp
        logger.dev(`📱 WhatsApp a ${clientPhone}: Hola ${clientName}, tu cita para ${service.name} ha sido agendada.`);

        return newAppointment;
    } catch (error) {
        // Manejo de Concurrencia (Doble reserva)
        if (error.code === 'P2002') {
            throw { statusCode: 409, message: 'Este horario acaba de ser ocupado por otro cliente. Por favor elige otro.' };
        }
        throw error; // Si es otro error, lo lanzamos
    }
};

export const getAppointmentsService = async (user, filters) => {
    const { date, view } = filters;
    let whereClause = {};

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

    const updated = await prisma.appointment.update({
        where: { id: appointmentId },
        data: { state: newState }
    });

    await prisma.historyAppointment.create({
        data: { state: newState, barberId: appointment.barberId, appointmentId: appointment.id, serviceId: appointment.serviceId }
    });

    return updated;
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