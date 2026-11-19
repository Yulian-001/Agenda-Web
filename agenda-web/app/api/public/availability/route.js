import { NextResponse } from 'next/server';
import { prisma } from '../../../../utils/prisma';
import { handleApiError } from '../../../../utils/errorHandler';
import { scheduleDateSchema } from '../../../../utils/validations';
import { civilDate, scheduleNow, slotKey, weekdayOf } from '../../../../config/schedule';
import { dailySlots, loadScheduleRange } from '../../../../services/schedule.service';

const dateKey = value => value.toISOString().split('T')[0].replace(/^\+0*/, '');

function groupByDate(rows) {
    const byDate = new Map();
    for (const row of rows) {
        const date = dateKey(row.date);
        if (!byDate.has(date)) byDate.set(date, []);
        byDate.get(date).push(row);
    }
    return byDate;
}

function getDayAvailability(day, schedule, exceptions, bookings, today, now) {
    const date = dateKey(day);
    if (date < today) return { date, status: 'past', availableCount: 0, slots: [] };
    if (!schedule) return { date, status: 'closed', availableCount: 0, slots: [] };

    const booked = new Set((bookings.get(date) ?? []).map(row => slotKey(row.timeSlot)));
    const slots = dailySlots({
        businessHours: schedule.businessHours.filter(row => row.day === weekdayOf(day)),
        scheduleExceptions: exceptions.get(date) ?? []
    }).filter(slot => slot.isActive && (date > today || slot.timeSlot >= now))
        .map(({ timeSlot }) => ({ timeSlot, occupied: booked.has(timeSlot) }));

    const availableCount = slots.filter(slot => !slot.occupied).length;
    return { date, status: availableCount ? 'available' : slots.length ? 'full' : 'closed', availableCount, slots };
}

export async function GET(request) {
    try {
        const { searchParams } = request.nextUrl;
        const barberId = searchParams.get('barberId');
        const serviceId = searchParams.get('serviceId');
        const date = searchParams.get('date');
        const month = searchParams.get('month');
        const startDate = month ? month + '-01' : date;
        if (!barberId || startDate?.startsWith('0000-') || !scheduleDateSchema.safeParse(startDate).success ||
            (month && date && (!date.startsWith(month + '-') || !scheduleDateSchema.safeParse(date).success))) {
            return NextResponse.json({ error: 'Selecciona un barbero y una fecha válida.' }, { status: 400 });
        }

        const start = civilDate(startDate);
        const end = new Date(start);
        if (month) end.setUTCMonth(end.getUTCMonth() + 1);
        else end.setUTCDate(end.getUTCDate() + 1);
        const [today, now] = scheduleNow();

        const where = serviceId ? { services: { some: { serviceId, service: { isActive: true } } } } : {};
        const schedule = await loadScheduleRange(prisma, barberId, startDate, dateKey(end), where);
        if (serviceId && !schedule) {
            return NextResponse.json({ error: 'Este barbero ya no ofrece el servicio seleccionado.' }, { status: 404 });
        }

        const appointments = schedule ? await prisma.appointment.findMany({
            where: { barberId, date: { gte: start, lt: end } },
            select: { date: true, timeSlot: true }
        }) : [];
        const bookings = groupByDate(appointments);
        const exceptions = groupByDate(schedule?.scheduleExceptions ?? []);
        const headers = { 'Cache-Control': 'no-store' };

        if (!month) {
            const { slots } = getDayAvailability(start, schedule, exceptions, bookings, today, now);
            return NextResponse.json({
                date, barberId, slots, availableSlots: slots.filter(slot => !slot.occupied).map(slot => slot.timeSlot)
            }, { headers });
        }

        const days = [];
        let selectedDay = null;
        for (const day = new Date(start); day < end; day.setUTCDate(day.getUTCDate() + 1)) {
            const { slots, ...summary } = getDayAvailability(day, schedule, exceptions, bookings, today, now);
            days.push(summary);
            if (summary.date === date) selectedDay = { ...summary, slots };
        }
        return NextResponse.json({ month, days, selectedDay }, { headers });
    } catch (error) {
        return handleApiError(error, 'Error calculando disponibilidad');
    }
}
