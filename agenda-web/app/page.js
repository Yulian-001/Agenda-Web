// app/page.js
'use client'; 

import { useState } from 'react';
import Link from 'next/link';
import { Scissors, MapPin, Menu, X, LogIn, Home } from 'lucide-react';
import { FaFacebook, FaInstagram, FaTiktok } from 'react-icons/fa6';
import businessData from '../config/business';

export default function HomePage() { 
  const { brand, socials } = businessData;
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <main className="min-h-screen w-full bg-gray-100 flex justify-center items-center font-sans md:p-6 overflow-hidden">
      <div className="w-full max-w-md bg-white min-h-screen md:min-h-[800px] md:rounded-3xl md:shadow-2xl flex flex-col relative overflow-hidden">
        
        {/* BACKDROP */}
        <div 
          className={`absolute inset-0 bg-slate-900/40 z-40 transition-opacity duration-300 ${
            isMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          onClick={() => setIsMenuOpen(false)}
        />

        {/* SIDEBAR PÚBLICO */}
        <div 
          className={`absolute top-0 left-0 h-full w-[260px] bg-white z-50 shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
            isMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="p-5 flex justify-between items-center border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[var(--primary)] text-white rounded-lg flex items-center justify-center font-bold text-sm">
                {brand.logoText.charAt(0)}
              </div>
              <span className="font-bold text-gray-800 tracking-wide">{brand.logoText}</span>
            </div>
            <button onClick={() => setIsMenuOpen(false)} className="p-1 text-gray-400 hover:text-gray-800">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 py-4 px-3 flex flex-col gap-1">
            <Link href="/" className="flex items-center gap-3 text-gray-700 p-3 rounded-xl hover:bg-gray-50">
              <Home size={18} className="text-gray-500" />
              <span className="font-medium text-sm">Inicio</span>
            </Link>
            <Link href="/reserva" className="flex items-center gap-3 text-gray-700 p-3 rounded-xl hover:bg-gray-50">
              <Scissors size={18} className="text-gray-500" />
              <span className="font-medium text-sm">Agendar Cita</span>
            </Link>
          </div>

          <div className="p-4 border-t border-gray-100">
            <Link href="/login" className="flex items-center justify-center gap-2 w-full bg-[var(--primary)] text-white py-3 rounded-xl font-semibold text-sm hover:opacity-90">
              <LogIn size={18} />
              Ingresar al Sistema
            </Link>
          </div>
        </div>

        {/* CONTENIDO PRINCIPAL */}
        <div className="w-full flex justify-start p-6 pb-0">
          <button onClick={() => setIsMenuOpen(true)} className="text-gray-800 p-2 hover:bg-gray-100 rounded-lg">
            <Menu size={28} />
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
          <div className="w-40 h-40 bg-[var(--primary)] rounded-full flex items-center justify-center mb-8 shadow-xl">
            <span className="text-white font-black text-3xl tracking-widest">{brand.logoText}</span>
          </div>
          <h2 className="text-2xl font-light text-gray-500 mb-2">{brand.heroTitle}</h2>
          <p className="text-base text-gray-600 mb-10 max-w-xs">{brand.heroSubtitle}</p>
          <Link href="/reserva" className="flex items-center gap-3 bg-[var(--primary)] text-white px-8 py-4 rounded-full font-semibold text-lg hover:opacity-90 shadow-lg">
            <Scissors size={20} />
            Ver servicios
          </Link>
        </div>

        <div className="flex flex-col items-center gap-4 p-6">
          <div className="flex gap-3">
            <a href={socials.facebook} className="p-2.5 border border-gray-200 rounded-full hover:bg-gray-50"><FaFacebook size={18} className="text-gray-800" /></a>
            <a href={socials.instagram} className="p-2.5 border border-gray-200 rounded-full hover:bg-gray-50"><FaInstagram size={18} className="text-gray-800" /></a>
            <a href={socials.tiktok} className="p-2.5 border border-gray-200 rounded-full hover:bg-gray-50"><FaTiktok size={18} className="text-gray-800" /></a>
          </div>
          <div className="flex items-center gap-1.5 text-gray-400 text-xs">
            <MapPin size={14} /><span>{brand.address}</span>
          </div>
        </div>
      </div>
    </main>
  );
}