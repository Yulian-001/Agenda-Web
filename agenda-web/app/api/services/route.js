// app/api/services/route.js
import { NextResponse } from 'next/server';
import { verifyAuth } from '../../../utils/auth';
import { serviceSchema } from '../../../utils/validations';
import { createServiceService, getServicesService } from '../../../services/service.service'; 


export async function POST(request) {
    try {
        // ROLES PERMITIDOS
        await verifyAuth(['ADMIN', 'BARBER_BOSS', 'BARBER_INDEPENDENT']);

        // 2. Validar datos con Zod
        const body = await request.json();
        const validation = serviceSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({
                error: "Datos del servicio inválidos",
                details: validation.error.format()
            }, { status: 400 });
        }

        // 3. Crear el servicio
        const newService = await createServiceService(validation.data);

        return NextResponse.json({
            message: "Servicio creado exitosamente",
            service: newService
        }, { status: 201 });

    } catch (error) {
        console.error("Error al crear servicio:", error);

        // Manejo de errores de la base de datos
        if (error.statusCode) {
            return NextResponse.json({ error: error.message }, { status: error.statusCode });
        }

        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}

export async function GET() {
    try {
        const services = await getServicesService();

        return NextResponse.json({
            message: "Servicios obtenidos exitosamente",
            count: services.length,
            services
        }, { status: 200 });

    } catch (error) {
        console.error("Error al listar servicios:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}