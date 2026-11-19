import { NextResponse } from 'next/server';
import { getPublicServiceBarbers } from '../../../../services/service.service';
import { handleApiError } from '../../../../utils/errorHandler';

export async function GET(request) {
    try {
        const serviceId = request.nextUrl.searchParams.get('serviceId');
        if (!serviceId) return NextResponse.json({ error: 'Falta el ID del servicio' }, { status: 400 });

        const selection = await getPublicServiceBarbers(serviceId);
        return NextResponse.json(selection, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
        return handleApiError(error, 'Error obteniendo barberos públicos');
    }
}
