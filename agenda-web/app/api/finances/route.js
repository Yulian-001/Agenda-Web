// app/api/finances/route.js
import { NextResponse } from 'next/server';
import { verifyAuth } from '../../../utils/auth';
import { getFinancesService } from '../../../services/finance.service';

export async function GET(request) {
    try {
        // Solo usuarios logueados (Barberos, Boss, Admin)
        const payload = await verifyAuth();

        // Leer parámetros: /api/finances?period=monthly&year=2026&month=11
        // O: /api/finances?period=semiannual&year=2026&semester=2
        const { searchParams } = new URL(request.url);
        const period = searchParams.get('period');
        const year = searchParams.get('year');
        const month = searchParams.get('month');
        const semester = searchParams.get('semester');

        const finances = await getFinancesService(payload, { period, year, month, semester });

        return NextResponse.json({
            message: "Reporte financiero generado exitosamente",
            data: finances
        }, { status: 200 });

    } catch (error) {
        console.error("Error en finanzas:", error);
        if (error.statusCode) return NextResponse.json({ error: error.message }, { status: error.statusCode });
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}