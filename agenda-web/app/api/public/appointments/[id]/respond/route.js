import { NextResponse } from 'next/server';
import { handleApiError } from '../../../../../../utils/errorHandler';
import { respondToAppointment } from '../../../../../../services/appointment.service';

export async function POST(request, { params }) {
    const { id } = await params;
    const { token, action } = await request.json().catch(() => null) ?? {};
    if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token) || !['confirm', 'cancel'].includes(action)) {
        return NextResponse.json({ error: 'El enlace de la cita no es válido.' }, { status: 400 });
    }
    try {
        return NextResponse.json(await respondToAppointment(id, token, action));
    } catch (error) {
        return handleApiError(error, 'Error al responder a la cita');
    }
}
