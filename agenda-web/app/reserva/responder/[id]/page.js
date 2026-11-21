import EmailLinkActions from '../../../../components/EmailLinkActions';
import { acceptsAppointmentLink, appointmentStart } from '../../../../utils/mail.mjs';
import { prisma } from '../../../../utils/prisma';

export const metadata = { referrer: 'no-referrer', robots: { index: false } };

const dateFormat = new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'full', timeStyle: 'short', timeZone: 'America/Bogota'
});

export default async function RespondPage({ params, searchParams }) {
    const [{ id }, { token, action }] = await Promise.all([params, searchParams]);
    const selectedAction = ['confirm', 'cancel'].includes(action) ? action : null;
    const appointment = typeof token === 'string' && /^[A-Za-z0-9_-]{43}$/.test(token)
        ? await prisma.appointment.findUnique({
            where: { id },
            select: {
                id: true, date: true, timeSlot: true, clientEmail: true, state: true,
                service: { select: { name: true } }, barber: { select: { name: true } }
            }
        })
        : null;
    if (!appointment || !acceptsAppointmentLink(appointment, token)) {
        return <EmailLinkActions booking unavailable="El enlace de la cita no es válido o ya venció." />;
    }
    if (!['PENDING', 'CONFIRMED'].includes(appointment.state)) {
        return <EmailLinkActions booking unavailable={appointment.state === 'CANCELLED' ? 'La cita ya está cancelada.' : 'La cita ya fue completada.'} />;
    }

    const details = {
        'Servicio': appointment.service.name,
        'Fecha y hora': dateFormat.format(appointmentStart(appointment)),
        'Profesional': appointment.barber.name
    };
    return <EmailLinkActions booking endpoint={'/api/public/appointments/' + encodeURIComponent(id) + '/respond'}
        token={token} initialAction={selectedAction} details={details} />;
}
