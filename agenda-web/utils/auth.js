// utils/auth.js
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

export const verifyAuth = async (allowedRoles = []) => {
    // 1. Obtener la cookie
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
        throw { statusCode: 401, message: "No autorizado. Inicie sesión." };
    }

    try {
        // 2. Verificar token
        const secret = new TextEncoder().encode(process.env.JWT_SECRET);
        const { payload } = await jwtVerify(token, secret);

        // 3. Verificar roles (RBAC)
        if (allowedRoles.length > 0 && !allowedRoles.includes(payload.role)) {
            throw {
                statusCode: 403,
                message: "Acceso denegado. Tu rol no tiene permisos suficientes."
            };
        }

        // 4. Retornar los datos del usuario (id, role, name)
        return payload;

    } catch (error) {
        if (error.statusCode) throw error; // Si es nuestro error de rol, lo lanzamos
        throw { statusCode: 401, message: "Token inválido o expirado." };
    }
};