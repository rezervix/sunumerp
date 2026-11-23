-- Turizm Faz 5: B2B Partner Ağı (turizm_b2b) — Rollback Script

DROP TABLE IF EXISTS "TurizmPartnerConflictLog";
DROP TABLE IF EXISTS "TurizmPartnerMessage";
DROP TABLE IF EXISTS "TurizmPartnerLedgerEntry";
DROP TABLE IF EXISTS "TurizmPartnerSettlement";
DROP TABLE IF EXISTS "TurizmPartnershipHistoryLog";

ALTER TABLE "TurizmCrossReservation" DROP COLUMN IF EXISTS "eDocumentIssuedAt";
ALTER TABLE "TurizmCrossReservation" DROP COLUMN IF EXISTS "eDocumentRefNo";
ALTER TABLE "TurizmCrossReservation" DROP COLUMN IF EXISTS "settlementId";
ALTER TABLE "TurizmCrossReservation" DROP COLUMN IF EXISTS "rejectedReason";
ALTER TABLE "TurizmCrossReservation" DROP COLUMN IF EXISTS "approvedAt";
ALTER TABLE "TurizmCrossReservation" DROP COLUMN IF EXISTS "approvedByUserId";
ALTER TABLE "TurizmCrossReservation" DROP COLUMN IF EXISTS "underlyingRecordId";
ALTER TABLE "TurizmCrossReservation" DROP COLUMN IF EXISTS "underlyingModuleType";
ALTER TABLE "TurizmCrossReservation" DROP COLUMN IF EXISTS "grossAmountTry";
ALTER TABLE "TurizmCrossReservation" DROP COLUMN IF EXISTS "ownerNetAmountTry";
ALTER TABLE "TurizmCrossReservation" DROP COLUMN IF EXISTS "commissionRatePct";
ALTER TABLE "TurizmCrossReservation" DROP COLUMN IF EXISTS "guestOrCustomerLabel";
ALTER TABLE "TurizmCrossReservation" DROP COLUMN IF EXISTS "quantity";

ALTER TABLE "TurizmSharedResource" DROP COLUMN IF EXISTS "withdrawalRuleNote";
ALTER TABLE "TurizmSharedResource" DROP COLUMN IF EXISTS "sensitiveMetaJson";
ALTER TABLE "TurizmSharedResource" DROP COLUMN IF EXISTS "hideSensitiveFields";
ALTER TABLE "TurizmSharedResource" DROP COLUMN IF EXISTS "allowedPartnerIdsJson";
ALTER TABLE "TurizmSharedResource" DROP COLUMN IF EXISTS "approvalMode";
ALTER TABLE "TurizmSharedResource" DROP COLUMN IF EXISTS "commissionRatePct";
ALTER TABLE "TurizmSharedResource" DROP COLUMN IF EXISTS "minDurationDays";
ALTER TABLE "TurizmSharedResource" DROP COLUMN IF EXISTS "availableTo";
ALTER TABLE "TurizmSharedResource" DROP COLUMN IF EXISTS "availableFrom";
