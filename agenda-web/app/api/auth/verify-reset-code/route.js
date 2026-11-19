import { NextResponse } from 'next/server';
import { verifyRecoverySchema } from '../../../../utils/validations';
import { verifyRecoveryCodeService } from '../../../../services/auth.service';

export async function POST(request) {
    try {
        const validation = verifyRecoverySchema.safeParse(await request.json().catch(() => null));
        if (!validation.success) return NextResponse.json({ error: 'Ingresa un código de seis dígitos.' }, { status: 400 });

        const { phone, otpCode } = validation.data;
        const result = await verifyRecoveryCodeService(phone, otpCode);
        return NextResponse.json({ ...result, serverTime: new Date() });
    } catch (error) {
        if (error.statusCode) return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
        return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
}
