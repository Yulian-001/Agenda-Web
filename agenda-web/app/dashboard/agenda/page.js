import { catalogManagers } from '../../../config/barberRoles';
import { notFound, redirect } from 'next/navigation';
import { verifyAuth } from '../../../utils/auth';
import { getWeeklySchedule } from '../../../services/schedule.service';
import { scheduleNow, civilDate, weekdayOf } from '../../../config/schedule';
import ScheduleEditor from './ScheduleEditor';

export default async function AgendaPage() {
    let ownerId;
    try {
        const actor = await verifyAuth(catalogManagers);
        ownerId = actor.role === 'BARBER_INDEPENDENT' ? actor.id : undefined;
    } catch (error) {
        if (error.statusCode === 401) redirect('/login');
        if (error.statusCode === 403) notFound();
        throw error;
    }

    const [today] = scheduleNow();
    return <ScheduleEditor individual={Boolean(ownerId)} initialSchedule={await getWeeklySchedule(ownerId)} today={today} initialDay={weekdayOf(civilDate(today))} />;
}
