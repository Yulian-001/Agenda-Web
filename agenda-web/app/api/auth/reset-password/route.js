import { NextResponse } from 'next/server';
import { resetPasswordSchema } from '../../../../utils/validations';
import { resetPasswordService } from '../../../../services/auth.service';

export async function POST(request) {
    try {
        const body = await request.json();
        const validation = resetPasswordSchema.safeParse(body);
        if (!validation.success) return NextResponse.json({ error: "Datos inválidos", details: validation.error.format() }, { status: 400 });

        const { phone, otpCode, newPassword } = validation.data;
        const result = await resetPasswordService(phone, otpCode, newPassword);

        return NextResponse.json(result, { status: 200 });
    } catch (error) {
        if (error.statusCode) return NextResponse.json({ error: error.message }, { status: error.statusCode });
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}