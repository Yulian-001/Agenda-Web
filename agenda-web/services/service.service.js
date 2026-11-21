import { publiclyBookable } from '../config/barberRoles';
// services/service.service.js
import { prisma } from '../utils/prisma';

export const createServiceService = async (data, barberId) => {
    const { name, description, duration, price } = data;

    // Validación de Negocio: Evitar duplicados
    const existingService = await prisma.services.findFirst({
        where: { name: { equals: name, mode: 'insensitive' } }
    });

    if (existingService) {
        throw { statusCode: 409, message: 'Ya existe un servicio con este nombre' };
    }

    const newService = await prisma.services.create({
        data: { name, description, duration, price, ...(barberId && { barbers: { create: { barberId } } }) }
    });

    return newService;
};


export const getServicesService = (includeInactive = false) => prisma.services.findMany({
    where: { archivedAt: null, ...(includeInactive ? {} : { isActive: true }) },
    orderBy: [{ name: 'asc' }, { id: 'asc' }]
});

export async function getPublicServiceBarbers(id) {
    const service = await prisma.services.findUnique({
        where: { id, isActive: true, archivedAt: null },
        select: {
            name: true,
            barbers: {
                where: { barber: publiclyBookable },
                orderBy: { barber: { name: 'asc' } },
                select: { barber: { select: { id: true, name: true, photo: true, description: true } } }
            }
        }
    });
    return { serviceName: service?.name ?? null, barbers: service?.barbers.map(item => item.barber) ?? [] };
}

async function updateCurrentService(id, data) {
    try {
        return await prisma.services.update({ where: { id, archivedAt: null }, data });
    } catch (error) {
        if (error.code === 'P2025') throw { statusCode: 404, message: 'Servicio no encontrado' };
        throw error;
    }
}

export const updateServiceService = async (id, data) => {
    const service = await prisma.services.findUnique({ where: { id, archivedAt: null } });
    if (!service) throw { statusCode: 404, message: 'Servicio no encontrado' };

    if (data.name && data.name !== service.name) {
        const existing = await prisma.services.findFirst({
            where: { name: { equals: data.name, mode: 'insensitive' } }
        });
        if (existing) throw { statusCode: 409, message: 'Ya existe otro servicio con ese nombre' };
    }

    return updateCurrentService(id, data);
};

export const archiveService = id => updateCurrentService(id, { isActive: false, archivedAt: new Date() });
