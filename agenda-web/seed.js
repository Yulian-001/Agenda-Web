import { pathToFileURL } from 'node:url';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { securePasswordMessage, securePasswordPattern } from './config/auth.js';

export async function seedOwner(tx) {
    const existingOwner = await tx.user.findFirst({ where: { isOwner: true }, select: { id: true } });
    if (existingOwner) return false;

    const phone = process.env.SEED_OWNER_PHONE ?? '3144533840';
    const password = process.env.SEED_OWNER_PASSWORD ?? '';
    const role = process.env.SEED_OWNER_ROLE ?? 'ADMIN';
    const photo = process.env.SEED_OWNER_PHOTO ?? '';
    if (!/^3[0-9]{9}$/.test(phone)) throw new Error('Configura un teléfono válido en SEED_OWNER_PHONE.');
    if (!securePasswordPattern.test(password)) throw new Error(securePasswordMessage);
    if (!['ADMIN', 'BARBER_BOSS', 'BARBER_INDEPENDENT'].includes(role)) {
        throw new Error('SEED_OWNER_ROLE debe ser ADMIN, BARBER_BOSS o BARBER_INDEPENDENT.');
    }
    if (role === 'BARBER_INDEPENDENT' && await tx.user.count()) {
        throw new Error('El modo independiente se inicializa en una base sin cuentas de personal.');
    }
    if (role !== 'ADMIN' && !photo) throw new Error('Configura SEED_OWNER_PHOTO para el perfil que atiende citas.');

    const passwordHash = await bcrypt.hash(password, 10);
    const owner = await tx.user.create({
        data: {
            name: process.env.SEED_OWNER_NAME ?? (role === 'ADMIN' ? 'Administrador principal' : 'Profesional titular'),
            phone,
            password: passwordHash,
            role,
            photo,
            description: 'Titular del establecimiento',
            isOwner: true,
            ...(role === 'BARBER_INDEPENDENT' && { commissionRate: 1 })
        },
        select: { id: true }
    });
    if (role === 'BARBER_INDEPENDENT') {
        const catalog = await tx.services.findMany({ where: { archivedAt: null }, select: { id: true } });
        await tx.servicesBarbers.createMany({
            data: catalog.map(service => ({ serviceId: service.id, barberId: owner.id }))
        });
    }
    return true;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const prisma = new PrismaClient();
    try {
        const created = await prisma.$transaction(async tx => {
            await tx.$queryRaw`SELECT 1::int FROM (SELECT pg_advisory_xact_lock(20261121)) AS lock`;
            return seedOwner(tx);
        });
        console.log(created ? 'Cuenta propietaria creada.' : 'La cuenta propietaria ya existe.');
    } catch (error) {
        console.error('No se pudo crear la cuenta propietaria:', error.message);
        process.exitCode = 1;
    } finally {
        await prisma.$disconnect();
    }
}
