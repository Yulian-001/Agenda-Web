// app/api/appointments/route.js
import { NextResponse } from 'next/server';
import { verifyAuth } from '../../../utils/auth';
import { createAppointmentSchema } from '../../../utils/validations';
import { createAppointmentService, getAppointmentsService } from '../../../services/appointment.service';

// GET: Listar Citas (Requiere Login)
export async function GET(request) {
    try {
        const payload = await verifyAuth(); // El usuario logueado

        // Leer parámetros (?date=2026-11-12&view=personal o view=team)
        const { searchParams } = new URL(request.url);
        const date = searchParams.get('date');
        const view = searchParams.get('view') || 'personal';

        const appointments = await getAppointmentsService(payload, { date, view });

        return NextResponse.json({
            message: "Citas obtenidas",
            count: appointments.length,
            appointments
        }, { status: 200 });

    } catch (error) {
        if (error.statusCode) return NextResponse.json({ error: error.message }, { status: error.statusCode });
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}

// POST: Crear Cita (PÚBLICO, sin Login)
export async function POST(request) {
    try {
        const body = await request.json();

        const validation = createAppointmentSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ error: "Datos inválidos", details: validation.error.format() }, { status: 400 });
        }

        const newAppointment = await createAppointmentService(validation.data);

        return NextResponse.json({
            message: "Cita agendada exitosamente",
            appointment: newAppointment
        }, { status: 201 });

    } catch (error) {
        console.error("Error al agendar cita:", error);
        if (error.statusCode) return NextResponse.json({ error: error.message }, { status: error.statusCode });
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
} 