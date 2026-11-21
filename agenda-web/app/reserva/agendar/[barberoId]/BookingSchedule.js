'use client';

import { useEffect, useRef, useState } from 'react';
import BrandLogo from '../../../../components/BrandLogo';
import Link from 'next/link';
import { ArrowLeft, CalendarDays, Check, Clock3, Lock, Scissors, UserRound } from 'lucide-react';
import { announceScheduleChange, watchSchedule } from '../../../../utils/liveSchedule';
import celebration from './BookingCelebration.module.css';
import MonthCalendar from '../../../../components/MonthCalendar';

const inputStyle = 'min-h-12 w-full rounded-xl border border-brand-border bg-brand-background px-4 py-3 text-base text-brand-text focus-visible:border-brand-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/55';
const primaryButton = 'flex min-h-12 items-center justify-center rounded-xl bg-brand-primary px-4 py-3 text-center text-sm font-semibold text-brand-on-primary hover:bg-brand-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-brand-muted';
const secondaryButton = 'flex min-h-12 items-center justify-center rounded-xl border border-brand-border bg-brand-surface px-4 py-3 text-center text-sm font-semibold text-brand-text hover:bg-brand-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent disabled:opacity-50';

const dateFormat = new Intl.DateTimeFormat('es-CO', { dateStyle: 'full', timeZone: 'UTC' });
const priceFormat = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 });

function BookingSummary({ selection, date, time, customer, price = selection.service.price }) {
    const rows = [
        { label: 'Servicio', icon: Scissors, value: selection.service.name, detail: selection.service.duration + ' min' },
        { label: 'Barbero', icon: UserRound, value: selection.barber.name },
        { label: 'Fecha', icon: CalendarDays, value: dateFormat.format(new Date(date + 'T00:00:00Z')), dateTime: date },
        { label: 'Hora', icon: Clock3, value: time, dateTime: time }
    ];
    if (customer) rows.push({ label: 'Cliente', icon: UserRound, value: customer });

    return (
        <section aria-labelledby="booking-summary-title" className="rounded-2xl border border-brand-border bg-brand-background px-4 py-4 sm:px-5">
            <h2 id="booking-summary-title" className="mb-3 text-sm font-semibold text-brand-text">Resumen de tu cita</h2>
            <dl className="grid gap-3">
                {rows.map(({ label, icon: Icon, value, detail, dateTime }) => (
                    <div key={label} className="flex items-center gap-3 text-sm">
                        <dt className="flex w-22 shrink-0 items-center gap-3 text-brand-muted"><Icon aria-hidden="true" size={17} className="shrink-0" /> {label}</dt>
                        <dd className="min-w-0 flex-1 wrap-break-word font-semibold text-brand-text">
                            {dateTime ? <time dateTime={dateTime}>{value}</time> : value}
                            {detail && <span className="ml-2 whitespace-nowrap text-xs font-normal text-brand-muted">{detail}</span>}
                        </dd>
                    </div>
                ))}
                <div className="mt-0.5 flex items-center justify-between gap-3 border-t border-brand-border pt-3 text-sm">
                    <dt className="text-brand-muted">Precio</dt>
                    <dd className="font-semibold text-brand-text">{priceFormat.format(price)}</dd>
                </div>
            </dl>
        </section>
    );
}

function BookingCelebration() {
    const sparks = [[15, 73], [62, 66], [111, 70], [156, 76], [203, 68], [254, 72], [302, 78], [337, 68]];
    return (
        <div className={celebration.celebration} aria-hidden="true">
            <span className={celebration.orbit} />
            <span className={celebration.medallion}><Check size={36} strokeWidth={2.5} /></span>
            {sparks.map(([angle, distance]) => <i key={angle} className={celebration.spark}
                style={{ '--angle': angle + 'deg', '--distance': distance + 'px' }} />)}
        </div>
    );
}

export default function BookingSchedule({ barberId, serviceId, selection, today }) {
    const [month, setMonth] = useState(today.slice(0, 7));
    const [date, setDate] = useState('');
    const [chosen, setChosen] = useState('');
    const [response, setResponse] = useState(null);
    const [reviewing, setReviewing] = useState(false);
    const [clientName, setClientName] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [clientEmail, setClientEmail] = useState('');
    const [error, setError] = useState('');
    const [sending, setSending] = useState(false);
    const [receipt, setReceipt] = useState(null);
    const [confirmCancel, setConfirmCancel] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const heading = useRef(null);
    const headingPending = useRef(false);
    const calendar = response?.month === month ? response : null;
    const active = calendar?.selectedDay?.date === date ? calendar.selectedDay : null;
    const slots = active?.slots ?? [];
    const selected = slots.some(slot => slot.timeSlot === chosen && !slot.occupied) ? chosen : '';
    const lostSelection = Boolean(chosen && active?.slots && !selected);
    const unavailableDay = Boolean(active && active.status !== 'available');
    const back = selection ? '/reserva/' + encodeURIComponent(serviceId) : '/reserva';

    useEffect(() => {
        if (!headingPending.current) return;
        headingPending.current = false;
        heading.current?.focus();
    }, [reviewing, receipt]);

    useEffect(() => {
        if (!selection || receipt) return;
        const query = new URLSearchParams({ barberId, month, serviceId });
        if (date) query.set('date', date);
        return watchSchedule(async signal => {
            try {
                const res = await fetch('/api/public/availability?' + query.toString(), { signal, cache: 'no-store' });
                const data = await res.json();
                if (!signal.aborted) {
                    setResponse(res.ok ? data : { month, error: data.error, code: data.code });
                }
            } catch {
                if (!signal.aborted) setResponse({ month, error: 'No se pudo consultar la disponibilidad.' });
            }
        });
    }, [date, month, serviceId, barberId, selection, receipt, attempt]);

    function review(next) {
        headingPending.current = true;
        if (!next && lostSelection) setChosen('');
        setReviewing(next);
        setError('');
    }

    function selectDate(next) {
        setDate(next);
        setChosen('');
        setError('');
    }

    function changeMonth(next) {
        setMonth(next);
        selectDate('');
    }

    async function reserve(event) {
        event.preventDefault();
        if (!selected || sending) return;
        setSending(true);
        setError('');
        try {
            const res = await fetch('/api/appointments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    barberId, serviceId, date, timeSlot: selected,
                    clientName: clientName.trim(), clientPhone: clientPhone.trim(), clientEmail: clientEmail.trim()
                })
            });
            const data = await res.json();
            if (!res.ok) {
                if (data.code === 'SELECTION_UNAVAILABLE') setResponse({ month, error: data.error, code: data.code });
                const fieldError = Object.values(data.details ?? {}).find(field => field?._errors?.length);
                setError(fieldError?._errors[0] || data.error || 'No se pudo agendar la cita.');
                setAttempt(value => value + 1);
                return;
            }

            headingPending.current = true;
            setReceipt({
                id: data.appointment.id, status: data.appointment.state, date: data.appointment.date.slice(0, 10),
                time: data.appointment.timeSlot, price: data.appointment.priceAtBooking, customer: clientName.trim()
            });
            announceScheduleChange();
        } catch {
            setError('No se pudo confirmar la cita. Revisa la disponibilidad antes de reintentar.');
            setAttempt(value => value + 1);
        } finally {
            setSending(false);
        }
    }

    async function cancelReservation() {
        if (sending) return;
        setSending(true);
        setError('');
        try {
            const response = await fetch('/api/public/appointments/' + encodeURIComponent(receipt.id) + '/cancel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clientPhone: clientPhone.trim() })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'No se pudo cancelar la reserva.');
            headingPending.current = true;
            setReceipt({ ...receipt, status: 'CANCELLED', cancellationMessage: data.message });
            announceScheduleChange();
        } catch (failure) {
            setError(failure.message);
        } finally {
            setSending(false);
        }
    }

    return (
        <main className="min-h-screen bg-brand-background px-4 py-6 sm:py-10">
            <div className="relative mx-auto max-w-lg space-y-6 rounded-[1.75rem] border border-brand-border bg-brand-surface p-5 shadow-sm sm:p-8">
                {!receipt && (reviewing
                    ? <button type="button" disabled={sending} onClick={() => review(false)} aria-label="Volver a fecha y hora"
                        className="absolute left-5 top-5 rounded-xl bg-brand-background p-2.5 text-brand-text hover:bg-brand-tint sm:left-8 sm:top-8"><ArrowLeft size={19} /></button>
                    : <Link href={back} aria-label={selection ? 'Volver a elegir barbero' : 'Volver a servicios'} className="absolute left-5 top-5 rounded-xl bg-brand-background p-2.5 text-brand-text hover:bg-brand-tint sm:left-8 sm:top-8"><ArrowLeft size={19} /></Link>)}
                <header className="flex flex-col items-center gap-3 text-center">
                    <BrandLogo size={68} eager />
                    {receipt && receipt.status !== 'CANCELLED' && <BookingCelebration />}
                    <h1 ref={heading} tabIndex={-1} className="text-2xl font-bold tracking-tight text-brand-text focus:outline-none">
                        {receipt ? (receipt.status === 'CANCELLED' ? 'Reserva cancelada' : 'Reserva registrada') : reviewing ? 'Confirma tu reserva' : 'Selecciona fecha y hora'}
                    </h1>
                    <p className="text-sm text-brand-muted">
                        {receipt ? (receipt.status === 'PENDING' ? 'Tu cita quedó pendiente de confirmación.' : receipt.cancellationMessage ?? 'Guardamos los datos de tu cita.')
                            : reviewing ? 'Revisa los datos de tu cita antes de confirmar.'
                            : selection ? selection.service.name + ' · ' + selection.barber.name : 'Elige un servicio y un barbero para continuar.'}
                    </p>
                </header>

                {receipt ? (
                    <>
                        <BookingSummary selection={selection} date={receipt.date} time={receipt.time} price={receipt.price} customer={receipt.customer} />
                        <p className="text-center text-xs text-brand-muted">Referencia <span className="block break-all font-mono text-brand-text sm:inline">{receipt.id}</span></p>
                        <div className="grid gap-2.5 sm:grid-cols-2">
                            <Link href="/reserva" className={primaryButton}>Hacer otra reserva</Link>
                            <Link href="/" className={secondaryButton}>Ir al inicio</Link>
                        </div>
                        {['PENDING', 'CONFIRMED'].includes(receipt.status) && (confirmCancel ?
                            <div className="space-y-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-950">
                                <p>Si cancelas con menos de 12 horas de anticipación, se registrará una falta. Las faltas reiteradas pueden bloquear futuras reservas.</p>
                                <div className="flex flex-wrap gap-3">
                                    <button type="button" disabled={sending} onClick={() => setConfirmCancel(false)} className="font-semibold underline">Conservar reserva</button>
                                    <button type="button" disabled={sending} onClick={cancelReservation} className="rounded-lg bg-rose-800 px-3 py-2 font-semibold text-white disabled:opacity-50">
                                        {sending ? 'Cancelando…' : 'Confirmar cancelación'}
                                    </button>
                                </div>
                            </div> :
                            <button type="button" onClick={() => setConfirmCancel(true)} className="mx-auto block text-sm font-semibold text-rose-800 underline">Cancelar esta reserva</button>)}
                        {error && <p role="alert" className="text-sm text-rose-800">{error}</p>}
                    </>
                ) : !selection ? (
                    <p className="rounded-2xl bg-brand-background p-4 text-sm text-brand-muted">
                        {serviceId ? 'Esta combinación de servicio y barbero ya no está disponible. ' : ''}
                        <Link href={back} className="font-semibold underline">Volver a la selección</Link>.
                    </p>
                ) : reviewing ? (
                    <>
                        <BookingSummary selection={selection} date={date} time={chosen} />
                        <form onSubmit={reserve} className="space-y-4">
                            <label className="block space-y-1.5 text-sm font-semibold text-brand-text">
                                <span>Nombre completo</span>
                                <input className={inputStyle} name="clientName" autoComplete="name" minLength={2} required disabled={sending}
                                    value={clientName} onChange={event => setClientName(event.target.value)} />
                            </label>
                            <label className="block space-y-1.5 text-sm font-semibold text-brand-text">
                                <span>Teléfono</span>
                                <input className={inputStyle} name="clientPhone" type="tel" autoComplete="tel-national" pattern="[0-9]{10}" maxLength={10} required disabled={sending}
                                    value={clientPhone} onChange={event => setClientPhone(event.target.value)} />
                            </label>
                            <label className="block space-y-1.5 text-sm font-semibold text-brand-text">
                                Correo electrónico
                                <input className={inputStyle} name="clientEmail" type="email" autoComplete="email" required maxLength={254} disabled={sending}
                                    value={clientEmail} onChange={event => setClientEmail(event.target.value)} />
                            </label>
                            {(unavailableDay || lostSelection) && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                                {unavailableDay ? 'Ya no quedan horas libres para esta fecha. Vuelve para elegir otro día.' : 'La hora elegida dejó de estar disponible. Vuelve para elegir otra.'}
                            </p>}
                            {(error || calendar?.error) && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-900">{error || calendar.error}</p>}
                            {calendar?.code === 'SELECTION_UNAVAILABLE' && <Link href={back} className="inline-block text-sm font-semibold underline">Elegir otro barbero</Link>}
                            <div className="grid gap-2.5 pt-1">
                                <button type="submit" disabled={!selected || sending} className={primaryButton}>{sending ? 'Agendando…' : 'Confirmar reserva'}</button>
                                <button type="button" disabled={sending} className={secondaryButton} onClick={() => review(false)}>Volver a fecha y hora</button>
                            </div>
                        </form>
                    </>
                ) : (
                    <>
                        <MonthCalendar month={month} today={today} date={date} days={calendar?.days} error={calendar?.error}
                            onMonthChange={changeMonth} onDateChange={selectDate} />
                        {calendar?.error && <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-900">
                            <p>{calendar.error}</p>
                            {calendar.code === 'SELECTION_UNAVAILABLE'
                                ? <Link href={back} className="font-semibold underline">Elegir otro barbero</Link>
                                : <button type="button" className="font-semibold underline" onClick={() => setAttempt(value => value + 1)}>Reintentar</button>}
                        </div>}
                        <section aria-label="Horas de atención" className="space-y-3">
                            <h2 className="flex items-center gap-2 font-semibold text-brand-text"><Clock3 size={18} /> Horas de atención</h2>
                            {!date && <p className="rounded-xl bg-brand-background p-4 text-sm text-brand-muted">Elige un día disponible para ver las horas.</p>}
                            {date && !active && !calendar?.error && <p role="status" className="rounded-xl bg-brand-background p-4 text-sm text-brand-muted">Consultando horarios…</p>}
                            {unavailableDay && <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Ya no quedan horas libres para esta fecha. Elige otro día.</p>}
                            {slots.length > 0 && (
                                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                                    {slots.map(slot => (
                                        <button type="button" key={slot.timeSlot} disabled={slot.occupied} aria-pressed={selected === slot.timeSlot}
                                            onClick={() => { setChosen(slot.timeSlot); setError(''); }}
                                            className={'flex min-h-13 flex-col items-center justify-center rounded-xl border px-1 py-2 text-sm font-semibold tabular-nums ' + (slot.occupied
                                                ? 'cursor-not-allowed border-rose-300 bg-rose-100 text-rose-950'
                                                : selected === slot.timeSlot ? 'border-brand-primary bg-brand-primary text-brand-on-primary' : 'border-brand-border bg-brand-surface text-brand-text hover:border-brand-accent')}>
                                            {slot.timeSlot}
                                            {slot.occupied && <span className="mt-0.5 flex items-center gap-1 text-[11px] leading-tight font-semibold text-rose-900"><Lock aria-hidden="true" size={10} /> Ocupada</span>}
                                        </button>
                                    ))}
                                </div>
                            )}
                            {lostSelection && !unavailableDay && <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">La hora elegida dejó de estar disponible. Selecciona otra.</p>}
                        </section>
                        <button type="button" disabled={!selected} onClick={() => review(true)} className={primaryButton + ' w-full'}>Continuar</button>
                    </>
                )}
            </div>
        </main>
    );
}
