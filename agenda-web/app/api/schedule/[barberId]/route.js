import { catalogManagers } from '../../../../config/barberRoles';
import { NextResponse } from 'next/server';
import { verifyAuth } from '../../../../utils/auth';
import { handleApiError } from '../../../../utils/errorHandler';
import { dailyScheduleSchema, scheduleDateSchema } from '../../../../utils/validations';
import { getIndividualSchedule, updateIndividualSchedule } from '../../../../services/schedule.service';

export async function GET(request, { params }) {
    try {
        const actor = await verifyAuth(catalogManagers);
        const ownerId = actor.role === 'BARBER_INDEPENDENT' ? actor.id : undefined;
        const { barberId } = await params;
        if (ownerId && barberId !== ownerId) return NextResponse.json({ error: 'Solo puedes gestionar tu propia agenda.' }, { status: 403 });
        const date = scheduleDateSchema.safeParse(request.nextUrl.searchParams.get('date'));
        if (!date.success) return NextResponse.json({ error: 'Selecciona una fecha válida.' }, { status: 400 });
        return NextResponse.json(await getIndividualSchedule(barberId, date.data, ownerId));
    } catch (error) {
        return handleApiError(error, 'Error al consultar la agenda individual');
    }
}

export async function PUT(request, { params }) {
    try {
        const actor = await verifyAuth(catalogManagers);
        const ownerId = actor.role === 'BARBER_INDEPENDENT' ? actor.id : undefined;
        const { barberId } = await params;
        if (ownerId && barberId !== ownerId) return NextResponse.json({ error: 'Solo puedes gestionar tu propia agenda.' }, { status: 403 });
        const validation = dailyScheduleSchema.safeParse(await request.json().catch(() => null));
        if (!validation.success) return NextResponse.json({ error: 'Selecciona una fecha y los horarios que quieres ajustar.' }, { status: 400 });
        await updateIndividualSchedule(barberId, validation.data, ownerId);
        return NextResponse.json({
            message: 'Agenda individual actualizada para la fecha seleccionada.',
            schedule: await getIndividualSchedule(barberId, validation.data.date, ownerId)
        });
    } catch (error) {
        if (error.conflicts) return NextResponse.json({ error: error.message, conflicts: error.conflicts }, { status: 409 });
        return handleApiError(error, 'Error al guardar la agenda individual');
    }
}
