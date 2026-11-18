// app/api/users/[id]/route.js
import { NextResponse } from 'next/server';
import { verifyAuth } from '../../../../utils/auth';
import { updateBarberService, deleteUserService } from '../../../../services/user.service';
import { updateUserSchema } from '../../../../utils/validations';
import { handleApiError } from '../../../../utils/errorHandler'; 

// PUT: Actualizar usuario
export async function PUT(request, { params }) {
    try {
        const resolvedParams = await params;
        const { id } = resolvedParams;

        const payload = await verifyAuth();

        const isAdminOrBoss = ['ADMIN', 'BARBER_BOSS'].includes(payload.role);
        const isSelf = payload.id === id;

        if (!isAdminOrBoss && !isSelf) {
            return NextResponse.json({
                error: "Acceso denegado. No puedes modificar el perfil de otro usuario."
            }, { status: 403 });
        }

        const body = await request.json();

        // Validación estricta con Zod
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

// DELETE: Soft Delete (Desactivar usuario)
export async function DELETE(request, { params }) {
    try {
        const payload = await verifyAuth();
        const resolvedParams = await params;
        const { id } = resolvedParams;

        // Solo el Admin o el Boss pueden "eliminar" (desactivar) a otros usuarios
        const isAdminOrBoss = ['ADMIN', 'BARBER_BOSS'].includes(payload.role);
        if (!isAdminOrBoss) {
            return NextResponse.json({
                error: "Acceso denegado. Solo un administrador puede desactivar usuarios."
            }, { status: 403 });
        }

        // Evitar que un Admin se desactive a sí mismo por error
        if (payload.id === id) {
            return NextResponse.json({ error: "No puedes desactivar tu propia cuenta." }, { status: 400 });
        }

        await deleteUserService(id);

        return NextResponse.json({
            message: "Usuario desactivado exitosamente. Ya no podrá iniciar sesión."
        }, { status: 200 });

    } catch (error) {
        return handleApiError(error, "Error en DELETE user");
    }
}