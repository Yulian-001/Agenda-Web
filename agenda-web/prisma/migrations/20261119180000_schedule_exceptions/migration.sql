CREATE TABLE IF NOT EXISTS "ScheduleException" (
    "barberId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "timeSlot" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL,
    CONSTRAINT "ScheduleException_pkey" PRIMARY KEY ("barberId", "date", "timeSlot"),
    CONSTRAINT "ScheduleException_barberId_fkey" FOREIGN KEY ("barberId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
