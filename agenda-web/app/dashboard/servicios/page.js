import { catalogManagers } from '../../../config/barberRoles';
import { notFound, redirect } from 'next/navigation';
import { verifyAuth } from '../../../utils/auth';
import { getServicesService } from '../../../services/service.service';
import ServicesEditor from './ServicesEditor';

export default async function ServiciosPage() {
    try {
        await verifyAuth(catalogManagers);
    } catch (error) {
        if (error.statusCode === 401) redirect('/login');
        if (error.statusCode === 403) notFound();
        throw error;
    }

    const initialServices = await getServicesService(true);

    return <ServicesEditor initialServices={initialServices} canManageState canEdit />;
}
