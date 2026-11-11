-- Migration: 20261111160000_uretim_is_emri
-- Faz 5: Üretim/İş Emri & Atölye İcra (Shop Floor Control)
-- Additive only (Mevcut tablolarda hiçbir kolon silinmez veya değiştirilmez).

CREATE TABLE IF NOT EXISTS "UretimWorkOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "branchId" TEXT,
    "workOrderNumber" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL DEFAULT 'MANUAL', -- MANUAL, SALES_ORDER, MRP
    "sourceDocumentId" TEXT,
    "sourceDocumentNumber" TEXT,
    "itemId" TEXT NOT NULL,
    "bomId" TEXT,
    "routingId" TEXT,
    "bomSnapshotJson" TEXT,
    "routingSnapshotJson" TEXT,
    "plannedQuantity" DOUBLE PRECISION NOT NULL,
    "producedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "scrapQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL DEFAULT 'Adet',
    "status" TEXT NOT NULL DEFAULT 'PLANNED', -- PLANNED, APPROVED, RELEASED, IN_PROGRESS, PAUSED, COMPLETED, CLOSED, CANCELLED
    "priority" TEXT NOT NULL DEFAULT 'NORMAL', -- LOW, NORMAL, HIGH, URGENT
    "warehouseId" TEXT NOT NULL,
    "productionWarehouseId" TEXT,
    "plannedStartDate" TIMESTAMP(3) NOT NULL,
    "plannedDueDate" TIMESTAMP(3) NOT NULL,
    "actualStartDate" TIMESTAMP(3),
    "actualEndDate" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "closedBy" TEXT,
    "lotNumber" TEXT,
    "parentWorkOrderId" TEXT,
    "theoreticalMaterialCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "theoreticalLaborCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "theoreticalOverheadCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "theoreticalTotalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actualMaterialCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actualLaborCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actualOverheadCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actualScrapCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actualTotalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costVariance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UretimWorkOrder_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "UretimWorkOrder_workOrderNumber_key" ON "UretimWorkOrder"("workOrderNumber");
CREATE INDEX IF NOT EXISTS "UretimWorkOrder_branchId_idx" ON "UretimWorkOrder"("branchId");
CREATE INDEX IF NOT EXISTS "UretimWorkOrder_itemId_idx" ON "UretimWorkOrder"("itemId");
CREATE INDEX IF NOT EXISTS "UretimWorkOrder_status_idx" ON "UretimWorkOrder"("status");
CREATE INDEX IF NOT EXISTS "UretimWorkOrder_priority_idx" ON "UretimWorkOrder"("priority");
CREATE INDEX IF NOT EXISTS "UretimWorkOrder_sourceType_idx" ON "UretimWorkOrder"("sourceType");
CREATE INDEX IF NOT EXISTS "UretimWorkOrder_sourceDocumentId_idx" ON "UretimWorkOrder"("sourceDocumentId");
CREATE INDEX IF NOT EXISTS "UretimWorkOrder_plannedDueDate_idx" ON "UretimWorkOrder"("plannedDueDate");

CREATE TABLE IF NOT EXISTS "UretimWorkOrderOperation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workOrderId" TEXT NOT NULL,
    "operationNumber" INTEGER NOT NULL DEFAULT 10,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "workCenterId" TEXT,
    "operatorUserId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, RUNNING, PAUSED, COMPLETED, SKIPPED
    "setupTimeMinutes" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "plannedRunMinutes" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actualRunMinutes" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actualMachineMinutes" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "plannedQuantity" DOUBLE PRECISION NOT NULL,
    "producedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "scrapQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "scrapReasonCode" TEXT,
    "notes" TEXT,
    "actualStartDate" TIMESTAMP(3),
    "actualEndDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UretimWorkOrderOperation_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "UretimWorkOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UretimWorkOrderOperation_workCenterId_fkey" FOREIGN KEY ("workCenterId") REFERENCES "UretimWorkCenter" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "UretimWorkOrderOperation_workOrderId_idx" ON "UretimWorkOrderOperation"("workOrderId");
CREATE INDEX IF NOT EXISTS "UretimWorkOrderOperation_workCenterId_idx" ON "UretimWorkOrderOperation"("workCenterId");
CREATE INDEX IF NOT EXISTS "UretimWorkOrderOperation_status_idx" ON "UretimWorkOrderOperation"("status");
CREATE INDEX IF NOT EXISTS "UretimWorkOrderOperation_operatorUserId_idx" ON "UretimWorkOrderOperation"("operatorUserId");

CREATE TABLE IF NOT EXISTS "UretimWorkOrderMaterial" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workOrderId" TEXT NOT NULL,
    "operationId" TEXT,
    "itemId" TEXT NOT NULL,
    "plannedQuantity" DOUBLE PRECISION NOT NULL,
    "reservedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "consumedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "scrapQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL DEFAULT 'Adet',
    "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "consumptionMethod" TEXT NOT NULL DEFAULT 'MANUAL', -- MANUAL, BACKFLUSH
    "lotNumber" TEXT,
    "isOverConsumed" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UretimWorkOrderMaterial_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "UretimWorkOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UretimWorkOrderMaterial_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "UretimWorkOrderOperation" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "UretimWorkOrderMaterial_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "UretimWorkOrderMaterial_workOrderId_idx" ON "UretimWorkOrderMaterial"("workOrderId");
CREATE INDEX IF NOT EXISTS "UretimWorkOrderMaterial_operationId_idx" ON "UretimWorkOrderMaterial"("operationId");
CREATE INDEX IF NOT EXISTS "UretimWorkOrderMaterial_itemId_idx" ON "UretimWorkOrderMaterial"("itemId");

CREATE TABLE IF NOT EXISTS "UretimWorkOrderLabor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workOrderId" TEXT NOT NULL,
    "operationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT,
    "durationMinutes" DOUBLE PRECISION NOT NULL,
    "hourlyRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalLaborCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UretimWorkOrderLabor_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "UretimWorkOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UretimWorkOrderLabor_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "UretimWorkOrderOperation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "UretimWorkOrderLabor_workOrderId_idx" ON "UretimWorkOrderLabor"("workOrderId");
CREATE INDEX IF NOT EXISTS "UretimWorkOrderLabor_operationId_idx" ON "UretimWorkOrderLabor"("operationId");
CREATE INDEX IF NOT EXISTS "UretimWorkOrderLabor_userId_idx" ON "UretimWorkOrderLabor"("userId");

CREATE TABLE IF NOT EXISTS "UretimWorkOrderStoppage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workOrderId" TEXT NOT NULL,
    "operationId" TEXT NOT NULL,
    "workCenterId" TEXT,
    "reasonCode" TEXT NOT NULL, -- ARIZA, BAKIM, MALZEME_BEKLEME, AYAR_KALIBRASYON, ELEKTRIK_KESINTISI, MOLA, DIGER
    "description" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "durationMinutes" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reportedBy" TEXT NOT NULL,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UretimWorkOrderStoppage_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "UretimWorkOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UretimWorkOrderStoppage_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "UretimWorkOrderOperation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "UretimWorkOrderStoppage_workOrderId_idx" ON "UretimWorkOrderStoppage"("workOrderId");
CREATE INDEX IF NOT EXISTS "UretimWorkOrderStoppage_operationId_idx" ON "UretimWorkOrderStoppage"("operationId");
CREATE INDEX IF NOT EXISTS "UretimWorkOrderStoppage_reasonCode_idx" ON "UretimWorkOrderStoppage"("reasonCode");

CREATE TABLE IF NOT EXISTS "UretimIotStaging" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "deviceId" TEXT NOT NULL,
    "deviceType" TEXT NOT NULL DEFAULT 'PLC', -- PLC, SCADA, SCALE, BARCODE_STATION, SENSOR
    "workOrderId" TEXT,
    "operationId" TEXT,
    "metricType" TEXT NOT NULL, -- PRODUCTION_COUNT, SCRAP_COUNT, CYCLE_TIME, WEIGHT, TEMPERATURE, STOPPAGE
    "metricValue" DOUBLE PRECISION NOT NULL,
    "unit" TEXT,
    "rawPayloadJson" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, PROCESSED, REJECTED
    "errorMessage" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    CONSTRAINT "UretimIotStaging_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "UretimWorkOrder" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "UretimIotStaging_deviceId_idx" ON "UretimIotStaging"("deviceId");
CREATE INDEX IF NOT EXISTS "UretimIotStaging_workOrderId_idx" ON "UretimIotStaging"("workOrderId");
CREATE INDEX IF NOT EXISTS "UretimIotStaging_status_idx" ON "UretimIotStaging"("status");
CREATE INDEX IF NOT EXISTS "UretimIotStaging_receivedAt_idx" ON "UretimIotStaging"("receivedAt");

