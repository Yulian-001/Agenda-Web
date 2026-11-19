import { getPublicServiceBarbers } from '../../../services/service.service';
import PublicBarbers from './PublicBarbers';

export default async function BarberosPage({ params }) {
    const { serviceId } = await params;
    return <PublicBarbers serviceId={serviceId} initialSelection={await getPublicServiceBarbers(serviceId)} />;
}
