// app/api/auth/register/route.js
import { NextResponse } from 'next/server';
import { registerSchema } from '../../../../utils/validations';
import { createUserService } from '../../../../services/auth.service';

export async function POST(request) {
    try {
        const body = await request.json();

        // 1. Validar con Zod
        const validation = registerSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({
                error: "Datos inválidos",
                details: validation.error.format()
            }, { status: 400 });
        }

        // 2. Llamar al servicio
        const newUser = await createUserService(validation.data);

        // 3. Respuesta exitosa
        return NextResponse.json({
            message: "Usuario registrado exitosamente",
            user: newUser
        }, { status: 201 });

    } catch (error) {
        console.error("Error en Registro:", error);

        // Manejo de errores controlados desde el servicio
        if (error.statusCode) {
            return NextResponse.json({ error: error.message }, { status: error.statusCode });
        }

        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}