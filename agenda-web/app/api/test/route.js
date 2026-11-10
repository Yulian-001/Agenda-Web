// app/api/test/route.js
import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';


export async function GET() {
    try {
        // Intentamos contar cuántos usuarios hay en la BD
        // (Asegúrate de tener un modelo 'User' en tu schema.prisma)
        const count = await prisma.user.count();

        return NextResponse.json({
            status: "Éxito",
            message: "Conexión a la base de datos perfecta",
            usuariosRegistrados: count
        });
    } catch (error) {
        return NextResponse.json({
            status: "Error",
            message: "No se pudo conectar a la BD",
            error: error.message
        }, { status: 500 });
    }
}