import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import { prisma } from '../utils/prisma';
import { queueEmail } from '../utils/mail.mjs';

const hash = token => createHash('sha256').update(token).digest('hex');
const duration = 30 * 60 * 1000;
const invalidLink = { statusCode: 400, message: 'El enlace ya no es válido. Solicita una nueva verificación.' };

export async function requestEmailChange(id, email, password) {
    if (!process.env.APP_PUBLIC_URL) throw { statusCode: 503, message: 'Configura el servicio de correo para verificar una dirección.' };
    return prisma.$transaction(async tx => {
        await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${id} FOR UPDATE`;
        const user = await tx.user.findUnique({ where: { id } });
        if (!user?.state || user.archivedAt || !await bcrypt.compare(password, user.password)) {
            throw { statusCode: 403, message: 'La contraseña actual es incorrecta.' };
        }
        if (user.email === email && user.emailVerifiedAt) return 'Ese correo ya está verificado.';
        const now = Date.now();
        if (user.emailChangeExpiresAt?.getTime() > now + duration - 60000) {
            throw { statusCode: 429, message: 'Espera un minuto antes de solicitar otro correo de verificación.' };
        }
        const existing = await tx.user.findUnique({ where: { email }, select: { id: true } });
        if (existing && existing.id !== id) throw { statusCode: 409, message: 'Ese correo ya pertenece a otra cuenta.' };

        const token = randomBytes(32).toString('base64url');
        const digest = hash(token);
        const expiresAt = new Date(now + duration);
        await tx.user.update({
            where: { id }, data: { pendingEmail: email, emailChangeDigest: digest, emailChangeExpiresAt: expiresAt }
        });
        await queueEmail(tx, 'VERIFY_EMAIL', { userId: id, to: email, token, digest }, { expiresAt });
        return 'Se programó el envío del enlace de verificación. Tu correo de recuperación cambiará al confirmarlo.';
    });
}

export async function verifyEmailChange(token) {
    const emailChangeDigest = hash(token);
    try {
        await prisma.$transaction(async tx => {
            const user = await tx.user.findUnique({ where: { emailChangeDigest } });
            if (!user?.pendingEmail) throw invalidLink;
            const now = new Date();
            const result = await tx.user.updateMany({
                where: { id: user.id, emailChangeDigest, emailChangeExpiresAt: { gt: now }, state: true, archivedAt: null },
                data: { email: user.pendingEmail, emailVerifiedAt: now, pendingEmail: null, emailChangeDigest: null, emailChangeExpiresAt: null }
            });
            if (!result.count) throw invalidLink;
            const { phone } = await tx.user.findUniqueOrThrow({ where: { id: user.id }, select: { phone: true } });
            await tx.passwordResetToken.updateMany({ where: { phone, used: false }, data: { used: true } });
        });
    } catch (error) {
        if (error.code === 'P2002') throw { statusCode: 409, message: 'Ese correo ya pertenece a otra cuenta.' };
        throw error;
    }
}
