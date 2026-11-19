import { scheduleNow } from '../../config/schedule';
import AppointmentBoard from '../../components/AppointmentBoard';

export default function DashboardPage() {
    const [today] = scheduleNow();
    return <AppointmentBoard mode="calendar" initialDate={today} />;
}
