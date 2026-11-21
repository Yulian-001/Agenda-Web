'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { inputStyle, PasswordField, primary } from '../../../login/auth-ui';

export default function EmailSettings({ email, pendingEmail, verified }) {
    const router = useRouter();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    async function save(event) {
        event.preventDefault();
        if (busy) return;
        const form = event.currentTarget;
        setBusy(true);
        setError('');
        setMessage('');
        try {
            const res = await fetch('/api/users/me/email', {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(Object.fromEntries(new FormData(form)))
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'No se pudo actualizar el correo.');
            form.reset();
            setMessage(data.message);
            router.refresh();
        } catch (failure) {
            setError(failure.message);
        } finally {
            setBusy(false);
        }
    }

    return <section className="mx-auto max-w-lg space-y-4 rounded-2xl border border-brand-border bg-brand-surface p-5 shadow-sm">
        <h1 className="text-2xl font-bold">Correo de mi cuenta</h1>
        <p className="text-sm text-brand-muted">{email ? email + (verified ? ' · Verificado' : ' · Sin verificar') : 'Agrega un correo para recuperar tu contraseña y recibir avisos.'}</p>
        {pendingEmail && <p className="text-sm text-amber-900">Verificación pendiente para {pendingEmail}.</p>}
        <form className="space-y-4" onSubmit={save}>
            <label className="block text-sm font-semibold">Nuevo correo
                <input name="email" type="email" autoComplete="email" required maxLength={254} className={inputStyle + ' mt-1'} />
            </label>
            <PasswordField label="Contraseña actual" name="password" id="email-password" autoComplete="current-password" />
            {message && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">{message}</p>}
            {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-900">{error}</p>}
            <button type="submit" disabled={busy} className={primary}>{busy ? 'Solicitando…' : 'Verificar nuevo correo'}</button>
        </form>
    </section>;
}
