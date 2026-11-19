'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { securePasswordMessage, securePasswordPattern } from '../../../config/auth';
import { AuthPanel, clientDeadline, inputStyle, PasswordField, postAuth, primary, timeLabel, useRemaining } from '../auth-ui';

export default function RecoverPage() {
    const router = useRouter();
    const [step, setStep] = useState('phone');
    const [phone, setPhone] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [expiresAt, setExpiresAt] = useState(null);
    const [resendAt, setResendAt] = useState(null);
    const [notice, setNotice] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const remaining = useRemaining(expiresAt);
    const resendIn = useRemaining(resendAt);
    const expired = Boolean(expiresAt && remaining === 0);

    async function sendCode(event) {
        event.preventDefault();
        if (busy || resendIn) return;
        setBusy(true);
        setError('');
        try {
            const data = await postAuth('forgot-password', { phone });
            setExpiresAt(clientDeadline(data.expiresAt, data.serverTime));
            setResendAt(clientDeadline(data.resendAt, data.serverTime));
            setOtpCode('');
            setNotice(data.message);
            setStep('code');
        } catch (failure) {
            setError(failure.message);
            if (failure.resendAt) setResendAt(clientDeadline(failure.resendAt, failure.serverTime));
        } finally {
            setBusy(false);
        }
    }

    async function verify(event) {
        event.preventDefault();
        if (busy || expired) return;
        setBusy(true);
        setError('');
        try {
            const data = await postAuth('verify-reset-code', { phone, otpCode });
            setExpiresAt(clientDeadline(data.expiresAt, data.serverTime));
            setStep('password');
        } catch (failure) {
            setError(failure.message);
        } finally {
            setBusy(false);
        }
    }

    async function reset(event) {
        event.preventDefault();
        if (busy || expired) return;
        const fields = new FormData(event.currentTarget);
        const newPassword = fields.get('newPassword');
        if (!securePasswordPattern.test(newPassword)) return setError(securePasswordMessage);
        if (newPassword !== fields.get('confirmPassword')) return setError('Las contraseñas deben coincidir.');
        setBusy(true);
        setError('');
        try {
            await postAuth('reset-password', { phone, otpCode, newPassword });
            router.replace('/login?recovered=1');
        } catch (failure) {
            if (failure.code === 'INVALID_CODE') setStep('code');
            setError(failure.message);
            setBusy(false);
        }
    }

    return <AuthPanel title={step === 'password' ? 'Cambia tu contraseña' : 'Recupera tu contraseña'}
        description={step === 'phone' ? 'Ingresa el teléfono que usas para iniciar sesión.' : 'Código solicitado para el número terminado en ' + phone.slice(-4) + '.'}>
        <div className="space-y-4">
            {step === 'phone' ? <form onSubmit={sendCode} className="space-y-4">
                <label className="block text-sm font-semibold">
                    Teléfono
                    <input type="tel" autoComplete="tel-national" value={phone} pattern="[0-9]{10}" maxLength={10} required
                        onChange={event => setPhone(event.target.value)} className={inputStyle + ' mt-1'} />
                </label>
                <button type="submit" className={primary} disabled={busy || resendIn > 0}>
                    {busy ? 'Enviando…' : resendIn ? 'Intenta en ' + timeLabel(resendIn) : 'Enviar código'}
                </button>
            </form> : <>
                {step === 'code' && notice && <p role="status" className="text-sm text-brand-muted">{notice}</p>}
                <div className="rounded-xl bg-brand-background p-3 text-sm font-semibold text-brand-text">
                    {expired ? 'El código ya no es válido. Solicita uno nuevo.' : <>El código vence en <span role="timer" className="tabular-nums">{timeLabel(remaining)}</span>.</>}
                </div>
                {step === 'code' && <form onSubmit={verify} className="space-y-4">
                    <label className="block text-sm font-semibold">
                        Código de seis dígitos
                        <input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" value={otpCode} maxLength={6} required
                            onChange={event => setOtpCode(event.target.value.replace(/[^0-9]/g, ''))} disabled={expired || busy}
                            className={inputStyle + ' mt-1 text-center font-mono text-2xl tracking-[0.35em] disabled:opacity-50'} />
                    </label>
                    <button type="submit" className={primary} disabled={busy || expired || otpCode.length !== 6}>
                        {busy ? 'Verificando…' : 'Verificar código'}
                    </button>
                </form>}
                {step === 'password' && !expired && <form onSubmit={reset} className="space-y-4">
                    <p className="text-sm text-brand-muted">{securePasswordMessage}</p>
                    <PasswordField name="newPassword" id="newPassword" label="Nueva contraseña" autoComplete="new-password" minLength={8} />
                    <PasswordField name="confirmPassword" id="confirmPassword" label="Confirma la contraseña" autoComplete="new-password" minLength={8} />
                    <button type="submit" className={primary} disabled={busy}>{busy ? 'Guardando…' : 'Cambiar contraseña'}</button>
                </form>}
                {(step === 'code' || expired) && <div className="flex flex-wrap justify-between gap-3 text-sm font-semibold">
                    <button type="button" disabled={busy || resendIn > 0} onClick={sendCode} className="text-brand-accent disabled:text-stone-500">
                        {resendIn ? 'Reenviar en ' + timeLabel(resendIn) : 'Reenviar código'}
                    </button>
                    <button type="button" disabled={busy} onClick={() => {
                        setStep('phone');
                        setExpiresAt(null);
                        setResendAt(null);
                        setError('');
                    }} className="text-brand-muted">Cambiar teléfono</button>
                </div>}
            </>}
            {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-900">{error}</p>}
            <Link href="/login" className="block text-center text-sm font-semibold text-brand-muted hover:underline">Volver al inicio de sesión</Link>
        </div>
    </AuthPanel>;
}
