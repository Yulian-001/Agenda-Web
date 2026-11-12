// app/api/users/[id]/route.js
import { NextResponse } from 'next/server';
import { verifyAuth } from '../../../../utils/auth';
import { updateBarberService } from '../../../../services/user.service';

export async function PUT(request, { params }) {
    try {
        const resolvedParams = await params;
        const { id } = resolvedParams;

        // 1. Validamos que esté logueado (sin restringir rol aún)
        const payload = await verifyAuth();

        // 2. Lógica RBAC: ¿Quién puede editar a quién?
        const isAdminOrBoss = ['ADMIN', 'BARBER_BOSS'].includes(payload.role);
        const isSelf = payload.id === id;

        // Si NO es admin/boss Y NO es él mismo, rebotamos la petición.
        if (!isAdminOrBoss && !isSelf) {
            return NextResponse.json({
                error: "Acceso denegado. No puedes modificar el perfil de otro usuario."
            }, { status: 403 });
        }

        // Opcional: Si es un afiliado, podríamos restringirle qué campos puede editar.
        // (Por ahora, lo dejamos editar su foto/descripcion, pero los horarios los bloquearemos en su propio endpoint)

        const body = await request.json();
        const updated = await updateBarberService(id, body);

        return NextResponse.json({
            message: "Barbero actualizado exitosamente",
            barber: updated
        }, { status: 200 });

    } catch (error) {
        if (error.statusCode) return NextResponse.json({ error: error.message }, { status: error.statusCode });
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}