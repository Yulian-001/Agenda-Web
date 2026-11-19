import { NextResponse } from 'next/server';
import { verifyAuth } from '../../../utils/auth';
import { handleApiError } from '../../../utils/errorHandler';
import { weeklyScheduleSchema } from '../../../utils/validations';
import { getWeeklySchedule, updateWeeklySchedule } from '../../../services/schedule.service';

export async function GET() {
    try {
        await verifyAuth(['ADMIN']);
        return NextResponse.json(await getWeeklySchedule());
    } catch (error) {
        return handleApiError(error, 'Error al consultar la agenda general');
    }
}

export async function PUT(request) {
    try {
        await verifyAuth(['ADMIN']);
        const validation = weeklyScheduleSchema.safeParse(await request.json().catch(() => null));
        if (!validation.success) return NextResponse.json({ error: 'Revisa los días y las horas seleccionados.' }, { status: 400 });
        const count = await updateWeeklySchedule(validation.data.changes);
        return NextResponse.json({
            message: `Horario semanal actualizado para ${count} integrantes del equipo.`,
            schedule: await getWeeklySchedule()
        });
    } catch (error) {
        if (error.conflicts) return NextResponse.json({ error: error.message, conflicts: error.conflicts }, { status: 409 });
        return handleApiError(error, 'Error al guardar la agenda general');
    }
}
