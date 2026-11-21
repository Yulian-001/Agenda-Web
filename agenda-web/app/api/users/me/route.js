import { NextResponse } from 'next/server';
import { verifyAuth } from '../../../../utils/auth';
import { handleApiError } from '../../../../utils/errorHandler';
import { affiliateProfileSchema } from '../../../../utils/validations';
import { updateAffiliateProfile } from '../../../../services/user.service';

export async function PUT(request) {
    try {
        const actor = await verifyAuth(['BARBER_AFFILIATE']);
        const parsed = affiliateProfileSchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
        const profile = await updateAffiliateProfile(actor.id, parsed.data);
        return NextResponse.json({ profile });
    } catch (error) {
        return handleApiError(error, 'Error al guardar el perfil');
    }
}
