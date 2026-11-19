// app/api/public/barbers/route.js
import { NextResponse } from 'next/server';
import { prisma } from '../../../../utils/prisma';
import { handleApiError } from '../../../../utils/errorHandler';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const serviceId = searchParams.get('serviceId');

        if (!serviceId) {
            return NextResponse.json({ error: "Falta el ID del servicio" }, { status: 400 });
        }

        // Buscamos usuarios activos que tengan ese servicio asignado
        const barbers = await prisma.user.findMany({
            where: {
                state: true,
                archivedAt: null,
                role: { in: ['ADMIN', 'BARBER_BOSS', 'BARBER_AFFILIATE', 'BARBER_INDEPENDENT'] },
                services: {
                    some: { serviceId: serviceId } // Filtro clave
                }
            },
            select: {
                id: true,
                name: true,
                photo: true,
                description: true
            }
        });

        return NextResponse.json({ barbers }, { status: 200 });
    } catch (error) {
        return handleApiError(error, "Error obteniendo barberos públicos");
    }
}
