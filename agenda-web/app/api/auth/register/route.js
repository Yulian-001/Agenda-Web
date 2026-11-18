// app/api/auth/register/route.js
import { NextResponse } from 'next/server';
import { registerSchema } from '../../../../utils/validations';
import { createUserService } from '../../../../services/auth.service';
import { verifyAuth } from '../../../../utils/auth'; 

export async function POST(request) {
    try {
        const body = await request.json();

        const validation = registerSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({
                error: "Datos inválidos",
                details: validation.error.format()
            }, { status: 400 });
        }

        const { role } = validation.data;

        if (role !== 'BARBER_INDEPENDENT') {
            try {
                const payload = await verifyAuth(); // Verificamos su token
                if (!['ADMIN', 'BARBER_BOSS'].includes(payload.role)) {
                    return NextResponse.json({
                        error: "Acceso denegado. Solo un Admin o Boss puede crear este rol."
                    }, { status: 403 });
                }
            } catch (authError) {
                return NextResponse.json({
                    error: "Debes iniciar sesión como Admin o Boss para registrar empleados."
                }, { status: 401 });
            }
        }

        // Si pasa la validación, procedemos a crear el usuario
        const newUser = await createUserService(validation.data);

        return NextResponse.json({
            message: "Usuario registrado exitosamente",
            user: newUser
        }, { status: 201 });

    } catch (error) {
        console.error("Error en Registro:", error);
        if (error.statusCode) {
            return NextResponse.json({ error: error.message }, { status: error.statusCode });
        }
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}