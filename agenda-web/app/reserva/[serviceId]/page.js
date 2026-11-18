// app/reserva/[serviceId]/page.js
import { prisma } from '../../../utils/prisma';
import Link from 'next/link';
import { ArrowLeft, User } from 'lucide-react';

export default async function BarberosPage({ params }) {
    const resolvedParams = await params;
    const { serviceId } = resolvedParams;

    const service = await prisma.services.findUnique({
        where: { id: serviceId },
        include: {
            barbers: { include: { barber: true } }
        }
    });

    if (!service) return <div className="p-6 text-center">Servicio no encontrado</div>;

    // Filtramos solo los barberos que están activos
    const activeBarbers = service.barbers
        .map(sb => sb.barber)
        .filter(barber => barber.state === true);

    return (
        <main className="min-h-screen w-full bg-gray-100 flex justify-center items-center font-sans md:p-6">
            {/* Contenedor principal un poco más ancho (max-w-lg) para que las tarjetas respiren mejor */}
            <div className="w-full max-w-lg bg-gray-50 min-h-screen md:min-h-[800px] md:rounded-3xl md:shadow-2xl p-6 overflow-y-auto">

                {/* Header sin Logo, solo botón de retroceso y título */}
                <div className="flex items-center mb-8 pt-2">
                    <Link href="/reserva" className="p-2 bg-white rounded-full shadow-sm mr-4 hover:bg-gray-100 transition-colors">
                        <ArrowLeft size={24} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Nuestros Barberos</h1>
                        <p className="text-sm text-gray-500">
                            Profesionales disponibles para: <span className="font-semibold text-black">{service.name}</span>
                        </p>
                    </div>
                </div>

                {/* Lista de Barberos en una sola columna amplia */}
                <div className="flex flex-col gap-6 pb-8">
                    {activeBarbers.length === 0 ? (
                        <p className="text-center text-gray-500 mt-10">No hay barberos disponibles para este servicio aún.</p>
                    ) : (
                        activeBarbers.map((barber) => (
                            <div
                                key={barber.id}
                                className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center text-center transition-all hover:shadow-md"
                            >
                                {/* Foto del Barbero (más grande y centrada) */}
                                <div className="w-28 h-28 bg-gray-100 rounded-full flex-shrink-0 overflow-hidden mb-4 border-4 border-white shadow-inner">
                                    {barber.photo ? (
                                        <img src={barber.photo} alt={barber.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <User className="w-full h-full p-6 text-gray-400" />
                                    )}
                                </div>

                                {/* Información */}
                                <h3 className="font-bold text-xl text-gray-800 mb-1">{barber.name}</h3>
                                <p className="text-sm text-gray-500 mb-6 px-4">
                                    {barber.description || 'Profesional listo para atenderte'}
                                </p>

                                {/* Botón de acción (Ocupa un buen ancho para que sea fácil de tocar) */}
                                <Link
                                    href={`/reserva/agendar/${barber.id}`}
                                    className="w-full max-w-[200px] bg-black text-white py-3 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors"
                                >
                                    Elegir Barbero
                                </Link>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </main>
    );
}