import { NextResponse } from 'next/server';
import { handleApiError } from '../../../../../../utils/errorHandler';
import { verifyEmailChange } from '../../../../../../services/user-email.service';

export async function POST(request) {
    const { token } = await request.json().catch(() => null) ?? {};
    if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
        return NextResponse.json({ error: 'El enlace de verificación no es válido.' }, { status: 400 });
    }
    try {
        await verifyEmailChange(token);
        return NextResponse.json({ message: 'Tu correo quedó verificado.' });
    } catch (error) {
        return handleApiError(error, 'Error al verificar correo');
    }
}
