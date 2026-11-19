'use client';

import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { civilDate, weekDays } from '../config/schedule';

const monthFormat = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const dayFormat = new Intl.DateTimeFormat('es-CO', { dateStyle: 'full', timeZone: 'UTC' });
const dayLabels = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];
const dayStatus = { available: 'Disponible', full: 'Sin cupos', closed: 'Sin atención', past: 'Fecha pasada' };
const arrow = 'grid size-9 place-items-center rounded-lg border border-brand-border bg-brand-surface text-brand-text hover:bg-brand-tint focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:bg-brand-background disabled:text-stone-400';

function dayStyle(status, selected, isToday) {
    if (selected) return 'border-brand-primary bg-brand-primary text-brand-on-primary';
    if (status === 'calendar') return isToday ? 'border-brand-accent bg-brand-background text-brand-text' : 'border-brand-border bg-brand-surface text-brand-text hover:bg-brand-tint';
    if (status === 'available') {
        return isToday ? 'border-emerald-600 bg-emerald-50 text-emerald-900 hover:bg-emerald-100' : 'border-brand-border bg-brand-surface text-brand-text hover:border-emerald-600 hover:bg-emerald-50';
    }
    if (status === 'full') return 'cursor-not-allowed border-rose-200 bg-rose-100 text-rose-950';
    return 'cursor-not-allowed border-transparent bg-brand-background text-stone-500';
}

export default function MonthCalendar({ month, today, date, days, error, onMonthChange, onDateChange, mode = 'booking' }) {
    const booking = mode === 'booking';
    const start = civilDate(month + '-01');
    const offset = (start.getUTCDay() + 6) % 7;
    const byDate = new Map((days ?? []).map(day => [day.date, day]));
    const lastDay = new Date(start);
    lastDay.setUTCMonth(start.getUTCMonth() + 1, 0);
    const dayCount = lastDay.getUTCDate();
    const count = (days ?? []).filter(day => day.status === 'available').length;

    function navigate(delta) {
        const next = new Date(start);
        next.setUTCMonth(start.getUTCMonth() + delta);
        onMonthChange(next.toISOString().slice(0, 7));
    }

    return (
        <section aria-labelledby="booking-calendar-title" aria-busy={booking && !days && !error} className="space-y-3 rounded-2xl border border-brand-border bg-brand-background/70 p-3 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 id="booking-calendar-title" className="flex items-center gap-2 text-sm font-semibold text-brand-text">
                    <CalendarDays size={17} aria-hidden="true" /> {booking ? 'Fecha de la cita' : 'Selecciona una fecha'}
                </h2>
                {booking && days && <span className="text-xs font-medium text-brand-muted">{count} {count === 1 ? 'día disponible' : 'días disponibles'}</span>}
            </div>
            <div className="flex items-center justify-between gap-2">
                <button type="button" aria-label="Mes anterior" disabled={booking ? month <= today.slice(0, 7) : month === '0001-01'} className={arrow} onClick={() => navigate(-1)}>
                    <ChevronLeft size={18} aria-hidden="true" />
                </button>
                <p aria-live="polite" className="text-center text-base font-bold text-brand-text first-letter:uppercase">{monthFormat.format(start)}</p>
                <button type="button" aria-label="Mes siguiente" disabled={month === '9999-12'} className={arrow} onClick={() => navigate(1)}>
                    <ChevronRight size={18} aria-hidden="true" />
                </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center sm:gap-1.5">
                {dayLabels.map((label, index) => (
                    <abbr key={label} title={weekDays[index][1]} className="py-1 text-xs font-semibold text-brand-muted no-underline">{label}</abbr>
                ))}
                {Array.from({ length: offset }, (_, index) => <span key={'empty-' + index} aria-hidden="true" />)}
                {Array.from({ length: dayCount }, (_, index) => {
                    const number = index + 1;
                    const key = month + '-' + String(number).padStart(2, '0');
                    const day = byDate.get(key);
                    const status = booking ? (day?.status ?? (key < today ? 'past' : null)) : 'calendar';
                    const enabled = !booking || status === 'available';
                    const selected = key === date && enabled;
                    const description = dayStatus[status] ?? 'Disponibilidad por consultar';
                    return (
                        <button type="button" key={key} data-date={key} disabled={!enabled} aria-pressed={selected}
                            aria-label={dayFormat.format(civilDate(key)) + (booking ? ', ' + description : '')} title={booking ? description : undefined}
                            aria-current={key === today ? 'date' : undefined}
                            onClick={() => onDateChange(key)}
                            className={'relative grid h-10 place-items-center rounded-lg border pb-0.5 text-sm font-semibold tabular-nums focus-visible:outline-2 focus-visible:outline-offset-1 sm:h-11 ' + dayStyle(status, selected, key === today)}>
                            {number}
                            {status === 'available' && !selected && <span aria-hidden="true" className="absolute bottom-1 size-1 rounded-full bg-emerald-700" />}
                            {status === 'full' && <span aria-hidden="true" className="absolute bottom-1 h-0.5 w-2.5 rounded-full bg-rose-700" />}
                        </button>
                    );
                })}
            </div>

            {booking && !days && !error && <p role="status" className="text-xs text-brand-muted">Consultando disponibilidad del mes…</p>}
            {booking && days && count === 0 && <p role="status" className="text-xs text-brand-muted">No hay fechas disponibles en este mes.</p>}
            {booking && <div className="flex flex-wrap gap-x-3 gap-y-1 border-t border-brand-border pt-3 text-xs text-brand-muted">
                <span><span aria-hidden="true" className="mr-1 inline-block size-2 rounded-full bg-emerald-700" />Disponible</span>
                <span><span aria-hidden="true" className="mr-1 inline-block h-0.5 w-2.5 align-middle bg-rose-700" />Sin cupos</span>
                <span><span aria-hidden="true" className="mr-1 inline-block size-2 rounded-sm border border-brand-border bg-brand-background" />Sin atención o fecha pasada</span>
            </div>}
        </section>
    );
}
