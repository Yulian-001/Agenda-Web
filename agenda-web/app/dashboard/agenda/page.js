import { notFound, redirect } from 'next/navigation';
import { verifyAuth } from '../../../utils/auth';
import { getWeeklySchedule } from '../../../services/schedule.service';
import { scheduleNow, civilDate, weekdayOf } from '../../../config/schedule';
import ScheduleEditor from './ScheduleEditor';

export default async function AgendaPage() {
    try {
        await verifyAuth(['ADMIN']);
    } catch (error) {
        if (error.statusCode === 401) redirect('/login');
        if (error.statusCode === 403) notFound();
        throw error;
    }

    const [today] = scheduleNow();
    return <ScheduleEditor initialSchedule={await getWeeklySchedule()} today={today} initialDay={weekdayOf(civilDate(today))} />;
}
