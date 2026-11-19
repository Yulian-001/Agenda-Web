'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, CalendarDays, Check, Clock3, Copy, RotateCcw, UserRound, UsersRound } from 'lucide-react';
import { weekDays } from '../../../config/schedule';
import { teamBarberRoles } from '../../../config/barberRoles';
import { announceScheduleChange, watchSchedule } from '../../../utils/liveSchedule';

const buttonStyle = 'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-blue-400 disabled:opacity-50';
const emptyDailyDraft = { hours: {} };

function weeklySlots(weekly, draft, day) {
    const saved = weekly.days.find(row => row.day === day).slots;
    const extra = Object.keys(draft[day] ?? {}).filter(timeSlot => !saved.some(slot => slot.timeSlot === timeSlot));
    return [...saved, ...extra.map(timeSlot => ({ timeSlot, isActive: false }))]
        .sort((a, b) => a.timeSlot.localeCompare(b.timeSlot));
}

async function request(url, options) {
    const response = await fetch(url, options);
    const data = await response.json();
    if (!response.ok) return { error: data.error ?? 'No se pudo completar el cambio.', conflicts: data.conflicts };
    return data;
}

function modeStyle(selected) {
    return 'flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold ' +
        (selected ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-700 hover:bg-white/60');
}

function slotStyle(active) {
    if (active === true) return 'border-blue-400 bg-blue-600 text-white hover:bg-blue-500';
    if (active === null) return 'border-amber-400/80 bg-amber-500/15 text-amber-100 hover:bg-amber-500/25';
    return 'border-slate-600 bg-slate-800 text-slate-200 hover:border-slate-400';
}

function conflictDate(date) {
    return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeZone: 'UTC' })
        .format(new Date(date + 'T00:00:00Z'));
}

export default function ScheduleEditor({ initialSchedule, today, initialDay }) {
    const [weekly, setWeekly] = useState(initialSchedule);
    const [daily, setDaily] = useState(null);
    const [mode, setMode] = useState('weekly');
    const [day, setDay] = useState(initialDay);
    const [barber, setBarber] = useState(initialSchedule.members[0]?.id ?? '');
    const [date, setDate] = useState(today);
    const [weeklyDraft, setWeeklyDraft] = useState({});
    const [dailyDraft, setDailyDraft] = useState(emptyDailyDraft);
    const [loadingError, setLoadingError] = useState('');
    const [loadAttempt, setLoadAttempt] = useState(0);
    const [copyOpen, setCopyOpen] = useState(false);
    const [copyTargets, setCopyTargets] = useState([]);
    const [copyNotice, setCopyNotice] = useState('');
    const [result, setResult] = useState(null);
    const [saving, setSaving] = useState(false);
    const general = mode === 'weekly';
    const member = weekly.members.find(person => person.id === barber);
    const target = member && date ? '/api/schedule/' + barber : '';
    const query = target ? target + '?date=' + date : '';
    const currentDate = daily?.query === query ? daily.schedule : null;
    const weekChanges = Object.entries(weeklyDraft).flatMap(([weekday, hours]) =>
        Object.entries(hours).map(([timeSlot, isActive]) => ({ day: weekday, timeSlot, isActive }))
    );
    const dateHasChanges = dailyDraft.wholeDay !== undefined || Object.keys(dailyDraft.hours).length > 0;
    const dirty = general ? weekChanges.length > 0 : dateHasChanges;
    const slots = general ? weeklySlots(weekly, weeklyDraft, day) : (currentDate?.slots ?? []);

    useEffect(() => {
        if (saving || (!general && !query)) return;
        return watchSchedule(async signal => {
            try {
                const data = await request(general ? '/api/schedule' : query, { signal, cache: 'no-store' });
                if (signal.aborted) return;
                if (data.error) setLoadingError(data.error);
                else {
                    if (general) setWeekly(data);
                    else setDaily({ query, schedule: data });
                    setLoadingError('');
                }
            } catch {
                if (!signal.aborted) setLoadingError('No se pudo cargar el horario.');
            }
        });
    }, [general, query, loadAttempt, saving]);

    function changeTarget(setter, value) {
        if (dateHasChanges && !window.confirm('¿Descartar los ajustes individuales pendientes?')) return;
        setter(value);
        setDailyDraft(emptyDailyDraft);
        setLoadingError('');
        setResult(null);
    }

    function statusFor(slot) {
        if (general) return weeklyDraft[day]?.[slot.timeSlot] ?? slot.isActive;
        if (Object.hasOwn(dailyDraft.hours, slot.timeSlot)) return dailyDraft.hours[slot.timeSlot];
        if (dailyDraft.wholeDay === null) return slot.weeklyActive;
        return dailyDraft.wholeDay ?? slot.isActive;
    }

    function setWeeklySlots(dayChanges) {
        setWeeklyDraft(previous => {
            const next = { ...previous };
            for (const [weekday, changes] of dayChanges) {
                const hours = { ...previous[weekday] };
                for (const [slot, active] of changes) {
                    if (active === slot.isActive) delete hours[slot.timeSlot];
                    else hours[slot.timeSlot] = active;
                }
                next[weekday] = hours;
            }
            return next;
        });
        setResult(null);
    }

    function copyHours() {
        const from = new Map(slots.map(slot => [slot.timeSlot, statusFor(slot)]));
        setWeeklySlots(copyTargets.map(weekday => {
            const destination = weeklySlots(weekly, weeklyDraft, weekday);
            const hours = new Map(destination.map(slot => [slot.timeSlot, slot]));
            for (const timeSlot of from.keys()) {
                if (!hours.has(timeSlot)) hours.set(timeSlot, { timeSlot, isActive: false });
            }
            return [weekday, [...hours.values()].filter(slot => from.get(slot.timeSlot) !== null)
                .map(slot => [slot, from.get(slot.timeSlot) ?? false])];
        }));
        setCopyNotice(`Horario de ${dayLabel} copiado al borrador de ${copyTargets.length} días.`);
        setCopyOpen(false);
        setCopyTargets([]);
    }

    function setDayAvailability(active) {
        if (general) setWeeklySlots([[day, slots.map(slot => [slot, active])]]);
        else setDailyDraft({ wholeDay: active, hours: {} });
        setResult(null);
    }

    function toggleSlot(slot) {
        const active = statusFor(slot) !== true;
        if (general) setWeeklySlots([[day, [[slot, active]]]]);
        else setDailyDraft(previous => ({ ...previous, hours: { ...previous.hours, [slot.timeSlot]: active } }));
        setResult(null);
    }

    async function save() {
        if (!dirty || saving) return;
        setSaving(true);
        setResult(null);
        try {
            const data = await request(general ? '/api/schedule' : target, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(general ? { changes: weekChanges } : { date, ...dailyDraft })
            });
            if (data.schedule && general) {
                setWeekly(data.schedule);
                setWeeklyDraft({});
                setDaily(null);
            } else if (data.schedule) {
                setDaily({ query, schedule: data.schedule });
                setDailyDraft(emptyDailyDraft);
            }
            if (data.schedule) {
                setCopyNotice('');
                announceScheduleChange();
            }
            setResult(data);
        } catch {
            setResult({ error: 'No se pudo guardar la agenda. Intenta de nuevo.' });
        } finally {
            setSaving(false);
        }
    }

    const available = slots.filter(slot => statusFor(slot) === true).length;
    const canEdit = weekly.members.length > 0 && (general || Boolean(currentDate));
    const dayLabel = weekDays.find(([value]) => value === day)[1];

    return (
        <div className="mx-auto max-w-5xl space-y-5 pb-12">
            <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                <div className="flex items-center gap-3 sm:gap-4">
                    <span className="rounded-xl bg-brand-primary p-3 text-brand-on-primary"><CalendarDays size={22} /></span>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-950">Agenda</h1>
                        <p className="mt-1 text-sm text-slate-600">Configura los días y las horas de atención.</p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1" aria-label="Tipo de agenda">
                    <button type="button" disabled={saving} aria-pressed={general} className={modeStyle(general)}
                        onClick={() => { setMode('weekly'); setResult(null); }}><UsersRound size={17} /> General</button>
                    <button type="button" disabled={saving} aria-pressed={!general} className={modeStyle(!general)}
                        onClick={() => { setMode('individual'); setLoadingError(''); setResult(null); }}><UserRound size={17} /> Individual</button>
                </div>
            </header>

            <fieldset disabled={saving} className="min-w-0 space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                {general ? (
                    <div className="space-y-4">
                        <div>
                            <h2 className="font-bold text-slate-950">Horario semanal del equipo</h2>
                            <p className="text-sm text-slate-600">Edita un día y copia sus horas donde quieras repetirlas. Guarda la semana cuando termines de ajustar cada día.</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7" aria-label="Días de la semana">
                            {weekDays.map(([value, label]) => {
                                const hours = weeklySlots(weekly, weeklyDraft, value).filter(slot =>
                                    (weeklyDraft[value]?.[slot.timeSlot] ?? slot.isActive) !== false
                                ).length;
                                return <button type="button" key={value} aria-pressed={day === value} aria-label={label}
                                    onClick={() => { setDay(value); setResult(null); setCopyOpen(false); setCopyTargets([]); }}
                                    className={'rounded-xl border px-2 py-2.5 text-sm font-semibold ' +
                                        (day === value ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50')}>
                                    {label}
                                    {Object.keys(weeklyDraft[value] ?? {}).length > 0 && <span className="ml-1 text-blue-600" aria-label="Cambios pendientes">●</span>}
                                    <span className="mt-0.5 block text-xs font-normal text-slate-600">{hours ? hours + ' franjas' : 'Cerrado'}</span>
                                </button>;
                            })}
                        </div>
                        <p className="text-xs text-slate-500">{weekly.members.length} afiliados y jefes · Las excepciones por fecha tienen prioridad.</p>
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="space-y-1 text-sm font-semibold text-slate-800">
                            <span>Barbero</span>
                            <select className="block w-full rounded-xl border border-slate-200 bg-white p-3" value={barber}
                                onChange={event => changeTarget(setBarber, event.target.value)} disabled={!weekly.members.length}>
                                {weekly.members.map(person => <option key={person.id} value={person.id}>{person.name} · {teamBarberRoles[person.role]}{person.state ? '' : ' (inactivo)'}</option>)}
                            </select>
                        </label>
                        <label className="space-y-1 text-sm font-semibold text-slate-800">
                            <span>Fecha</span>
                            <input type="date" min={today} value={date} className="block w-full rounded-xl border border-slate-200 bg-white p-3"
                                onChange={event => changeTarget(setDate, event.target.value)} />
                        </label>
                    </div>
                )}

                {!weekly.members.length && <p className="rounded-xl bg-slate-100 p-4 text-sm text-slate-700">Agrega un barbero afiliado o jefe para configurar la agenda.</p>}
                {!general && weekly.members.length > 0 && !date && <p className="text-sm text-slate-700">Selecciona una fecha.</p>}
                {!general && query && !currentDate && !loadingError && <p role="status" className="text-sm text-slate-700">Cargando horario…</p>}
                {loadingError && <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-red-700">
                    {loadingError}
                    <button type="button" className={buttonStyle} onClick={() => { setLoadingError(''); setLoadAttempt(count => count + 1); }}>Reintentar</button>
                </div>}

                {canEdit && <>
                    <div className="flex flex-wrap gap-2">
                        <button type="button" className={buttonStyle} onClick={() => setDayAvailability(true)}>Activar día</button>
                        <button type="button" className={buttonStyle} onClick={() => setDayAvailability(false)}>Desactivar día</button>
                        {general && <button type="button" className={buttonStyle} aria-expanded={copyOpen}
                            onClick={() => { setCopyOpen(value => !value); setCopyNotice(''); }}>
                            <Copy size={15} className="mr-1 inline" /> Copiar horario
                        </button>}
                        {!general && (currentDate.hasException || dateHasChanges) &&
                            <button type="button" className={buttonStyle} onClick={() => setDayAvailability(null)}>Restaurar horario semanal</button>}
                    </div>
                    {general && copyOpen && (
                        <fieldset className="space-y-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
                            <legend className="px-1 text-sm font-semibold text-blue-950">Copiar horario de {dayLabel}</legend>
                            <p className="text-sm text-blue-950">Se reemplaza el horario de los días seleccionados en el borrador. Las horas que varían por barbero mantienen su ajuste.</p>
                            <div className="flex flex-wrap gap-2">
                                {weekDays.filter(([value]) => value !== day).map(([value, label]) =>
                                    <label key={value} className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm text-slate-800">
                                        <input type="checkbox" checked={copyTargets.includes(value)} onChange={event => {
                                            const checked = event.target.checked;
                                            setCopyTargets(previous => checked ? [...previous, value] : previous.filter(target => target !== value));
                                        }} /> {label}
                                    </label>
                                )}
                            </div>
                            <button type="button" className={buttonStyle}
                                onClick={() => setCopyTargets(weekDays.filter(([value]) => value !== day).map(([value]) => value))}>Seleccionar todos</button>
                            <button type="button" className={buttonStyle + ' ml-2'} disabled={!copyTargets.length} onClick={copyHours}>Aplicar al borrador</button>
                        </fieldset>
                    )}
                    {general && dirty && copyNotice && <p role="status" className="rounded-xl bg-blue-50 p-3 text-sm text-blue-900">{copyNotice}</p>}
                    <section className="space-y-4 rounded-2xl bg-slate-950 p-4 text-white sm:p-5" aria-label="Franjas de atención">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <h3 className="flex items-center gap-2 text-sm font-semibold"><Clock3 size={17} /> {general ? dayLabel : conflictDate(date)}</h3>
                            <span className="text-xs text-slate-300">{available} de {slots.length} horas activas</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 min-[430px]:grid-cols-4 sm:grid-cols-5 xl:grid-cols-8">
                            {slots.map(slot => {
                                const active = statusFor(slot);
                                const exception = !general && (Object.hasOwn(dailyDraft.hours, slot.timeSlot) ||
                                    (dailyDraft.wholeDay === undefined ? slot.isException : dailyDraft.wholeDay !== null));
                                return <button type="button" key={slot.timeSlot} aria-pressed={active === null ? 'mixed' : active}
                                    onClick={() => toggleSlot(slot)}
                                    className={'rounded-lg border px-2 py-2 text-sm font-semibold tabular-nums ' + slotStyle(active)}>
                                    {slot.timeSlot}
                                    {!general && <span className="block text-[10px] font-normal opacity-90">{exception ? 'Excepción' : 'Semanal'}</span>}
                                </button>;
                            })}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-300">
                            <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-blue-400" /> Activa</span>
                            <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-slate-500" /> Inactiva</span>
                            {general && <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-amber-400" /> Varía por barbero</span>}
                        </div>
                    </section>
                </>}

                {result?.error && <div role="alert" className="space-y-2 rounded-xl bg-red-50 p-4 text-sm text-red-800">
                    <p className="flex items-start gap-2"><AlertCircle size={17} className="shrink-0" /> {result.error}</p>
                    {result.conflicts?.length > 0 && <ul className="list-disc space-y-1 pl-6">
                        {result.conflicts.map(conflict => <li key={conflict.id}>{conflict.barberName} · {conflictDate(conflict.date)} · {conflict.timeSlot}</li>)}
                    </ul>}
                </div>}
                {result?.message && <p role="status" className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800"><Check size={17} /> {result.message}</p>}

                <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                    <p className="text-sm text-slate-600">{general
                        ? (dirty ? weekChanges.length + ' franjas por guardar en el horario semanal.' : 'Selecciona las horas que quieras cambiar.')
                        : (member && date ? 'Solo afecta a ' + member.name + ' el ' + conflictDate(date) + '.' : 'Selecciona un barbero y una fecha.')}</p>
                    <div className="flex flex-wrap items-center gap-2">
                        {dirty && <button type="button" className={buttonStyle} onClick={() => {
                            if (general) {
                                setWeeklyDraft({});
                                setCopyNotice('');
                            } else setDailyDraft(emptyDailyDraft);
                            setResult(null);
                        }}><RotateCcw size={15} className="mr-1 inline" /> Descartar</button>}
                        <button type="button" onClick={save} disabled={!dirty || !canEdit || saving}
                            className="rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-semibold text-brand-on-primary hover:bg-brand-primary-hover disabled:opacity-50">
                            {saving ? 'Guardando…' : general ? 'Guardar horario semanal' : 'Guardar excepción'}
                        </button>
                    </div>
                </footer>
            </fieldset>
        </div>
    );
}
