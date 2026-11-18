// app/reserva/agendar/[barberId]/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Calendar as CalendarIcon, Clock, Loader2 } from 'lucide-react';

export default function AgendarPage() {
    const router = useRouter();
    const params = useParams();
    const barberId = params.barberId; // 🛠️ SOLUCIÓN: Obtenemos el ID correctamente

    // Obtener la fecha local actual en formato YYYY-MM-DD (evita desfases de zona horaria)
    const today = new Date();
    const localToday = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split('T')[0];

    const [selectedDate, setSelectedDate] = useState(localToday);
    const [availableSlots, setAvailableSlots] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState(null);

    // Consultar horas disponibles
    useEffect(() => {
        if (!barberId) return;

        const fetchAvailability = async () => {
            setLoading(true);
            setSelectedSlot(null);

            try {
                // cache: 'no-store' asegura que siempre traiga datos frescos de la BD
                const res = await fetch(`/api/public/availability?barberId=${barberId}&date=${selectedDate}`, {
                    cache: 'no-store'
                });
                const data = await res.json();

                if (res.ok) {
                    setAvailableSlots(data.availableSlots);
                } else {
                    setAvailableSlots([]);
                }
            } catch (error) {
                setAvailableSlots([]);
            } finally {
                setLoading(false);
            }
        };

        fetchAvailability();
    }, [barberId, selectedDate]);

    const handleContinue = () => {
        if (selectedSlot) {
            router.push(`/reserva/confirmar?barberId=${barberId}&date=${selectedDate}&time=${selectedSlot}`);
        }
    };

    return (
        <main className="min-h-screen w-full bg-gray-100 flex justify-center items-center font-sans md:p-6">
            <div className="w-full max-w-lg bg-gray-50 min-h-screen md:min-h-[800px] md:rounded-3xl md:shadow-2xl p-6 flex flex-col">

                {/* Header */}
                <div className="flex items-center mb-8 pt-2">
                    <button onClick={() => router.back()} className="p-2 bg-white rounded-full shadow-sm mr-4 hover:bg-gray-100 transition-colors">
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Selecciona Fecha y Hora</h1>
                        <p className="text-sm text-gray-500">Elige el día y la hora para tu cita</p>
                    </div>
                </div>

                {/* Selector de Fecha */}
                <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 mb-8">
                    <label className="flex items-center gap-2 text-gray-700 font-bold mb-3">
                        <CalendarIcon size={20} className="text-black" /> Fecha de la cita
                    </label>
                    <input
                        type="date"
                        className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-black focus:ring-1 focus:ring-black transition-all text-lg font-medium"
                        value={selectedDate}
                        min={localToday}
                        onChange={(e) => setSelectedDate(e.target.value)}
                    />
                </div>

                {/* Horas Disponibles */}
                <div className="flex-1">
                    <label className="flex items-center gap-2 text-gray-700 font-bold mb-4">
                        <Clock size={20} className="text-black" /> Horas disponibles
                    </label>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                            <Loader2 className="animate-spin mb-2" size={32} />
                            <p>Buscando disponibilidad...</p>
                        </div>
                    ) : availableSlots.length === 0 ? (
                        <div className="text-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <p className="text-gray-500 font-medium">No hay horas disponibles para este día.</p>
                            <p className="text-sm text-gray-400 mt-2">Intenta seleccionando otra fecha en el calendario.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 gap-3">
                            {availableSlots.map((slot) => (
                                <button
                                    key={slot}
                                    onClick={() => setSelectedSlot(slot)}
                                    className={`py-4 rounded-xl font-bold transition-all border ${selectedSlot === slot
                                            ? 'bg-black text-white border-black shadow-md scale-105'
                                            : 'bg-white text-gray-700 border-gray-200 hover:border-black'
                                        }`}
                                >
                                    {slot}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Botón Continuar */}
                <div className="pt-6 mt-auto">
                    <button
                        onClick={handleContinue}
                        disabled={!selectedSlot}
                        className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${selectedSlot
                                ? 'bg-black text-white hover:bg-gray-800 shadow-lg'
                                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }`}
                    >
                        Continuar
                    </button>
                </div>

            </div>
        </main>
    );
}