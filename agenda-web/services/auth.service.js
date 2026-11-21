// services/auth.service.js
import bcrypt from 'bcryptjs';
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { accountLockMs, maxCodeFailures, maxLoginFailures, recoveryDurationMs } from '../config/auth';
import { prisma } from '../utils/prisma';
import jwt from 'jsonwebtoken';
import { queueEmail } from '../utils/mail.mjs';
import { getServiceAssignments } from './user.service';



export const createUserService = async (data) => {
    const { password, services = [], ...profile } = data;
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        return await prisma.$transaction(async tx => {
            await tx.$queryRaw`SELECT 1::int FROM (SELECT pg_advisory_xact_lock(20261121)) AS lock`;
            const soloOwner = await tx.user.findFirst({ where: { isOwner: true, role: 'BARBER_INDEPENDENT' }, select: { id: true } });
            if (soloOwner || profile.role === 'BARBER_INDEPENDENT') {
                throw { statusCode: 403, message: 'La modalidad independiente se configura desde la seed y admite una sola cuenta.' };
            }
            const assignments = await getServiceAssignments(tx, services);
            return tx.user.create({
                data: {
                    ...profile,
                    password: hashedPassword,
                    services: { createMany: { data: assignments } }
                },
                select: { id: true, name: true, phone: true, role: true, createdAt: true }
            });
        });
    } catch (error) {
        if (error.code === 'P2002') {
            throw { statusCode: 409, message: 'Este número de teléfono ya está registrado' };
        }
        throw error;
    }
};

async function lockAccount(tx, phone) {
    const [account] = await tx.$queryRaw`
        SELECT "id" FROM "User" WHERE "phone" = ${phone} AND "state" = true AND "archivedAt" IS NULL FOR UPDATE
    `;
    return account ? tx.user.findUnique({ where: { id: account.id } }) : null;
}

const invalidCredentials = { statusCode: 401, message: 'Credenciales incorrectas' };
const lockedAccount = lockUntil => ({
    statusCode: 403, code: 'ACCOUNT_LOCKED', message: 'Cuenta bloqueada temporalmente por intentos fallidos.', lockUntil
});

export const loginUserService = async (phone, password) => {
    const result = await prisma.$transaction(async tx => {
        const user = await lockAccount(tx, phone);
        if (!user || (user.role === 'BARBER_INDEPENDENT' && !user.isOwner)) return { error: invalidCredentials };
        const now = new Date();
        if (user.lockUntil > now) return { error: lockedAccount(user.lockUntil) };

        if (!await bcrypt.compare(password, user.password)) {
            const failedAttempts = (user.lockUntil ? 0 : user.failedAttempts) + 1;
            const lockUntil = failedAttempts >= maxLoginFailures ? new Date(Date.now() + accountLockMs) : null;
            await tx.user.update({ where: { id: user.id }, data: { failedAttempts, lockUntil } });
            return { error: lockUntil ? lockedAccount(lockUntil) : invalidCredentials };
        }

        await tx.user.update({ where: { id: user.id }, data: { failedAttempts: 0, lockUntil: null } });
        return { user };
    });
    if (result.error) throw result.error;

    const { id, role, name, photo } = result.user;
    const token = jwt.sign({ id, role, name }, process.env.JWT_SECRET, { expiresIn: '1d' });
    return { token, user: { id, role, name, photo } };
};

function codeDigest(phone, code) {
    return createHmac('sha256', process.env.JWT_SECRET).update('password-recovery:' + phone + ':' + code).digest();
}

export function ensureRecoveryAvailable() {
    if (!process.env.APP_PUBLIC_URL) {
        throw { statusCode: 503, message: 'La recuperación por código todavía no está disponible. Contacta al administrador.' };
    }
}

export const generateOTPService = async (phone, requestedAt, expiresAt) => {
    ensureRecoveryAvailable();
    await prisma.$transaction(async tx => {
        const account = await lockAccount(tx, phone);
        if (!account?.email || !account.emailVerifiedAt || expiresAt <= new Date()) return;

        const newer = await tx.passwordResetToken.findFirst({
            where: { phone, createdAt: { gte: requestedAt } }, select: { id: true }
        });
        if (newer) return;

        const otp = String(randomInt(1000000)).padStart(6, '0');
        await tx.passwordResetToken.updateMany({ where: { phone, used: false }, data: { used: true } });
        const token = await tx.passwordResetToken.create({
            data: { phone, otpCode: codeDigest(phone, otp).toString('hex'), expiresAt, createdAt: requestedAt }
        });
        await queueEmail(tx, 'RECOVERY', { userId: account.id, to: account.email, tokenId: token.id, code: otp }, { expiresAt });
    });
};

const invalidRecoveryCode = {
    statusCode: 400, code: 'INVALID_CODE',
    message: 'El código no es válido. Revisa los dígitos o solicita uno nuevo.'
};
const emptyDigest = Buffer.alloc(32);

async function processRecoveryCode(phone, otpCode, newPassword) {
    ensureRecoveryAvailable();
    const startedAt = performance.now();
    const result = await prisma.$transaction(async tx => {
        const account = await lockAccount(tx, phone);
        const now = new Date();
        const token = await tx.passwordResetToken.findFirst({
            where: { phone, used: false, expiresAt: { gt: now }, createdAt: { gt: new Date(now.getTime() - recoveryDurationMs) } },
            orderBy: { createdAt: 'desc' }
        });
        const stored = token ? Buffer.from(token.otpCode, 'hex') : emptyDigest;
        const expected = codeDigest(phone, otpCode);
        const matches = timingSafeEqual(stored.length === expected.length ? stored : emptyDigest, expected);
        if (!account?.emailVerifiedAt || !token) return null;
        if (!matches) {
            const failedAttempts = token.failedAttempts + 1;
            await tx.passwordResetToken.update({
                where: { id: token.id }, data: { failedAttempts, used: failedAttempts >= maxCodeFailures }
            });
            return null;
        }

        if (newPassword === undefined) return { message: 'Código verificado', expiresAt: token.expiresAt };
        const password = await bcrypt.hash(newPassword, 10);
        if (token.expiresAt <= new Date() || token.createdAt.getTime() + recoveryDurationMs <= Date.now()) return null;

        await tx.user.update({ where: { id: account.id }, data: { password, failedAttempts: 0, lockUntil: null } });
        await tx.passwordResetToken.update({ where: { id: token.id }, data: { used: true } });
        return { message: 'Contraseña actualizada' };
    });

    if (result) return result;
    // Pad rejected attempts outside the transaction so response time exposes less account state.
    await delay(Math.max(0, 100 - (performance.now() - startedAt)));
    throw invalidRecoveryCode;
}

export const verifyRecoveryCodeService = (phone, otpCode) => processRecoveryCode(phone, otpCode);
export const resetPasswordService = (phone, otpCode, newPassword) => processRecoveryCode(phone, otpCode, newPassword);
