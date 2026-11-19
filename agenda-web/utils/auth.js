import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { prisma } from './prisma';

export const verifyAuth = async (allowedRoles = []) => {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) throw { statusCode: 401, message: 'No autorizado. Inicie sesión.' };

    let payload;
    try {
        const secret = new TextEncoder().encode(process.env.JWT_SECRET);
        ({ payload } = await jwtVerify(token, secret));
    } catch {
        throw { statusCode: 401, message: 'Token inválido o expirado.' };
    }

    if (typeof payload.id !== 'string') throw { statusCode: 401, message: 'Sesión inválida.' };
    const user = await prisma.user.findUnique({
        where: { id: payload.id },
        select: { id: true, role: true, name: true, state: true, archivedAt: true }
    });
    if (!user?.state || user.archivedAt || user.role !== payload.role) {
        throw { statusCode: 401, message: 'La sesión ya no es válida. Inicie sesión de nuevo.' };
    }
    if (allowedRoles.length && !allowedRoles.includes(user.role)) {
        throw { statusCode: 403, message: 'Acceso denegado. Tu rol no tiene permisos suficientes.' };
    }
    return user;
};
