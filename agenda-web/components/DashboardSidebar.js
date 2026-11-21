// components/DashboardSidebar.js
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Menu, X, CalendarDays, CalendarCheck, User,
    Scissors, Clock, BarChart3, LogOut, Mail
} from 'lucide-react';
import BrandLogo from './BrandLogo';
import business from '../config/business.json';
import AffiliateProfileDialog from './AffiliateProfileDialog';
import { catalogManagers, roleLabels, teamManagers } from '../config/barberRoles';

const menuItems = [
    { name: 'Calendario', icon: CalendarDays, path: '/dashboard' },
    { name: 'Reservas Día', icon: CalendarCheck, path: '/dashboard/reservas' },
    { name: 'Barberos', icon: User, path: '/dashboard/barberos', allowedRoles: teamManagers },
    { name: 'Servicios', icon: Scissors, path: '/dashboard/servicios', allowedRoles: catalogManagers },
    { name: 'Agenda', icon: Clock, path: '/dashboard/agenda', allowedRoles: catalogManagers },
    { name: 'Contabilidad', icon: BarChart3, path: '/dashboard/contabilidad' },
    { name: 'Mi correo', icon: Mail, path: '/dashboard/cuenta/correo' },
];

function ProfileCard({ profile, onEdit }) {
    const { name, role, photo } = profile;
    const details = <>
        <span className="relative grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-brand-on-primary/15">
            <User size={20} aria-hidden="true" />
            {photo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={photo} src={photo} alt="" className="absolute inset-0 size-full object-cover"
                    onError={event => { event.currentTarget.hidden = true; }} />
            )}
        </span>
        <span className="min-w-0">
            <span className="block break-words text-sm font-bold">{name}</span>
            <span className="block text-xs text-brand-on-primary/80">{roleLabels[role]}</span>
        </span>
    </>;
    const style = 'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left';
    return <div className="shrink-0 border-b border-brand-on-primary/15 px-3 py-3">
        {role === 'BARBER_AFFILIATE'
            ? <button type="button" aria-label={'Editar perfil de ' + name} aria-haspopup="dialog" onClick={onEdit}
                className={style + ' hover:bg-brand-on-primary/10'}>{details}</button>
            : <div className={style}>{details}</div>}
    </div>;
}

function SidebarContent({ profile, onEdit, onNavigate }) {
    const { role } = profile;
    const pathname = usePathname();
    return (
        <>
            <div className="flex min-h-24 shrink-0 flex-col items-center justify-center gap-1 border-b border-brand-on-primary/15 px-6 py-3 text-center">
                <BrandLogo size={54} decorative />
                <span className="wrap-break-word max-w-full text-sm font-bold tracking-wide">{business.brand.name}</span>
            </div>

            <ProfileCard profile={profile} onEdit={onEdit} />

            {/* Menú */}
            <nav className="flex-1 py-4 px-3 flex flex-col gap-2 overflow-y-auto">
                {menuItems.filter(item => !item.allowedRoles || item.allowedRoles.includes(role)).map((item) => (
                    <Link
                        key={item.name}
                        href={item.path}
                        onClick={onNavigate}
                        aria-current={pathname === item.path ? 'page' : undefined}
                        className={`flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-brand-on-primary/10 transition-colors text-brand-on-primary/85 hover:text-brand-on-primary group ${pathname === item.path ? 'bg-brand-on-primary/10 text-brand-on-primary' : ''}`}
                    >
                        <div className="p-2 bg-brand-on-primary/10 rounded-lg group-hover:bg-brand-on-primary/15 transition-colors">
                            <item.icon size={20} className="text-brand-on-primary" />
                        </div>
                        <span className="font-medium text-sm">{item.name}</span>
                    </Link>
                ))}
            </nav>

            {/* Cerrar Sesión */}
            <div className="p-4 border-t border-brand-on-primary/15 shrink-0">
                <a
                    href="/api/auth/logout"
                    className="flex items-center justify-center gap-3 w-full px-4 py-3 rounded-xl bg-rose-50 text-rose-900 hover:bg-rose-100 transition-colors"
                >
                    <LogOut size={18} />
                    <span className="font-semibold text-sm">Cerrar Sesión</span>
                </a>
            </div>
        </>
    );
}

export default function DashboardSidebar({ profile, children }) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [editing, setEditing] = useState(false);
    const editProfile = () => setEditing(true);

    return (
        <div className="flex h-screen bg-brand-background font-sans">

            {/* 🖥️ SIDEBAR ESCRITORIO (Fijo) */}
            <aside className="w-72 bg-brand-primary text-brand-on-primary hidden md:flex flex-col shadow-2xl z-20">
                <SidebarContent profile={profile} onEdit={editProfile} onNavigate={() => setIsMobileMenuOpen(false)} />
            </aside>

            {/* 📱 BACKDROP MÓVIL (Fondo oscuro para cerrar al tocar) */}
            <div
                className={`fixed inset-0 bg-black/60 z-40 md:hidden transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
                onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* 📱 SIDEBAR MÓVIL (Deslizable) */}
            <aside
                className={`fixed top-0 left-0 h-full w-72 bg-brand-primary text-brand-on-primary z-50 shadow-2xl flex flex-col transition-transform duration-300 md:hidden ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                <div className="absolute top-4 right-4 z-10">
                    <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-brand-on-primary/80 hover:text-brand-on-primary rounded-full">
                        <X size={24} />
                    </button>
                </div>
                <SidebarContent profile={profile} onEdit={editProfile} onNavigate={() => setIsMobileMenuOpen(false)} />
            </aside>

            {editing && profile.role === 'BARBER_AFFILIATE' && <AffiliateProfileDialog profile={profile}
                onClose={() => setEditing(false)} />}

            {/* 🟢 CONTENIDO PRINCIPAL */}
            <div className="flex-1 flex flex-col h-full overflow-hidden ">

                {/* 📱 HEADER MÓVIL (Con botón de menú) */}
                <header className="md:hidden bg-brand-primary h-16 flex items-center justify-between px-6  text-brand-on-primary z-10 shrink-0">
                    <div className="flex items-center gap-3 ">
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="p-1 -ml-2 text-brand-on-primary hover:bg-brand-on-primary/10 rounded-lg transition-colors"
                        >
                            <Menu size={28} />
                        </button>
                    </div>
                    <div className="flex min-w-0 items-center gap-2">
                        <BrandLogo size={34} decorative eager />
                        <span className="truncate font-bold tracking-wide">{business.brand.name}</span>
                    </div>
                </header>

                {/* Área de Trabajo */}
                <main className="flex-1 overflow-y-auto bg-brand-background p-4 md:p-6 relative">
                    {children}
                </main>
            </div>
        </div>
    );
}
