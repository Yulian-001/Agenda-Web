import { civilDate, slotKey } from '../config/schedule';

const dayMs = 86400000;
const dateKey = date => date.toISOString().slice(0, 10);

function group(rows, key) {
    const result = new Map();
    for (const row of rows) {
        const value = key(row);
        if (!result.has(value)) result.set(value, []);
        result.get(value).push(row);
    }
    return result;
}

function longestSeries(dates, gap) {
    const included = new Set(dates);
    let longest = [];
    for (const start of dates) {
        const previous = dateKey(new Date(civilDate(start).getTime() - gap * dayMs));
        if (included.has(previous)) continue;
        const current = [];
        for (let day = civilDate(start).getTime(); included.has(dateKey(new Date(day))); day += gap * dayMs) {
            current.push(dateKey(new Date(day)));
        }
        if (current.length > longest.length) longest = current;
    }
    return longest;
}

export function detectCancellationPatterns(appointments, today) {
    const findings = [];
    for (const [barberId, rows] of group(appointments, row => row.barberId)) {
        const barberName = rows[0].barber.name;
        const personal = rows.filter(row => row.state === 'CANCELLED' && row.historyAppointment[0]?.actorUserId === barberId);
        const add = (kind, title, explanation, evidence) => {
            if (!evidence.length) return;
            findings.push({
                id: barberId + ':' + kind, barberName, title, explanation, count: evidence.length,
                evidence: evidence.slice(0, 16).map(row => ({
                    id: row.id, date: dateKey(row.date), timeSlot: slotKey(row.timeSlot),
                    serviceName: row.service.name, state: row.state,
                    cancelledAt: row.historyAppointment[0]?.changedAt ?? null
                }))
            });
        };
        const byDate = group(personal, row => dateKey(row.date));
        for (const gap of [1, 2]) {
            const sequence = longestSeries([...byDate.keys()].sort(), gap);
            if (sequence.length < 3) continue;
            add('series-' + gap, gap === 1 ? 'Cancelaciones en días consecutivos' : 'Cancelaciones en días alternos',
                `${sequence.length} fechas con citas canceladas por el mismo barbero asignado.`,
                sequence.flatMap(date => byDate.get(date)));
        }
        for (const [hour, items] of group(personal, row => slotKey(row.timeSlot).slice(0, 2))) {
            if (items.length >= 3 && new Set(items.map(row => dateKey(row.date))).size >= 2) {
                add('hour-' + hour, 'Cancelaciones repetidas entre ' + hour + ':00 y ' + hour + ':59',
                    'El barbero canceló al menos tres citas propias en esta hora, en fechas distintas.', items);
            }
        }

        const late = personal.filter(row => {
            const scheduled = new Date(dateKey(row.date) + 'T' + slotKey(row.timeSlot) + ':00-05:00');
            return scheduled - new Date(row.historyAppointment[0].changedAt) <= 3600000;
        });
        if (late.length >= 2) add('late', 'Cancelaciones cerca del inicio o después',
            'Al menos dos citas propias fueron canceladas desde una hora antes de empezar o después del horario programado.', late);

        for (const [date, items] of group(rows.filter(row => dateKey(row.date) < today), row => dateKey(row.date))) {
            const completed = items.filter(row => row.state === 'COMPLETED').length;
            const cancelled = items.filter(row => row.state === 'CANCELLED').length;
            if (items.length >= 4 && completed / items.length <= 0.25) {
                add('volume-' + date, 'Jornada con pocas citas completadas',
                    `${date}: ${completed} de ${items.length} completadas y ${cancelled} canceladas en una jornada ya terminada.`, items);
            }
        }
    }
    return findings.sort((a, b) => b.count - a.count || a.barberName.localeCompare(b.barberName, 'es-CO'));
}
