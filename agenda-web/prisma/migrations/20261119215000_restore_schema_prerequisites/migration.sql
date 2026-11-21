BEGIN;

CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "otpCode" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 0.70;
ALTER TABLE "Services" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Clients"
    ADD COLUMN IF NOT EXISTS "strikes" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "blockCount" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "blockedUntil" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "isBanned" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "lastStrikeAt" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "Clients_phone_key" ON "Clients" ("phone");

ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "priceAtBooking" DOUBLE PRECISION;
UPDATE "Appointment" AS appointment
SET "priceAtBooking" = service."price"
FROM "Services" AS service
WHERE appointment."priceAtBooking" IS NULL AND appointment."serviceId" = service."id";
ALTER TABLE "Appointment" ALTER COLUMN "priceAtBooking" SET NOT NULL;

-- Preserve copies of legacy customer fields without requiring new writes to populate them.
DO $$
DECLARE
    column_name_legacy TEXT;
BEGIN
    FOREACH column_name_legacy IN ARRAY ARRAY['name', 'phone']
    LOOP
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = current_schema() AND table_name = 'Appointment' AND column_name = column_name_legacy
        ) THEN
            EXECUTE format('ALTER TABLE "Appointment" ALTER COLUMN %I DROP NOT NULL', column_name_legacy);
        END IF;
    END LOOP;
END $$;

ALTER TABLE "HistoryAppointment" ADD COLUMN IF NOT EXISTS "changedAt" TIMESTAMP(3);
UPDATE "HistoryAppointment" AS history
SET "changedAt" = CASE WHEN history."state" = 'PENDING' THEN appointment."createdAt" ELSE appointment."updatedAt" END
FROM "Appointment" AS appointment
WHERE history."changedAt" IS NULL AND history."appointmentId" = appointment."id";
ALTER TABLE "HistoryAppointment"
    ALTER COLUMN "changedAt" SET DEFAULT CURRENT_TIMESTAMP,
    ALTER COLUMN "changedAt" SET NOT NULL;

ALTER TABLE "Appointment"
    DROP CONSTRAINT "Appointment_clientId_fkey",
    DROP CONSTRAINT "Appointment_barberId_fkey",
    DROP CONSTRAINT "Appointment_serviceId_fkey",
    ADD CONSTRAINT "Appointment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "Appointment_barberId_fkey" FOREIGN KEY ("barberId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "Appointment_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
