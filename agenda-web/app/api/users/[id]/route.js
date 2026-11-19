import { NextResponse } from 'next/server';
import { verifyAuth } from '../../../../utils/auth';
import { deactivateBarberService, updateBarberService } from '../../../../services/user.service';
import { updateOwnProfileSchema, updateUserSchema } from '../../../../utils/validations';
import { handleApiError } from '../../../../utils/errorHandler';

export async function PUT(request, { params }) {
    try {
        const actor = await verifyAuth();
        const { id } = await params;
        const canManage = ['ADMIN', 'BARBER_BOSS'].includes(actor.role);
        const isSelf = actor.id === id;
        if (!canManage && !isSelf) {
            return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
        }

        const body = await request.json().catch(() => null);
        const validation = (canManage ? updateUserSchema : updateOwnProfileSchema).safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ error: 'Datos inválidos', details: validation.error.format() }, { status: 400 });
        }

        const { state, role, ...profile } = validation.data;
        if (isSelf && (state === false || (role && role !== actor.role))) {
            return NextResponse.json({ error: 'No puedes desactivar tu cuenta ni cambiar tu propio rol.' }, { status: 400 });
        }

        if (state === false) {
            if (role || Object.keys(profile).length) {
                return NextResponse.json({ error: 'Guarda la edición del perfil y la desactivación por separado.' }, { status: 400 });
            }
            const barber = await deactivateBarberService(id);
            return NextResponse.json({ message: 'Barbero desactivado', barber });
        }

        const barber = await updateBarberService(id, validation.data, canManage);
        return NextResponse.json({ message: 'Barbero actualizado exitosamente', barber });
    } catch (error) {
        return handleApiError(error, 'Error al actualizar barbero');
    }
}

export async function DELETE(_request, { params }) {
    try {
        const actor = await verifyAuth(['ADMIN', 'BARBER_BOSS']);
        const { id } = await params;
        if (actor.id === id) {
            return NextResponse.json({ error: 'No puedes dar de baja tu propia cuenta.' }, { status: 400 });
        }

        await deactivateBarberService(id, { archive: true });
        return NextResponse.json({ message: 'Barbero retirado del equipo. Su historial se conservó.' });
    } catch (error) {
        return handleApiError(error, 'Error al dar de baja barbero');
    }
}
