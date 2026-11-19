'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Clock } from 'lucide-react';
import Link from 'next/link';
import BrandLogo from '../../components/BrandLogo';
import { watchSchedule } from '../../utils/liveSchedule';

export default function PublicServices({ initialServices }) {
    const [services, setServices] = useState(initialServices);
    const [error, setError] = useState('');

    useEffect(() => watchSchedule(async signal => {
        try {
            const response = await fetch('/api/services', { signal, cache: 'no-store' });
            if (!response.ok) throw new Error('No se pudo actualizar el catálogo.');
            const data = await response.json();
            if (!signal.aborted) {
                setServices(data.services);
                setError('');
            }
        } catch {
            if (!signal.aborted) setError('No pudimos actualizar los servicios. Volveremos a intentarlo.');
        }
    }), []);

    return (
        <main className="flex min-h-screen w-full items-center justify-center bg-brand-background font-sans md:p-6">
            <div className="min-h-screen w-full max-w-2xl overflow-y-auto bg-brand-surface p-6 md:min-h-[800px] md:rounded-3xl md:shadow-2xl lg:max-w-6xl">
                <header className="mb-8 flex items-center gap-4">
                    <Link href="/" aria-label="Volver al inicio" className="rounded-full bg-brand-surface p-2 shadow-sm hover:bg-brand-background">
                        <ArrowLeft size={24} />
                    </Link>
                    <h1 className="text-2xl font-bold">Nuestros Servicios</h1>
                    <BrandLogo size={44} className="ml-auto" />
                </header>

                {error && <p role="status" className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{error}</p>}
                {!services.length && <p className="text-sm text-brand-muted">Por ahora no hay servicios disponibles para reservar.</p>}
                <div className="grid grid-cols-1 gap-4 pb-8 md:grid-cols-2 lg:grid-cols-3">
                    {services.map(service => (
                        <article key={service.id} className="rounded-2xl border border-brand-border bg-brand-surface p-5 shadow-sm">
                            <h2 className="mb-2 text-xl font-bold">{service.name}</h2>
                            <p className="mb-4 text-brand-muted">{service.description}</p>
                            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-brand-border pt-4">
                                <div className="flex flex-wrap items-center gap-4 text-sm text-brand-muted">
                                    <span className="flex items-center gap-1"><Clock size={16} /> {service.duration} min</span>
                                    <span className="font-semibold text-brand-text">${service.price.toLocaleString('es-CO')}</span>
                                </div>
                                <Link href={'/reserva/' + service.id} className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-brand-on-primary hover:bg-brand-primary-hover">
                                    Seleccionar
                                </Link>
                            </div>
                        </article>
                    ))}
                </div>
            </div>
        </main>
    );
}
