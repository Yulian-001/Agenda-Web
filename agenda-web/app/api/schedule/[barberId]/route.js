// app/api/schedule/[barberId]/route.js
import { NextResponse } from 'next/server';
import { verifyAuth } from '../../../../utils/auth';
import {
    getScheduleService,
    toggleDayService,
    toggleHourService
} from '../../../../services/schedule.service';
import { toggleDaySchema, toggleHourSchema } from '../../../../utils/validations';

export async function GET(request, { params }) {
    try {
        const payload = await verifyAuth();
        const { barberId } = await params;

        if (payload.role === 'BARBER_AFFILIATE') {
            return NextResponse.json({ error: "Acceso denegado." }, { status: 403 });
        }

        const schedule = await getScheduleService(barberId);
        return NextResponse.json({ schedule }, { status: 200 });
    } catch (error) {
        if (error.statusCode) return NextResponse.json({ error: error.message }, { status: error.statusCode });
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}

export async function PUT(request, { params }) {
    try {
        const payload = await verifyAuth();
        const { barberId } = await params;

        const isAdminOrBoss = ['ADMIN', 'BARBER_BOSS'].includes(payload.role);
        const isSelfIndependent = payload.role === 'BARBER_INDEPENDENT' && payload.id === barberId;

        if (!isAdminOrBoss && !isSelfIndependent) {
            return NextResponse.json({
                error: "Acceso denegado. No tienes permiso para modificar esta agenda."
            }, { status: 403 });
        }

        const body = await request.json();

        if (body.timeSlot) {
            const validation = toggleHourSchema.safeParse(body);
            if (!validation.success) return NextResponse.json({ error: "Datos inválidos", details: validation.error.format() }, { status: 400 });

            await toggleHourService(barberId, body.day, body.timeSlot, body.isActive);
            return NextResponse.json({ message: `Hora ${body.timeSlot} actualizada.` }, { status: 200 });
        } else {
            const validation = toggleDaySchema.safeParse(body);
            if (!validation.success) return NextResponse.json({ error: "Datos inválidos", details: validation.error.format() }, { status: 400 });

            await toggleDayService(barberId, body.day, body.isActive);
            return NextResponse.json({ message: `Día ${body.day} actualizado.` }, { status: 200 });
        }

    } catch (error) {
        if (error.statusCode) return NextResponse.json({ error: error.message }, { status: error.statusCode });
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}