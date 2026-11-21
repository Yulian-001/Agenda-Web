BEGIN;

ALTER TABLE "User" ADD COLUMN "isOwner" BOOLEAN NOT NULL DEFAULT false;
CREATE UNIQUE INDEX "User_one_owner_idx" ON "User" ("isOwner") WHERE "isOwner" = true;

-- Prisma 5 represents the lookup index. PostgreSQL enforces uniqueness only for occupied slots.
DROP INDEX IF EXISTS "Appointment_barberId_date_timeSlot_key";
CREATE INDEX "Appointment_barberId_date_timeSlot_idx" ON "Appointment" ("barberId", "date", "timeSlot");
CREATE UNIQUE INDEX "Appointment_occupied_slot_key"
ON "Appointment" ("barberId", "date", (CASE WHEN length("timeSlot") = 4 THEN '0' || "timeSlot" ELSE "timeSlot" END))
WHERE "state" <> 'CANCELLED';

COMMIT;
