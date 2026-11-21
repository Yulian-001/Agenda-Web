import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { appointmentEmail } from './appointment-email.mjs';
import { appointmentLinkToken, appointmentStart, readEmail } from '../utils/mail.mjs';

const base = new URL(process.env.APP_PUBLIC_URL ?? '');
if (base.protocol !== 'https:' && !(base.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(base.hostname))) {
    throw new Error('APP_PUBLIC_URL debe usar HTTPS o apuntar a localhost.');
}
if (!process.env.JWT_SECRET) throw new Error('Configura JWT_SECRET también para el proceso de correo.');
const previewDir = process.env.MAIL_PREVIEW_DIR;
if (previewDir && process.env.NODE_ENV === 'production') throw new Error('MAIL_PREVIEW_DIR está reservado al entorno de pruebas.');
const sender = process.env.GMAIL_USER;
const password = process.env.GMAIL_APP_PASSWORD?.replace(/\s/g, '');
if (!previewDir && (!sender || !password)) throw new Error('Configura GMAIL_USER y GMAIL_APP_PASSWORD.');
const transport = previewDir ? null : nodemailer.createTransport({
    service: 'gmail', auth: { user: sender, pass: password },
    connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 15000, disableFileAccess: true, disableUrlAccess: true
});
if (previewDir) await mkdir(previewDir, { recursive: true, mode: 0o700 });
const prisma = new PrismaClient();
let working = true;
process.on('SIGINT', () => { working = false; });
process.on('SIGTERM', () => { working = false; });
const dateFormat = new Intl.DateTimeFormat('es-CO', { dateStyle: 'full', timeZone: 'America/Bogota' });
const timeFormat = new Intl.DateTimeFormat('es-CO', { timeStyle: 'short', timeZone: 'America/Bogota' });
const open = ['PENDING', 'CONFIRMED'];

function bookingLink(appointment, action) {
    const url = new URL('/reserva/responder/' + appointment.id, base);
    url.searchParams.set('token', appointmentLinkToken(appointment));
    url.searchParams.set('action', action);
    return url.href;
}

async function render(job) {
    const data = readEmail(job.payload);
    if (job.kind === 'RECOVERY' || job.kind === 'VERIFY_EMAIL') {
        const user = await prisma.user.findUnique({
            where: { id: data.userId },
            select: { state: true, archivedAt: true, emailVerifiedAt: true, email: true, pendingEmail: true, emailChangeDigest: true }
        });
        if (!user?.state || user.archivedAt) return null;
        if (job.kind === 'VERIFY_EMAIL') {
            if (user.pendingEmail !== data.to || user.emailChangeDigest !== data.digest) return null;
            const url = new URL('/verificar-correo', base);
            url.searchParams.set('token', data.token);
            return { to: data.to, subject: 'Verifica tu correo en Agenda Web', text: 'Confirma tu nuevo correo: ' + url.href + '\nEste enlace vence en 30 minutos.' };
        }
        if (!user.emailVerifiedAt || user.email !== data.to) return null;
        const reset = await prisma.passwordResetToken.findUnique({ where: { id: data.tokenId }, select: { used: true, expiresAt: true } });
        if (!reset || reset.used || reset.expiresAt <= new Date()) return null;
        return { to: data.to, subject: 'Código de recuperación de Agenda Web', text: 'Tu código es ' + data.code + '. Vence en 5 minutos desde que lo solicitaste.' };
    }

    const appointment = await prisma.appointment.findUnique({
        where: { id: data.appointmentId },
        include: {
            service: { select: { name: true } },
            barber: { select: { name: true, email: true, emailVerifiedAt: true, state: true, archivedAt: true } }
        }
    });
    if (!appointment) return null;
    const startsAt = appointmentStart(appointment);
    const details = {
        service: appointment.service.name, date: dateFormat.format(startsAt),
        time: timeFormat.format(startsAt), barber: appointment.barber.name
    };
    const barberAddress = appointment.barber.state && !appointment.barber.archivedAt && appointment.barber.emailVerifiedAt && appointment.barber.email;
    if (job.kind === 'BARBER_NEW_BOOKING') {
        if (!barberAddress || !open.includes(appointment.state)) return null;
        return { to: barberAddress, ...appointmentEmail({
            ...details, staff: true, subject: 'Nueva cita en tu agenda', intro: 'Se agregó una reserva a tu calendario.'
        }) };
    }
    if (job.kind === 'BARBER_CANCELLED') {
        if (!barberAddress || appointment.state !== 'CANCELLED') return null;
        return { to: barberAddress, ...appointmentEmail({
            ...details, staff: true, subject: 'Cita cancelada', intro: 'Una reserva de tu agenda se canceló. Consulta el calendario para ver la disponibilidad.'
        }) };
    }
    if (job.kind === 'ADMIN_STRIKE') {
        const admins = await prisma.user.findMany({
            where: { role: 'ADMIN', state: true, archivedAt: null, emailVerifiedAt: { not: null }, email: { not: null } },
            select: { email: true }
        });
        if (!admins.length) return null;
        return { bcc: admins.map(user => user.email), ...appointmentEmail({
            ...details, staff: true, subject: 'Cancelación tardía registrada', intro: 'La cancelación generó una falta. Puedes consultarla en Reportes.'
        }) };
    }
    if (!['BOOKING_RECEIPT', 'BOOKING_REMINDER'].includes(job.kind) || !appointment.clientEmail || !open.includes(appointment.state)) return null;
    const reminder = job.kind === 'BOOKING_REMINDER';
    const canRespond = startsAt > new Date();
    return { to: appointment.clientEmail, ...appointmentEmail({
        ...details, reference: appointment.id,
        subject: reminder ? 'Recordatorio de tu cita' : 'Comprobante de tu reserva',
        intro: reminder ? 'Tu cita se acerca. Revisa los datos y confirma si puedes asistir.' : 'Registramos tu cita. Guarda este correo para consultar los datos de tu reserva.',
        actions: canRespond ? [
            { label: 'Confirmar asistencia', href: bookingLink(appointment, 'confirm') },
            { label: 'Cancelar cita', href: bookingLink(appointment, 'cancel'), secondary: true }
        ] : [],
        note: canRespond ? 'Cada botón abre la acción elegida. Si cancelas con menos de 12 horas de anticipación, puedes acumular una falta.' : undefined
    }) };
}

async function claim() {
    const lease = randomUUID();
    const [job] = await prisma.$queryRaw`
        WITH pending AS (
            SELECT "id" FROM "EmailJob"
            WHERE "runAt" <= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') AND "expiresAt" > (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') AND ("lockedUntil" IS NULL OR "lockedUntil" < (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'))
            ORDER BY "runAt" FOR UPDATE SKIP LOCKED LIMIT 1
        )
        UPDATE "EmailJob" AS job SET "lease" = ${lease}, "lockedUntil" = (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') + INTERVAL '2 minutes'
        FROM pending WHERE job."id" = pending."id" RETURNING job.*
    `;
    return job;
}

async function deliver(job) {
    const where = { id: job.id, lease: job.lease };
    try {
        const message = await render(job);
        if (message) {
            if (previewDir) await writeFile(join(previewDir, job.id + '.json'), JSON.stringify(message), { mode: 0o600 });
            else await transport.sendMail({ from: sender, messageId: '<' + job.id + '@' + base.hostname + '>', ...message });
        }
        await prisma.emailJob.deleteMany({ where });
    } catch (error) {
        const attempts = job.attempts + 1;
        const retryAt = new Date(Date.now() + Math.min(3600000, 15000 * 2 ** job.attempts));
        console.error('Fallo de correo', job.kind, error.code ?? error.name);
        if (attempts >= 8 || retryAt >= job.expiresAt) await prisma.emailJob.deleteMany({ where });
        else await prisma.emailJob.updateMany({ where, data: { attempts, runAt: retryAt, lease: null, lockedUntil: null } });
    }
}

try {
    while (working) {
        try {
            const job = await claim();
            if (job) await deliver(job);
            else {
                await prisma.$executeRaw`
                    DELETE FROM "EmailJob" WHERE "id" IN (
                        SELECT "id" FROM "EmailJob" WHERE "expiresAt" <= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')
                        AND ("lockedUntil" IS NULL OR "lockedUntil" < (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')) LIMIT 100
                    )
                `;
                if (process.argv.includes('--once')) break;
                await sleep(2000);
            }
        } catch (error) {
            console.error('Error del proceso de correo', error.code ?? error.name);
            if (process.argv.includes('--once')) throw error;
            await sleep(5000);
        }
    }
} finally {
    await prisma.$disconnect();
    transport?.close();
}
