'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, Edit, Loader2, Plus, Trash2, User, XCircle } from 'lucide-react';
import { announceScheduleChange } from '../../../utils/liveSchedule';
import BarberPhotoField from '../../../components/BarberPhotoField';
import { adminProtection, teamBarberRoles } from '../../../config/barberRoles';

const fieldClass = 'w-full rounded-xl border border-gray-200 bg-gray-50 p-3';
const newBarber = {
    name: '', phone: '', password: '', description: '', photo: '', role: 'BARBER_AFFILIATE',
    commissionRate: 0.7, haveWhatsApp: true, services: []
};

async function requestJson(url, options) {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => null);
    if (!response.ok) {
        const fieldError = Object.values(data?.details ?? {}).find(field => field?._errors?.length);
        throw new Error(fieldError?._errors[0] || data?.error || 'No se pudo completar la operación.');
    }
    return data;
}

async function loadBarbers(signal) {
    const [team, catalog] = await Promise.all([
        requestJson('/api/users', { signal, cache: 'no-store' }),
        requestJson('/api/services', { signal, cache: 'no-store' })
    ]);
    return { ...team, catalog: catalog.services };
}

function BarberForm({ barber, catalog, viewerId, viewerRole, pending, error, onCancel, onSave }) {
    const editing = Boolean(barber);
    const canChangeRole = !editing || (barber.id !== viewerId && !barber.isOwner &&
        !(viewerRole === 'BARBER_BOSS' && barber.role === 'ADMIN'));
    const [form, setForm] = useState(() => barber ? {
        name: barber.name, description: barber.description, photo: barber.photo, role: barber.role,
        commissionRate: barber.commissionRate, haveWhatsApp: barber.haveWhatsApp,
        services: barber.services.map(({ service }) => service.id)
    } : newBarber);
    const [readyPhoto, setReadyPhoto] = useState(null);
    const [processingPhoto, setProcessingPhoto] = useState(false);
    const [photoError, setPhotoError] = useState('');
    const inactive = (barber?.services ?? [])
        .map(({ service }) => service)
        .filter(service => !service.isActive);
    const options = [...catalog, ...inactive];

    function setField(field, value) {
        setForm(current => ({ ...current, [field]: value }));
    }

    function toggleService(id, checked) {
        setField('services', checked ? [...form.services, id] : form.services.filter(serviceId => serviceId !== id));
    }

    function save(event) {
        event.preventDefault();
        if (pending || processingPhoto) return;
        if (form.role !== 'ADMIN' && (!form.photo || readyPhoto !== form.photo)) {
            setPhotoError(form.photo ? 'Usa una foto que se pueda ver en la vista previa.' : 'Agrega la foto del barbero para continuar.');
            return;
        }
        onSave(form, barber?.id);
    }

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 sm:items-center">
            <section role="dialog" aria-modal="true" aria-labelledby="barber-form-title" className="my-4 max-h-[calc(100dvh-4rem)] w-full max-w-lg overflow-y-auto rounded-3xl bg-white shadow-2xl">
                <div className="border-b border-gray-100 p-6">
                    <h2 id="barber-form-title" className="text-xl font-bold">{editing ? 'Editar perfil' : 'Nuevo barbero'}</h2>
                </div>
                <form className="p-6" onSubmit={save}>
                    <fieldset disabled={pending} className="space-y-4">
                        <label className="block text-sm font-semibold text-gray-600">
                            Nombre completo
                            <input className={fieldClass} required minLength={2} value={form.name} onChange={event => setField('name', event.target.value)} />
                        </label>
                        {!editing && (
                            <div className="grid gap-4 sm:grid-cols-2">
                                <label className="block text-sm font-semibold text-gray-600">
                                    Teléfono
                                    <input className={fieldClass} type="tel" autoComplete="tel-national" required pattern="3[0-9]{9}" title="10 dígitos, empezando por 3" value={form.phone} onChange={event => setField('phone', event.target.value)} />
                                </label>
                                <label className="block text-sm font-semibold text-gray-600">
                                    Contraseña
                                    <input className={fieldClass} type="password" autoComplete="new-password" required minLength={8} value={form.password} onChange={event => setField('password', event.target.value)} />
                                </label>
                            </div>
                        )}
                        <label className="block text-sm font-semibold text-gray-600">
                            Descripción
                            <textarea className={fieldClass} required minLength={editing ? 5 : 10} rows={2} value={form.description} onChange={event => setField('description', event.target.value)} />
                        </label>
                        <BarberPhotoField photo={form.photo} processing={processingPhoto} onProcessing={setProcessingPhoto}
                            onReady={setReadyPhoto} onChange={photo => { setField('photo', photo); setPhotoError(''); }} />
                        {photoError && <p role="alert" className="text-sm text-red-700">{photoError}</p>}
                        <div className="grid grid-cols-2 gap-4">
                            <label className="block text-sm font-semibold text-gray-600">
                                Rol
                                <select className={fieldClass} disabled={!canChangeRole} value={form.role} onChange={event => setField('role', event.target.value)}>
                                    {Object.entries(teamBarberRoles)
                                        .filter(([value]) => value !== 'ADMIN' || viewerRole === 'ADMIN' || barber?.role === 'ADMIN')
                                        .map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                                </select>
                            </label>
                            <label className="block text-sm font-semibold text-gray-600">
                                Comisión ({Math.round(form.commissionRate * 100)} %)
                                <input className="mt-3 w-full accent-black" type="range" min={0} max={1} step={0.01} value={form.commissionRate} onChange={event => setField('commissionRate', event.target.valueAsNumber)} />
                            </label>
                        </div>
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                            <input type="checkbox" checked={form.haveWhatsApp} onChange={event => setField('haveWhatsApp', event.target.checked)} />
                            Tiene WhatsApp
                        </label>
                        <fieldset className="rounded-xl border border-gray-200 p-3">
                            <legend className="px-1 text-sm font-semibold text-gray-600">Servicios asignados</legend>
                            {options.length ? options.map(service => (
                                <label key={service.id} className="flex items-center gap-2 py-1 text-sm text-gray-700">
                                    <input type="checkbox" checked={form.services.includes(service.id)} onChange={event => toggleService(service.id, event.target.checked)} />
                                    {service.name}{service.isActive === false && ' (inactivo)'}
                                </label>
                            )) : <p className="text-sm text-gray-500">Agrega servicios en el catálogo para poder asignarlos.</p>}
                        </fieldset>
                        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
                        <div className="flex flex-col-reverse gap-3 sm:flex-row">
                            <button type="button" onClick={onCancel} className="w-full rounded-xl bg-gray-200 py-3 font-bold text-gray-700">Cancelar</button>
                            <button type="submit" disabled={processingPhoto} className="w-full rounded-xl bg-brand-primary py-3 font-bold text-brand-on-primary hover:bg-brand-primary-hover disabled:opacity-60">
                                {pending ? 'Guardando…' : editing ? 'Guardar' : 'Crear barbero'}
                            </button>
                        </div>
                    </fieldset>
                </form>
            </section>
        </div>
    );
}

export default function BarberosPage() {
    const [team, setTeam] = useState(null);
    const [loadError, setLoadError] = useState('');
    const [loadAttempt, setLoadAttempt] = useState(0);
    const [dialog, setDialog] = useState(null);
    const [pending, setPending] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    useEffect(() => {
        const controller = new AbortController();
        loadBarbers(controller.signal)
            .then(setTeam)
            .catch(error => { if (!controller.signal.aborted) setLoadError(error.message); });
        return () => controller.abort();
    }, [loadAttempt]);

    function reload() {
        setLoadError('');
        setLoadAttempt(attempt => attempt + 1);
    }

    function edit(barber) {
        setError('');
        setNotice('');
        setDialog({ barber });
    }

    async function mutate(url, method, body) {
        setPending(true);
        setError('');
        setNotice('');
        try {
            const result = await requestJson(url, {
                method,
                ...(body && { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
            });
            setDialog(null);
            setNotice(result.message);
            announceScheduleChange();
            try {
                setTeam(await loadBarbers());
                setLoadError('');
            } catch (error) {
                setLoadError(error.message);
            }
        } catch (error) {
            setError(error.message);
        } finally {
            setPending(false);
        }
    }

    function warnProtected(barber) {
        if (team.viewerRole === 'BARBER_BOSS' && barber.role === 'ADMIN') {
            setNotice('');
            setError(adminProtection);
            return true;
        }
        if (barber.isOwner) {
            setNotice('');
            setError('No puedes retirar ni desactivar la cuenta propietaria.');
            return true;
        }
        return false;
    }

    function toggleState(barber) {
        if (warnProtected(barber)) return;
        const message = barber.state
            ? `¿Quieres desactivar a ${barber.name}? Dejará de aparecer en las reservas y se conservará su historial.`
            : `¿Quieres reactivar a ${barber.name}?`;
        if (window.confirm(message)) {
            void mutate(`/api/users/${barber.id}`, 'PUT', { state: !barber.state });
        }
    }

    function archiveBarber(barber) {
        if (warnProtected(barber)) return;
        const confirmed = window.confirm(
            `¿Quieres eliminar a ${barber.name} del equipo? Su perfil desaparecerá del panel y de reservas. Sus citas e historial se conservarán.`
        );
        if (confirmed) void mutate(`/api/users/${barber.id}`, 'DELETE');
    }

    return (
        <div className="mx-auto max-w-5xl space-y-6 pb-20">
            <div className="flex flex-col justify-between gap-4 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm md:flex-row md:items-center">
                <div>
                    <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-800"><User size={24} /> Gestión de Barberos</h1>
                    <p className="mt-1 text-sm text-gray-500">Administra el equipo, sus roles y servicios.</p>
                </div>
                <button disabled={pending || !team || Boolean(loadError)} onClick={() => edit(null)} className="flex items-center gap-2 rounded-xl bg-brand-primary px-6 py-3 font-bold text-brand-on-primary hover:bg-brand-primary-hover disabled:opacity-50">
                    <Plus size={20} /> Agregar barbero
                </button>
            </div>

            {notice && <p role="status" className="rounded-xl bg-green-50 p-3 text-green-800">{notice}</p>}
            {!dialog && error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-red-700">{error}</p>}
            {loadError && (
                <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-red-50 p-3 text-red-700">
                    <p>{loadError}</p>
                    <button onClick={reload} className="font-semibold underline">Reintentar</button>
                </div>
            )}
            {!team && !loadError && <div role="status" className="flex justify-center py-20"><Loader2 className="animate-spin text-gray-400" size={40} /><span className="sr-only">Cargando barberos</span></div>}
            {team?.barbers.length === 0 && <p className="rounded-3xl bg-white p-6 text-gray-500">Todavía no hay barberos registrados.</p>}

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {team?.barbers.map(barber => (
                    <article key={barber.id} className={`overflow-hidden rounded-3xl border bg-white shadow-sm ${barber.state ? 'border-gray-200' : 'border-red-200'}`}>
                        <div className="flex items-center gap-4 border-b border-gray-100 p-6">
                            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-gray-100">
                                {/* Las fotos pueden venir de cualquier proveedor que el administrador elija. */}
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                {barber.photo ? <img src={barber.photo} alt="" className="h-full w-full object-cover" /> : <User className="h-full w-full p-4 text-gray-400" />}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">{barber.name}</h2>
                                <div className="mt-1 flex flex-wrap gap-2">
                                    <span className={`rounded-full px-2 py-1 text-xs font-bold ${barber.state ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{barber.state ? 'Activo' : 'Inactivo'}</span>
                                    <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-bold text-blue-700">{teamBarberRoles[barber.role]}</span>
                                </div>
                            </div>
                        </div>
                        <dl className="space-y-3 bg-gray-50/50 p-6 text-sm">
                            <div className="flex justify-between gap-4"><dt className="text-gray-600">Comisión</dt><dd className="font-bold text-green-700">{Math.round(barber.commissionRate * 100)} %</dd></div>
                            <div className="flex justify-between gap-4"><dt className="text-gray-600">Servicios asignados</dt><dd className="text-right font-semibold text-gray-800">{barber.services.map(({ service }) => service.name).join(', ') || 'Sin servicios'}</dd></div>
                        </dl>
                        <div className="flex flex-wrap gap-2 border-t border-gray-100 p-4">
                            <button disabled={pending || Boolean(loadError)} onClick={() => edit(barber)} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-50 p-2 text-sm font-semibold text-blue-700 disabled:opacity-50"><Edit size={16} /> Editar</button>
                            {barber.id !== team.viewerId && <>
                                <button disabled={pending || Boolean(loadError)} onClick={() => toggleState(barber)} className={`flex flex-1 items-center justify-center gap-2 rounded-xl p-2 text-sm font-semibold disabled:opacity-50 ${barber.state ? 'bg-orange-50 text-orange-700' : 'bg-green-50 text-green-700'}`}>
                                    {barber.state ? <><XCircle size={16} /> Desactivar</> : <><CheckCircle size={16} /> Reactivar</>}
                                </button>
                                <button disabled={pending || Boolean(loadError)} onClick={() => archiveBarber(barber)}
                                    className="flex items-center gap-2 rounded-xl bg-red-50 p-2 text-sm font-semibold text-red-700 disabled:opacity-50"
                                    aria-label={`Eliminar a ${barber.name}`}>
                                    <Trash2 size={16} /> Eliminar
                                </button>
                            </>}
                        </div>
                    </article>
                ))}
            </div>

            {dialog && (
                <BarberForm barber={dialog.barber} catalog={team.catalog} viewerId={team.viewerId} viewerRole={team.viewerRole} pending={pending} error={error}
                    onCancel={() => { setDialog(null); setError(''); }}
                    onSave={(body, id) => mutate(id ? `/api/users/${id}` : '/api/users', id ? 'PUT' : 'POST', body)} />
            )}
        </div>
    );
}
