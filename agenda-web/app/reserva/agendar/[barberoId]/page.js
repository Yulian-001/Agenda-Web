import { scheduleNow } from '../../../../config/schedule';
import BookingSchedule from './BookingSchedule';

export default async function AgendarPage({ params, searchParams }) {
    const { barberoId: barberId } = await params;
    const { serviceId } = await searchParams;
    const [today] = scheduleNow();

    return <BookingSchedule barberId={barberId} serviceId={typeof serviceId === 'string' ? serviceId : ''} today={today} />;
}
