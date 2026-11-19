'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { CalendarDays, Eye, EyeOff, Home, Lock, Menu, X } from 'lucide-react';

export const inputStyle = 'min-h-14 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-stone-950 outline-none focus:border-stone-900 focus:bg-white';
export const primary = 'min-h-12 w-full rounded-xl bg-black px-4 py-3 font-bold text-white hover:bg-stone-800 disabled:opacity-50';

export function clientDeadline(value, serverTime) {
    if (!value) return null;
    const receivedAt = Date.now();
    return { receivedAt, at: receivedAt + (Date.parse(value) - Date.parse(serverTime)) };
}

export function useRemaining(deadline) {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        if (!deadline) return;
        const update = () => setNow(Date.now());
        const id = window.setInterval(update, 250);
        document.addEventListener('visibilitychange', update);
        return () => {
            window.clearInterval(id);
            document.removeEventListener('visibilitychange', update);
        };
    }, [deadline]);
    return deadline ? Math.max(0, Math.ceil((deadline.at - Math.max(now, deadline.receivedAt)) / 1000)) : 0;
}

export const timeLabel = seconds => Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');

export function AuthPanel({ title, description, children }) {
    const menu = useRef(null);
    return <main className="flex min-h-dvh items-center justify-center bg-gray-100 sm:p-6">
        <section className="relative min-h-dvh w-full max-w-xl bg-white px-6 pb-12 pt-20 sm:min-h-0 sm:rounded-3xl sm:px-12 sm:shadow-xl">
            <button type="button" aria-label="Abrir menú" aria-haspopup="dialog" onClick={() => menu.current.showModal()}
                className="absolute left-5 top-5 rounded-lg p-2 text-stone-950 hover:bg-gray-100"><Menu size={28} /></button>
            <dialog ref={menu} aria-labelledby="auth-menu-title" className="fixed inset-0 m-auto w-[min(90vw,22rem)] rounded-2xl bg-white p-5 shadow-2xl backdrop:bg-black/40">
                <div className="mb-3 flex items-center justify-between">
                    <h2 id="auth-menu-title" className="font-bold">Navegación</h2>
                    <button type="button" aria-label="Cerrar menú" onClick={() => menu.current.close()} className="rounded-lg p-2 hover:bg-gray-100"><X size={20} /></button>
                </div>
                <Link href="/" className="flex items-center gap-3 rounded-lg p-3 hover:bg-gray-100"><Home size={19} /> Ir al inicio</Link>
                <Link href="/reserva" className="flex items-center gap-3 rounded-lg p-3 hover:bg-gray-100"><CalendarDays size={19} /> Hacer una reserva</Link>
            </dialog>
            <div className="mb-8 text-center">
                <Image src="/logos/LogoSama.png" alt="SAMA" width={112} height={112} className="mx-auto mb-6 aspect-square rounded-full bg-black object-contain shadow-md" />
                <h1 className="text-2xl font-bold text-stone-950">{title}</h1>
                {description && <p className="mt-2 text-sm text-stone-600">{description}</p>}
            </div>
            {children}
        </section>
    </main>;
}

export function PasswordField({ id, label, autoComplete, ...props }) {
    const [visible, setVisible] = useState(false);
    return <div>
        <label htmlFor={id} className="mb-1 block text-sm font-semibold text-stone-800">{label}</label>
        <div className="relative">
            <Lock size={18} aria-hidden className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-500" />
            <input {...props} id={id} type={visible ? 'text' : 'password'} autoComplete={autoComplete} required
                className={inputStyle + ' pl-11 pr-12'} />
            <button type="button" aria-label={(visible ? 'Ocultar ' : 'Mostrar ') + label.toLowerCase()}
                onClick={() => setVisible(!visible)} className="absolute right-1 top-1/2 -translate-y-1/2 rounded-lg p-3 text-stone-700 hover:bg-gray-200">
                {visible ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
        </div>
    </div>;
}

export async function postAuth(action, payload) {
    const response = await fetch('/api/auth/' + action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) throw Object.assign(new Error(data.error || 'No se pudo completar la solicitud.'), data);
    return data;
}
