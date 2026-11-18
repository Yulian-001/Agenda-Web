// components/DashboardSidebar.js
'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
    Menu, X, CalendarDays, CalendarCheck, User,
    Scissors, Clock, BarChart3, LogOut
} from 'lucide-react';
import businessData from '../config/business';

export default function DashboardSidebar({ userName, children }) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const menuItems = [
        { name: 'Calendario', icon: CalendarDays, path: '/dashboard' },
        { name: 'Reservas Día', icon: CalendarCheck, path: '/dashboard/reservas' },
        { name: 'Barberos', icon: User, path: '/dashboard/barberos' },
        { name: 'Servicios', icon: Scissors, path: '/dashboard/servicios' },
        { name: 'Agenda', icon: Clock, path: '/dashboard/agenda' },
        { name: 'Contabilidad', icon: BarChart3, path: '/dashboard/contabilidad' },
    ];

    // Extraemos el contenido del menú para no duplicar código entre Desktop y Mobile
    const SidebarContent = () => (
        <>
            {/* Logo */}
            <div className="h-24 flex flex-col items-center justify-center border-b border-gray-700/50 pt-4 shrink-0">
                <div className="w-16 h-16 bg-white text-[var(--primary)] rounded-full flex items-center justify-center font-black text-xl shadow-lg mb-2">
                    {businessData.brand.logoText.charAt(0)}
                </div>
                <span className="text-sm font-bold tracking-widest text-gray-300">SAMA</span>
            </div>

            {/* Bienvenida */}
            <div className="px-6 py-4 text-center border-b border-gray-700/50 shrink-0">
                <p className="text-sm text-gray-400">Bienvenido</p>
                <p className="font-bold text-lg text-white uppercase">{userName}</p>
            </div>

            {/* Menú */}
            <nav className="flex-1 py-4 px-3 flex flex-col gap-2 overflow-y-auto">
                {menuItems.map((item) => (
                    <Link
                        key={item.name}
                        href={item.path}
                        onClick={() => setIsMobileMenuOpen(false)} // Cierra el menú al hacer clic en móvil
                        className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-white/10 transition-colors text-gray-300 hover:text-white group"
                    >
                        <div className="p-2 bg-gray-800/50 rounded-lg group-hover:bg-[var(--primary)] transition-colors">
                            <item.icon size={20} className="text-white" />
                        </div>
                        <span className="font-medium text-sm">{item.name}</span>
                    </Link>
                ))}
            </nav>

            {/* Cerrar Sesión */}
            <div className="p-4 border-t border-gray-700/50 shrink-0">
                <Link
                    href="/api/auth/logout"
                    className="flex items-center justify-center gap-3 w-full px-4 py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                >
                    <LogOut size={18} />
                    <span className="font-semibold text-sm">Cerrar Sesión</span>
                </Link>
            </div>
        </>
    );

    return (
        <div className="flex h-screen bg-gray-100 font-sans">

            {/* 🖥️ SIDEBAR ESCRITORIO (Fijo) */}
            <aside className="w-72 bg-[var(--primary)] text-white hidden md:flex flex-col shadow-2xl z-20">
                <SidebarContent />
            </aside>

            {/* 📱 BACKDROP MÓVIL (Fondo oscuro para cerrar al tocar) */}
            <div
                className={`fixed inset-0 bg-black/60 z-40 md:hidden transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
                onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* 📱 SIDEBAR MÓVIL (Deslizable) */}
            <aside
                className={`fixed top-0 left-0 h-full w-72 bg-[var(--primary)] text-white z-50 shadow-2xl flex flex-col transition-transform duration-300 md:hidden ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                <div className="absolute top-4 right-4 z-10">
                    <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-gray-400 hover:text-white rounded-full">
                        <X size={24} />
                    </button>
                </div>
                <SidebarContent />
            </aside>

            {/* 🟢 CONTENIDO PRINCIPAL */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">

                {/* 📱 HEADER MÓVIL (Con botón de menú) */}
                <header className="md:hidden bg-[var(--primary)] h-16 flex items-center justify-between px-6 text-white z-10 shrink-0">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="p-1 -ml-2 text-white hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <Menu size={28} />
                        </button>
                        <span className="font-black tracking-widest">SAMA</span>
                    </div>
                    <Link href="/api/auth/logout" className="text-red-400 hover:text-red-300">
                        <LogOut size={24} />
                    </Link>
                </header>

                {/* Área de Trabajo */}
                <main className="flex-1 overflow-y-auto bg-gray-50 p-4 md:p-6 relative">
                    {children}
                </main>
            </div>
        </div>
    );
}