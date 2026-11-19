ALTER TABLE "HistoryAppointment"
    ADD COLUMN IF NOT EXISTS "actorUserId" TEXT,
    ADD COLUMN IF NOT EXISTS "actorName" TEXT,
    ADD COLUMN IF NOT EXISTS "actorRole" TEXT;
