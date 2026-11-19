'use client';

import { useEffect, useRef, useState } from 'react';
import { CalendarCheck, CalendarDays, CalendarX, Clock3, Scissors, UserRound, X } from 'lucide-react';
import { civilDate, scheduleNow } from '../config/schedule';
import { announceScheduleChange, watchSchedule } from '../utils/liveSchedule';
import MonthCalendar from './MonthCalendar';

const states = {
    PENDING: ['Pendiente', 'bg-amber-50 text-amber-900'],
    CONFIRMED: ['Confirmada', 'bg-blue-50 text-blue-800'],
    COMPLETED: ['Completada', 'bg-emerald-50 text-emerald-800'],
    CANCELLED: ['Cancelada', 'bg-rose-50 text-rose-800']
};
const roles = {
    ADMIN: 'Administrador',
    BARBER_BOSS: 'Barbero jefe',
    BARBER_AFFILIATE: 'Barbero afiliado',
    BARBER_INDEPENDENT: 'Barbero independiente',
    CLIENT: 'Cliente'
};
const dateFormat = new Intl.DateTimeFormat('es-CO', { dateStyle: 'full', timeZone: 'UTC' });
const instantFormat = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota' });
const selectStyle = 'min-h-11 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 text-sm text-stone-900 focus-visible:outline-2 focus-visible:outline-offset-2';

function statusLabel(state) {
    const [label, color] = states[state];
    return <span className={'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ' + color}>{label}</span>;
}

function Cancellation({ data }) {
    return (
        <div className="rounded-xl bg-rose-50 px-3 py-2.5 text-xs text-rose-950">
            <p><span className="font-semibold">Canceló</span> {data?.actorName || 'Autor desconocido'}
                {data?.actorRole && ' · ' + (roles[data.actorRole] ?? data.actorRole)}</p>
            {data?.changedAt && <time dateTime={data.changedAt}>{instantFormat.format(new Date(data.changedAt))}</time>}
        </div>
    );
}

function Avatar({ appointment }) {
    const initials = appointment.barberName.trim().split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase();
    return <span aria-hidden="true" className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-stone-100 text-xs font-semibold text-stone-700">
        {initials || <UserRound size={17} />}
        {appointment.barberPhoto && (
            // El perfil admite enlaces externos e imágenes pegadas.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={appointment.barberPhoto} alt="" className="absolute inset-0 h-full w-full object-cover" onError={event => { event.currentTarget.hidden = true; }} />
        )}
    </span>;
}

function AppointmentCard({ appointment, onOpen }) {
    return (
        <article className="relative grid gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm focus-within:ring-2 focus-within:ring-stone-800">
            <div className="flex items-start justify-between gap-2">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-stone-950"><Clock3 size={15} aria-hidden="true" /> {appointment.timeSlot}</p>
                {statusLabel(appointment.state)}
            </div>
            <div>
                <h3 className="wrap-break-word font-bold text-stone-950">{appointment.clientName}</h3>
                <p className="flex items-center gap-1.5 text-sm text-stone-700"><Scissors size={15} aria-hidden="true" /> {appointment.serviceName}</p>
            </div>
            <div className="flex items-center gap-2 border-t border-stone-100 pt-3">
                <Avatar appointment={appointment} />
                <div className="min-w-0 text-xs text-stone-600">
                    <p className="truncate font-semibold text-stone-900">{appointment.barberName}</p>
                    <p>{dateFormat.format(new Date(appointment.date))}</p>
                </div>
            </div>
            {appointment.state === 'CANCELLED' && <Cancellation data={appointment.cancellation} />}
            <button type="button" onClick={onOpen} aria-label={'Abrir cita de ' + appointment.clientName + ' a las ' + appointment.timeSlot}
                className="absolute inset-0 cursor-pointer rounded-2xl focus:outline-none hover:ring-1 hover:ring-stone-400" />
        </article>
    );
}

function AppointmentDialog({ appointment, onClose, onCancel, busy, error }) {
    const dialog = useRef(null);

    useEffect(() => {
        const element = dialog.current;
        element.showModal();
        return () => { if (element.open) element.close(); };
    }, []);

    const cancellable = ['PENDING', 'CONFIRMED'].includes(appointment.state);

    return (
        <dialog ref={dialog} aria-labelledby="appointment-dialog-title" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}
            className="m-auto w-[calc(100%-2rem)] max-w-md rounded-3xl border border-stone-200 bg-white p-5 shadow-xl backdrop:bg-black/55 sm:p-6">
            <header className="mb-4 flex items-start justify-between gap-3">
                <div>
                    <h2 id="appointment-dialog-title" className="text-xl font-bold text-stone-950">{appointment.clientName}</h2>
                    <p className="mt-1">{statusLabel(appointment.state)}</p>
                </div>
                <button type="button" aria-label="Cerrar detalle" disabled={busy} onClick={onClose} className="rounded-lg bg-stone-100 p-2 text-stone-800 hover:bg-stone-200"><X size={18} /></button>
            </header>
            <dl className="grid gap-2 rounded-xl bg-stone-50 p-4 text-sm">
                <div className="flex justify-between gap-3"><dt className="text-stone-600">Servicio</dt><dd className="text-right font-semibold">{appointment.serviceName}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-stone-600">Barbero</dt><dd className="text-right font-semibold">{appointment.barberName}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-stone-600">Fecha</dt><dd className="text-right font-semibold">{dateFormat.format(new Date(appointment.date))}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-stone-600">Hora</dt><dd className="text-right font-semibold">{appointment.timeSlot}</dd></div>
            </dl>
            <div className="mt-4 space-y-3">
                {appointment.state === 'CANCELLED' && <Cancellation data={appointment.cancellation} />}
                {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-900">{error}</p>}
                {cancellable && <button type="button" disabled={busy} onClick={onCancel}
                    className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-rose-700 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-50">
                    <CalendarX size={17} /> {busy ? 'Cancelando…' : 'Cancelar cita'}
                </button>}
                <button type="button" disabled={busy} onClick={onClose} className="min-h-11 w-full rounded-xl border border-stone-200 text-sm font-semibold text-stone-900 hover:bg-stone-100">Cerrar</button>
            </div>
        </dialog>
    );
}

function filterOptions(appointments, idField, nameField) {
    return [...new Map(appointments.map(item => [item[idField], item[nameField]]))]
        .sort((a, b) => a[1].localeCompare(b[1], 'es-CO'));
}

export default function AppointmentBoard({ mode, initialDate }) {
    const daily = mode === 'today';
    const [businessDay, setBusinessDay] = useState(initialDate);
    const [selectedDate, setSelectedDate] = useState(initialDate);
    const [month, setMonth] = useState(initialDate.slice(0, 7));
    const [snapshot, setSnapshot] = useState(null);
    const [barberFilter, setBarberFilter] = useState('');
    const [serviceFilter, setServiceFilter] = useState('');
    const [openId, setOpenId] = useState('');
    const [busy, setBusy] = useState(false);
    const [dialogError, setDialogError] = useState('');
    const date = daily ? businessDay : selectedDate;
    const current = snapshot?.date === date ? snapshot : null;
    const appointments = current?.appointments ?? [];
    const selected = appointments.find(item => item.id === openId);
    const barbers = filterOptions(appointments, 'barberId', 'barberName');
    const services = filterOptions(appointments, 'serviceId', 'serviceName');
    const visible = appointments.filter(item => (!barberFilter || item.barberId === barberFilter) &&
        (!serviceFilter || item.serviceId === serviceFilter));
    const Icon = daily ? CalendarCheck : CalendarDays;

    useEffect(() => {
        if (busy) return;
        return watchSchedule(async signal => {
            const [today] = scheduleNow();
            const queryDate = daily ? today : date;
            try {
                const res = await fetch('/api/appointments?view=team&date=' + encodeURIComponent(queryDate), { signal, cache: 'no-store' });
                const data = await res.json();
                if (!signal.aborted) {
                    setBusinessDay(today);
                    if (!res.ok) setSnapshot(previous => ({ date: queryDate, appointments: previous?.date === queryDate ? previous.appointments : [], error: data.error }));
                    else setSnapshot({ date: queryDate, appointments: data.appointments });
                }
            } catch {
                if (!signal.aborted) {
                    setBusinessDay(today);
                    setSnapshot(previous => ({ date: queryDate, appointments: previous?.date === queryDate ? previous.appointments : [], error: 'No pudimos consultar las citas. Volveremos a intentarlo.' }));
                }
            }
        });
    }, [busy, daily, date]);

    function changeDate(next) {
        setSelectedDate(next);
        setBarberFilter('');
        setServiceFilter('');
        setOpenId('');
    }

    async function cancel() {
        if (busy || !selected || !window.confirm('¿Cancelar la cita de ' + selected.clientName + '?')) return;
        setBusy(true);
        setDialogError('');
        try {
            const res = await fetch('/api/appointments/' + selected.id, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ state: 'CANCELLED' })
            });
            const data = await res.json();
            if (!res.ok) {
                setDialogError(data.error || 'No se pudo cancelar la cita.');
                return;
            }
            setSnapshot(previous => previous && ({
                ...previous,
                appointments: previous.appointments.map(item => item.id === selected.id
                    ? { ...item, state: data.appointment.state, cancellation: data.appointment.cancellation } : item)
            }));
            announceScheduleChange();
        } catch {
            setDialogError('No se pudo cancelar la cita. Revisa su estado antes de reintentar.');
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="mx-auto max-w-6xl space-y-5 pb-12">
            <header className="flex items-center gap-3 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
                <span className="shrink-0 rounded-xl bg-brand-primary p-3 text-brand-on-primary"><Icon size={22} aria-hidden="true" /></span>
                <div>
                    <h1 className="text-2xl font-bold text-stone-950">{daily ? 'Reservas Día' : 'Calendario'}</h1>
                    <p className="text-sm text-stone-600">{daily ? 'Consulta las citas de hoy.' : 'Selecciona un día para consultar sus citas.'}</p>
                </div>
            </header>

            <div className={!daily ? 'grid items-start gap-5 xl:grid-cols-[20rem_minmax(0,1fr)]' : ''}>
                {!daily && <MonthCalendar mode="appointments" month={month} today={businessDay} date={date} onMonthChange={setMonth} onDateChange={changeDate} />}
                <section aria-labelledby="appointment-list-title" className="min-w-0 space-y-4 rounded-3xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
                    <div className="flex flex-wrap items-end justify-between gap-2">
                        <h2 id="appointment-list-title" className="font-bold text-stone-950 first-letter:uppercase">{dateFormat.format(civilDate(date))}</h2>
                        {current && !current.error && <span className="text-xs text-stone-600">{visible.length} {visible.length === 1 ? 'cita' : 'citas'}</span>}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <label className="space-y-1 text-sm font-semibold text-stone-700">
                            Barbero <select value={barberFilter} onChange={event => setBarberFilter(event.target.value)} className={selectStyle}>
                                <option value="">Todos los barberos</option>
                                {barbers.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                            </select>
                        </label>
                        <label className="space-y-1 text-sm font-semibold text-stone-700">
                            Servicio <select value={serviceFilter} onChange={event => setServiceFilter(event.target.value)} className={selectStyle}>
                                <option value="">Todos los servicios</option>
                                {services.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                            </select>
                        </label>
                    </div>
                    {!current && <p role="status" className="rounded-xl bg-stone-50 p-4 text-sm text-stone-700">Consultando citas…</p>}
                    {current?.error && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-900">{current.error}</p>}
                    {current && !current.error && visible.length === 0 && <p className="rounded-xl bg-stone-50 p-4 text-sm text-stone-700">
                        {appointments.length ? 'Ninguna cita coincide con los filtros.' : 'No hay citas para esta fecha.'}
                    </p>}
                    {visible.length > 0 && <div className="grid gap-3 lg:grid-cols-2">
                        {visible.map(item => <AppointmentCard key={item.id} appointment={item} onOpen={() => { setOpenId(item.id); setDialogError(''); }} />)}
                    </div>}
                </section>
            </div>

            {selected && <AppointmentDialog appointment={selected} busy={busy} error={dialogError} onClose={() => setOpenId('')} onCancel={cancel} />}
        </div>
    );
}
