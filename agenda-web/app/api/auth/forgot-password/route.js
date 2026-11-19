import { NextResponse } from 'next/server';
import { forgotPasswordSchema } from '../../../../utils/validations';
import { generateOTPService } from '../../../../services/auth.service';

import { rateLimit } from '../../../../utils/rateLimit';

export async function POST(request) {
    try {
        const body = await request.json().catch(() => null);
        const validation = forgotPasswordSchema.safeParse(body);
        if (!validation.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

        const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
        const resendAt = rateLimit('recover:' + ip, 10, 300000);
        if (resendAt) return NextResponse.json({
            error: 'Demasiadas solicitudes de recuperación. Intenta de nuevo cuando termine el temporizador.',
            resendAt, serverTime: new Date()
        }, { status: 429 });

        const result = await generateOTPService(validation.data.phone);
        return NextResponse.json({ ...result, serverTime: new Date() });
    } catch (error) {
        if (error.statusCode) return NextResponse.json({ error: error.message }, { status: error.statusCode });
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}