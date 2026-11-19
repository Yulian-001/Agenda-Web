import { Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { civilDate, scheduleNow, scheduleRoles, slotKey, standardHours, weekdayOf, weekDays } from '../config/schedule';

const wholeDate = '';
const team = { role: { in: scheduleRoles }, archivedAt: null };
const openStates = ['PENDING', 'CONFIRMED'];

function enabledHours(rows) {
    return new Set(rows.filter(row => row.isActive).map(row => slotKey(row.timeSlot)));
}

function sortedHours(...hours) {
    return [...new Set(hours.flat().filter(Boolean).map(slotKey))].sort();
}

function dateKey(date) {
    return date.toISOString().slice(0, 10);
}

function checkClosures(appointments) {
    if (!appointments.length) return;
    throw {
        statusCode: 409,
        message: `Hay ${appointments.length} citas pendientes o confirmadas en las horas que quieres cerrar. Cancélalas antes de guardar.`,
        conflicts: appointments.slice(0, 20).map(appointment => ({
            id: appointment.id,
            barberName: appointment.barber.name,
            date: dateKey(appointment.date),
            timeSlot: slotKey(appointment.timeSlot)
        }))
    };
}

export async function getWeeklySchedule() {
    const users = await prisma.user.findMany({
        where: team,
        orderBy: { name: 'asc' },
        select: { id: true, name: true, role: true, state: true, businessHours: true }
    });
    const members = users.map(({ id, name, role, state }) => ({ id, name, role, state }));
    const days = weekDays.map(([day]) => {
        const weeklyRows = users.map(user => user.businessHours.filter(row => row.day === day));
        const calendarHours = sortedHours(standardHours, ...weeklyRows.map(rows => rows.map(row => row.timeSlot)));
        const available = weeklyRows.map(enabledHours);
        return {
            day,
            slots: calendarHours.map(timeSlot => {
                const openCount = available.filter(hours => hours.has(timeSlot)).length;
                return { timeSlot, isActive: openCount === 0 ? false : openCount === members.length ? true : null };
            })
        };
    });
    return { members, days };
}

export async function loadDailySchedule(db, barberId, date, where = {}) {
    const schedule = await db.user.findFirst({
        where: { ...where, id: barberId, archivedAt: null },
        select: {
            name: true,
            businessHours: { where: { day: weekdayOf(date) }, select: { timeSlot: true, isActive: true } }
        }
    });
    if (!schedule) return null;

    // Consulta la tabla directamente para que el cliente de un proceso dev recargado
    // pueda usar la migración aunque su modelo de Prisma siga en memoria.
    const scheduleExceptions = await db.$queryRaw`
        SELECT "timeSlot", "isActive" FROM "ScheduleException"
        WHERE "barberId" = ${barberId} AND "date" = ${dateKey(date)}::date
    `;
    return { ...schedule, scheduleExceptions };
}

export async function loadScheduleRange(db, barberId, start, end, where) {
    const schedule = await db.user.findFirst({
        where: { ...where, id: barberId, state: true, archivedAt: null },
        select: { businessHours: { select: { day: true, timeSlot: true, isActive: true } } }
    });
    if (!schedule) return null;

    const scheduleExceptions = await db.$queryRaw`
        SELECT "date", "timeSlot", "isActive" FROM "ScheduleException"
        WHERE "barberId" = ${barberId} AND "date" >= ${start}::date AND "date" < ${end}::date
    `;
    return { ...schedule, scheduleExceptions };
}

function exceptionMap(rows) {
    return new Map(rows.map(row => [row.timeSlot, row.isActive]));
}

export function dailySlots(schedule) {
    const openedWeekly = enabledHours(schedule.businessHours);
    const exceptions = exceptionMap(schedule.scheduleExceptions);
    const hours = sortedHours(standardHours, schedule.businessHours.map(row => row.timeSlot), [...exceptions.keys()]);
    return hours.map(timeSlot => {
        const weeklyActive = openedWeekly.has(timeSlot);
        return {
            timeSlot,
            weeklyActive,
            isActive: exceptions.get(timeSlot) ?? exceptions.get(wholeDate) ?? weeklyActive,
            isException: exceptions.has(timeSlot) || exceptions.has(wholeDate)
        };
    });
}

export async function getIndividualSchedule(barberId, date) {
    const schedule = await loadDailySchedule(prisma, barberId, civilDate(date), team);
    if (!schedule) throw { statusCode: 404, message: 'Barbero del equipo no encontrado.' };
    return {
        name: schedule.name,
        date,
        slots: dailySlots(schedule),
        hasException: schedule.scheduleExceptions.length > 0
    };
}

function uniqueChanges(changes) {
    return [...new Map(changes.map(change => [change.day + change.timeSlot, change])).values()];
}

export const updateWeeklySchedule = changes => prisma.$transaction(async tx => {
    // El mismo bloqueo por usuario serializa estos cambios con reservas, excepciones y bajas.
    const users = await tx.$queryRaw`
        SELECT "id" FROM "User"
        WHERE "archivedAt" IS NULL AND "role" IN ('BARBER_AFFILIATE', 'BARBER_BOSS')
        ORDER BY "id" FOR UPDATE
    `;
    if (!users.length) throw { statusCode: 409, message: 'Todavía no hay barberos afiliados o jefes en el equipo.' };
    const barberIds = users.map(user => user.id);
    const updates = uniqueChanges(changes);
    const closed = new Set(updates.filter(change => !change.isActive).map(change => change.day + change.timeSlot));

    if (closed.size) {
        const [today, now] = scheduleNow();
        const date = { gte: civilDate(today) };
        const [appointments, overrides] = await Promise.all([
            tx.appointment.findMany({
                where: { date, barberId: { in: barberIds }, state: { in: openStates } },
                select: { id: true, date: true, timeSlot: true, barberId: true, barber: { select: { name: true } } },
                orderBy: [{ date: 'asc' }, { timeSlot: 'asc' }]
            }),
            tx.$queryRaw`
                SELECT "barberId", "date", "timeSlot", "isActive" FROM "ScheduleException"
                WHERE "date" >= ${today}::date AND "barberId" IN (${Prisma.join(barberIds)})
            `
        ]);
        const activeExceptions = new Map(overrides.map(row => [row.barberId + dateKey(row.date) + row.timeSlot, row.isActive]));
        checkClosures(appointments.filter(appointment => {
            const day = dateKey(appointment.date);
            const slot = slotKey(appointment.timeSlot);
            const key = appointment.barberId + day;
            const opening = activeExceptions.get(key + slot) ?? activeExceptions.get(key);
            return (day > today || slot >= now) && closed.has(weekdayOf(appointment.date) + slot) && !opening;
        }));
    }

    await tx.businessHour.createMany({
        data: barberIds.flatMap(barberId => updates.map(change => ({ barberId, ...change }))),
        skipDuplicates: true
    });
    for (const [day] of weekDays) {
        for (const isActive of [true, false]) {
            const slots = updates.filter(change => change.day === day && change.isActive === isActive)
                .map(change => change.timeSlot);
            if (slots.length) {
                const storedSlots = slots.flatMap(slot => slot.startsWith('0') ? [slot, slot.slice(1)] : [slot]);
                await tx.businessHour.updateMany({
                    where: { barberId: { in: barberIds }, day, timeSlot: { in: storedSlots } },
                    data: { isActive }
                });
            }
        }
    }
    return barberIds.length;
}, { timeout: 15000 });

export const updateIndividualSchedule = (barberId, draft) => prisma.$transaction(async tx => {
    const [barber] = await tx.$queryRaw`
        SELECT "id" FROM "User" WHERE "id" = ${barberId} AND "archivedAt" IS NULL
        AND "role" IN ('BARBER_AFFILIATE', 'BARBER_BOSS') FOR UPDATE
    `;
    if (!barber) throw { statusCode: 404, message: 'Barbero del equipo no encontrado.' };
    const [today, now] = scheduleNow();
    if (draft.date < today) throw { statusCode: 400, message: 'Selecciona hoy o una fecha futura.' };

    const date = civilDate(draft.date);
    const schedule = await loadDailySchedule(tx, barberId, date);
    const resetDate = draft.wholeDay !== undefined;
    const overrides = resetDate ? new Map() : exceptionMap(schedule.scheduleExceptions);
    if (resetDate && draft.wholeDay !== null) overrides.set(wholeDate, draft.wholeDay);
    for (const [slot, isActive] of Object.entries(draft.hours)) overrides.set(slot, isActive);

    const appointments = await tx.appointment.findMany({
        where: { barberId, date, state: { in: openStates } },
        select: { id: true, date: true, timeSlot: true, barber: { select: { name: true } } },
        orderBy: { timeSlot: 'asc' }
    });
    const weekly = enabledHours(schedule.businessHours);
    checkClosures(appointments.filter(appointment => {
        const slot = slotKey(appointment.timeSlot);
        const enabled = overrides.get(slot) ?? overrides.get(wholeDate) ?? weekly.has(slot);
        return (draft.date > today || slot >= now) && (resetDate || Object.hasOwn(draft.hours, slot)) && !enabled;
    }));

    await tx.$executeRaw`
        DELETE FROM "ScheduleException" WHERE "barberId" = ${barberId} AND "date" = ${draft.date}::date
    `;
    if (overrides.size) {
        const rows = [...overrides].map(([timeSlot, isActive]) =>
            Prisma.sql`(${barberId}, ${draft.date}::date, ${timeSlot}, ${isActive})`
        );
        await tx.$executeRaw`
            INSERT INTO "ScheduleException" ("barberId", "date", "timeSlot", "isActive")
            VALUES ${Prisma.join(rows)}
        `;
    }
});
