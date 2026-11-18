// app/login/page.js
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, User, Scissors, Loader2 } from 'lucide-react';
import Link from 'next/link';
import businessData from '../../config/business'; // Usamos la config del negocio

export default function LoginPage() {
    const router = useRouter();
    const { brand } = businessData;

    const [formData, setFormData] = useState({ phone: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg('');

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Error al iniciar sesión');
            }

            // Si el login es exitoso, el backend guarda la cookie.
            // Redirigimos al futuro panel de administración.
            router.push('/dashboard');

        } catch (error) {
            setErrorMsg(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen w-full bg-gray-100 flex justify-center items-center font-sans md:p-6">
            <div className="w-full max-w-md bg-white min-h-screen md:min-h-[800px] md:rounded-3xl md:shadow-2xl p-6 flex flex-col justify-center relative overflow-hidden">

                {/* Botón de menú (hamburguesa) simulado para diseño */}
                <div className="absolute top-6 left-6">
                    <Link href="/" className="text-black p-2 hover:bg-gray-100 rounded-md transition-colors flex items-center justify-center">
                        {/* Icono SVG del menú hamburguesa */}
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="18" y2="18" /></svg>
                    </Link>
                </div>

                <div className="flex flex-col items-center text-center mb-10">
                    {/* Logo Circular */}
                    <div className="w-32 h-32 bg-black rounded-full flex items-center justify-center mb-6 shadow-lg">
                        <span className="text-white font-black text-2xl tracking-widest">{brand.logoText}</span>
                    </div>
                    <h2 className="text-xl font-light text-gray-500">Bienvenido a {brand.name}</h2>
                </div>

                {errorMsg && (
                    <div className="bg-red-50 text-red-500 p-4 rounded-xl mb-6 text-sm font-medium border border-red-100 text-center">
                        {errorMsg}
                    </div>
                )}

                <form onSubmit={handleLogin} className="flex flex-col gap-4">
                    <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="tel"
                            required
                            placeholder="Usuario (Teléfono)"
                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-black focus:bg-white transition-colors"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                    </div>

                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="password"
                            required
                            placeholder="Contraseña"
                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-black focus:bg-white transition-colors"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        />
                    </div>

                    <div className="flex justify-end mt-2 mb-4">
                        <Link href="/login/recover" className="text-sm text-blue-600 hover:underline">
                            Recuperar contraseña
                        </Link>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-black text-white rounded-xl font-bold text-lg hover:bg-gray-800 transition-all disabled:opacity-50 flex justify-center items-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : 'Entrar'}
                    </button>
                </form>

            </div>
        </main>
    );
}