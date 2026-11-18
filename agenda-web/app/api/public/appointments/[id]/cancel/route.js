import { NextResponse } from 'next/server';
import { cancelAppointmentService } from '../../../../../../services/appointment.service';
import { handleApiError } from '../../../../../../utils/errorHandler';

export async function POST(request, { params }) {
    try {
        const resolvedParams = await params;
        const { id } = resolvedParams;
        const body = await request.json();

        if (!body.clientPhone) {
            return NextResponse.json({ error: "El teléfono del cliente es requerido" }, { status: 400 });
        }

        const result = await cancelAppointmentService(id, body.clientPhone);
        return NextResponse.json(result, { status: 200 });
    } catch (error) {
        return handleApiError(error, "Error en Cancelación Pública");
    }
}