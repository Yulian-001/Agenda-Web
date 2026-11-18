// app/api/public/availability/route.js
import { NextResponse } from 'next/server';
import { prisma } from '../../../../utils/prisma';
import { handleApiError } from '../../../../utils/errorHandler';

const getDayOfWeekEnum = (dateString) => {
    const date = new Date(dateString + 'T00:00:00');
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    return days[date.getDay()];
};

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const barberId = searchParams.get('barberId');
        const date = searchParams.get('date'); // Formato YYYY-MM-DD

        if (!barberId || !date) {
            return NextResponse.json({ error: "Faltan parámetros (barberId, date)" }, { status: 400 });
        }

        const dayEnum = getDayOfWeekEnum(date);
        const dateObj = new Date(date + 'T00:00:00.000Z');

        // 1. Obtener las horas habilitadas del barbero para ese día
        const businessHours = await prisma.businessHour.findMany({
            where: { barberId, day: dayEnum, isActive: true },
            select: { timeSlot: true }
        });

        const activeSlots = businessHours.map(bh => bh.timeSlot);

        // 2. Obtener las citas ya agendadas para ese barbero en esa fecha
        const appointments = await prisma.appointment.findMany({
            where: {
                barberId,
                date: dateObj,
                state: { in: ['PENDING', 'CONFIRMED'] }
            },
            select: { timeSlot: true }
        });

        const bookedSlots = appointments.map(app => app.timeSlot);

        // 3. Calcular las horas disponibles (las activas menos las ocupadas)
        const availableSlots = activeSlots.filter(slot => !bookedSlots.includes(slot));

        return NextResponse.json({
            date,
            barberId,
            availableSlots
        }, { status: 200 });

    } catch (error) {
        return handleApiError(error, "Error calculando disponibilidad");
    }
}