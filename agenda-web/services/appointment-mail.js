import { queueEmail, appointmentStart } from '../utils/mail.mjs';

export async function queueBookingEmails(tx, appointment) {
    const startsAt = appointmentStart(appointment);
    const now = new Date();
    const reminderAt = new Date(startsAt.getTime() - 3600000);

    await queueEmail(tx, 'BOOKING_RECEIPT', { appointmentId: appointment.id });
    await queueEmail(tx, 'BARBER_NEW_BOOKING', { appointmentId: appointment.id }, { expiresAt: startsAt });
    if (reminderAt > now) {
        await queueEmail(tx, 'BOOKING_REMINDER', { appointmentId: appointment.id }, { runAt: reminderAt, expiresAt: startsAt });
    }
}

export async function queueCancellationEmails(tx, appointment, strike) {
    await queueEmail(tx, 'BARBER_CANCELLED', { appointmentId: appointment.id });
    if (strike) await queueEmail(tx, 'ADMIN_STRIKE', { appointmentId: appointment.id });
}
