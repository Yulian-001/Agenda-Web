import { prisma } from '../utils/prisma';
import { civilDate, scheduleNow } from '../config/schedule';
import { defaultSettlementDirection, financeRoles, settlementDirections } from '../config/finance';
import { detectCancellationPatterns } from './cancellation-patterns';

const keyOf = date => date.toISOString().slice(0, 10);
const percent = (amount, total) => total ? Math.round(amount / total * 1000) / 10 : 0;
const currency = cents => cents / 100;
const compareActivity = (a, b) => b.completed - a.completed || b.revenue - a.revenue || a.name.localeCompare(b.name, 'es-CO');

function numberParam(value, defaultValue, min, max) {
    const parsed = value === null || value === undefined ? defaultValue : /^\d+$/.test(String(value)) ? Number(value) : NaN;
    if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
        throw { statusCode: 400, message: 'Selecciona un año y un período válidos.' };
    }
    return parsed;
}

function resolvePeriod({ period, year, month, semester }, today) {
    if (!['monthly', 'semiannual'].includes(period)) {
        throw { statusCode: 400, message: 'Selecciona un período mensual o semestral.' };
    }
    const [localYear, localMonth] = today.split('-').map(Number);
    const selectedYear = numberParam(year, localYear, 1900, 9998);
    const monthIndex = period === 'monthly'
        ? numberParam(month, localMonth, 1, 12) - 1
        : (numberParam(semester, localMonth <= 6 ? 1 : 2, 1, 2) - 1) * 6;
    const startDate = new Date(Date.UTC(selectedYear, monthIndex, 1));
    const endDate = new Date(Date.UTC(selectedYear, monthIndex + (period === 'monthly' ? 1 : 6), 1));
    return { type: period, startDate, endDate };
}

function bucketRows(period) {
    const rows = new Map();
    for (const cursor = new Date(period.startDate); cursor < period.endDate;) {
        const date = keyOf(cursor);
        const key = period.type === 'monthly' ? date : date.slice(0, 7);
        rows.set(key, { key, cents: 0, completed: 0 });
        if (period.type === 'monthly') cursor.setUTCDate(cursor.getUTCDate() + 1);
        else cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }
    return rows;
}

function newActivity(id, name) {
    return { id, name, scheduled: 0, cancelled: 0, completed: 0, cents: 0 };
}

function amountFor(appointment) {
    const barbers = appointment.barber;
    return {
        cents: Math.round(appointment.priceAtBooking * 100),
        rate: appointment.commissionRateApplied ?? (barbers.role === 'BARBER_INDEPENDENT' ? 1 : barbers.commissionRate),
        direction: appointment.settlementDirectionApplied ?? barbers.settlementDirection ?? defaultSettlementDirection,
        estimated: appointment.commissionRateApplied === null || appointment.settlementDirectionApplied === null
    };
}

function addActivity(row, appointment) {
    row.scheduled += 1;
    if (appointment.state === 'CANCELLED') row.cancelled += 1;
    if (appointment.state === 'COMPLETED') {
        row.completed += 1;
        row.cents += Math.round(appointment.priceAtBooking * 100);
    }
}

function toActivity(row) {
    return {
        id: row.id, name: row.name, scheduled: row.scheduled, cancelled: row.cancelled,
        completed: row.completed, revenue: currency(row.cents), cancellationRate: percent(row.cancelled, row.scheduled)
    };
}

function createBarber(barber, lifetimeCompleted) {
    return {
        ...newActivity(barber.id, barber.name), role: barber.role, commissionRate: barber.commissionRate,
        settlementDirection: barber.settlementDirection, canEditSettings: !barber.archivedAt,
        profileActive: barber.state, lifetimeCompleted, estimated: 0,
        barberCents: 0, businessCents: 0, receivesCents: 0, paysCents: 0,
        clients: new Map(), months: new Map(), rates: new Set()
    };
}

function weekOf(date) {
    const monday = new Date(date);
    monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay() + 6) % 7);
    return keyOf(monday);
}

export const getFinancesService = async (user, filters) => {
    const [today] = scheduleNow();
    const period = resolvePeriod(filters, today);
    const team = financeRoles.includes(user.role);
    const scope = team ? { barber: { role: { not: 'BARBER_INDEPENDENT' } } } : { barberId: user.id };
    const barberSelect = { id: true, name: true, role: true, commissionRate: true, settlementDirection: true, archivedAt: true, state: true };
    const [appointments, profiles, lifetime, catalog, clientSanctions] = await Promise.all([
        prisma.appointment.findMany({
            where: { ...scope, date: { gte: period.startDate, lt: period.endDate } },
            select: {
                id: true, date: true, timeSlot: true, state: true, priceAtBooking: true, commissionRateApplied: true,
                settlementDirectionApplied: true, barberId: true, serviceId: true, clientId: true,
                barber: { select: barberSelect }, service: { select: { name: true } },
                client: { select: { name: true } },
                historyAppointment: {
                    where: { state: 'CANCELLED' }, take: 1, orderBy: [{ changedAt: 'desc' }, { id: 'desc' }],
                    select: { actorUserId: true, actorName: true, actorRole: true, changedAt: true }
                }
            },
            orderBy: [{ date: 'asc' }, { timeSlot: 'asc' }]
        }),
        prisma.user.findMany({
            where: team ? {
                role: { not: 'BARBER_INDEPENDENT' }, archivedAt: null,
                OR: [{ isOwner: false }, { role: { not: 'ADMIN' } }, { id: user.id }]
            } : { id: user.id },
            select: barberSelect
        }),
        prisma.appointment.groupBy({ by: ['barberId'], where: { ...scope, state: 'COMPLETED' }, _count: { _all: true } }),
        team ? prisma.services.findMany({ where: { isActive: true, archivedAt: null }, select: { id: true, name: true } }) : [],
        team ? prisma.clients.findMany({
            where: {
                OR: [{ strikes: { gt: 0 } }, { blockCount: { gt: 0 } }, { isBanned: true }],
                appointments: { some: scope }
            },
            select: { id: true, name: true, strikes: true, blockCount: true, blockedUntil: true, isBanned: true },
            orderBy: [{ isBanned: 'desc' }, { lastStrikeAt: 'desc' }]
        }) : []
    ]);

    const lifetimeByBarber = new Map(lifetime.map(row => [row.barberId, row._count._all]));
    const barbers = new Map(profiles.map(row => [row.id, createBarber(row, lifetimeByBarber.get(row.id) ?? 0)]));
    const services = new Map(catalog.map(row => [row.id, newActivity(row.id, row.name)]));
    const clients = new Map();
    const authors = new Map();
    const summary = newActivity('', '');
    const chart = bucketRows(period);

    for (const appointment of appointments) {
        const { barberId, serviceId, clientId, state } = appointment;
        if (!barbers.has(barberId)) {
            barbers.set(barberId, createBarber(appointment.barber, lifetimeByBarber.get(barberId) ?? 0));
        }
        if (!services.has(serviceId)) services.set(serviceId, newActivity(serviceId, appointment.service.name));
        if (!clients.has(clientId)) {
            clients.set(clientId, { ...newActivity(clientId, appointment.client.name), days: new Set(), weeks: new Set() });
        }

        const barber = barbers.get(barberId);
        const client = clients.get(clientId);
        for (const row of [summary, barber, client, services.get(serviceId)]) addActivity(row, appointment);
        if (state === 'CANCELLED' && team) {
            const author = appointment.historyAppointment[0];
            const role = author?.actorRole ?? 'UNKNOWN';
            const key = role + ':' + (author?.actorUserId ?? (role === 'CLIENT' ? clientId : author?.actorName ?? ''));
            const item = authors.get(key) ?? { id: key, role, name: author?.actorName ?? null, count: 0 };
            item.count += 1;
            authors.set(key, item);
        }
        if (state !== 'COMPLETED') continue;

        const { cents, rate, direction, estimated } = amountFor(appointment);
        const commission = Math.round(cents * Math.round(rate * 10000) / 10000);
        const business = cents - commission;
        barber.barberCents += commission;
        barber.businessCents += business;
        if (direction === 'BARBER_PAYS_BUSINESS') barber.receivesCents += business;
        else barber.paysCents += commission;
        if (estimated) barber.estimated += 1;
        barber.rates.add(rate);

        const day = keyOf(appointment.date);
        const month = day.slice(0, 7);
        const series = chart.get(period.type === 'monthly' ? day : month);
        series.cents += cents;
        series.completed += 1;
        barber.months.set(month, (barber.months.get(month) ?? 0) + 1);
        if (!barber.clients.has(clientId)) barber.clients.set(clientId, new Set());
        barber.clients.get(clientId).add(day);
        client.days.add(day);
        client.weeks.add(weekOf(appointment.date));
    }

    const teamReport = [...barbers.values()].map(row => ({
        ...toActivity(row), role: row.role, profileActive: row.profileActive, canEditSettings: row.canEditSettings,
        commissionRate: row.commissionRate, settlementDirection: row.settlementDirection,
        totalSales: currency(row.cents), appointmentsCount: row.completed,
        barberEarnings: currency(row.barberCents), bossEarnings: currency(row.businessCents),
        receives: currency(row.receivesCents), pays: currency(row.paysCents),
        lifetimeCompleted: row.lifetimeCompleted, estimated: row.estimated,
        appliedRates: [...row.rates].sort((a, b) => a - b),
        recurringClients: [...row.clients.values()].filter(days => days.size >= 2).length,
        uniqueClients: row.clients.size, monthlyCounts: Object.fromEntries(row.months)
    })).sort(compareActivity);

    if (!team) {
        const own = teamReport[0];
        return {
            period,
            summary: {
                scheduled: summary.scheduled, completed: summary.completed, cancelled: summary.cancelled,
                totalRevenue: own?.totalSales ?? 0, barberEarnings: own?.barberEarnings ?? 0, estimated: own?.estimated ?? 0
            },
            personal: {
                commissionRate: user.role === 'BARBER_INDEPENDENT' ? 1 : own?.commissionRate ?? 0,
                appliedRates: own?.appliedRates ?? [],
                appointments: appointments.map(row => ({
                    id: row.id, date: keyOf(row.date), timeSlot: row.timeSlot, state: row.state,
                    service: row.service.name
                }))
            },
            chart: [...chart.values()].map(row => ({ key: row.key, revenue: currency(row.cents), completed: row.completed }))
        };
    }

    const serviceReport = [...services.values()].map(toActivity).sort(compareActivity);
    const customerReport = [...clients.values()].map(row => {
        const days = [...row.days].sort();
        return {
            ...toActivity(row), visitDays: days.length, activeWeeks: row.weeks.size,
            averageGap: days.length > 1 ? Math.round((civilDate(days.at(-1)) - civilDate(days[0])) / 86400000 / (days.length - 1)) : null
        };
    });
    const roleCounts = new Map();
    for (const item of authors.values()) roleCounts.set(item.role, (roleCounts.get(item.role) ?? 0) + item.count);

    return {
        period,
        summary: {
            ...toActivity(summary), totalRevenue: currency(summary.cents), totalAppointments: summary.completed,
            businessNet: teamReport.reduce((total, row) => total + Math.round(row.bossEarnings * 100), 0) / 100,
            barberEarnings: teamReport.reduce((total, row) => total + Math.round(row.barberEarnings * 100), 0) / 100,
            estimated: teamReport.reduce((total, row) => total + row.estimated, 0),
            topServices: serviceReport.filter(row => row.completed > 0).map(row => ({
                name: row.name, count: row.completed, percentage: percent(row.completed, summary.completed) + '%'
            }))
        },
        teamReport,
        chart: [...chart.values()].map(row => ({ key: row.key, revenue: currency(row.cents), completed: row.completed })),
        services: serviceReport,
        clientSanctions: clientSanctions.map(({ isBanned, blockedUntil, ...client }) => ({
            ...client, blockedUntil,
            status: isBanned ? 'BANNED' : blockedUntil > new Date() ? 'BLOCKED' : client.strikes ? 'STRIKES' : 'CLEAR'
        })),
        lowDemand: serviceReport.filter(row => catalog.some(service => service.id === row.id)).sort((a, b) => a.completed - b.completed || a.revenue - b.revenue),
        salesByClient: customerReport.filter(row => row.completed > 0).sort((a, b) => b.revenue - a.revenue || b.completed - a.completed),
        loyalty: customerReport.filter(row => row.visitDays >= 2).sort((a, b) =>
            b.activeWeeks - a.activeWeeks || b.visitDays - a.visitDays || b.completed - a.completed),
        customerCancellations: customerReport.filter(row => row.cancelled > 0).sort((a, b) =>
            b.cancelled - a.cancelled || b.cancellationRate - a.cancellationRate),
        authors: [...authors.values()].map(item => ({ ...item, rate: percent(item.count, summary.scheduled) })).sort((a, b) => b.count - a.count),
        cancellationByRole: [...roleCounts].map(([role, count]) => ({ role, count, rate: percent(count, summary.scheduled) })).sort((a, b) => b.count - a.count),
        patterns: detectCancellationPatterns(appointments, today)
    };
};

export async function updateSettlementSettings(id, data) {
    if (!Object.hasOwn(settlementDirections, data.settlementDirection)) {
        throw { statusCode: 400, message: 'Selecciona una modalidad de liquidación válida.' };
    }
    try {
        return await prisma.user.update({
            where: { id, archivedAt: null, role: { not: 'BARBER_INDEPENDENT' } },
            data,
            select: { id: true, name: true, commissionRate: true, settlementDirection: true }
        });
    } catch (error) {
        if (error.code === 'P2025') throw { statusCode: 404, message: 'Colaborador no encontrado.' };
        throw error;
    }
}
