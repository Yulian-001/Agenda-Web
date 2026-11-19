// services/auth.service.js
import bcrypt from 'bcryptjs';
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { accountLockMs, maxCodeFailures, maxLoginFailures, recoveryDurationMs, recoveryResendMs } from '../config/auth';
import { prisma } from '../utils/prisma';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import { getServiceAssignments } from './user.service';



export const createUserService = async (data) => {
    const { password, services = [], ...profile } = data;
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        return await prisma.$transaction(async tx => {
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
        if (!user) return { error: invalidCredentials };
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

function ensureRecoveryAvailable() {
    if (process.env.NODE_ENV === 'production') {
        throw { statusCode: 503, message: 'La recuperación por código todavía no está disponible. Contacta al administrador.' };
    }
}

export const generateOTPService = async phone => {
    ensureRecoveryAvailable();
    const result = await prisma.$transaction(async tx => {
        const account = await lockAccount(tx, phone);
        const now = Date.now();
        if (!account) return { expiresAt: new Date(now + recoveryDurationMs), resendAt: new Date(now + recoveryResendMs) };

        const previous = await tx.passwordResetToken.findFirst({
            where: { phone }, orderBy: { createdAt: 'desc' }, select: { createdAt: true, expiresAt: true }
        });
        if (previous && previous.createdAt.getTime() + recoveryResendMs > now) {
            return { expiresAt: previous.expiresAt, resendAt: new Date(previous.createdAt.getTime() + recoveryResendMs) };
        }

        const code = String(randomInt(1000000)).padStart(6, '0');
        const expiresAt = new Date(now + recoveryDurationMs);
        await tx.passwordResetToken.updateMany({ where: { phone, used: false }, data: { used: true } });
        await tx.passwordResetToken.create({
            data: { phone, otpCode: codeDigest(phone, code).toString('hex'), expiresAt }
        });
        return { code, expiresAt, resendAt: new Date(now + recoveryResendMs) };
    });

    if (result.code) logger.dev(`OTP PARA ${phone}: [ ${result.code} ]`);
    return {
        message: 'Si el teléfono está registrado, el código de prueba aparece en la terminal de desarrollo.',
        expiresAt: result.expiresAt, resendAt: result.resendAt
    };
};

async function processRecoveryCode(phone, otpCode, newPassword) {
    ensureRecoveryAvailable();
    const result = await prisma.$transaction(async tx => {
        const account = await lockAccount(tx, phone);
        const now = new Date();
        const token = account && await tx.passwordResetToken.findFirst({
            where: { phone, used: false, expiresAt: { gt: now }, createdAt: { gt: new Date(now.getTime() - recoveryDurationMs) } },
            orderBy: { createdAt: 'desc' }
        });
        if (!token) return { error: { statusCode: 400, code: 'CODE_UNAVAILABLE', message: 'El código venció o ya fue utilizado. Solicita uno nuevo.' } };

        const stored = Buffer.from(token.otpCode, 'hex');
        const expected = codeDigest(phone, otpCode);
        if (stored.length !== expected.length || !timingSafeEqual(stored, expected)) {
            const failedAttempts = token.failedAttempts + 1;
            const used = failedAttempts >= maxCodeFailures;
            await tx.passwordResetToken.update({ where: { id: token.id }, data: { failedAttempts, used } });
            return { error: {
                statusCode: 400, code: used ? 'CODE_UNAVAILABLE' : 'INVALID_CODE',
                message: used ? 'Agotaste los intentos. Solicita un código nuevo.' : 'El código ingresado es incorrecto.'
            } };
        }

        if (newPassword === undefined) return { message: 'Código verificado', expiresAt: token.expiresAt };
        const password = await bcrypt.hash(newPassword, 10);
        if (token.expiresAt <= new Date() || token.createdAt.getTime() + recoveryDurationMs <= Date.now()) {
            return { error: { statusCode: 400, code: 'CODE_UNAVAILABLE', message: 'El código venció. Solicita uno nuevo.' } };
        }
        await tx.user.update({ where: { id: account.id }, data: { password, failedAttempts: 0, lockUntil: null } });
        await tx.passwordResetToken.update({ where: { id: token.id }, data: { used: true } });
        return { message: 'Contraseña actualizada' };
    });
    if (result.error) throw result.error;
    return result;
}

export const verifyRecoveryCodeService = (phone, otpCode) => processRecoveryCode(phone, otpCode);
export const resetPasswordService = (phone, otpCode, newPassword) => processRecoveryCode(phone, otpCode, newPassword);
