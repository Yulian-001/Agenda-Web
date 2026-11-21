'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import BarberPhotoField from './BarberPhotoField';
import { announceScheduleChange } from '../utils/liveSchedule';

const field = 'mt-1 block w-full rounded-xl border border-brand-border bg-brand-background px-3 py-2';

export default function AffiliateProfileDialog({ profile, onClose }) {
    const dialog = useRef(null);
    const router = useRouter();
    const [photo, setPhoto] = useState(profile.photo);
    const [processing, setProcessing] = useState(false);
    const [readyPhoto, setReadyPhoto] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    useEffect(() => {
        const modal = dialog.current;
        modal.showModal();
        return () => modal.close();
    }, []);

    async function save(event) {
        event.preventDefault();
        if (busy || processing) return;
        if (photo !== profile.photo && photo !== readyPhoto) {
            setError('Verifica que la foto se vea en la vista previa.');
            return;
        }
        setBusy(true);
        setError('');
        const fields = Object.fromEntries(new FormData(event.currentTarget));
        try {
            const response = await fetch('/api/users/me', {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...fields, photo })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'No se pudo guardar el perfil.');
            announceScheduleChange();
            onClose();
            router.refresh();
        } catch (failure) {
            setError(failure.message);
        } finally {
            setBusy(false);
        }
    }

    return <dialog ref={dialog} aria-labelledby="affiliate-profile-title" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}
        className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl bg-brand-surface p-5 text-brand-text shadow-xl backdrop:bg-black/55 sm:p-6">
        <header className="mb-4 flex items-center justify-between gap-2">
            <h2 id="affiliate-profile-title" className="text-xl font-bold">Mi perfil</h2>
            <button type="button" onClick={onClose} disabled={busy} aria-label="Cerrar perfil" className="rounded-lg p-2 hover:bg-brand-background"><X size={20} /></button>
        </header>
        <form onSubmit={save} className="space-y-4">
            <fieldset disabled={busy} className="space-y-3">
                <label className="block text-sm font-semibold">Nombre <input name="name" defaultValue={profile.name} required minLength={2} className={field} /></label>
                <label className="block text-sm font-semibold">Teléfono de ingreso <input name="phone" defaultValue={profile.phone} type="tel" autoComplete="tel-national" required pattern="3[0-9]{9}" className={field} /></label>
                <label className="block text-sm font-semibold">Descripción <textarea name="description" defaultValue={profile.description} rows={2} required minLength={5} className={field} /></label>
                <BarberPhotoField photo={photo} onChange={setPhoto} onReady={setReadyPhoto} processing={processing} onProcessing={setProcessing} />
            </fieldset>
            <section aria-labelledby="assigned-services-title" className="rounded-xl border border-brand-border p-3 text-sm">
                <h3 id="assigned-services-title" className="font-bold">Servicios asignados</h3>
                {profile.services.length ? <ul className="mt-2 list-disc space-y-1 pl-5">
                    {profile.services.map(({ service }) => <li key={service.id}>{service.name}{!service.isActive && ' · Inactivo'}</li>)}
                </ul> : <p className="mt-1 text-brand-muted">Todavía no tienes servicios asignados.</p>}
            </section>
            {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-900">{error}</p>}
            <button type="submit" disabled={busy || processing} className="w-full rounded-xl bg-brand-primary p-3 font-bold text-brand-on-primary disabled:opacity-50">
                {busy ? 'Guardando…' : 'Guardar cambios'}
            </button>
        </form>
    </dialog>;
}
