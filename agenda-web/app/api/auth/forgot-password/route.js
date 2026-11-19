import { after, NextResponse } from 'next/server';
import { forgotPasswordSchema } from '../../../../utils/validations';
import { ensureRecoveryAvailable, generateOTPService } from '../../../../services/auth.service';
import { limitRecoveryRequest, pruneRecoveryLimits } from '../../../../services/recovery-rate-limit';
import { recoveryDurationMs, recoveryResendMs } from '../../../../config/auth';
import { logger } from '../../../../utils/logger';

export async function POST(request) {
    try {
        const validation = forgotPasswordSchema.safeParse(await request.json().catch(() => null));
        if (!validation.success) return NextResponse.json({ error: 'Ingresa un número de teléfono de diez dígitos.' }, { status: 400 });
        ensureRecoveryAvailable();

        const { phone } = validation.data;
        const { retryAt, now } = await limitRecoveryRequest(request.headers, phone);
        if (retryAt) return NextResponse.json({
            error: 'Demasiadas solicitudes de recuperación. Intenta de nuevo cuando termine el temporizador.',
            resendAt: retryAt, serverTime: new Date()
        }, { status: 429 });

        const expiresAt = new Date(now.getTime() + recoveryDurationMs);
        const resendAt = new Date(now.getTime() + recoveryResendMs);
        after(async () => {
            try {
                await generateOTPService(phone, now, expiresAt);
                await pruneRecoveryLimits();
            } catch (error) {
                logger.error('No se pudo procesar la solicitud de recuperación.', error.code ?? error.name);
            }
        });
        return NextResponse.json({
            message: 'Si el número está registrado, se generará un código. En desarrollo se muestra en la terminal.',
            expiresAt, resendAt, serverTime: new Date()
        });
    } catch (error) {
        if (error.statusCode) return NextResponse.json({ error: error.message }, { status: error.statusCode });
        logger.error('Error en el control de solicitudes de recuperación.', error.code ?? error.name);
        return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
}
