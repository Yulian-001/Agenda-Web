import { createHmac } from 'node:crypto';
import { isIP, SocketAddress } from 'node:net';
import { recoveryIpWindowMs, recoveryPhoneWindowMs, recoveryRequestLimit, recoveryResendMs } from '../config/auth';
import { prisma } from '../utils/prisma';

function clientIp(headers) {
    const header = process.env.RECOVERY_CLIENT_IP_HEADER;
    const address = header && headers.get(header)?.trim();
    const family = address && isIP(address);
    // Without a trusted ingress header, every request shares one quota.
    if (!family) return 'unidentified';
    if (family === 4) return address;
    const normalized = new SocketAddress({ address, family: 'ipv6' }).address;
    const ipv4 = normalized.startsWith('::ffff:') ? normalized.slice(7) : '';
    return isIP(ipv4) === 4 ? ipv4 : normalized;
}

function counterKey(scope, value) {
    return createHmac('sha256', process.env.JWT_SECRET)
        .update('recovery-limit:' + scope + ':' + value).digest('hex');
}

async function lockBucket(tx, key) {
    for (;;) {
        const [existing] = await tx.$queryRaw`
            SELECT "attempts" FROM "RecoveryRateLimit" WHERE "key" = ${key} FOR UPDATE
        `;
        if (existing) return existing.attempts;

        const inserted = await tx.$executeRaw`
            INSERT INTO "RecoveryRateLimit" ("key", "expiresAt") VALUES (${key}, ${new Date()})
            ON CONFLICT ("key") DO NOTHING
        `;
        if (inserted) return [];
    }
}

async function consume(tx, key, windowMs, cooldownMs = 0) {
    const stored = await lockBucket(tx, key);
    const now = new Date();
    const time = now.getTime();
    const attempts = stored.filter(attempt => attempt.getTime() > time - windowMs);
    const oldest = attempts[0];
    const latest = attempts.at(-1);
    const retryAt = Math.max(
        attempts.length >= recoveryRequestLimit ? oldest.getTime() + windowMs : 0,
        latest ? latest.getTime() + cooldownMs : 0
    );
    if (retryAt > time) return { retryAt: new Date(retryAt), now };

    await tx.recoveryRateLimit.update({
        where: { key },
        data: { attempts: [...attempts, now], expiresAt: new Date(time + windowMs) }
    });
    return { now };
}

export function limitRecoveryRequest(headers, phone) {
    const ipKey = counterKey('ip', clientIp(headers));
    const phoneKey = counterKey('phone', phone);

    return prisma.$transaction(async tx => {
        const byIp = await consume(tx, ipKey, recoveryIpWindowMs);
        if (byIp.retryAt) return byIp;
        return consume(tx, phoneKey, recoveryPhoneWindowMs, recoveryResendMs);
    });
}

export function pruneRecoveryLimits() {
    return prisma.$executeRaw`
        WITH expired AS (
            SELECT "key" FROM "RecoveryRateLimit"
            WHERE "expiresAt" <= ${new Date()}
            ORDER BY "expiresAt" LIMIT 32 FOR UPDATE SKIP LOCKED
        )
        DELETE FROM "RecoveryRateLimit" WHERE "key" IN (SELECT "key" FROM expired)
    `;
}
