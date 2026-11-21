import { publiclyBookable } from '../../../../config/barberRoles';
import { scheduleNow } from '../../../../config/schedule';
import { prisma } from '../../../../utils/prisma';
import BookingSchedule from './BookingSchedule';

export default async function AgendarPage({ params, searchParams }) {
    const { barberoId: barberId } = await params;
    const { serviceId: serviceParam } = await searchParams;
    const serviceId = typeof serviceParam === 'string' ? serviceParam : '';
    const [today] = scheduleNow();
    const selection = serviceId ? await prisma.servicesBarbers.findFirst({
        where: { barberId, serviceId, service: { isActive: true, archivedAt: null }, barber: publiclyBookable },
        select: {
            barber: { select: { name: true } },
            service: { select: { name: true, price: true, duration: true } }
        }
    }) : null;

    return <BookingSchedule barberId={barberId} serviceId={serviceId} selection={selection} today={today} />;
}
