CREATE TABLE "RecoveryRateLimit" (
    "key" TEXT NOT NULL,
    "attempts" TIMESTAMP(3)[] NOT NULL DEFAULT ARRAY[]::TIMESTAMP(3)[],
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecoveryRateLimit_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "RecoveryRateLimit_expiresAt_idx" ON "RecoveryRateLimit"("expiresAt");

CREATE INDEX "PasswordResetToken_phone_createdAt_idx" ON "PasswordResetToken"("phone", "createdAt");
