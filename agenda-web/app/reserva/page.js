import { connection } from 'next/server';
import { getServicesService } from '../../services/service.service';
import PublicServices from './PublicServices';

export default async function ReservaPage() {
    await connection();
    return <PublicServices initialServices={await getServicesService()} />;
}
