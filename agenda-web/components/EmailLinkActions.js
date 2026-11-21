'use client';

import { useState } from 'react';
import Link from 'next/link';
import { announceScheduleChange } from '../utils/liveSchedule';

const primary = 'block min-h-12 w-full rounded-xl bg-brand-primary p-3 font-semibold text-brand-on-primary disabled:opacity-50';
const danger = 'block min-h-12 w-full rounded-xl border border-rose-300 p-3 font-semibold text-rose-900 disabled:opacity-50';

export default function EmailLinkActions({ endpoint, token, booking = false, details, initialAction, unavailable }) {
    const [action, setAction] = useState(initialAction ?? null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const cancelling = action === 'cancel';
    const title = !booking ? 'Verificar correo' : cancelling ? 'Cancelar cita' : action === 'confirm' ? 'Confirmar asistencia' : 'Tu asistencia';

    async function submit(response) {
        if (busy) return;
        setBusy(true);
        setError('');
        try {
            const res = await fetch(endpoint, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, ...(response && { action: response }) })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'No se pudo completar la solicitud.');
            setMessage(data.message);
            if (booking) announceScheduleChange();
        } catch (failure) {
            setError(failure.message);
        } finally {
            setBusy(false);
        }
    }

    return <main className="mx-auto max-w-lg px-4 py-8">
        <section className="space-y-5 rounded-2xl border border-brand-border bg-brand-surface p-5 shadow-sm sm:p-7">
            <h1 className="text-2xl font-bold leading-tight">{title}</h1>

            {details && <dl className="space-y-3 rounded-xl border border-brand-border bg-brand-background p-4">
                {Object.entries(details).map(([label, value]) => <div key={label}>
                    <dt className="text-sm font-semibold text-brand-muted">{label}</dt>
                    <dd className="break-words text-base font-semibold text-brand-text">{value}</dd>
                </div>)}
            </dl>}

            {message ? <p role="status" className="rounded-xl bg-emerald-50 p-4 font-semibold text-emerald-900">{message}</p> : token ? <>
                {cancelling ? <>
                    <p className="rounded-xl bg-rose-50 p-3 text-sm leading-relaxed text-rose-950">Si faltan menos de 12 horas para tu cita, la cancelación puede generar una falta.</p>
                    <button type="button" disabled={busy} onClick={() => submit('cancel')}
                        className="block min-h-12 w-full rounded-xl bg-rose-800 p-3 font-semibold text-white disabled:opacity-50">
                        {busy ? 'Cancelando…' : 'Sí, cancelar mi cita'}
                    </button>
                    {initialAction !== 'cancel' && <button type="button" disabled={busy} onClick={() => { setAction(null); setError(''); }}
                        className="block min-h-11 w-full rounded-xl border border-brand-border p-2 font-semibold">Volver</button>}
                </> : <>
                    <button type="button" disabled={busy} onClick={() => submit(booking ? 'confirm' : undefined)} className={primary}>
                        {busy ? 'Guardando…' : booking ? 'Confirmar asistencia' : 'Verificar mi correo'}
                    </button>
                    {booking && !action && <button type="button" disabled={busy} onClick={() => { setAction('cancel'); setError(''); }}
                        className={danger}>Cancelar mi cita</button>}
                </>}
            </> : <p role="status" className="text-brand-muted">{unavailable || 'El enlace no es válido.'}</p>}

            {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-rose-900">{error}</p>}
            <Link href={booking ? '/' : '/dashboard/cuenta/correo'} className="block w-fit py-2 text-sm font-semibold underline">
                {booking ? (cancelling && token && !message ? 'Conservar mi cita' : 'Ir al inicio') : 'Ir a mi cuenta'}
            </Link>
        </section>
    </main>;
}
