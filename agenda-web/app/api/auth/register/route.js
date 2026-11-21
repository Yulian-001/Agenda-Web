import { NextResponse } from 'next/server';
import { adminGrantProtection, independentRole, teamManagers } from '../../../../config/barberRoles';
import { createUserService } from '../../../../services/auth.service';
import { verifyAuth } from '../../../../utils/auth';
import { handleApiError } from '../../../../utils/errorHandler';
import { registerSchema } from '../../../../utils/validations';

export async function POST(request) {
    try {
        const actor = await verifyAuth(teamManagers);
        const validation = registerSchema.safeParse(await request.json().catch(() => null));
        if (!validation.success) {
            return NextResponse.json({ error: 'Datos inválidos', details: validation.error.format() }, { status: 400 });
        }

        const { role } = validation.data;
        if (role === independentRole) {
            return NextResponse.json({ error: 'Configura la cuenta independiente desde la seed.' }, { status: 403 });
        }
        if (actor.role === 'BARBER_BOSS' && role === 'ADMIN') {
            return NextResponse.json({ error: adminGrantProtection }, { status: 403 });
        }

        const user = await createUserService(validation.data);
        return NextResponse.json({ message: 'Usuario registrado exitosamente', user }, { status: 201 });
    } catch (error) {
        return handleApiError(error, 'Error en registro');
    }
}
