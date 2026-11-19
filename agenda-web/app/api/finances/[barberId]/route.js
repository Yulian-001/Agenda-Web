import { NextResponse } from 'next/server';
import { z } from 'zod';
import { financeRoles, settlementDirections } from '../../../../config/finance';
import { updateSettlementSettings } from '../../../../services/finance.service';
import { verifyAuth } from '../../../../utils/auth';
import { handleApiError } from '../../../../utils/errorHandler';

const settingsSchema = z.strictObject({
    commissionRate: z.number().min(0).max(1),
    settlementDirection: z.enum(Object.keys(settlementDirections))
});

export async function PATCH(request, { params }) {
    try {
        await verifyAuth(financeRoles);
        const validation = settingsSchema.safeParse(await request.json().catch(() => null));
        if (!validation.success) {
            return NextResponse.json({ error: 'Ingresa un porcentaje entre 0 y 100 y elige una modalidad de liquidación.' }, { status: 400 });
        }
        const { barberId } = await params;
        const barber = await updateSettlementSettings(barberId, validation.data);
        return NextResponse.json({ message: 'Configuración de liquidación guardada', barber });
    } catch (error) {
        return handleApiError(error, 'Error al actualizar la liquidación');
    }
}
