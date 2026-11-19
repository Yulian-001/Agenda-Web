import { prisma } from '../utils/prisma';
import { teamBarberRoles } from '../config/barberRoles';
import { barberPhotoSchema } from '../utils/validations';

const barberSelect = {
    id: true,
    name: true,
    phone: true,
    photo: true,
    role: true,
    description: true,
    haveWhatsApp: true,
    commissionRate: true,
    state: true,
    services: {
        select: { service: { select: { id: true, name: true, isActive: true } } }
    }
};

export const getBarbersService = () => prisma.user.findMany({
    where: { archivedAt: null, role: { in: Object.keys(teamBarberRoles) } },
    select: barberSelect,
    orderBy: [{ name: 'asc' }, { id: 'asc' }]
});

async function lockBarber(tx, id, teamOnly) {
    // Coordina las bajas con las reservas en curso y los cambios de perfil.
    const [barber] = await tx.$queryRaw`
        SELECT "role", "photo" FROM "User" WHERE "id" = ${id} AND "archivedAt" IS NULL FOR UPDATE
    `;
    if (!barber || (teamOnly && !Object.hasOwn(teamBarberRoles, barber.role))) {
        throw { statusCode: 404, message: 'Usuario no encontrado' };
    }
    return barber;
}

export async function ensureBarberInOperation(tx, id) {
    const [barber] = await tx.$queryRaw`
        SELECT "id" FROM "User" WHERE "id" = ${id} AND "archivedAt" IS NULL FOR SHARE
    `;
    if (!barber) throw { statusCode: 404, message: 'Barbero no encontrado.' };
}

export async function getServiceAssignments(tx, serviceIds) {
    const ids = [...new Set(serviceIds)];
    if (ids.length === 0) return [];

    const count = await tx.services.count({ where: { id: { in: ids }, isActive: true } });
    if (count !== ids.length) {
        throw { statusCode: 400, message: 'Solo se pueden asignar servicios activos del catálogo.' };
    }

    return ids.map(serviceId => ({ serviceId }));
}

export const updateBarberService = (id, data, teamOnly) => prisma.$transaction(async tx => {
    const barber = await lockBarber(tx, id, teamOnly);
    const { services, ...profile } = data;
    if (teamOnly && !barberPhotoSchema.safeParse(profile.photo ?? barber.photo).success) {
        throw { statusCode: 400, message: 'Agrega una foto válida antes de guardar o reactivar al barbero.' };
    }

    if (services !== undefined) {
        const current = await tx.servicesBarbers.findMany({ where: { barberId: id }, select: { serviceId: true } });
        const assigned = new Set(current.map(item => item.serviceId));
        const added = await getServiceAssignments(tx, services.filter(serviceId => !assigned.has(serviceId)));
        profile.services = {
            deleteMany: { serviceId: { notIn: services } },
            createMany: { data: added }
        };
    }

    return tx.user.update({ where: { id }, data: profile, select: barberSelect });
});

export const deactivateBarberService = (id, { archive = false } = {}) => prisma.$transaction(async tx => {
    await lockBarber(tx, id, true);
    const openAppointments = await tx.appointment.count({
        where: {
            barberId: id,
            state: { in: ['PENDING', 'CONFIRMED'] }
        }
    });

    if (openAppointments) {
        throw {
            statusCode: 409,
            message: `El barbero tiene ${openAppointments} citas pendientes o confirmadas. Cancélalas antes de ${archive ? 'eliminarlo' : 'desactivarlo'}.`
        };
    }

    const data = { state: false };
    if (archive) data.archivedAt = new Date();
    return tx.user.update({ where: { id }, data, select: barberSelect });
});
