-- Sunum ERP — Lojistik Faz 4: Tersine Lojistik, İade (RMA), Karantina, Kalite ve Kredi Notası (Additive Migration)
-- Mevcut tablolara yalnızca geriye dönük uyumlu (nullable veya varsayılan değerli) kolonlar eklenir;
-- yeni tabloların tamamı "Lojistik" önekine sahiptir ve mevcut verilere zarar verilmez.

ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "returnWindowDays" INTEGER;
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "warrantyMonths" INTEGER;
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "isReturnable" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "ReturnRmaRecord" ADD COLUMN IF NOT EXISTS "rmaStatus" TEXT NOT NULL DEFAULT 'TALEP';
ALTER TABLE "ReturnRmaRecord" ADD COLUMN IF NOT EXISTS "reasonCode" TEXT NOT NULL DEFAULT 'CAYMA_HAKKI';
ALTER TABLE "ReturnRmaRecord" ADD COLUMN IF NOT EXISTS "reasonNote" TEXT;
ALTER TABLE "ReturnRmaRecord" ADD COLUMN IF NOT EXISTS "orderSourceType" TEXT NOT NULL DEFAULT 'OMNICHANNEL';
ALTER TABLE "ReturnRmaRecord" ADD COLUMN IF NOT EXISTS "originalOrderId" TEXT;
ALTER TABLE "ReturnRmaRecord" ADD COLUMN IF NOT EXISTS "invoiceDocId" TEXT;
ALTER TABLE "ReturnRmaRecord" ADD COLUMN IF NOT EXISTS "invoiceNo" TEXT;
ALTER TABLE "ReturnRmaRecord" ADD COLUMN IF NOT EXISTS "deliveredAt" TIMESTAMP(3);
ALTER TABLE "ReturnRmaRecord" ADD COLUMN IF NOT EXISTS "returnWindowDays" INTEGER NOT NULL DEFAULT 14;
ALTER TABLE "ReturnRmaRecord" ADD COLUMN IF NOT EXISTS "returnDeadlineAt" TIMESTAMP(3);
ALTER TABLE "ReturnRmaRecord" ADD COLUMN IF NOT EXISTS "warrantyExpiresAt" TIMESTAMP(3);
ALTER TABLE "ReturnRmaRecord" ADD COLUMN IF NOT EXISTS "isWithinReturnWindow" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "ReturnRmaRecord" ADD COLUMN IF NOT EXISTS "isWithinWarranty" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ReturnRmaRecord" ADD COLUMN IF NOT EXISTS "deadlineOverrideApproved" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ReturnRmaRecord" ADD COLUMN IF NOT EXISTS "deadlineOverrideBy" TEXT;
ALTER TABLE "ReturnRmaRecord" ADD COLUMN IF NOT EXISTS "deadlineOverrideReason" TEXT;
ALTER TABLE "ReturnRmaRecord" ADD COLUMN IF NOT EXISTS "receivedAt" TIMESTAMP(3);
ALTER TABLE "ReturnRmaRecord" ADD COLUMN IF NOT EXISTS "receivedBy" TEXT;
ALTER TABLE "ReturnRmaRecord" ADD COLUMN IF NOT EXISTS "receivedWarehouseId" TEXT;
ALTER TABLE "ReturnRmaRecord" ADD COLUMN IF NOT EXISTS "receivedBinCode" TEXT;
ALTER TABLE "ReturnRmaRecord" ADD COLUMN IF NOT EXISTS "inspectedAt" TIMESTAMP(3);
ALTER TABLE "ReturnRmaRecord" ADD COLUMN IF NOT EXISTS "decidedAt" TIMESTAMP(3);
ALTER TABLE "ReturnRmaRecord" ADD COLUMN IF NOT EXISTS "closedAt" TIMESTAMP(3);
ALTER TABLE "ReturnRmaRecord" ADD COLUMN IF NOT EXISTS "inspectionId" TEXT;
ALTER TABLE "ReturnRmaRecord" ADD COLUMN IF NOT EXISTS "ncrId" TEXT;
ALTER TABLE "ReturnRmaRecord" ADD COLUMN IF NOT EXISTS "qualityDecision" TEXT;
ALTER TABLE "ReturnRmaRecord" ADD COLUMN IF NOT EXISTS "supplierId" TEXT;
ALTER TABLE "ReturnRmaRecord" ADD COLUMN IF NOT EXISTS "poId" TEXT;
ALTER TABLE "ReturnRmaRecord" ADD COLUMN IF NOT EXISTS "creditNoteId" TEXT;
ALTER TABLE "ReturnRmaRecord" ADD COLUMN IF NOT EXISTS "creditNoteNo" TEXT;
ALTER TABLE "ReturnRmaRecord" ADD COLUMN IF NOT EXISTS "financeRecordId" TEXT;
ALTER TABLE "ReturnRmaRecord" ADD COLUMN IF NOT EXISTS "refundApprovedBy" TEXT;
ALTER TABLE "ReturnRmaRecord" ADD COLUMN IF NOT EXISTS "refundApprovedAt" TIMESTAMP(3);
ALTER TABLE "ReturnRmaRecord" ADD COLUMN IF NOT EXISTS "returnCarrierCode" TEXT;
ALTER TABLE "ReturnRmaRecord" ADD COLUMN IF NOT EXISTS "labelCode" TEXT;
ALTER TABLE "ReturnRmaRecord" ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;
ALTER TABLE "ReturnRmaRecord" ADD COLUMN IF NOT EXISTS "externalChannelRef" TEXT;
ALTER TABLE "ReturnRmaRecord" ADD COLUMN IF NOT EXISTS "estimatedCostTry" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "ReturnRmaRecord" ADD COLUMN IF NOT EXISTS "recoveredValueTry" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "ReturnRmaRecord" ADD COLUMN IF NOT EXISTS "cycleHours" DOUBLE PRECISION;

CREATE TABLE IF NOT EXISTS "LojistikRmaLine" (
    "id" TEXT NOT NULL,
    "rmaId" TEXT NOT NULL,
    "itemId" TEXT,
    "orderLineId" TEXT,
    "sku" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "soldQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "requestedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "receivedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "damagedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "missingQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vatRate" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "lotNumber" TEXT,
    "serialNumber" TEXT,
    "expiryDate" TIMESTAMP(3),
    "disposition" TEXT,
    "targetBinCode" TEXT,
    "inspectionId" TEXT,
    "ncrId" TEXT,
    "supplierId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LojistikRmaLine_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "LojistikRmaLine_rmaId_fkey" FOREIGN KEY ("rmaId") REFERENCES "ReturnRmaRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LojistikRmaLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "LojistikRmaLine_rmaId_idx" ON "LojistikRmaLine"("rmaId");
CREATE INDEX IF NOT EXISTS "LojistikRmaLine_itemId_idx" ON "LojistikRmaLine"("itemId");
CREATE INDEX IF NOT EXISTS "LojistikRmaLine_sku_idx" ON "LojistikRmaLine"("sku");

CREATE TABLE IF NOT EXISTS "LojistikRmaEventLog" (
    "id" TEXT NOT NULL,
    "rmaId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "actorUserId" TEXT,
    "actorName" TEXT,
    "method" TEXT NOT NULL DEFAULT 'WEB',
    "binCode" TEXT,
    "qtyDelta" DOUBLE PRECISION,
    "note" TEXT,
    "metadataJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LojistikRmaEventLog_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "LojistikRmaEventLog_rmaId_fkey" FOREIGN KEY ("rmaId") REFERENCES "ReturnRmaRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "LojistikRmaEventLog_rmaId_idx" ON "LojistikRmaEventLog"("rmaId");
CREATE INDEX IF NOT EXISTS "LojistikRmaEventLog_createdAt_idx" ON "LojistikRmaEventLog"("createdAt");

CREATE TABLE IF NOT EXISTS "LojistikRmaCreditNote" (
    "id" TEXT NOT NULL,
    "creditNoteNo" TEXT NOT NULL,
    "rmaId" TEXT NOT NULL,
    "rmaNumber" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "netAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vatAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "grossAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "status" TEXT NOT NULL DEFAULT 'TASLAK_ONAY_BEKLIYOR',
    "eDocumentId" TEXT,
    "eDocumentNo" TEXT,
    "financeId" TEXT,
    "branchId" TEXT NOT NULL DEFAULT 'local-debug-branch',
    "requestedBy" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LojistikRmaCreditNote_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "LojistikRmaCreditNote_creditNoteNo_key" UNIQUE ("creditNoteNo"),
    CONSTRAINT "LojistikRmaCreditNote_rmaId_fkey" FOREIGN KEY ("rmaId") REFERENCES "ReturnRmaRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "LojistikRmaCreditNote_rmaId_idx" ON "LojistikRmaCreditNote"("rmaId");
CREATE INDEX IF NOT EXISTS "LojistikRmaCreditNote_status_idx" ON "LojistikRmaCreditNote"("status");

CREATE TABLE IF NOT EXISTS "LojistikReturnPolicy" (
    "id" TEXT NOT NULL,
    "policyKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT,
    "itemId" TEXT,
    "returnWindowDays" INTEGER NOT NULL DEFAULT 14,
    "warrantyMonths" INTEGER NOT NULL DEFAULT 0,
    "restockable" BOOLEAN NOT NULL DEFAULT true,
    "requireInspection" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LojistikReturnPolicy_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "LojistikReturnPolicy_policyKey_key" UNIQUE ("policyKey")
);
CREATE INDEX IF NOT EXISTS "LojistikReturnPolicy_category_idx" ON "LojistikReturnPolicy"("category");
CREATE INDEX IF NOT EXISTS "LojistikReturnPolicy_itemId_idx" ON "LojistikReturnPolicy"("itemId");

CREATE TABLE IF NOT EXISTS "LojistikRmaWebhookLog" (
    "id" TEXT NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'INBOUND',
    "channelCode" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "externalRef" TEXT,
    "idempotencyKey" TEXT,
    "rmaId" TEXT,
    "rmaNumber" TEXT,
    "signatureVerified" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ACCEPTED',
    "payloadJson" TEXT NOT NULL,
    "responseNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LojistikRmaWebhookLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "LojistikRmaWebhookLog_channelCode_idx" ON "LojistikRmaWebhookLog"("channelCode");
CREATE INDEX IF NOT EXISTS "LojistikRmaWebhookLog_idempotencyKey_idx" ON "LojistikRmaWebhookLog"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "LojistikRmaWebhookLog_rmaId_idx" ON "LojistikRmaWebhookLog"("rmaId");

CREATE INDEX IF NOT EXISTS "ReturnRmaRecord_rmaStatus_idx" ON "ReturnRmaRecord"("rmaStatus");
CREATE INDEX IF NOT EXISTS "ReturnRmaRecord_orderNumber_idx" ON "ReturnRmaRecord"("orderNumber");
CREATE INDEX IF NOT EXISTS "ReturnRmaRecord_supplierId_idx" ON "ReturnRmaRecord"("supplierId");
CREATE INDEX IF NOT EXISTS "ReturnRmaRecord_idempotencyKey_idx" ON "ReturnRmaRecord"("idempotencyKey");
