import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const emailKey = () => createHmac('sha256', process.env.JWT_SECRET).update('agenda-mail-queue-v1').digest();

export function protectEmail(payload) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', emailKey(), iv);
    const body = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);
    return Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64url');
}

export function readEmail(payload) {
    const packed = Buffer.from(payload, 'base64url');
    const decipher = createDecipheriv('aes-256-gcm', emailKey(), packed.subarray(0, 12));
    decipher.setAuthTag(packed.subarray(12, 28));
    return JSON.parse(Buffer.concat([decipher.update(packed.subarray(28)), decipher.final()]).toString('utf8'));
}

export function queueEmail(tx, kind, message, { runAt = new Date(), expiresAt = new Date(runAt.getTime() + 86400000) } = {}) {
    return tx.emailJob.create({ data: { kind, payload: protectEmail(message), runAt, expiresAt } });
}

export function appointmentStart(appointment) {
    return new Date(appointment.date.toISOString().slice(0, 10) + 'T' + appointment.timeSlot.padStart(5, '0') + ':00-05:00');
}

export function appointmentLinkToken(appointment) {
    return createHmac('sha256', process.env.JWT_SECRET)
        .update(['booking-action-v1', appointment.id, appointment.clientEmail, appointmentStart(appointment).toISOString()].join(':'))
        .digest('base64url');
}

export function acceptsAppointmentLink(appointment, token) {
    if (!appointment.clientEmail || !/^[a-zA-Z0-9_-]{43}$/.test(token) || appointmentStart(appointment) <= new Date()) return false;
    return timingSafeEqual(Buffer.from(token), Buffer.from(appointmentLinkToken(appointment)));
}
