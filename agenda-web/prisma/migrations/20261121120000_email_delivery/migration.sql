BEGIN;
ALTER TABLE "User"
    ADD COLUMN "email" TEXT,
    ADD COLUMN "emailVerifiedAt" TIMESTAMP(3),
    ADD COLUMN "pendingEmail" TEXT,
    ADD COLUMN "emailChangeDigest" TEXT,
    ADD COLUMN "emailChangeExpiresAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "User_email_key" ON "User" ("email");
CREATE UNIQUE INDEX "User_emailChangeDigest_key" ON "User" ("emailChangeDigest");
ALTER TABLE "Appointment" ADD COLUMN "clientEmail" TEXT, ADD COLUMN "clientConfirmedAt" TIMESTAMP(3);

CREATE TABLE "EmailJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "runAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lease" TEXT,
    "lockedUntil" TIMESTAMP(3)
);
CREATE INDEX "EmailJob_runAt_idx" ON "EmailJob" ("runAt");
COMMIT;
