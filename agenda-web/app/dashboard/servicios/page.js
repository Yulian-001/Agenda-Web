import { redirect } from 'next/navigation';
import { verifyAuth } from '../../../utils/auth';
import { getServicesService } from '../../../services/service.service';
import ServicesEditor from './ServicesEditor';

export default async function ServiciosPage() {
    let user;
    try {
        user = await verifyAuth();
    } catch (error) {
        if (error.statusCode === 401) redirect('/login');
        throw error;
    }

    const canManageState = user.role === 'ADMIN';
    const canEdit = ['ADMIN', 'BARBER_BOSS', 'BARBER_INDEPENDENT'].includes(user.role);
    const initialServices = await getServicesService(canManageState);

    return <ServicesEditor initialServices={initialServices} canManageState={canManageState} canEdit={canEdit} />;
}
