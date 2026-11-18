// utils/errorHandler.js
import { NextResponse } from 'next/server';

export function handleApiError(error, contextMessage = "Error interno") {
    // 1. Logueamos el error real SIEMPRE en el servidor para nosotros
    console.error(`🚨 [${contextMessage}]:`, error);

    // 2. Errores controlados de la lógica de negocio (Zod, Prisma controlado, Auth)
    if (error.statusCode) {
        return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    // 3. Errores de Prisma (Base de datos) - Ocultamos los detalles al cliente
    if (error.code && typeof error.code === 'string' && error.code.startsWith('P')) {
        return NextResponse.json({ error: "Error en la base de datos" }, { status: 500 });
    }

    // 4. Cualquier otro error no controlado (evitamos fugar stack traces)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
}