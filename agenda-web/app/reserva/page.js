// app/reserva/page.js
import { prisma } from '../../utils/prisma';
import { Clock, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default async function ReservaPage() {
    const services = await prisma.services.findMany({
        where: { isActive: true }
    });

    return (
        <main className="min-h-screen w-full bg-gray-100 flex justify-center items-center font-sans md:p-6">
            <div className="w-full max-w-md bg-gray-50 min-h-screen md:min-h-[800px] md:rounded-3xl md:shadow-2xl p-6 overflow-y-auto">

                <div className="flex items-center mb-8 pt-2">
                    <Link href="/" className="p-2 bg-white rounded-full shadow-sm mr-4 hover:bg-gray-100">
                        <ArrowLeft size={24} />
                    </Link>
                    <h1 className="text-2xl font-bold">Nuestros Servicios</h1>
                </div>

                <div className="flex flex-col gap-4 pb-8">
                    {services.map((service) => (
                        <div key={service.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="text-xl font-bold mb-2">{service.name}</h3>
                            <p className="text-gray-500 text-sm mb-4">{service.description}</p>

                            <div className="flex justify-between items-center border-t border-gray-100 pt-4">
                                <div className="flex items-center gap-4 text-gray-600 text-sm">
                                    <span className="flex items-center gap-1">
                                        <Clock size={16} /> {service.duration} min
                                    </span>
                                    <span className="flex items-center gap-1 font-semibold text-black">
                                        ${service.price.toLocaleString('es-CO')}
                                    </span>
                                </div>
                                <Link
                                    href={`/reserva/${service.id}`}
                                    className="bg-black text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-800 transition-colors"
                                >
                                    Seleccionar
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </main>
    );
}