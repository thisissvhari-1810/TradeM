CREATE TABLE "ClosedTrade" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "practicePeriodId" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "exchange" TEXT NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'LONG',
    "quantity" INTEGER NOT NULL,
    "entryAt" TIMESTAMP(3) NOT NULL,
    "avgEntryPaise" BIGINT NOT NULL,
    "exitAt" TIMESTAMP(3) NOT NULL,
    "avgExitPaise" BIGINT NOT NULL,
    "grossPaise" BIGINT NOT NULL,
    "chargesPaise" BIGINT NOT NULL,
    "netPaise" BIGINT NOT NULL,
    "returnBps" INTEGER NOT NULL,
    "holdingSeconds" INTEGER NOT NULL,
    "orderIds" JSONB NOT NULL,
    "exitExecutionId" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "receiptSvg" TEXT NOT NULL DEFAULT '',
    "capturedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClosedTrade_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClosedTrade_exitExecutionId_key" ON "ClosedTrade"("exitExecutionId");
CREATE INDEX "ClosedTrade_userId_exitAt_idx" ON "ClosedTrade"("userId", "exitAt");
CREATE INDEX "ClosedTrade_accountId_exitAt_idx" ON "ClosedTrade"("accountId", "exitAt");

ALTER TABLE "ClosedTrade" ADD CONSTRAINT "ClosedTrade_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "VirtualAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClosedTrade" ADD CONSTRAINT "ClosedTrade_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClosedTrade" ADD CONSTRAINT "ClosedTrade_practicePeriodId_fkey" FOREIGN KEY ("practicePeriodId") REFERENCES "PracticePeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClosedTrade" ADD CONSTRAINT "ClosedTrade_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "Instrument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
