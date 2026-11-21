import { redirect } from 'next/navigation';
import { scheduleNow } from '../../../config/schedule';
import { verifyAuth } from '../../../utils/auth';
import AppointmentBoard from '../../../components/AppointmentBoard';

export default async function DailyAppointmentsPage() {
    const [today] = scheduleNow();
    const { role } = await verifyAuth().catch(error => {
        if (error.statusCode === 401) redirect('/login');
        throw error;
    });
    return <AppointmentBoard mode="today" initialDate={today} role={role} />;
}
