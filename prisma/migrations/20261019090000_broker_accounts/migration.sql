-- CreateEnum
CREATE TYPE "AccountRelationship" AS ENUM ('SELF', 'SPOUSE', 'DEPENDENT_CHILD', 'DEPENDENT_PARENT');

-- CreateEnum
CREATE TYPE "BrokerConnection" AS ENUM ('NOT_CONNECTED', 'AUTH_REQUIRED', 'CONNECTED', 'EXPIRED', 'ERROR');

-- CreateEnum
CREATE TYPE "TradingMode" AS ENUM ('PAPER', 'LIVE');

-- CreateEnum
CREATE TYPE "BrokerOrderStatus" AS ENUM ('PREVIEW', 'SUBMITTING', 'PENDING', 'PARTIAL', 'FILLED', 'REJECTED', 'CANCELLED', 'EXPIRED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "AuditOutcome" AS ENUM ('SUCCESS', 'FAILURE', 'DENIED');

-- CreateTable
CREATE TABLE "BrokerAccount" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "broker" TEXT NOT NULL DEFAULT 'DHAN',
    "slot" INTEGER NOT NULL,
    "nickname" TEXT NOT NULL,
    "relationship" "AccountRelationship" NOT NULL,
    "maskedClientId" TEXT NOT NULL DEFAULT '',
    "clientFingerprint" TEXT,
    "connection" "BrokerConnection" NOT NULL DEFAULT 'NOT_CONNECTED',
    "authorizedAt" TIMESTAMP(3),
    "tokenExpiresAt" TIMESTAMP(3),
    "lastConnectedAt" TIMESTAMP(3),
    "lastSyncAt" TIMESTAMP(3),
    "lastError" TEXT NOT NULL DEFAULT '',
    "lastErrorAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrokerAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrokerCredential" (
    "accountId" TEXT NOT NULL,
    "ciphertext" TEXT NOT NULL,
    "keyId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrokerCredential_pkey" PRIMARY KEY ("accountId")
);

-- CreateTable
CREATE TABLE "BrokerOrder" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mode" "TradingMode" NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "correlationId" TEXT NOT NULL,
    "brokerOrderId" TEXT,
    "exchangeSegment" TEXT NOT NULL,
    "securityId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "productType" TEXT NOT NULL,
    "side" "OrderSide" NOT NULL,
    "orderType" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "pricePaise" BIGINT,
    "triggerPricePaise" BIGINT,
    "status" "BrokerOrderStatus" NOT NULL DEFAULT 'PREVIEW',
    "brokerStatus" TEXT NOT NULL DEFAULT '',
    "avgPricePaise" BIGINT,
    "filledQuantity" INTEGER NOT NULL DEFAULT 0,
    "remainingQuantity" INTEGER NOT NULL,
    "rejectReason" TEXT NOT NULL DEFAULT '',
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrokerOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradingAuditEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "accountId" TEXT,
    "action" TEXT NOT NULL,
    "correlationId" TEXT NOT NULL,
    "outcome" "AuditOutcome" NOT NULL,
    "detail" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TradingAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BrokerAccount_clientFingerprint_key" ON "BrokerAccount"("clientFingerprint");

-- CreateIndex
CREATE INDEX "BrokerAccount_ownerId_idx" ON "BrokerAccount"("ownerId");

-- CreateIndex
CREATE INDEX "BrokerAccount_connection_idx" ON "BrokerAccount"("connection");

-- CreateIndex
CREATE UNIQUE INDEX "BrokerAccount_ownerId_slot_key" ON "BrokerAccount"("ownerId", "slot");

-- CreateIndex
CREATE UNIQUE INDEX "BrokerOrder_correlationId_key" ON "BrokerOrder"("correlationId");

-- CreateIndex
CREATE INDEX "BrokerOrder_accountId_createdAt_idx" ON "BrokerOrder"("accountId", "createdAt");

-- CreateIndex
CREATE INDEX "BrokerOrder_brokerOrderId_idx" ON "BrokerOrder"("brokerOrderId");

-- CreateIndex
CREATE INDEX "BrokerOrder_status_idx" ON "BrokerOrder"("status");

-- CreateIndex
CREATE UNIQUE INDEX "BrokerOrder_accountId_idempotencyKey_key" ON "BrokerOrder"("accountId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "TradingAuditEvent_userId_createdAt_idx" ON "TradingAuditEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "TradingAuditEvent_accountId_createdAt_idx" ON "TradingAuditEvent"("accountId", "createdAt");

-- CreateIndex
CREATE INDEX "TradingAuditEvent_correlationId_idx" ON "TradingAuditEvent"("correlationId");

-- CreateIndex
CREATE INDEX "TradingAuditEvent_createdAt_idx" ON "TradingAuditEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "BrokerAccount" ADD CONSTRAINT "BrokerAccount_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrokerCredential" ADD CONSTRAINT "BrokerCredential_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "BrokerAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrokerOrder" ADD CONSTRAINT "BrokerOrder_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "BrokerAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

