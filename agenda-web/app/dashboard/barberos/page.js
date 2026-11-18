// app/dashboard/barberos/page.js
'use client';

import { useState, useEffect } from 'react';
import { User, Edit, CheckCircle, XCircle, Loader2, X, Camera, Plus, Trash2 } from 'lucide-react';

export default function BarberosPage() {
    const [barbers, setBarbers] = useState([]);
    const [allServices, setAllServices] = useState([]);
    const [loading, setLoading] = useState(true);

    // Estados para Modales
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Estado para Editar
    const [currentBarber, setCurrentBarber] = useState({
        id: '', name: '', description: '', role: 'BARBER_INDEPENDENT',
        photo: '', commissionRate: 0.7, state: true, services: []
    });

    // Estado para Crear
    const [newBarber, setNewBarber] = useState({ name: '', phone: '', password: '', role: 'BARBER_INDEPENDENT', photo: '', description: '', haveWhatsApp: true });

    const fetchData = async () => {
        try {
            const [resBarbers, resServices] = await Promise.all([fetch('/api/users'), fetch('/api/services')]);
            const dataBarbers = await resBarbers.json();
            const dataServices = await resServices.json();
            if (resBarbers.ok) setBarbers(dataBarbers.barbers);
            if (resServices.ok) setAllServices(dataServices.services);
        } catch (error) { console.error(error); } finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    // --- LÓGICA DE EDICIÓN ---
    const openEditModal = (barber) => {
        setCurrentBarber({ ...barber, services: barber.services?.map(s => s.service.id) || [] });
        setIsEditModalOpen(true);
    };

    const handleEditSave = async (e) => {
        e.preventDefault(); setLoading(true);
        try {
            const res = await fetch(`/api/users/${currentBarber.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...currentBarber, commissionRate: Number(currentBarber.commissionRate) })
            });
            if (res.ok) { setIsEditModalOpen(false); fetchData(); } else { alert("Error al actualizar"); }
        } catch (error) { console.error(error); } finally { setLoading(false); }
    };

    // --- LÓGICA DE CREACIÓN ---
    const handleCreateSave = async (e) => {
        e.preventDefault(); setLoading(true);
        try {
            const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newBarber)
            });
            const data = await res.json();
            if (res.ok) {
                setIsCreateModalOpen(false);
                setNewBarber({ name: '', phone: '', password: '', role: 'BARBER_INDEPENDENT', photo: '', description: '', haveWhatsApp: true });
                fetchData();
            } else { alert(data.error || "Error al crear"); }
        } catch (error) { console.error(error); } finally { setLoading(false); }
    };

    // --- LÓGICA DE ESTADO Y ELIMINACIÓN ---
    const handleToggleState = async (barber) => {
        const action = barber.state ? 'desactivar' : 'activar';
        if (!confirm(`¿Estás seguro de ${action} a ${barber.name}?`)) return;
        try {
            if (barber.state) {
                const res = await fetch(`/api/users/${barber.id}`, { method: 'DELETE' });
                if (!res.ok) alert((await res.json()).error); else fetchData();
            } else {
                const res = await fetch(`/api/users/${barber.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ state: true }) });
                if (res.ok) fetchData();
            }
        } catch (error) { console.error(error); }
    };

    const handleHardDelete = async (id) => {
        if (!confirm('¿Estás seguro de ELIMINAR definitivamente a este barbero? Esta acción no se puede deshacer.')) return;
        try {
            const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
            if (!res.ok) alert((await res.json()).error); else fetchData();
        } catch (error) { console.error(error); }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-20">

            {/* Cabecera con botón de Agregar */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <User className="text-[var(--primary)]" /> Gestión de Barberos
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Administra el equipo, sus roles y servicios.</p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="bg-[var(--primary)] text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:opacity-90 transition-opacity"
                >
                    <Plus size={20} /> Agregar Barbero
                </button>
            </div>

            {loading && !isEditModalOpen && !isCreateModalOpen ? (
                <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gray-400" size={40} /></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {barbers.map((barber) => (
                        <div key={barber.id} className={`bg-white rounded-3xl shadow-sm border ${barber.state ? 'border-gray-200' : 'border-red-200 opacity-80'} overflow-hidden`}>
                            <div className="p-6 flex items-center gap-4 border-b border-gray-100">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex-shrink-0 overflow-hidden grayscale-[0.5]">
                                    {barber.photo ? <img src={barber.photo} alt={barber.name} className="w-full h-full object-cover" /> : <User className="w-full h-full p-4 text-gray-400" />}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-800">{barber.name}</h3>
                                    <div className="flex gap-2 mt-1">
                                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${barber.state ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {barber.state ? 'Activo' : 'Inactivo'}
                                        </span>
                                        <span className="text-xs font-bold px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                                            {barber.role.replace('_', ' ')}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 bg-gray-50/50 space-y-3">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500 font-medium">Comisión</span>
                                    <span className="font-bold text-green-600">{(barber.commissionRate * 100).toFixed(0)}%</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500 font-medium">Servicios Asignados</span>
                                    <span className="font-bold text-blue-600">{barber.services?.length || 0}</span>
                                </div>
                            </div>

                            <div className="p-4 border-t border-gray-100 flex gap-2">
                                <button onClick={() => openEditModal(barber)} className="flex-1 bg-blue-50 text-blue-600 py-2 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-blue-100">
                                    <Edit size={16} /> Editar
                                </button>
                                <button
                                    onClick={() => handleToggleState(barber)}
                                    className={`flex-1 py-2 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors ${barber.state ? 'bg-orange-50 text-orange-600 hover:bg-orange-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                                >
                                    {barber.state ? <><XCircle size={16} /> Desactivar</> : <><CheckCircle size={16} /> Activar</>}
                                </button>
                                <button
                                    onClick={() => handleHardDelete(barber.id)}
                                    className="bg-red-100 text-red-700 p-2 rounded-xl hover:bg-red-200 transition-colors"
                                    title="Eliminar Definitivamente"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* --- MODAL DE EDICIÓN (Sin la X) --- */}
            {isEditModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl relative my-8">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100">
                            <h2 className="text-xl font-bold">Editar Perfil</h2>
                        </div>

                        <form onSubmit={handleEditSave} className="p-6 space-y-5">
                            <div className="flex flex-col items-center">
                                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-3 overflow-hidden border-4 border-white shadow-md relative group">
                                    {currentBarber.photo ? <img src={currentBarber.photo} className="w-full h-full object-cover" /> : <Camera size={32} className="text-gray-400" />}
                                </div>
                                <input type="url" placeholder="URL de la foto" className="w-full text-xs p-2 bg-gray-50 border border-gray-200 rounded-lg text-center" value={currentBarber.photo} onChange={(e) => setCurrentBarber({ ...currentBarber, photo: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-sm font-semibold text-gray-600 mb-1 block">Nombre Completo</label>
                                <input type="text" required className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl" value={currentBarber.name} onChange={(e) => setCurrentBarber({ ...currentBarber, name: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-sm font-semibold text-gray-600 mb-1 block">Descripción</label>
                                <textarea required rows="2" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl resize-none" value={currentBarber.description} onChange={(e) => setCurrentBarber({ ...currentBarber, description: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-semibold text-gray-600 mb-1 block">Rol</label>
                                    <select className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl" value={currentBarber.role} onChange={(e) => setCurrentBarber({ ...currentBarber, role: e.target.value })}>
                                        <option value="BARBER_INDEPENDENT">Independiente</option>
                                        <option value="BARBER_AFFILIATE">Afiliado</option>
                                        <option value="BARBER_BOSS">Jefe</option>
                                        <option value="ADMIN">Admin</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-gray-600 mb-1 block">Comisión</label>
                                    <input type="range" min="0" max="1" step="0.05" className="w-full accent-black mt-3" value={currentBarber.commissionRate} onChange={(e) => setCurrentBarber({ ...currentBarber, commissionRate: e.target.value })} />
                                    <span className="text-sm font-bold text-green-600">{(currentBarber.commissionRate * 100).toFixed(0)}%</span>
                                </div>
                            </div>
                            <div className="flex flex-col-reverse md:flex-row gap-3 mt-6">
                                <button type="button" onClick={() => setIsEditModalOpen(false)} className="w-full bg-gray-200 text-gray-700 py-3 rounded-xl font-bold">Cancelar</button>
                                <button type="submit" disabled={loading} className="w-full bg-black text-white py-3 rounded-xl font-bold disabled:opacity-50">{loading ? 'Guardando...' : 'Guardar'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- MODAL DE CREACIÓN --- */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl relative my-8">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100">
                            <h2 className="text-xl font-bold">Nuevo Barbero</h2>
                        </div>
                        <form onSubmit={handleCreateSave} className="p-6 space-y-4">
                            <div>
                                <label className="text-sm font-semibold text-gray-600 mb-1 block">Nombre</label>
                                <input type="text" required className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl" value={newBarber.name} onChange={(e) => setNewBarber({ ...newBarber, name: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-sm font-semibold text-gray-600 mb-1 block">Teléfono (Usuario)</label>
                                <input type="tel" required maxLength="10" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl" value={newBarber.phone} onChange={(e) => setNewBarber({ ...newBarber, phone: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-sm font-semibold text-gray-600 mb-1 block">Contraseña</label>
                                <input type="password" required className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl" value={newBarber.password} onChange={(e) => setNewBarber({ ...newBarber, password: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-sm font-semibold text-gray-600 mb-1 block">URL Foto (Opcional)</label>
                                <input type="url" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl" value={newBarber.photo} onChange={(e) => setNewBarber({ ...newBarber, photo: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-sm font-semibold text-gray-600 mb-1 block">Descripción</label>
                                <textarea required rows="2" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl resize-none" value={newBarber.description} onChange={(e) => setNewBarber({ ...newBarber, description: e.target.value })} />
                            </div>
                            <div className="flex flex-col-reverse md:flex-row gap-3 mt-6">
                                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="w-full bg-gray-200 text-gray-700 py-3 rounded-xl font-bold">Cancelar</button>
                                <button type="submit" disabled={loading} className="w-full bg-[var(--primary)] text-white py-3 rounded-xl font-bold disabled:opacity-50">{loading ? 'Creando...' : 'Crear Barbero'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}