import { NextResponse } from 'next/server';
import { forgotPasswordSchema } from '../../../../utils/validations';
import { generateOTPService } from '../../../../services/auth.service';

export async function POST(request) {
    try {
        const body = await request.json();
        const validation = forgotPasswordSchema.safeParse(body);
        if (!validation.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

        const result = await generateOTPService(validation.data.phone);
        return NextResponse.json(result, { status: 200 });
    } catch (error) {
        if (error.statusCode) return NextResponse.json({ error: error.message }, { status: error.statusCode });
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}