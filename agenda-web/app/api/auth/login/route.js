// app/api/auth/login/route.js
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { loginUserService } from '../../../../services/auth.service';

const loginSchema = z.object({
    phone: z.string().min(1, "El teléfono es requerido"),
    password: z.string().min(1, "La contraseña es requerida"),
});

export async function POST(request) {
    try {
        const body = await request.json();

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
            secure: process.env.NODE_ENV === 'production', // Solo HTTPS en producción
            sameSite: 'strict',
            maxAge: 60 * 60 * 24 
        });

        return response;

    } catch (error) {
        console.error("Error en Login:", error);

        if (error.statusCode) {
            return NextResponse.json({ error: error.message }, { status: error.statusCode });
        }

        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}