// app/dashboard/servicios/page.js
'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Clock, DollarSign, Edit, Trash2, X, Loader2 } from 'lucide-react';

export default function ServiciosPage() {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Estado para el Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentService, setCurrentService] = useState({ name: '', description: '', duration: '', price: '' });
    const [isEditing, setIsEditing] = useState(false);

    // 1. Obtener Servicios
    const fetchServices = async () => {
        try {
            const res = await fetch('/api/services');
            const data = await res.json();
            if (res.ok) setServices(data.services);
        } catch (error) {
            console.error("Error cargando servicios", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchServices();
    }, []);

    // 2. Guardar (Crear o Editar)
    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);

        const method = isEditing ? 'PUT' : 'POST';
        const url = isEditing ? `/api/services/${currentService.id}` : '/api/services';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: currentService.name,
                    description: currentService.description,
                    duration: Number(currentService.duration),
                    price: Number(currentService.price)
                })
            });

            if (res.ok) {
                setIsModalOpen(false);
                fetchServices(); // Recargar la lista
            } else {
                const error = await res.json();
                alert(error.error || "Error al guardar");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // 3. Eliminar Servicio (Soft Delete)
    const handleDelete = async (id) => {
        if (!confirm('¿Estás seguro de eliminar este servicio?')) return;

        try {
            const res = await fetch(`/api/services/${id}`, { method: 'DELETE' });
            if (res.ok) fetchServices();
        } catch (error) {
            console.error(error);
        }
    };

    // Filtrar por búsqueda
    const filteredServices = services.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-20">

            {/* 🟢 CABECERA DEL MÓDULO (Figma) */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <ScissorsIcon /> Servicios
                    </h1>

                    <div className="flex w-full md:w-auto gap-3">
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar servicio..."
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-black transition-colors"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button
                            onClick={() => {
                                setCurrentService({ name: '', description: '', duration: '', price: '' });
                                setIsEditing(false);
                                setIsModalOpen(true);
                            }}
                            className="bg-green-500 text-white px-4 py-2 rounded-xl font-semibold flex items-center gap-2 hover:bg-green-600 transition-colors"
                        >
                            <Plus size={20} /> Agregar
                        </button>
                    </div>
                </div>
            </div>

            {/* 🟢 LISTA DE SERVICIOS (Figma Cards) */}
            {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gray-400" size={40} /></div>
            ) : filteredServices.length === 0 ? (
                <div className="text-center py-20 text-gray-400">No hay servicios registrados.</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredServices.map((service) => (
                        <div key={service.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-800">{service.name}</h3>
                                    <p className="text-sm text-gray-500 line-clamp-2 mt-1">{service.description}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 text-sm text-gray-600 mb-6 bg-gray-50 p-3 rounded-xl">
                                <span className="flex items-center gap-1.5 font-medium">
                                    <Clock size={16} className="text-gray-400" /> {service.duration} min
                                </span>
                                <span className="flex items-center gap-1.5 font-bold text-black">
                                    <DollarSign size={16} className="text-gray-400" /> {service.price.toLocaleString('es-CO')}
                                </span>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        setCurrentService(service);
                                        setIsEditing(true);
                                        setIsModalOpen(true);
                                    }}
                                    className="flex-1 bg-blue-50 text-blue-600 py-2 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 hover:bg-blue-100 transition-colors"
                                >
                                    <Edit size={16} /> Editar
                                </button>
                                <button
                                    onClick={() => handleDelete(service.id)}
                                    className="flex-1 bg-red-50 text-red-600 py-2 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
                                >
                                    <Trash2 size={16} /> Eliminar
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* 🟢 MODAL PARA CREAR/EDITAR (Figma) */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl relative">
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="absolute top-4 right-4 p-2 text-gray-400 hover:bg-gray-100 rounded-full"
                        >
                            <X size={20} />
                        </button>

                        <h2 className="text-xl font-bold mb-6">{isEditing ? 'Editar Servicio' : 'Nuevo Servicio'}</h2>

                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="text-sm font-semibold text-gray-600 mb-1 block">Nombre</label>
                                <input
                                    type="text" required
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-black outline-none"
                                    value={currentService.name}
                                    onChange={(e) => setCurrentService({ ...currentService, name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="text-sm font-semibold text-gray-600 mb-1 block">Descripción</label>
                                <textarea
                                    required rows="2"
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-black outline-none resize-none"
                                    value={currentService.description}
                                    onChange={(e) => setCurrentService({ ...currentService, description: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-semibold text-gray-600 mb-1 block">Duración (min)</label>
                                    <input
                                        type="number" required min="1"
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-black outline-none"
                                        value={currentService.duration}
                                        onChange={(e) => setCurrentService({ ...currentService, duration: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-gray-600 mb-1 block">Precio</label>
                                    <input
                                        type="number" required min="0"
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-black outline-none"
                                        value={currentService.price}
                                        onChange={(e) => setCurrentService({ ...currentService, price: e.target.value })}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-black text-white py-3 rounded-xl font-bold mt-4 hover:bg-gray-800 transition-colors disabled:opacity-50 flex justify-center"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : 'Guardar Servicio'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}

// Icono de tijeras simple para el título
function ScissorsIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><line x1="20" y1="4" x2="8.12" y2="15.88" /><line x1="14.47" y1="14.48" x2="20" y2="20" /><line x1="8.12" y1="8.12" x2="12" y2="12" /></svg>
    )
}