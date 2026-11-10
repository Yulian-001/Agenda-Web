// app/api/auth/login/route.js
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/utils/prisma';

// Esquema de validación con Zod
const loginSchema = z.object({
    phone: z.string().min(1, "El teléfono es requerido"),
    password: z.string().min(1, "La contraseña es requerida"),
});

export async function POST(request) {
    try {
        const body = await request.json();

        // 1. Validar datos de entrada
        const validation = loginSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
        }

        const { phone, password } = validation.data;

        // 2. Buscar al usuario
        const user = await prisma.user.findUnique({ where: { phone } });
        if (!user) {
            return NextResponse.json({ error: "Credenciales incorrectas" }, { status: 401 });
        }

        // 3. Verificar si la cuenta está bloqueada temporalmente
        if (user.lockUntil && user.lockUntil > new Date()) {
            return NextResponse.json({
                error: "Cuenta bloqueada temporalmente. Intente más tarde."
            }, { status: 403 });
        }

        // 4. Comparar contraseñas
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            // Lógica de intentos fallidos
            const failedAttempts = user.failedAttempts + 1;
            let lockUntil = null;

            if (failedAttempts >= 5) {
                lockUntil = new Date(Date.now() + 15 * 60 * 1000); // Bloqueo de 15 min
            }

            await prisma.user.update({
                where: { id: user.id },
                data: { failedAttempts, lockUntil }
            });

            return NextResponse.json({ error: "Credenciales incorrectas" }, { status: 401 });
        }

        // 5. Login exitoso: Resetear intentos fallidos
        await prisma.user.update({
            where: { id: user.id },
            data: { failedAttempts: 0, lockUntil: null }
        });

        // TODO: Aquí generaremos el JWT con jsonwebtoken en el siguiente paso

        return NextResponse.json({
            message: "Login exitoso",
            user: {
                id: user.id,
                name: user.name,
                role: user.role
            }
        }, { status: 200 });

    } catch (error) {
        console.error("Error en Login:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}