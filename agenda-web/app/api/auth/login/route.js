// app/api/auth/login/route.js
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { loginUserService } from '../../../../services/auth.service';
import { handleApiError } from '../../../../utils/errorHandler';
import { rateLimit } from '../../../../utils/rateLimit';

const loginSchema = z.object({
    phone: z.string().trim().min(1, "El teléfono es requerido"),
    password: z.string().min(1, "La contraseña es requerida"),
});

export async function POST(request) {
    try {
        const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
        const retryAt = rateLimit('login:' + ip, 5, 60000);

        if (retryAt) {
            return NextResponse.json(
                { error: "Demasiados intentos de inicio de sesión. Intenta de nuevo cuando termine el temporizador.", retryAt, serverTime: new Date() },
                { status: 429 } // 429 Too Many Requests
            );
        }

        const body = await request.json().catch(() => null);

        const validation = loginSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
        }

        const { phone, password } = validation.data;

        // Llamamos a la capa de servicio
        const { token, user } = await loginUserService(phone, password);

        // Creamos la respuesta
        const response = NextResponse.json({
            message: "Login exitoso",
            user
        }, { status: 200 });

        response.cookies.set({
            name: 'token',
            value: token,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60 * 24
        });

        return response;

    } catch (error) {
        if (error.code === 'ACCOUNT_LOCKED') {
            return NextResponse.json({
                error: error.message, retryAt: error.lockUntil, serverTime: new Date(), code: error.code
            }, { status: error.statusCode });
        }
        return handleApiError(error, "Error en Login");
    }
}