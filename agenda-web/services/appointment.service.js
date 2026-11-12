// services/appointment.service.js
import { prisma } from '../utils/prisma';

// Mapeo de fecha JS al Enum DayOfWeek
const getDayOfWeekEnum = (dateString) => {
    const date = new Date(dateString + 'T00:00:00');
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    return days[date.getDay()];
};

// 1. Crear Cita (Lógica del Cliente)
export const createAppointmentService = async (data) => {
    const { clientName, clientPhone, barberId, serviceId, date, timeSlot } = data;

    // Validar que el Barbero tenga habilitada esa hora
    const dayEnum = getDayOfWeekEnum(date);
    const businessHour = await prisma.businessHour.findFirst({
        where: { barberId, day: dayEnum, timeSlot, isActive: true }
    });

    if (!businessHour) throw { statusCode: 400, message: 'El barbero no está disponible en este horario.' };

    // Validar que no esté ocupado
    const dateObj = new Date(date + 'T00:00:00Z');
    const existingAppointment = await prisma.appointment.findFirst({
        where: {
            barberId, date: dateObj, timeSlot,
            state: { in: ['PENDING', 'CONFIRMED'] }
        }
    });

    if (existingAppointment) throw { statusCode: 409, message: 'Este horario ya está ocupado por otro cliente.' };

    // Obtener precio del servicio
    const service = await prisma.services.findUnique({ where: { id: serviceId } });
    if (!service) throw { statusCode: 404, message: 'Servicio no encontrado' };

    // Buscar o crear el cliente
    let client = await prisma.clients.findUnique({ where: { phone: clientPhone } });
    if (!client) {
        client = await prisma.clients.create({ data: { name: clientName, phone: clientPhone } });
    }

    // Crear la cita
    const newAppointment = await prisma.appointment.create({
        data: {
            date: dateObj, timeSlot, priceAtBooking: service.price,
            clientId: client.id, barberId, serviceId,
        }
    });

    // Guardar historial
    await prisma.historyAppointment.create({
        data: { state: 'PENDING', barberId, appointmentId: newAppointment.id, serviceId }
    });

    return newAppointment;
};

// 2. Obtener Citas (Para el Calendario y Reservas Día)
export const getAppointmentsService = async (user, filters) => {
    const { date, view } = filters;
    let whereClause = {};

    if (date) {
        const startOfDay = new Date(date + 'T00:00:00.000Z');
        const endOfDay = new Date(date + 'T23:59:59.999Z');
        whereClause.date = { gte: startOfDay, lte: endOfDay };
    }

    const isAdminOrBoss = ['ADMIN', 'BARBER_BOSS'].includes(user.role);

    // Si pide su agenda personal o es un barbero, solo ve sus citas. Si es Admin y pide 'team', ve todas.
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

    // Formatear para que el Frontend solo reciba lo necesario para las tarjetas
    return appointments.map(app => ({
        id: app.id,
        date: app.date,
        timeSlot: app.timeSlot,
        state: app.state,
        priceAtBooking: app.priceAtBooking,
        clientName: app.client.name,
        clientPhone: app.client.phone,
        serviceName: app.service.name,
        barberName: app.barber.name,
        barberPhoto: app.barber.photo
    }));
};

export const updateAppointmentStatusService = async (appointmentId, newState, user) => {
    const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId }
    });

    if (!appointment) throw { statusCode: 404, message: 'Cita no encontrada' };

    // Seguridad: Solo el barbero asignado, el Admin o el Boss pueden cambiar el estado
    const isAdminOrBoss = ['ADMIN', 'BARBER_BOSS'].includes(user.role);
    const isAssignedBarber = appointment.barberId === user.id;

    if (!isAdminOrBoss && !isAssignedBarber) {
        throw { statusCode: 403, message: 'No tienes permiso para modificar esta cita.' };
    }

    // Actualizar estado
    const updated = await prisma.appointment.update({
        where: { id: appointmentId },
        data: { state: newState }
    });

    // Guardar en el historial para auditoría
    await prisma.historyAppointment.create({
        data: {
            state: newState,
            barberId: appointment.barberId,
            appointmentId: appointment.id,
            serviceId: appointment.serviceId
        }
    });

    return updated;
};