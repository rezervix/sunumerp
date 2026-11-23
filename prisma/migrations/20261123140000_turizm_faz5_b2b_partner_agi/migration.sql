-- Turizm Faz 5: B2B Partner Ağı (turizm_b2b) — Additive Migration
-- Mevcut hiçbir tablo kolonu silinmez, yeniden adlandırılmaz veya tipi değiştirilmez.

-- 1. TurizmSharedResource additive columns
ALTER TABLE "TurizmSharedResource" ADD COLUMN IF NOT EXISTS "availableFrom" TIMESTAMP(3);
ALTER TABLE "TurizmSharedResource" ADD COLUMN IF NOT EXISTS "availableTo" TIMESTAMP(3);
ALTER TABLE "TurizmSharedResource" ADD COLUMN IF NOT EXISTS "minDurationDays" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "TurizmSharedResource" ADD COLUMN IF NOT EXISTS "commissionRatePct" DOUBLE PRECISION NOT NULL DEFAULT 10;
ALTER TABLE "TurizmSharedResource" ADD COLUMN IF NOT EXISTS "approvalMode" TEXT NOT NULL DEFAULT 'MANUAL';
ALTER TABLE "TurizmSharedResource" ADD COLUMN IF NOT EXISTS "allowedPartnerIdsJson" TEXT;
ALTER TABLE "TurizmSharedResource" ADD COLUMN IF NOT EXISTS "hideSensitiveFields" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "TurizmSharedResource" ADD COLUMN IF NOT EXISTS "sensitiveMetaJson" TEXT;
ALTER TABLE "TurizmSharedResource" ADD COLUMN IF NOT EXISTS "withdrawalRuleNote" TEXT;

-- 2. TurizmCrossReservation additive columns
ALTER TABLE "TurizmCrossReservation" ADD COLUMN IF NOT EXISTS "quantity" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "TurizmCrossReservation" ADD COLUMN IF NOT EXISTS "guestOrCustomerLabel" TEXT;
ALTER TABLE "TurizmCrossReservation" ADD COLUMN IF NOT EXISTS "commissionRatePct" DOUBLE PRECISION NOT NULL DEFAULT 10;
ALTER TABLE "TurizmCrossReservation" ADD COLUMN IF NOT EXISTS "ownerNetAmountTry" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "TurizmCrossReservation" ADD COLUMN IF NOT EXISTS "grossAmountTry" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "TurizmCrossReservation" ADD COLUMN IF NOT EXISTS "underlyingModuleType" TEXT;
ALTER TABLE "TurizmCrossReservation" ADD COLUMN IF NOT EXISTS "underlyingRecordId" TEXT;
ALTER TABLE "TurizmCrossReservation" ADD COLUMN IF NOT EXISTS "approvedByUserId" TEXT;
ALTER TABLE "TurizmCrossReservation" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);
ALTER TABLE "TurizmCrossReservation" ADD COLUMN IF NOT EXISTS "rejectedReason" TEXT;
ALTER TABLE "TurizmCrossReservation" ADD COLUMN IF NOT EXISTS "settlementId" TEXT;
ALTER TABLE "TurizmCrossReservation" ADD COLUMN IF NOT EXISTS "eDocumentRefNo" TEXT;
ALTER TABLE "TurizmCrossReservation" ADD COLUMN IF NOT EXISTS "eDocumentIssuedAt" TIMESTAMP(3);

-- 3. New Faz 5 Tables
CREATE TABLE IF NOT EXISTS "TurizmPartnershipHistoryLog" (
    "id" TEXT NOT NULL,
    "partnershipId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "actorCompanyId" TEXT,
    "actorUserId" TEXT,
    "actorName" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TurizmPartnershipHistoryLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "TurizmPartnershipHistoryLog_partnershipId_createdAt_idx" ON "TurizmPartnershipHistoryLog"("partnershipId", "createdAt");

CREATE TABLE IF NOT EXISTS "TurizmPartnerSettlement" (
    "id" TEXT NOT NULL,
    "settlementNo" TEXT NOT NULL,
    "periodLabel" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "ownerCompanyId" TEXT NOT NULL,
    "bookingCompanyId" TEXT NOT NULL,
    "reservationCount" INTEGER NOT NULL DEFAULT 0,
    "grossVolumeTry" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "commissionTotalTry" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ownerNetPayableTry" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "adjustmentAmountTry" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "adjustmentReason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING_COUNTERPARTY',
    "ownerApprovedAt" TIMESTAMP(3),
    "ownerApprovedBy" TEXT,
    "bookerApprovedAt" TIMESTAMP(3),
    "bookerApprovedBy" TEXT,
    "disputeNote" TEXT,
    "eDocumentRefNo" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TurizmPartnerSettlement_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "TurizmPartnerSettlement_settlementNo_key" ON "TurizmPartnerSettlement"("settlementNo");
CREATE INDEX IF NOT EXISTS "TurizmPartnerSettlement_ownerCompanyId_status_idx" ON "TurizmPartnerSettlement"("ownerCompanyId", "status");
CREATE INDEX IF NOT EXISTS "TurizmPartnerSettlement_bookingCompanyId_status_idx" ON "TurizmPartnerSettlement"("bookingCompanyId", "status");

CREATE TABLE IF NOT EXISTS "TurizmPartnerLedgerEntry" (
    "id" TEXT NOT NULL,
    "entryNo" TEXT NOT NULL,
    "pairKey" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "counterpartyCompanyId" TEXT NOT NULL,
    "crossReservationId" TEXT,
    "settlementId" TEXT,
    "entryType" TEXT NOT NULL DEFAULT 'RECEIVABLE',
    "direction" TEXT NOT NULL DEFAULT 'DEBIT',
    "amountTry" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "dueDate" TIMESTAMP(3),
    "financeId" TEXT,
    "eDocumentRefNo" TEXT,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TurizmPartnerLedgerEntry_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "TurizmPartnerLedgerEntry_entryNo_key" ON "TurizmPartnerLedgerEntry"("entryNo");
CREATE INDEX IF NOT EXISTS "TurizmPartnerLedgerEntry_companyId_status_idx" ON "TurizmPartnerLedgerEntry"("companyId", "status");
CREATE INDEX IF NOT EXISTS "TurizmPartnerLedgerEntry_counterpartyCompanyId_idx" ON "TurizmPartnerLedgerEntry"("counterpartyCompanyId");
CREATE INDEX IF NOT EXISTS "TurizmPartnerLedgerEntry_pairKey_idx" ON "TurizmPartnerLedgerEntry"("pairKey");
CREATE INDEX IF NOT EXISTS "TurizmPartnerLedgerEntry_crossReservationId_idx" ON "TurizmPartnerLedgerEntry"("crossReservationId");

CREATE TABLE IF NOT EXISTS "TurizmPartnerMessage" (
    "id" TEXT NOT NULL,
    "crossReservationId" TEXT NOT NULL,
    "senderCompanyId" TEXT NOT NULL,
    "senderUserId" TEXT,
    "senderName" TEXT NOT NULL,
    "messageType" TEXT NOT NULL DEFAULT 'NOTE',
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TurizmPartnerMessage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "TurizmPartnerMessage_crossReservationId_createdAt_idx" ON "TurizmPartnerMessage"("crossReservationId", "createdAt");

CREATE TABLE IF NOT EXISTS "TurizmPartnerConflictLog" (
    "id" TEXT NOT NULL,
    "sharedResourceId" TEXT,
    "resourceTitle" TEXT NOT NULL,
    "ownerCompanyId" TEXT NOT NULL,
    "bookingCompanyId" TEXT NOT NULL,
    "attemptedStartAt" TIMESTAMP(3) NOT NULL,
    "attemptedEndAt" TIMESTAMP(3) NOT NULL,
    "conflictReservationNo" TEXT,
    "rejectionCode" TEXT NOT NULL,
    "rejectionMessage" TEXT NOT NULL,
    "alternativesSuggestedCount" INTEGER NOT NULL DEFAULT 0,
    "actorUserId" TEXT,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TurizmPartnerConflictLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "TurizmPartnerConflictLog_ownerCompanyId_attemptedAt_idx" ON "TurizmPartnerConflictLog"("ownerCompanyId", "attemptedAt");
CREATE INDEX IF NOT EXISTS "TurizmPartnerConflictLog_bookingCompanyId_attemptedAt_idx" ON "TurizmPartnerConflictLog"("bookingCompanyId", "attemptedAt");
