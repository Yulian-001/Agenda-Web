import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAuth } from '../../../../utils/auth';
import { updateServiceSchema } from '../../../../utils/validations';
import { updateServiceService } from '../../../../services/service.service';
import { handleApiError } from '../../../../utils/errorHandler';

const serviceStateSchema = z.strictObject({ isActive: z.boolean() });

export async function PUT(request, { params }) {
    try {
        await verifyAuth(['ADMIN', 'BARBER_BOSS', 'BARBER_INDEPENDENT']);

        const resolvedParams = await params;
        const { id } = resolvedParams;

        const body = await request.json();
        const validation = updateServiceSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: "Datos inválidos", details: validation.error.format() }, { status: 400 });
        }

        const updated = await updateServiceService(id, validation.data);

        return NextResponse.json({ message: "Servicio actualizado", service: updated }, { status: 200 });
    } catch (error) {
        console.error(error);
        if (error.statusCode) return NextResponse.json({ error: error.message }, { status: error.statusCode });
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}

export async function PATCH(request, { params }) {
    try {
        await verifyAuth(['ADMIN']);
        const validation = serviceStateSchema.safeParse(await request.json().catch(() => null));
        if (!validation.success) {
            return NextResponse.json({ error: 'Selecciona un estado válido para el servicio.' }, { status: 400 });
        }

        const { id } = await params;
        const service = await updateServiceService(id, validation.data);
        return NextResponse.json({ message: service.isActive ? 'Servicio reactivado' : 'Servicio desactivado', service });
    } catch (error) {
        return handleApiError(error, 'Error al cambiar el estado del servicio');
    }
}

export async function DELETE(request, { params }) {
    try {
        await verifyAuth(['ADMIN', 'BARBER_BOSS', 'BARBER_INDEPENDENT']);

        const resolvedParams = await params;
        const { id } = resolvedParams;

        const service = await updateServiceService(id, { isActive: false });

        return NextResponse.json({ message: 'Servicio desactivado', service });
    } catch (error) {
        console.error(error);
        if (error.statusCode) return NextResponse.json({ error: error.message }, { status: error.statusCode });
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
