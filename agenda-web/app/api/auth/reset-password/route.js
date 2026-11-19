import { NextResponse } from 'next/server';
import { resetPasswordSchema } from '../../../../utils/validations';
import { resetPasswordService } from '../../../../services/auth.service';

export async function POST(request) {
    try {
        const body = await request.json().catch(() => null);
        const validation = resetPasswordSchema.safeParse(body);
        if (!validation.success) return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });

        const { phone, otpCode, newPassword } = validation.data;
        const result = await resetPasswordService(phone, otpCode, newPassword);

        return NextResponse.json(result, { status: 200 });
    } catch (error) {
        if (error.statusCode) return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}