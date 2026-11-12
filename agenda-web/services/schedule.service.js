// services/schedule.service.js
import { prisma } from '../utils/prisma';

const dayMap = {
    SUNDAY: 0, MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4, FRIDAY: 5, SATURDAY: 6
};

export const getScheduleService = async (barberId) => {
    return await prisma.businessHour.findMany({
        where: { barberId },
        orderBy: [{ day: 'asc' }, { timeSlot: 'asc' }]
    });
};

export const toggleDayService = async (barberId, day, isActive) => {
    if (!isActive) {
        const today = new Date();
        const appointments = await prisma.appointment.findMany({
            where: {
                barberId,
                date: { gte: today },
                state: { in: ['PENDING', 'CONFIRMED'] }
            }
        });

        const hasAppointments = appointments.some(app => app.date.getDay() === dayMap[day]);

        if (hasAppointments) {
            throw {
                statusCode: 400,
                message: `No se puede deshabilitar el día ${day} porque hay citas activas agendadas. Cancele las citas primero.`
            };
        }
    }

    return await prisma.businessHour.updateMany({
        where: { barberId, day },
        data: { isActive }
    });
};

export const toggleHourService = async (barberId, day, timeSlot, isActive) => {
    if (!isActive) {
        const today = new Date();
        const appointments = await prisma.appointment.findMany({
            where: {
                barberId,
                timeSlot,
                date: { gte: today },
                state: { in: ['PENDING', 'CONFIRMED'] }
            }
        });

        const hasAppointments = appointments.some(app => app.date.getDay() === dayMap[day]);

        if (hasAppointments) {
            throw {
                statusCode: 400,
                message: `No se puede deshabilitar la hora ${timeSlot} del día ${day} porque hay citas activas.`
            };
        }
    }

    return await prisma.businessHour.updateMany({
        where: { barberId, day, timeSlot },
        data: { isActive }
    });
};