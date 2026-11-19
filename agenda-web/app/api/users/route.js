import { NextResponse } from 'next/server';
import { createUserService } from '../../../services/auth.service';
import { getBarbersService } from '../../../services/user.service';
import { verifyAuth } from '../../../utils/auth';
import { handleApiError } from '../../../utils/errorHandler';
import { createBarberSchema } from '../../../utils/validations';

export async function GET() {
    try {
        const viewer = await verifyAuth(['ADMIN', 'BARBER_BOSS']);
        const barbers = await getBarbersService();
        return NextResponse.json({ count: barbers.length, barbers, viewerId: viewer.id });
    } catch (error) {
        return handleApiError(error, 'Error al listar barberos');
    }
}

export async function POST(request) {
    try {
        await verifyAuth(['ADMIN', 'BARBER_BOSS']);
        const body = await request.json().catch(() => null);
        const validation = createBarberSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ error: 'Datos inválidos', details: validation.error.format() }, { status: 400 });
        }

        const barber = await createUserService(validation.data);
        return NextResponse.json({ message: 'Barbero creado exitosamente', barber }, { status: 201 });
    } catch (error) {
        return handleApiError(error, 'Error al crear barbero');
    }
}
