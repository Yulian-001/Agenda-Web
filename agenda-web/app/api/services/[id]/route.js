import { NextResponse } from 'next/server';
import { verifyAuth } from '../../../../utils/auth';
import { updateServiceSchema } from '../../../../utils/validations';
import { updateServiceService, deleteServiceService } from '../../../../services/service.service';

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

export async function DELETE(request, { params }) {
    try {
        await verifyAuth(['ADMIN', 'BARBER_BOSS', 'BARBER_INDEPENDENT']);

        const resolvedParams = await params;
        const { id } = resolvedParams;

        await deleteServiceService(id);

        return NextResponse.json({ message: "Servicio eliminado del catálogo exitosamente" }, { status: 200 });
    } catch (error) {
        console.error(error);
        if (error.statusCode) return NextResponse.json({ error: error.message }, { status: error.statusCode });
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}