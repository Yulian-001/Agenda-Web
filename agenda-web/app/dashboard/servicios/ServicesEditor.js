'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Clock, Edit, Plus, Scissors, Search, Trash2, X, XCircle } from 'lucide-react';
import { announceScheduleChange, watchSchedule } from '../../../utils/liveSchedule';

const emptyForm = { name: '', description: '', duration: '', price: '' };
const filters = [['all', 'Todos'], ['active', 'Activos'], ['inactive', 'Inactivos']];
const fieldClass = 'w-full rounded-xl border border-gray-200 bg-gray-50 p-3 focus:border-black focus:outline-none';

async function requestJson(url, options) {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => null);
    if (!response.ok) {
        const field = Object.values(data?.details ?? {}).find(value => value?._errors?.length);
        throw new Error(field?._errors[0] || data?.error || 'No se pudo completar la operación.');
    }
    return data;
}

const priceFormat = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 2 });

export default function ServicesEditor({ initialServices, canManageState, canEdit }) {
    const [services, setServices] = useState(initialServices);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');
    const [form, setForm] = useState(null);
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState(null);
    const [loadError, setLoadError] = useState('');
    const listUrl = canManageState ? '/api/services?includeInactive=true' : '/api/services';

    useEffect(() => {
        if (busy) return;
        return watchSchedule(async signal => {
            try {
                const data = await requestJson(listUrl, { signal, cache: 'no-store' });
                if (!signal.aborted) {
                    setServices(data.services);
                    setLoadError('');
                }
            } catch (error) {
                if (!signal.aborted) setLoadError(error.message);
            }
        });
    }, [busy, listUrl]);

    const counts = {
        all: services.length,
        active: services.filter(service => service.isActive).length
    };
    counts.inactive = counts.all - counts.active;
    const visible = services.filter(service =>
        service.name.toLocaleLowerCase('es-CO').includes(search.trim().toLocaleLowerCase('es-CO')) &&
        (filter === 'all' || service.isActive === (filter === 'active'))
    );

    async function mutate(url, method, body) {
        setBusy(true);
        setResult(null);
        try {
            const data = await requestJson(url, {
                method,
                ...(body && { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
            });
            setServices(previous => [...previous.filter(service => service.id !== data.service.id), data.service]
                .filter(service => !service.archivedAt && (canManageState || service.isActive))
                .sort((a, b) => a.name.localeCompare(b.name, 'es-CO')));
            setForm(null);
            setResult({ message: data.message });
            announceScheduleChange();
        } catch (error) {
            setResult({ error: error.message });
        } finally {
            setBusy(false);
        }
    }

    function save(event) {
        event.preventDefault();
        void mutate(form.id ? '/api/services/' + form.id : '/api/services', form.id ? 'PUT' : 'POST', {
            name: form.name,
            description: form.description,
            duration: Number(form.duration),
            price: Number(form.price)
        });
    }

    function toggleService(service) {
        if (service.isActive && !window.confirm(`¿Desactivar «${service.name}» para nuevas reservas?`)) return;
        void mutate('/api/services/' + service.id, 'PATCH', { isActive: !service.isActive });
    }

    function removeService(service) {
        if (!window.confirm(`¿Eliminar «${service.name}» del panel y de reservas? Sus citas y su historial se conservarán.`)) return;
        void mutate('/api/services/' + service.id, 'DELETE');
    }

    function openForm(service) {
        setResult(null);
        setForm(service);
    }

    return (
        <div className="mx-auto max-w-5xl space-y-5 pb-20">
            <header className="space-y-4 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900"><Scissors size={23} /> Servicios</h1>
                    <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                        <div className="relative min-w-0 flex-1 sm:w-60">
                            <Search aria-hidden="true" size={18} className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" />
                            <input type="search" aria-label="Buscar servicio" placeholder="Buscar servicio…" value={search}
                                onChange={event => setSearch(event.target.value)}
                                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pr-3 pl-10 text-sm focus:border-black focus:outline-none" />
                        </div>
                        {canEdit && <button type="button" disabled={busy} onClick={() => openForm({ ...emptyForm })}
                            className="flex items-center gap-1.5 rounded-xl bg-green-700 px-3 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50">
                            <Plus size={18} /> Agregar
                        </button>}
                    </div>
                </div>
                {canManageState && <div className="flex flex-wrap gap-2" aria-label="Filtrar por estado">
                    {filters.map(([value, label]) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}
                        className={'rounded-lg border px-3 py-1.5 text-sm font-semibold ' + (filter === value
                            ? 'border-brand-primary bg-brand-primary text-brand-on-primary' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50')}>
                        {label} <span className="ml-0.5 tabular-nums opacity-80">{counts[value]}</span>
                    </button>)}
                </div>}
            </header>

            {loadError && <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">No se pudo actualizar la lista. {loadError}</p>}
            {!form && result?.error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-900">{result.error}</p>}
            {result?.message && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">{result.message}</p>}
            {!visible.length && <p className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-600">
                {search.trim() ? 'Ningún servicio coincide con la búsqueda.' : filter === 'inactive' ? 'No hay servicios inactivos.' : filter === 'active' ? 'No hay servicios activos.' : 'No hay servicios registrados.'}
            </p>}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {visible.map(service => (
                    <article key={service.id} className={'flex flex-col rounded-2xl border bg-white p-5 shadow-sm ' + (service.isActive ? 'border-gray-200' : 'border-amber-200')}>
                        <div className="mb-4">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                                <h2 className="min-w-0 wrap-break-word text-lg font-bold text-gray-900">{service.name}</h2>
                                {canManageState && <span className={'rounded-full px-2.5 py-1 text-xs font-semibold ' + (service.isActive
                                    ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-100 text-amber-900')}>
                                    {service.isActive ? 'Activo' : 'Inactivo'}
                                </span>}
                            </div>
                            <p className="mt-1 line-clamp-2 text-sm text-gray-600">{service.description}</p>
                        </div>
                        <div className="mb-4 mt-auto flex flex-wrap items-center gap-3 rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
                            <span className="flex items-center gap-1.5"><Clock size={16} /> {service.duration} min</span>
                            <span className="font-semibold text-gray-900">{priceFormat.format(service.price)}</span>
                        </div>
                        {canEdit && <div className="flex flex-wrap gap-2">
                            <button type="button" disabled={busy} onClick={() => openForm(service)}
                                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50">
                                <Edit size={16} /> Editar
                            </button>
                            <button type="button" disabled={busy} onClick={() => toggleService(service)}
                                className={'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50 ' + (service.isActive
                                    ? 'bg-amber-50 text-amber-900 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100')}>
                                {service.isActive ? <><XCircle size={16} /> Desactivar</> : <><CheckCircle2 size={16} /> Reactivar</>}
                            </button>
                            {canManageState && <button type="button" disabled={busy} onClick={() => removeService(service)}
                                aria-label={`Eliminar ${service.name}`} className="flex items-center justify-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-800 hover:bg-red-100 disabled:opacity-50">
                                <Trash2 size={16} /> Eliminar
                            </button>}
                        </div>}
                    </article>
                ))}
            </div>

            {form && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <section role="dialog" aria-modal="true" aria-labelledby="service-form-title" className="relative max-h-full w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
                        <button type="button" disabled={busy} aria-label="Cerrar formulario" onClick={() => setForm(null)}
                            className="absolute top-4 right-4 rounded-full p-2 text-gray-600 hover:bg-gray-100"><X size={20} /></button>
                        <h2 id="service-form-title" className="mb-6 text-xl font-bold">{form.id ? 'Editar servicio' : 'Nuevo servicio'}</h2>
                        <form onSubmit={save}>
                            <fieldset disabled={busy} className="space-y-4">
                                <label className="block space-y-1 text-sm font-semibold text-gray-700">
                                    Nombre <input required type="text" className={fieldClass} value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} />
                                </label>
                                <label className="block space-y-1 text-sm font-semibold text-gray-700">
                                    Descripción <textarea required rows={2} className={fieldClass} value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} />
                                </label>
                                <div className="grid grid-cols-2 gap-4">
                                    <label className="block space-y-1 text-sm font-semibold text-gray-700">
                                        Duración (min) <input type="number" required min={1} className={fieldClass} value={form.duration} onChange={event => setForm({ ...form, duration: event.target.value })} />
                                    </label>
                                    <label className="block space-y-1 text-sm font-semibold text-gray-700">
                                        Precio <input type="number" required min="0.01" step="0.01" className={fieldClass} value={form.price} onChange={event => setForm({ ...form, price: event.target.value })} />
                                    </label>
                                </div>
                                {result?.error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-900">{result.error}</p>}
                                <button type="submit" className="w-full rounded-xl bg-brand-primary py-3 font-bold text-brand-on-primary hover:bg-brand-primary-hover disabled:opacity-50">
                                    {busy ? 'Guardando…' : 'Guardar servicio'}
                                </button>
                            </fieldset>
                        </form>
                    </section>
                </div>
            )}
        </div>
    );
}
