import { NextResponse } from 'next/server';
import { prisma } from '../../../../utils/prisma';
import { handleApiError } from '../../../../utils/errorHandler';
import { scheduleDateSchema } from '../../../../utils/validations';
import { civilDate, scheduleNow, slotKey } from '../../../../config/schedule';
import { dailySlots, loadDailySchedule } from '../../../../services/schedule.service';

export async function GET(request) {
    try {
        const { searchParams } = request.nextUrl;
        const barberId = searchParams.get('barberId');
        const serviceId = searchParams.get('serviceId');
        const validation = scheduleDateSchema.safeParse(searchParams.get('date'));
        if (!barberId || !validation.success) {
            return NextResponse.json({ error: 'Selecciona un barbero y una fecha válida.' }, { status: 400 });
        }

        const date = validation.data;
        const [today, now] = scheduleNow();
        const slots = [];
        if (serviceId) {
            const service = await prisma.servicesBarbers.findFirst({
                where: { barberId, serviceId, service: { isActive: true }, barber: { state: true, archivedAt: null } },
                select: { barberId: true }
            });
            if (!service) return NextResponse.json({ error: 'Este barbero ya no ofrece el servicio seleccionado.' }, { status: 404 });
        }
        if (date >= today) {
            const day = civilDate(date);
            const schedule = await loadDailySchedule(prisma, barberId, day, { state: true });
            if (schedule) {
                const appointments = await prisma.appointment.findMany({
                    where: { barberId, date: day },
                    select: { timeSlot: true }
                });
                const bookedSlots = new Set(appointments.map(row => slotKey(row.timeSlot)));
                for (const slot of dailySlots(schedule)) {
                    if (slot.isActive && (date > today || slot.timeSlot >= now)) {
                        slots.push({ timeSlot: slot.timeSlot, occupied: bookedSlots.has(slot.timeSlot) });
                    }
                }
            }
        }

        return NextResponse.json({
            date, barberId, slots,
            availableSlots: slots.filter(slot => !slot.occupied).map(slot => slot.timeSlot)
        }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
        return handleApiError(error, 'Error calculando disponibilidad');
    }
}
