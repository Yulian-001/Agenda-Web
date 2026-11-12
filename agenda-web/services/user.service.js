// services/user.service.js
import { prisma } from '../utils/prisma';

export const getBarbersService = async () => {
    // Buscamos a todos los usuarios que no sean solo Admins (a menos que también corten pelo)
    return await prisma.user.findMany({
        where: {
            role: { in: ['ADMIN', 'BARBER_BOSS', 'BARBER_AFFILIATE', 'BARBER_INDEPENDENT'] },
            state: true // Solo los activos
        },
        select: {
            id: true,
            name: true,
            phone: true,
            photo: true,
            role: true,
            description: true,
            commissionRate: true,
            services: {
                select: {
                    service: { select: { id: true, name: true } }
                }
            }
        }
    });
};

export const updateBarberService = async (id, data) => {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw { statusCode: 404, message: 'Usuario no encontrado' };

    // Si envían servicios, manejamos la relación N:M
    const updateData = { ...data };
    delete updateData.services; // Lo sacamos temporalmente

    if (data.services && Array.isArray(data.services)) {
        // Borramos las asignaciones anteriores
        await prisma.servicesBarbers.deleteMany({ where: { barberId: id } });

        // Creamos las nuevas asignaciones
        updateData.services = {
            create: data.services.map(serviceId => ({
                service: { connect: { id: serviceId } }
            }))
        };
    }

    return await prisma.user.update({
        where: { id },
        data: updateData
    });
};