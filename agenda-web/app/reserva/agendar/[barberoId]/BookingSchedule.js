'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CalendarDays, CheckCircle2, Clock3 } from 'lucide-react';
import { announceScheduleChange, watchSchedule } from '../../../../utils/liveSchedule';

const inputStyle = 'w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 focus:border-black focus:outline-none';

export default function BookingSchedule({ barberId, serviceId, today }) {
    const [date, setDate] = useState(today);
    const [chosen, setChosen] = useState('');
    const [response, setResponse] = useState(null);
    const [formOpen, setFormOpen] = useState(false);
    const [error, setError] = useState('');
    const [sending, setSending] = useState(false);
    const [reference, setReference] = useState('');
    const [attempt, setAttempt] = useState(0);
    const active = response?.date === date ? response : null;
    const slots = active?.slots ?? [];
    const selected = slots.some(slot => slot.timeSlot === chosen && !slot.occupied) ? chosen : '';
    const back = serviceId ? '/reserva/' + encodeURIComponent(serviceId) : '/reserva';

    useEffect(() => {
        if (!date || !serviceId || reference) return;
        const query = new URLSearchParams({ barberId, date, serviceId });
        return watchSchedule(async signal => {
            try {
                const res = await fetch('/api/public/availability?' + query.toString(), { signal, cache: 'no-store' });
                const data = await res.json();
                if (!signal.aborted) {
                    setResponse(res.ok ? { date, slots: data.slots } : { date, error: data.error });
                }
            } catch {
                if (!signal.aborted) setResponse({ date, error: 'No se pudo consultar la disponibilidad.' });
            }
        });
    }, [date, serviceId, barberId, reference, attempt]);

    function selectDate(next) {
        setDate(next);
        setChosen('');
        setFormOpen(false);
        setError('');
    }

    async function reserve(event) {
        event.preventDefault();
        if (!selected || sending) return;
        const fields = new FormData(event.currentTarget);
        setSending(true);
        setError('');
        try {
            const res = await fetch('/api/appointments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    barberId, serviceId, date, timeSlot: selected,
                    clientName: fields.get('clientName'), clientPhone: fields.get('clientPhone')
                })
            });
            const data = await res.json();
            if (!res.ok) {
                const fieldError = Object.values(data.details ?? {}).find(field => field?._errors?.length);
                setError(fieldError?._errors[0] || data.error || 'No se pudo agendar la cita.');
                setAttempt(value => value + 1);
                return;
            }

            setReference(data.appointment.id);
            announceScheduleChange();
        } catch {
            setError('No se pudo confirmar la cita. Revisa la disponibilidad antes de reintentar.');
            setAttempt(value => value + 1);
        } finally {
            setSending(false);
        }
    }

    return (
        <main className="min-h-screen bg-gray-100 px-4 py-6 sm:py-10">
            <div className="mx-auto max-w-xl space-y-5 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8">
                <header className="flex items-start gap-3">
                    <Link href={back} aria-label="Volver" className="shrink-0 rounded-xl bg-gray-100 p-2.5 text-black"><ArrowLeft size={20} /></Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-950">{reference ? 'Cita registrada' : 'Selecciona fecha y hora'}</h1>
                        <p className="text-sm text-gray-600">{reference ? 'Tu cita quedó pendiente de confirmación.' : 'Elige una franja disponible para tu servicio.'}</p>
                    </div>
                </header>

                {reference ? (
                    <div role="status" className="space-y-3 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">
                        <p className="flex items-center gap-2 font-semibold"><CheckCircle2 size={18} /> {date} · {chosen}</p>
                        <p className="break-all">Referencia {reference}</p>
                        <Link href="/" className="inline-block font-semibold underline">Volver al inicio</Link>
                    </div>
                ) : !serviceId ? (
                    <p className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-700">Selecciona primero <Link href="/reserva" className="font-semibold underline">un servicio</Link>.</p>
                ) : (
                    <>
                        <label className="block space-y-2 rounded-2xl border border-gray-200 p-4 text-sm font-semibold text-gray-800">
                            <span className="flex items-center gap-2"><CalendarDays size={18} /> Fecha de la cita</span>
                            <input type="date" min={today} value={date} disabled={sending} className={inputStyle} onChange={event => selectDate(event.target.value)} />
                        </label>
                        <section aria-label="Horas de atención" className="space-y-3">
                            <h2 className="flex items-center gap-2 font-semibold text-gray-900"><Clock3 size={18} /> Horas de atención</h2>
                            {date && !active && <p role="status" className="rounded-xl bg-gray-50 p-4 text-sm text-gray-600">Consultando horarios…</p>}
                            {active?.error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{active.error}</p>}
                            {active?.slots?.length === 0 && <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-700">No quedan horas de atención para esta fecha. Elige otro día.</p>}
                            {slots.length > 0 && (
                                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                                    {slots.map(slot => (
                                        <button type="button" key={slot.timeSlot} disabled={slot.occupied || sending} aria-pressed={selected === slot.timeSlot}
                                            onClick={() => { setChosen(slot.timeSlot); setError(''); }}
                                            className={'rounded-xl border py-2.5 text-sm font-semibold tabular-nums ' + (slot.occupied
                                                ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-600'
                                                : selected === slot.timeSlot ? 'border-black bg-black text-white' : 'border-gray-200 bg-white text-gray-900 hover:border-black')}>
                                            {slot.timeSlot}
                                            {slot.occupied && <span className="block text-xs font-normal">Ocupada</span>}
                                        </button>
                                    ))}
                                </div>
                            )}
                            {chosen && active?.slots && !selected &&
                                <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">La hora elegida dejó de estar disponible. Selecciona otra.</p>}
                        </section>
                        {formOpen ? (
                            <form onSubmit={reserve} className="space-y-3 border-t border-gray-100 pt-4">
                                <h2 className="font-semibold text-gray-900">Datos de la cita</h2>
                                <label className="block space-y-1 text-sm font-medium text-gray-800">
                                    Nombre <input className={inputStyle} name="clientName" autoComplete="name" minLength={2} required disabled={sending} />
                                </label>
                                <label className="block space-y-1 text-sm font-medium text-gray-800">
                                    Teléfono <input className={inputStyle} name="clientPhone" type="tel" autoComplete="tel-national" pattern="[0-9]{10}" maxLength={10} required disabled={sending} />
                                </label>
                                {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
                                <button disabled={!selected || sending} className="w-full rounded-xl bg-black px-4 py-3 font-semibold text-white disabled:opacity-50">
                                    {sending ? 'Agendando…' : 'Confirmar reserva'}
                                </button>
                            </form>
                        ) : (
                            <button type="button" disabled={!selected} onClick={() => setFormOpen(true)} className="w-full rounded-xl bg-black px-4 py-3 font-semibold text-white disabled:opacity-50">
                                Continuar
                            </button>
                        )}
                    </>
                )}
            </div>
        </main>
    );
}
