// services/service.service.js
import { prisma } from '../utils/prisma';

export const createServiceService = async (data) => {
    const { name, description, duration, price } = data;

    // Validación de Negocio: Evitar duplicados
    const existingService = await prisma.services.findFirst({
        where: { name: { equals: name, mode: 'insensitive' } }
    });

    if (existingService) {
        throw { statusCode: 409, message: 'Ya existe un servicio con este nombre' };
    }

    const newService = await prisma.services.create({
        data: { name, description, duration, price }
    });

    return newService;
};


export const getServicesService = async () => {
    // Traemos solo los servicios que no han sido eliminados lógicamente
    const services = await prisma.services.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' } // Ordenados alfabéticamente
    });

    return services;
};

export const updateServiceService = async (id, data) => {
    const service = await prisma.services.findUnique({ where: { id } });
    if (!service) throw { statusCode: 404, message: 'Servicio no encontrado' };

    if (data.name && data.name !== service.name) {
        const existing = await prisma.services.findFirst({
            where: { name: { equals: data.name, mode: 'insensitive' } }
        });
        if (existing) throw { statusCode: 409, message: 'Ya existe otro servicio con ese nombre' };
    }

    return await prisma.services.update({
        where: { id },
        data
    });
};

export const deleteServiceService = async (id) => {
    const service = await prisma.services.findUnique({ where: { id } });
    if (!service) throw { statusCode: 404, message: 'Servicio no encontrado' };

    // Soft delete: solo desactivamos el servicio
    return await prisma.services.update({
        where: { id },
        data: { isActive: false }
    });
};