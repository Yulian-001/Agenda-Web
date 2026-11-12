// app/api/appointments/[id]/route.js
import { NextResponse } from 'next/server';
import { verifyAuth } from '../../../../utils/auth';
import { updateAppointmentStatusService } from '../../../../services/appointment.service';

export async function PUT(request, { params }) {
    try {
        const payload = await verifyAuth(); // Usuario logueado (Barbero/Admin)
        const resolvedParams = await params;
        const { id } = resolvedParams;

        const body = await request.json();
        const { state } = body;

        // Validar que el estado sea uno de los permitidos
        if (!['CONFIRMED', 'COMPLETED', 'CANCELLED'].includes(state)) {
            return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
        }

        const updated = await updateAppointmentStatusService(id, state, payload);

        return NextResponse.json({
            message: `Cita actualizada a estado: ${state}`,
            appointment: updated
        }, { status: 200 });

    } catch (error) {
        console.error("Error al actualizar cita:", error);
        if (error.statusCode) return NextResponse.json({ error: error.message }, { status: error.statusCode });
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}