import { prisma } from '../utils/prisma';
import { adminGrantProtection, adminProtection, teamBarberRoles } from '../config/barberRoles';
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
    isOwner: true,
    services: {
        where: { service: { archivedAt: null } },
        select: { service: { select: { id: true, name: true, isActive: true } } }
    }
};

export const getBarbersService = viewerId => prisma.user.findMany({
    where: {
        archivedAt: null, role: { in: Object.keys(teamBarberRoles) },
        OR: [{ isOwner: false }, { role: { not: 'ADMIN' } }, { id: viewerId }]
    },
    select: barberSelect,
    orderBy: [{ name: 'asc' }, { id: 'asc' }]
});

async function lockBarber(tx, id, teamOnly) {
    // Coordina las bajas con las reservas en curso y los cambios de perfil.
    const [barber] = await tx.$queryRaw`
        SELECT "role", "photo", "isOwner", "commissionRate" FROM "User" WHERE "id" = ${id} AND "archivedAt" IS NULL FOR UPDATE
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

    const count = await tx.services.count({ where: { id: { in: ids }, isActive: true, archivedAt: null } });
    if (count !== ids.length) {
        throw { statusCode: 400, message: 'Solo se pueden asignar servicios activos del catálogo.' };
    }

    return ids.map(serviceId => ({ serviceId }));
}

export const updateBarberService = (id, data, teamOnly, actor) => prisma.$transaction(async tx => {
    const barber = await lockBarber(tx, id, teamOnly);
    const { services, ...profile } = data;
    if (profile.commissionRate !== undefined && profile.commissionRate !== barber.commissionRate &&
        ((profile.role ?? barber.role) === 'ADMIN' || (actor.role === 'BARBER_BOSS' && actor.id === id))) {
        throw { statusCode: 403, message: 'Esta cuenta no permite modificar la comisión desde tu perfil.' };
    }
    if (profile.role && profile.role !== barber.role) {
        if (actor.role === 'BARBER_BOSS' && barber.role === 'ADMIN') {
            throw { statusCode: 403, message: adminProtection };
        }
        if (actor.role === 'BARBER_BOSS' && profile.role === 'ADMIN') {
            throw { statusCode: 403, message: adminGrantProtection };
        }
        if (barber.isOwner) throw { statusCode: 403, message: 'No puedes cambiar el rol de la cuenta propietaria.' };
    }
    if (barber.isOwner && barber.role === 'ADMIN' && actor.id !== id) {
        throw { statusCode: 403, message: 'Solo la cuenta propietaria puede editar su perfil.' };
    }
    if (teamOnly && (profile.role ?? barber.role) !== 'ADMIN' && !barberPhotoSchema.safeParse(profile.photo ?? barber.photo).success) {
        throw { statusCode: 400, message: 'Agrega una foto válida antes de guardar o reactivar al barbero.' };
    }

    if (services !== undefined) {
        const current = await tx.servicesBarbers.findMany({ where: { barberId: id }, select: { serviceId: true } });
        const assigned = new Set(current.map(item => item.serviceId));
        const added = await getServiceAssignments(tx, services.filter(serviceId => !assigned.has(serviceId)));
        await tx.servicesBarbers.deleteMany({
            where: { barberId: id, serviceId: { notIn: services }, service: { archivedAt: null } }
        });
        profile.services = { createMany: { data: added } };
    }

    return tx.user.update({ where: { id }, data: profile, select: barberSelect });
});

export const deactivateBarberService = (id, actor, { archive = false } = {}) => prisma.$transaction(async tx => {
    const barber = await lockBarber(tx, id, true);
    if (actor.role === 'BARBER_BOSS' && barber.role === 'ADMIN') {
        throw { statusCode: 403, message: adminProtection };
    }
    if (barber.isOwner) throw { statusCode: 403, message: 'No puedes retirar ni desactivar la cuenta propietaria.' };
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

const affiliateProfileSelect = {
    id: true, name: true, role: true, phone: true, description: true, photo: true,
    services: {
        where: { service: { archivedAt: null } },
        select: { service: { select: { id: true, name: true, isActive: true } } }
    }
};

export const getDashboardProfile = actor => prisma.user.findUniqueOrThrow({
    where: { id: actor.id },
    select: actor.role === 'BARBER_AFFILIATE' ? affiliateProfileSelect : { id: true, name: true, role: true, photo: true }
});

export async function updateAffiliateProfile(id, data) {
    try {
        return await prisma.$transaction(async tx => {
            const [user] = await tx.$queryRaw`
                SELECT "phone" FROM "User"
                WHERE "id" = ${id} AND "state" AND "archivedAt" IS NULL AND "role" = 'BARBER_AFFILIATE' FOR UPDATE
            `;
            if (!user) throw { statusCode: 403, message: 'El perfil ya no está disponible.' };

            const profile = await tx.user.update({ where: { id }, data, select: affiliateProfileSelect });
            if (user.phone !== data.phone) {
                await tx.passwordResetToken.updateMany({
                    where: { phone: { in: [user.phone, data.phone] }, used: false },
                    data: { used: true }
                });
            }
            return profile;
        });
    } catch (error) {
        if (error.code === 'P2002') throw { statusCode: 409, message: 'Ese teléfono ya pertenece a otra cuenta.' };
        throw error;
    }
}
