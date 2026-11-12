// app/api/users/route.js
import { NextResponse } from 'next/server';
import { verifyAuth } from '../../../utils/auth';
import { getBarbersService } from '../../../services/user.service';

export async function GET() {
    try {
        // Admin y Boss pueden ver la lista completa de la barbería
        await verifyAuth(['ADMIN', 'BARBER_BOSS']);

        const barbers = await getBarbersService();

        return NextResponse.json({
            message: "Barberos obtenidos exitosamente",
            count: barbers.length,
            barbers
        }, { status: 200 });

    } catch (error) {
        if (error.statusCode) return NextResponse.json({ error: error.message }, { status: error.statusCode });
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}