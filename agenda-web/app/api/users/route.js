// app/api/users/route.js
import { NextResponse } from 'next/server';
import { verifyAuth } from '../../../utils/auth';
import { getBarbersService, createBarberService } from '../../../services/user.service'; // Importamos createBarberService
import { handleApiError } from '../../../utils/errorHandler';
import { registerSchema } from '../../../utils/validations';


export async function GET() {
    try {
        // Admin y Boss pueden ver la lista completa de la barbería
        await verifyAuth(['ADMIN', 'BARBER_BOSS']);

        const barbers = await getBarbersService();

        return NextResponse.json({
            message: "Barberos obtenidos exitosamente",
            count: barbers.length,
            barbers
        }, { status: 200 });

    } catch (error) {
        if (error.statusCode) return NextResponse.json({ error: error.message }, { status: error.statusCode });
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}




export async function POST(request) {
    try {
        await verifyAuth(['ADMIN', 'BARBER_BOSS']); // Solo Admin/Boss pueden crear barberos
        
        const body = await request.json();
        
        // Usamos el esquema de registro pero ignoramos los servicios obligatorios por ahora
        const validation = registerSchema.omit({ services: true }).safeParse(body); 
        
        if (!validation.success) {
            return NextResponse.json({ error: "Datos inválidos", details: validation.error.format() }, { status: 400 });
        }

        const newBarber = await createBarberService(validation.data);

        return NextResponse.json({ message: "Barbero creado exitosamente", barber: newBarber }, { status: 201 });
    } catch (error) {
        return handleApiError(error, "Error en POST user");
    }
}