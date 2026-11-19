'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthPanel, clientDeadline, inputStyle, PasswordField, postAuth, primary, timeLabel, useRemaining } from './auth-ui';

export default function LoginForm({ recovered }) {
    const router = useRouter();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [retryAt, setRetryAt] = useState(null);
    const remaining = useRemaining(retryAt);

    async function login(event) {
        event.preventDefault();
        if (busy || remaining) return;
        setBusy(true);
        setError('');
        const fields = new FormData(event.currentTarget);
        try {
            await postAuth('login', { phone: fields.get('phone'), password: fields.get('password') });
            router.replace('/dashboard');
        } catch (failure) {
            setError(failure.message);
            setRetryAt(clientDeadline(failure.retryAt, failure.serverTime));
            setBusy(false);
        }
    }

    return <AuthPanel title="Bienvenido a SAMA">
        {recovered && <p role="status" className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">Contraseña actualizada. Ya puedes iniciar sesión.</p>}
        <form onSubmit={login} className="space-y-4">
            <label className="block text-sm font-semibold text-stone-800">
                Usuario (teléfono)
                <input name="phone" type="tel" autoComplete="username" required className={inputStyle + ' mt-1'} />
            </label>
            <PasswordField id="password" name="password" label="Contraseña" autoComplete="current-password" />
            <div className="text-right">
                <Link href="/login/recover" className="text-sm font-semibold text-blue-700 hover:underline">Recuperar contraseña</Link>
            </div>
            {error && (!retryAt || remaining > 0) && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-900">{error}</p>}
            {retryAt && (remaining ? <p className="text-sm text-stone-700">Puedes volver a intentarlo en <strong className="tabular-nums">{timeLabel(remaining)}</strong>.</p> :
                <p role="status" className="text-sm text-stone-700">Ya puedes volver a intentarlo.</p>)}
            <button type="submit" className={primary} disabled={busy || remaining > 0}>{busy ? 'Entrando…' : 'Entrar'}</button>
        </form>
    </AuthPanel>;
}
