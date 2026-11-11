-- Migration: 20261111140000_uretim_mrp_mps
-- Faz 4: MRP (Malzeme İhtiyaç Planlaması) & MPS (Ana Üretim Çizelgesi)
-- Additive only (Mevcut tablolarda hiçbir kolon silinmez veya değiştirilmez).

CREATE TABLE IF NOT EXISTS "UretimMpsPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "branchId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "revision" TEXT NOT NULL DEFAULT '1.0',
    "status" TEXT NOT NULL DEFAULT 'DRAFT', -- DRAFT, APPROVED, OBSOLETE
    "bucketType" TEXT NOT NULL DEFAULT 'WEEKLY', -- DAILY, WEEKLY, MONTHLY
    "horizonDays" INTEGER NOT NULL DEFAULT 90,
    "frozenDays" INTEGER NOT NULL DEFAULT 14,
    "isWhatIfScenario" BOOLEAN NOT NULL DEFAULT false,
    "scenarioName" TEXT,
    "basePlanId" TEXT,
    "notes" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "UretimMpsPlan_code_key" ON "UretimMpsPlan"("code");
CREATE INDEX IF NOT EXISTS "UretimMpsPlan_branchId_idx" ON "UretimMpsPlan"("branchId");
CREATE INDEX IF NOT EXISTS "UretimMpsPlan_status_idx" ON "UretimMpsPlan"("status");
CREATE INDEX IF NOT EXISTS "UretimMpsPlan_basePlanId_idx" ON "UretimMpsPlan"("basePlanId");

CREATE TABLE IF NOT EXISTS "UretimMpsPlanItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mpsPlanId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "periodIndex" INTEGER NOT NULL DEFAULT 0,
    "periodStartDate" TIMESTAMP(3) NOT NULL,
    "periodEndDate" TIMESTAMP(3) NOT NULL,
    "forecastQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "salesOrderQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "grossRequirement" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "scheduledReceipts" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "plannedProductionQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "projectedOnHand" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "atpQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    CONSTRAINT "UretimMpsPlanItem_mpsPlanId_fkey" FOREIGN KEY ("mpsPlanId") REFERENCES "UretimMpsPlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UretimMpsPlanItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "UretimMpsPlanItem_mpsPlanId_idx" ON "UretimMpsPlanItem"("mpsPlanId");
CREATE INDEX IF NOT EXISTS "UretimMpsPlanItem_itemId_idx" ON "UretimMpsPlanItem"("itemId");
CREATE INDEX IF NOT EXISTS "UretimMpsPlanItem_periodIndex_idx" ON "UretimMpsPlanItem"("periodIndex");

CREATE TABLE IF NOT EXISTS "UretimMrpRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "branchId" TEXT,
    "mpsPlanId" TEXT,
    "runCode" TEXT NOT NULL,
    "runType" TEXT NOT NULL DEFAULT 'FULL_REGENERATION', -- FULL_REGENERATION, NET_CHANGE
    "status" TEXT NOT NULL DEFAULT 'RUNNING', -- RUNNING, COMPLETED, FAILED
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "totalItemsPlanned" INTEGER NOT NULL DEFAULT 0,
    "totalOrdersGenerated" INTEGER NOT NULL DEFAULT 0,
    "totalActionMessages" INTEGER NOT NULL DEFAULT 0,
    "executionTimeMs" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "triggeredBy" TEXT NOT NULL DEFAULT 'SYSTEM',
    "parametersJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UretimMrpRun_mpsPlanId_fkey" FOREIGN KEY ("mpsPlanId") REFERENCES "UretimMpsPlan" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "UretimMrpRun_runCode_key" ON "UretimMrpRun"("runCode");
CREATE INDEX IF NOT EXISTS "UretimMrpRun_branchId_idx" ON "UretimMrpRun"("branchId");
CREATE INDEX IF NOT EXISTS "UretimMrpRun_mpsPlanId_idx" ON "UretimMrpRun"("mpsPlanId");
CREATE INDEX IF NOT EXISTS "UretimMrpRun_status_idx" ON "UretimMrpRun"("status");

CREATE TABLE IF NOT EXISTS "UretimMrpPlannedOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mrpRunId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "orderType" TEXT NOT NULL, -- PURCHASE, PRODUCTION, TRANSFER
    "orderNumber" TEXT NOT NULL,
    "orderStatus" TEXT NOT NULL DEFAULT 'PLANNED', -- PLANNED, APPROVED, CONVERTED, REJECTED
    "sourceDocumentType" TEXT NOT NULL DEFAULT 'MPS', -- MPS, SALES_ORDER, SAFETY_STOCK, BOM_DEPENDENT
    "sourceDocumentId" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'Adet',
    "releaseDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "supplierId" TEXT,
    "bomId" TEXT,
    "routingId" TEXT,
    "convertedDocType" TEXT, -- PURCHASE_REQUISITION, WORK_ORDER
    "convertedDocId" TEXT,
    "peggingJson" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UretimMrpPlannedOrder_mrpRunId_fkey" FOREIGN KEY ("mrpRunId") REFERENCES "UretimMrpRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UretimMrpPlannedOrder_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "UretimMrpPlannedOrder_mrpRunId_idx" ON "UretimMrpPlannedOrder"("mrpRunId");
CREATE INDEX IF NOT EXISTS "UretimMrpPlannedOrder_itemId_idx" ON "UretimMrpPlannedOrder"("itemId");
CREATE INDEX IF NOT EXISTS "UretimMrpPlannedOrder_orderType_idx" ON "UretimMrpPlannedOrder"("orderType");
CREATE INDEX IF NOT EXISTS "UretimMrpPlannedOrder_orderStatus_idx" ON "UretimMrpPlannedOrder"("orderStatus");
CREATE INDEX IF NOT EXISTS "UretimMrpPlannedOrder_releaseDate_idx" ON "UretimMrpPlannedOrder"("releaseDate");
CREATE INDEX IF NOT EXISTS "UretimMrpPlannedOrder_dueDate_idx" ON "UretimMrpPlannedOrder"("dueDate");

CREATE TABLE IF NOT EXISTS "UretimMrpActionMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mrpRunId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "plannedOrderId" TEXT,
    "actionType" TEXT NOT NULL, -- EXPEDITE, DEFER, CANCEL, PAST_DUE, INSUFFICIENT_LEAD_TIME, SAFETY_STOCK_VIOLATION
    "severity" TEXT NOT NULL DEFAULT 'WARNING', -- INFO, WARNING, CRITICAL
    "suggestedDate" TIMESTAMP(3),
    "suggestedQty" DOUBLE PRECISION,
    "message" TEXT NOT NULL,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UretimMrpActionMessage_mrpRunId_fkey" FOREIGN KEY ("mrpRunId") REFERENCES "UretimMrpRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UretimMrpActionMessage_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UretimMrpActionMessage_plannedOrderId_fkey" FOREIGN KEY ("plannedOrderId") REFERENCES "UretimMrpPlannedOrder" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "UretimMrpActionMessage_mrpRunId_idx" ON "UretimMrpActionMessage"("mrpRunId");
CREATE INDEX IF NOT EXISTS "UretimMrpActionMessage_itemId_idx" ON "UretimMrpActionMessage"("itemId");
CREATE INDEX IF NOT EXISTS "UretimMrpActionMessage_actionType_idx" ON "UretimMrpActionMessage"("actionType");
CREATE INDEX IF NOT EXISTS "UretimMrpActionMessage_severity_idx" ON "UretimMrpActionMessage"("severity");
CREATE INDEX IF NOT EXISTS "UretimMrpActionMessage_isResolved_idx" ON "UretimMrpActionMessage"("isResolved");
