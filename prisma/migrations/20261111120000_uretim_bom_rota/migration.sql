-- Migration: 20261111120000_uretim_bom_rota
-- Faz 3: Ürün Reçeteleri (BOM) & Rotalar (Routing)
-- Additive only (Mevcut tablolarda hiçbir kolon silinmez veya değiştirilmez).

CREATE TABLE IF NOT EXISTS "UretimBomHeader" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "branchId" TEXT,
    "finishedItemId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "revision" TEXT NOT NULL DEFAULT '01',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "effectiveStartDate" TEXT,
    "effectiveEndDate" TEXT,
    "baseQuantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "baseUnit" TEXT NOT NULL DEFAULT 'Adet',
    "isPhantom" BOOLEAN NOT NULL DEFAULT false,
    "variantCode" TEXT,
    "yieldPercent" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    "totalMaterialCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalLaborCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalOverheadCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalTheoreticalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UretimBomHeader_finishedItemId_fkey" FOREIGN KEY ("finishedItemId") REFERENCES "InventoryItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "UretimBomHeader_code_key" ON "UretimBomHeader"("code");
CREATE INDEX IF NOT EXISTS "UretimBomHeader_finishedItemId_idx" ON "UretimBomHeader"("finishedItemId");
CREATE INDEX IF NOT EXISTS "UretimBomHeader_status_idx" ON "UretimBomHeader"("status");
CREATE INDEX IF NOT EXISTS "UretimBomHeader_branchId_idx" ON "UretimBomHeader"("branchId");
CREATE INDEX IF NOT EXISTS "UretimBomHeader_isActive_idx" ON "UretimBomHeader"("isActive");

CREATE TABLE IF NOT EXISTS "UretimBomItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bomId" TEXT NOT NULL,
    "componentItemId" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL DEFAULT 10,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'Adet',
    "unitConversionFactor" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "scrapPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isPhantom" BOOLEAN NOT NULL DEFAULT false,
    "isVariantSpecific" BOOLEAN NOT NULL DEFAULT false,
    "variantKey" TEXT,
    "operationSequence" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UretimBomItem_bomId_fkey" FOREIGN KEY ("bomId") REFERENCES "UretimBomHeader" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UretimBomItem_componentItemId_fkey" FOREIGN KEY ("componentItemId") REFERENCES "InventoryItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "UretimBomItem_bomId_idx" ON "UretimBomItem"("bomId");
CREATE INDEX IF NOT EXISTS "UretimBomItem_componentItemId_idx" ON "UretimBomItem"("componentItemId");
CREATE INDEX IF NOT EXISTS "UretimBomItem_operationSequence_idx" ON "UretimBomItem"("operationSequence");

CREATE TABLE IF NOT EXISTS "UretimBomSubstitute" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bomItemId" TEXT NOT NULL,
    "substituteItemId" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "substitutionRatio" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "isMandatoryApproval" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UretimBomSubstitute_bomItemId_fkey" FOREIGN KEY ("bomItemId") REFERENCES "UretimBomItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UretimBomSubstitute_substituteItemId_fkey" FOREIGN KEY ("substituteItemId") REFERENCES "InventoryItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "UretimBomSubstitute_bomItemId_idx" ON "UretimBomSubstitute"("bomItemId");
CREATE INDEX IF NOT EXISTS "UretimBomSubstitute_substituteItemId_idx" ON "UretimBomSubstitute"("substituteItemId");

CREATE TABLE IF NOT EXISTS "UretimBomRevisionLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bomId" TEXT NOT NULL,
    "fromRevision" TEXT NOT NULL,
    "toRevision" TEXT NOT NULL,
    "action" TEXT NOT NULL DEFAULT 'UPDATE',
    "changeSummary" TEXT NOT NULL,
    "diffSnapshotJson" TEXT,
    "changedBy" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UretimBomRevisionLog_bomId_fkey" FOREIGN KEY ("bomId") REFERENCES "UretimBomHeader" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "UretimBomRevisionLog_bomId_idx" ON "UretimBomRevisionLog"("bomId");
CREATE INDEX IF NOT EXISTS "UretimBomRevisionLog_changedAt_idx" ON "UretimBomRevisionLog"("changedAt");

CREATE TABLE IF NOT EXISTS "UretimRoutingHeader" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "branchId" TEXT,
    "bomId" TEXT,
    "finishedItemId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "revision" TEXT NOT NULL DEFAULT '01',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "totalSetupTimeMinutes" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalRunTimeMinutes" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalHourlyCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalRoutingCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UretimRoutingHeader_bomId_fkey" FOREIGN KEY ("bomId") REFERENCES "UretimBomHeader" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "UretimRoutingHeader_finishedItemId_fkey" FOREIGN KEY ("finishedItemId") REFERENCES "InventoryItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "UretimRoutingHeader_code_key" ON "UretimRoutingHeader"("code");
CREATE INDEX IF NOT EXISTS "UretimRoutingHeader_finishedItemId_idx" ON "UretimRoutingHeader"("finishedItemId");
CREATE INDEX IF NOT EXISTS "UretimRoutingHeader_bomId_idx" ON "UretimRoutingHeader"("bomId");
CREATE INDEX IF NOT EXISTS "UretimRoutingHeader_status_idx" ON "UretimRoutingHeader"("status");
CREATE INDEX IF NOT EXISTS "UretimRoutingHeader_branchId_idx" ON "UretimRoutingHeader"("branchId");

CREATE TABLE IF NOT EXISTS "UretimOperation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "routingId" TEXT NOT NULL,
    "operationNumber" INTEGER NOT NULL DEFAULT 10,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "workCenterId" TEXT NOT NULL,
    "setupTimeMinutes" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "runTimeMinutes" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "waitOrTransportTimeMinutes" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "workerCount" INTEGER NOT NULL DEFAULT 1,
    "isSubcontracted" BOOLEAN NOT NULL DEFAULT false,
    "subcontractorName" TEXT,
    "subcontractUnitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isQualityControlPoint" BOOLEAN NOT NULL DEFAULT false,
    "qualityInspectionType" TEXT,
    "calculatedHourlyCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalOperationCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UretimOperation_routingId_fkey" FOREIGN KEY ("routingId") REFERENCES "UretimRoutingHeader" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UretimOperation_workCenterId_fkey" FOREIGN KEY ("workCenterId") REFERENCES "UretimWorkCenter" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "UretimOperation_routingId_idx" ON "UretimOperation"("routingId");
CREATE INDEX IF NOT EXISTS "UretimOperation_workCenterId_idx" ON "UretimOperation"("workCenterId");
CREATE INDEX IF NOT EXISTS "UretimOperation_operationNumber_idx" ON "UretimOperation"("operationNumber");

CREATE TABLE IF NOT EXISTS "UretimOperationAlternativeWorkCenter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "operationId" TEXT NOT NULL,
    "workCenterId" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "efficiencyFactor" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "notes" TEXT,
    CONSTRAINT "UretimOperationAlternativeWorkCenter_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "UretimOperation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UretimOperationAlternativeWorkCenter_workCenterId_fkey" FOREIGN KEY ("workCenterId") REFERENCES "UretimWorkCenter" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "UretimOperationAltWc_opId_idx" ON "UretimOperationAlternativeWorkCenter"("operationId");
CREATE INDEX IF NOT EXISTS "UretimOperationAltWc_wcId_idx" ON "UretimOperationAlternativeWorkCenter"("workCenterId");

CREATE TABLE IF NOT EXISTS "UretimOperationMaterial" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "operationId" TEXT NOT NULL,
    "bomItemId" TEXT NOT NULL,
    "consumptionTiming" TEXT NOT NULL DEFAULT 'START',
    "notes" TEXT,
    CONSTRAINT "UretimOperationMaterial_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "UretimOperation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UretimOperationMaterial_bomItemId_fkey" FOREIGN KEY ("bomItemId") REFERENCES "UretimBomItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "UretimOperationMaterial_opId_idx" ON "UretimOperationMaterial"("operationId");
CREATE INDEX IF NOT EXISTS "UretimOperationMaterial_bomItemId_idx" ON "UretimOperationMaterial"("bomItemId");

