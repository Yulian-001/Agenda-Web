'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import BrandLogo from '../../../components/BrandLogo';
import { ArrowLeft, User } from 'lucide-react';
import { watchSchedule } from '../../../utils/liveSchedule';

export default function PublicBarbers({ serviceId, initialSelection }) {
    const [selection, setSelection] = useState(initialSelection);
    const [error, setError] = useState('');

    useEffect(() => watchSchedule(async signal => {
        try {
            const params = new URLSearchParams({ serviceId });
            const res = await fetch('/api/public/barbers?' + params, { signal, cache: 'no-store' });
            if (!res.ok) throw new Error('No se pudo actualizar la lista de barberos.');
            const data = await res.json();
            if (!signal.aborted) {
                setSelection(data);
                setError('');
            }
        } catch {
            if (!signal.aborted) setError('No se pudo actualizar la lista de barberos. Volveremos a intentarlo.');
        }
    }), [serviceId]);

    return (
        <main className="flex min-h-screen w-full items-center justify-center bg-brand-background font-sans md:p-6">
            <div className="min-h-screen w-full max-w-lg bg-brand-surface p-6 md:min-h-[800px] md:rounded-3xl md:shadow-2xl">
                <header className="mb-8 flex items-center gap-4 pt-2">
                    <Link href="/reserva" aria-label="Volver a servicios" className="shrink-0 rounded-full bg-brand-surface p-2 shadow-sm hover:bg-brand-background">
                        <ArrowLeft size={24} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-brand-text">Nuestros Barberos</h1>
                        {selection.serviceName && <p className="text-sm text-brand-muted">
                            Profesionales disponibles para <span className="font-semibold text-brand-text">{selection.serviceName}</span>
                        </p>}
                    </div>
                    <BrandLogo size={44} className="ml-auto" />
                </header>

                {error && <p role="alert" className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{error}</p>}
                {!selection.serviceName ? (
                    <p role="status" className="rounded-xl bg-brand-surface p-4 text-sm text-brand-muted">
                        Servicio no encontrado o fuera de disponibilidad. <Link href="/reserva" className="font-semibold underline">Elegir otro servicio</Link>.
                    </p>
                ) : !selection.barbers.length ? (
                    <p role="status" className="rounded-xl bg-brand-surface p-4 text-sm text-brand-muted">No hay barberos disponibles para este servicio.</p>
                ) : (
                    <div className="flex flex-col gap-6 pb-8">
                        {selection.barbers.map(barber => (
                            <article key={barber.id} className="flex flex-row-reverse items-center justify-between gap-3 rounded-3xl border border-brand-border bg-brand-surface p-4 text-center shadow-sm sm:p-6">
                                <div className="size-24 shrink-0 overflow-hidden rounded-xl border-4 border-brand-surface bg-brand-background shadow-inner sm:size-40">
                                    {barber.photo ? (
                                        // Las fotos del equipo pueden ser enlaces externos o imágenes pegadas.
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={barber.photo} alt={barber.name} className="h-full w-full object-cover" />
                                    ) : <User className="h-full w-full p-6 text-gray-400" />}
                                </div>
                                <div className="flex min-w-0 flex-1 flex-col items-center gap-3">
                                    <h2 className="wrap-break-word text-xl font-bold text-brand-text">{barber.name}</h2>
                                    <p className="text-sm text-brand-muted">{barber.description || 'Profesional listo para atenderte'}</p>
                                    <Link prefetch={false} href={{ pathname: '/reserva/agendar/' + barber.id, query: { serviceId } }}
                                        className="w-full max-w-52 rounded-xl bg-brand-primary px-2 py-2.5 text-sm font-semibold text-brand-on-primary hover:bg-brand-primary-hover">
                                        Elegir Barbero
                                    </Link>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
