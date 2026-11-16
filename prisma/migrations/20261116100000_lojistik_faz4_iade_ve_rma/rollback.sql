-- Sunum ERP — Lojistik Faz 4: Tersine Lojistik, İade (RMA), Karantina, Kalite ve Kredi Notası (Rollback)

DROP INDEX IF EXISTS "ReturnRmaRecord_idempotencyKey_idx";
DROP INDEX IF EXISTS "ReturnRmaRecord_supplierId_idx";
DROP INDEX IF EXISTS "ReturnRmaRecord_orderNumber_idx";
DROP INDEX IF EXISTS "ReturnRmaRecord_rmaStatus_idx";

DROP TABLE IF EXISTS "LojistikRmaWebhookLog";
DROP TABLE IF EXISTS "LojistikReturnPolicy";
DROP TABLE IF EXISTS "LojistikRmaCreditNote";
DROP TABLE IF EXISTS "LojistikRmaEventLog";
DROP TABLE IF EXISTS "LojistikRmaLine";

ALTER TABLE "ReturnRmaRecord"
  DROP COLUMN IF EXISTS "cycleHours",
  DROP COLUMN IF EXISTS "recoveredValueTry",
  DROP COLUMN IF EXISTS "estimatedCostTry",
  DROP COLUMN IF EXISTS "externalChannelRef",
  DROP COLUMN IF EXISTS "idempotencyKey",
  DROP COLUMN IF EXISTS "labelCode",
  DROP COLUMN IF EXISTS "returnCarrierCode",
  DROP COLUMN IF EXISTS "refundApprovedAt",
  DROP COLUMN IF EXISTS "refundApprovedBy",
  DROP COLUMN IF EXISTS "financeRecordId",
  DROP COLUMN IF EXISTS "creditNoteNo",
  DROP COLUMN IF EXISTS "creditNoteId",
  DROP COLUMN IF EXISTS "poId",
  DROP COLUMN IF EXISTS "supplierId",
  DROP COLUMN IF EXISTS "qualityDecision",
  DROP COLUMN IF EXISTS "ncrId",
  DROP COLUMN IF EXISTS "inspectionId",
  DROP COLUMN IF EXISTS "closedAt",
  DROP COLUMN IF EXISTS "decidedAt",
  DROP COLUMN IF EXISTS "inspectedAt",
  DROP COLUMN IF EXISTS "receivedBinCode",
  DROP COLUMN IF EXISTS "receivedWarehouseId",
  DROP COLUMN IF EXISTS "receivedBy",
  DROP COLUMN IF EXISTS "receivedAt",
  DROP COLUMN IF EXISTS "deadlineOverrideReason",
  DROP COLUMN IF EXISTS "deadlineOverrideBy",
  DROP COLUMN IF EXISTS "deadlineOverrideApproved",
  DROP COLUMN IF EXISTS "isWithinWarranty",
  DROP COLUMN IF EXISTS "isWithinReturnWindow",
  DROP COLUMN IF EXISTS "warrantyExpiresAt",
  DROP COLUMN IF EXISTS "returnDeadlineAt",
  DROP COLUMN IF EXISTS "returnWindowDays",
  DROP COLUMN IF EXISTS "deliveredAt",
  DROP COLUMN IF EXISTS "invoiceNo",
  DROP COLUMN IF EXISTS "invoiceDocId",
  DROP COLUMN IF EXISTS "originalOrderId",
  DROP COLUMN IF EXISTS "orderSourceType",
  DROP COLUMN IF EXISTS "reasonNote",
  DROP COLUMN IF EXISTS "reasonCode",
  DROP COLUMN IF EXISTS "rmaStatus";

ALTER TABLE "InventoryItem"
  DROP COLUMN IF EXISTS "isReturnable",
  DROP COLUMN IF EXISTS "warrantyMonths",
  DROP COLUMN IF EXISTS "returnWindowDays";
