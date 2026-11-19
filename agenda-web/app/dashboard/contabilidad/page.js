import { notFound, redirect } from 'next/navigation';
import { financeRoles } from '../../../config/finance';
import { scheduleNow } from '../../../config/schedule';
import { verifyAuth } from '../../../utils/auth';
import FinanceDashboard from './FinanceDashboard';

export default async function ContabilidadPage() {
    try {
        await verifyAuth(financeRoles);
    } catch (error) {
        if (error.statusCode === 401) redirect('/login');
        if (error.statusCode === 403) notFound();
        throw error;
    }
    const [today] = scheduleNow();
    return <FinanceDashboard today={today} />;
}
