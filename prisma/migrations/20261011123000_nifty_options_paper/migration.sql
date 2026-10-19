CREATE TABLE "OptionPaperAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cashPaise" BIGINT NOT NULL,
    "dayKey" TEXT NOT NULL DEFAULT '',
    "dayEntries" INTEGER NOT NULL DEFAULT 0,
    "dayRealizedPaise" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OptionPaperAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OptionPaperOrder" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "contractKey" TEXT NOT NULL,
    "lots" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "fillPremiumPaise" BIGINT,
    "chargesPaise" BIGINT NOT NULL DEFAULT 0,
    "simulated" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OptionPaperOrder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OptionPaperPosition" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "contractKey" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "strike" INTEGER NOT NULL,
    "expiry" TEXT NOT NULL,
    "right" TEXT NOT NULL,
    "lots" INTEGER NOT NULL,
    "lotSize" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "avgPremiumPaise" BIGINT NOT NULL,
    "stopPremiumPaise" BIGINT NOT NULL,
    "targetPremiumPaise" BIGINT NOT NULL,
    "chargesPaise" BIGINT NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "exitPremiumPaise" BIGINT,
    "realizedPaise" BIGINT NOT NULL DEFAULT 0,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "OptionPaperPosition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OptionSignalLog" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OptionSignalLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OptionPaperAccount_userId_key" ON "OptionPaperAccount"("userId");
CREATE UNIQUE INDEX "OptionPaperOrder_accountId_idempotencyKey_key" ON "OptionPaperOrder"("accountId", "idempotencyKey");
CREATE INDEX "OptionPaperOrder_accountId_createdAt_idx" ON "OptionPaperOrder"("accountId", "createdAt");
CREATE INDEX "OptionPaperPosition_accountId_status_idx" ON "OptionPaperPosition"("accountId", "status");
CREATE UNIQUE INDEX "OptionSignalLog_accountId_dedupeKey_key" ON "OptionSignalLog"("accountId", "dedupeKey");
CREATE INDEX "OptionSignalLog_accountId_createdAt_idx" ON "OptionSignalLog"("accountId", "createdAt");

ALTER TABLE "OptionPaperAccount" ADD CONSTRAINT "OptionPaperAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OptionPaperOrder" ADD CONSTRAINT "OptionPaperOrder_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "OptionPaperAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OptionPaperPosition" ADD CONSTRAINT "OptionPaperPosition_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "OptionPaperAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OptionSignalLog" ADD CONSTRAINT "OptionSignalLog_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "OptionPaperAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
