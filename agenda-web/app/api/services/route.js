// app/api/services/route.js
import { NextResponse } from 'next/server';
import { serviceSchema } from '../../../utils/validations'; // Ojo: 3 niveles hacia atrás
import { createServiceService } from '../../../services/service.service'; // Ojo: 3 niveles

export async function POST(request) {
    try {
        const body = await request.json();

        // 1. Validar y limpiar datos con Zod
        const validation = serviceSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({
                error: "Datos del servicio inválidos",
                details: validation.error.format()
            }, { status: 400 });
        }

        // 2. Llamar a la capa de servicio
        const newService = await createServiceService(validation.data);

        // 3. Responder con 201 Created
        return NextResponse.json({
            message: "Servicio creado exitosamente",
            service: newService
        }, { status: 201 });

    } catch (error) {
        console.error("Error al crear servicio:", error);

        if (error.statusCode) {
            return NextResponse.json({ error: error.message }, { status: error.statusCode });
        }

        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}