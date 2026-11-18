// app/dashboard/page.js
import { CalendarDays, User, ChevronRight } from 'lucide-react';

export default function DashboardPage() {
    return (
        <div className="max-w-5xl mx-auto space-y-6">

            {/* Cabecera de la página */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Panel de Control</h1>
                    <p className="text-gray-500">Bienvenido de nuevo, Administrador</p>
                </div>
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-200">
                    <User size={24} className="text-gray-400" />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Tarjeta 1 */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                        <CalendarDays size={28} />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-gray-500">Citas Hoy</p>
                        <p className="text-2xl font-bold text-gray-800">0</p>
                    </div>
                </div>

                {/* Tarjeta 2 */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="w-14 h-14 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center">
                        <User size={28} />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-gray-500">Barberos Activos</p>
                        <p className="text-2xl font-bold text-gray-800">1</p>
                    </div>
                </div>

                {/* Tarjeta 3 */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center">
                        <ChevronRight size={28} />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-gray-500">Ingresos Mes</p>
                        <p className="text-2xl font-bold text-gray-800">$0</p>
                    </div>
                </div>

            </div>

            {/* Área de trabajo vacía para conectar el Calendario luego */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 min-h-[400px] flex items-center justify-center text-gray-400">
                Aquí irá el widget del Calendario interactivo (Figma)
            </div>

        </div>
    );
}