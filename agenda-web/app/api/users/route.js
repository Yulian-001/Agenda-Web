import { adminGrantProtection, teamManagers } from '../../../config/barberRoles';
import { NextResponse } from 'next/server';
import { createUserService } from '../../../services/auth.service';
import { getBarbersService } from '../../../services/user.service';
import { verifyAuth } from '../../../utils/auth';
import { handleApiError } from '../../../utils/errorHandler';
import { createBarberSchema } from '../../../utils/validations';

export async function GET() {
    try {
        const viewer = await verifyAuth(teamManagers);
        const barbers = await getBarbersService(viewer.id);
        return NextResponse.json({ count: barbers.length, barbers, viewerId: viewer.id, viewerRole: viewer.role });
    } catch (error) {
        return handleApiError(error, 'Error al listar barberos');
    }
}

export async function POST(request) {
    try {
        const actor = await verifyAuth(teamManagers);
        const body = await request.json().catch(() => null);
        const validation = createBarberSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ error: 'Datos inválidos', details: validation.error.format() }, { status: 400 });
        }

        if (actor.role === 'BARBER_BOSS' && validation.data.role === 'ADMIN') {
            return NextResponse.json({ error: adminGrantProtection }, { status: 403 });
        }
        const barber = await createUserService(validation.data);
        return NextResponse.json({ message: 'Barbero creado exitosamente', barber }, { status: 201 });
    } catch (error) {
        return handleApiError(error, 'Error al crear barbero');
    }
}
