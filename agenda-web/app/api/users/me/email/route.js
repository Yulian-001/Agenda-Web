import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAuth } from '../../../../../utils/auth';
import { handleApiError } from '../../../../../utils/errorHandler';
import { requestEmailChange } from '../../../../../services/user-email.service';

const change = z.strictObject({
    email: z.string().trim().max(254).email('Ingresa un correo válido.').transform(value => value.toLowerCase()),
    password: z.string().min(1, 'Ingresa tu contraseña actual.').max(256)
});

export async function PUT(request) {
    try {
        const user = await verifyAuth();
        const parsed = change.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
        const message = await requestEmailChange(user.id, parsed.data.email, parsed.data.password);
        return NextResponse.json({ message });
    } catch (error) {
        return handleApiError(error, 'Error al cambiar correo');
    }
}
