'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Scissors, MapPin, Menu, X, LogIn, Home } from 'lucide-react';
import { FaFacebook, FaInstagram, FaTiktok } from 'react-icons/fa6';
import BrandLogo from '../components/BrandLogo';
import business from '../config/business.json';

const socialNetworks = [
  { key: 'facebook', label: 'Facebook', Icon: FaFacebook },
  { key: 'instagram', label: 'Instagram', Icon: FaInstagram },
  { key: 'tiktok', label: 'TikTok', Icon: FaTiktok },
];

export default function HomePage() {
  const { brand, socials } = business;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const links = socialNetworks.filter(({ key }) => socials?.[key]);

  return (
    <main className="flex min-h-dvh w-full items-center justify-center bg-brand-background font-sans md:p-6">
      <div className="relative flex min-h-dvh w-full max-w-4xl flex-col overflow-hidden bg-brand-surface md:min-h-[min(860px,calc(100dvh-3rem))] md:rounded-3xl md:shadow-xl">
        {isMenuOpen && <>
          <div className="absolute inset-0 z-40 bg-black/40" onClick={() => setIsMenuOpen(false)} />
          <nav id="public-navigation" aria-label="Menú principal" className="absolute inset-y-0 left-0 z-50 flex w-65 max-w-full flex-col bg-brand-surface shadow-2xl">
            <div className="flex items-center justify-between gap-2 border-b border-brand-border p-5">
              <BrandLogo size={36} decorative />
              <span className="flex-1 break-words font-bold">{brand.name}</span>
              <button type="button" aria-label="Cerrar menú" onClick={() => setIsMenuOpen(false)} className="rounded-lg p-1 hover:bg-brand-background"><X size={20} /></button>
            </div>
            <div className="flex flex-1 flex-col gap-1 px-3 py-4">
              <Link href="/" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 rounded-xl p-3 hover:bg-brand-background">
                <Home size={18} /> Inicio
              </Link>
              <Link href="/reserva" className="flex items-center gap-3 rounded-xl p-3 hover:bg-brand-background">
                <Scissors size={18} /> Agendar cita
              </Link>
            </div>
            <div className="border-t border-brand-border p-4">
              <Link href="/login" className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-primary py-3 text-sm font-semibold text-brand-on-primary hover:bg-brand-primary-hover">
                <LogIn size={18} /> Ingresar al sistema
              </Link>
            </div>
          </nav>
        </>}

        <div className="p-6 pb-0">
          <button type="button" aria-label="Abrir menú" aria-expanded={isMenuOpen} aria-controls={isMenuOpen ? 'public-navigation' : undefined}
            onClick={() => setIsMenuOpen(true)} className="rounded-lg p-2 hover:bg-brand-background">
            <Menu size={28} />
          </button>
        </div>

        <section className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
          <BrandLogo size={160} eager className="mb-8 shadow-xl" />
          <h1 className="mb-2 text-2xl font-semibold">{brand.heroTitle || brand.name}</h1>
          {brand.heroSubtitle && <p className="max-w-sm text-brand-muted">{brand.heroSubtitle}</p>}
          <Link href="/reserva" className="mt-8 flex items-center gap-3 rounded-full bg-brand-primary px-8 py-4 text-lg font-semibold text-brand-on-primary shadow-lg hover:bg-brand-primary-hover">
            <Scissors size={20} /> Ver servicios
          </Link>
        </section>

        {(links.length > 0 || brand.address) && <footer className="flex flex-col items-center gap-4 p-6 pb-10">
          {links.length > 0 && <div className="flex flex-wrap justify-center gap-3">
            {links.map(({ key, label, Icon }) => <a key={key} href={socials[key]} aria-label={label} className="rounded-full border border-brand-border p-2.5 hover:bg-brand-background">
              <Icon size={18} aria-hidden="true" />
            </a>)}
          </div>}
          {brand.address && <div className="flex items-center gap-1.5 text-xs text-brand-muted">
            <MapPin size={14} aria-hidden="true" /> <span>{brand.address}</span>
          </div>}
        </footer>}
      </div>
    </main>
  );
}
