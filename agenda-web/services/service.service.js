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