// app/api/users/[id]/route.js
import { NextResponse } from 'next/server';
import { verifyAuth } from '../../../../utils/auth';
import { updateBarberService, hardDeleteUserService } from '../../../../services/user.service'; 
import { updateUserSchema } from '../../../../utils/validations';
import { handleApiError } from '../../../../utils/errorHandler'; 

// PUT: Actualizar usuario (incluye activar/desactivar)
export async function PUT(request, { params }) {
    try {
        const resolvedParams = await params;
        const { id } = resolvedParams;

        const payload = await verifyAuth();
        const isAdminOrBoss = ['ADMIN', 'BARBER_BOSS'].includes(payload.role);
        const isSelf = payload.id === id;

        if (!isAdminOrBoss && !isSelf) {
            return NextResponse.json({ error: "Acceso denegado." }, { status: 403 });
        }

        const body = await request.json();
        const validation = updateUserSchema.safeParse(body);
        
        if (!validation.success) {
            return NextResponse.json({ error: "Datos inválidos", details: validation.error.format() }, { status: 400 });
        }

        const updated = await updateBarberService(id, validation.data);

        return NextResponse.json({
            message: "Barbero actualizado exitosamente",
            barber: updated
        }, { status: 200 });

    } catch (error) {
        return handleApiError(error, "Error en PUT user");
    }
}

// DELETE: Eliminación Definitiva (Hard Delete)
export async function DELETE(request, { params }) {
    try {
        const payload = await verifyAuth();
        const resolvedParams = await params;
        const { id } = resolvedParams;

        // Solo el Admin o el Boss pueden eliminar definitivamente
        const isAdminOrBoss = ['ADMIN', 'BARBER_BOSS'].includes(payload.role);
        if (!isAdminOrBoss) {
            return NextResponse.json({
                error: "Acceso denegado. Solo un administrador puede eliminar usuarios."
            }, { status: 403 });
        }

        // Evitar que un Admin se elimine a sí mismo
        if (payload.id === id) {
            return NextResponse.json({ error: "No puedes eliminar tu propia cuenta." }, { status: 400 });
        }

        // Llamamos a la función de eliminación definitiva (valida citas pendientes)
        await hardDeleteUserService(id);

        return NextResponse.json({
            message: "Usuario eliminado definitivamente del sistema."
        }, { status: 200 });

    } catch (error) {
        return handleApiError(error, "Error en DELETE user");
    }
}