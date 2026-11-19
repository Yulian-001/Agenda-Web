import { scheduleNow } from '../../../config/schedule';
import AppointmentBoard from '../../../components/AppointmentBoard';

export default function DailyAppointmentsPage() {
    const [today] = scheduleNow();
    return <AppointmentBoard mode="today" initialDate={today} />;
}
