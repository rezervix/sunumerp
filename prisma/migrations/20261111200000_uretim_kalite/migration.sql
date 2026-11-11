-- ─────────────────────────────────────────────────────────────
-- FAZ 7: ÜRETİM KALİTE KONTROL, MUAYENE, NCR & DÖF (CAPA)
-- Migration: 20261111200000_uretim_kalite
-- Additive Only - Mevcut hiçbir veri silinmez veya değiştirilmez
-- ─────────────────────────────────────────────────────────────

-- 1. UretimWorkOrderOperation tablosuna Kalite Kontrol Alanları Ekleme
ALTER TABLE "UretimWorkOrderOperation" ADD COLUMN IF NOT EXISTS "isQualityControlPoint" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "UretimWorkOrderOperation" ADD COLUMN IF NOT EXISTS "qualityInspectionStatus" TEXT;

-- 2. Kalibrasyon Cihazı Kartı ve Takibi (UretimQualityCalibration)
CREATE TABLE IF NOT EXISTS "UretimQualityCalibration" (
    "id" TEXT NOT NULL,
    "deviceCode" TEXT NOT NULL,
    "deviceName" TEXT NOT NULL,
    "deviceType" TEXT NOT NULL DEFAULT 'CALIPER',
    "serialNumber" TEXT,
    "brandModel" TEXT,
    "location" TEXT,
    "calibrationPeriodMonths" INTEGER NOT NULL DEFAULT 12,
    "lastCalibrationDate" TIMESTAMP(3) NOT NULL,
    "nextCalibrationDate" TIMESTAMP(3) NOT NULL,
    "certificateNumber" TEXT,
    "calibratedBy" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UretimQualityCalibration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UretimQualityCalibration_deviceCode_key" ON "UretimQualityCalibration"("deviceCode");
CREATE INDEX IF NOT EXISTS "UretimQualityCalibration_status_idx" ON "UretimQualityCalibration"("status");
CREATE INDEX IF NOT EXISTS "UretimQualityCalibration_nextCalibrationDate_idx" ON "UretimQualityCalibration"("nextCalibrationDate");

-- 3. Kalite / Muayene Planı (UretimQualityPlan)
CREATE TABLE IF NOT EXISTS "UretimQualityPlan" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "targetType" TEXT NOT NULL DEFAULT 'ITEM',
    "itemId" TEXT,
    "itemGroup" TEXT,
    "controlPoint" TEXT NOT NULL DEFAULT 'RECEIVING',
    "inspectionLevel" TEXT NOT NULL DEFAULT 'LEVEL_II',
    "samplingType" TEXT NOT NULL DEFAULT 'AQL',
    "samplingSize" DOUBLE PRECISION,
    "aqlAcceptanceLimit" DOUBLE PRECISION NOT NULL DEFAULT 1.5,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "revisionNotes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UretimQualityPlan_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "UretimQualityPlan_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "UretimQualityPlan_code_key" ON "UretimQualityPlan"("code");
CREATE INDEX IF NOT EXISTS "UretimQualityPlan_itemId_idx" ON "UretimQualityPlan"("itemId");
CREATE INDEX IF NOT EXISTS "UretimQualityPlan_controlPoint_idx" ON "UretimQualityPlan"("controlPoint");
CREATE INDEX IF NOT EXISTS "UretimQualityPlan_isActive_idx" ON "UretimQualityPlan"("isActive");

-- 4. Kalite Planı Kontrol Özelliği / Tolerans Maddeleri (UretimQualityPlanItem)
CREATE TABLE IF NOT EXISTS "UretimQualityPlanItem" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 10,
    "characteristicName" TEXT NOT NULL,
    "characteristicType" TEXT NOT NULL DEFAULT 'VARIABLE',
    "nominalValue" DOUBLE PRECISION,
    "minTolerance" DOUBLE PRECISION,
    "maxTolerance" DOUBLE PRECISION,
    "unit" TEXT,
    "inspectionMethod" TEXT,
    "calibrationDeviceId" TEXT,
    "isCritical" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UretimQualityPlanItem_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "UretimQualityPlanItem_planId_fkey" FOREIGN KEY ("planId") REFERENCES "UretimQualityPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UretimQualityPlanItem_calibrationDeviceId_fkey" FOREIGN KEY ("calibrationDeviceId") REFERENCES "UretimQualityCalibration"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "UretimQualityPlanItem_planId_idx" ON "UretimQualityPlanItem"("planId");
CREATE INDEX IF NOT EXISTS "UretimQualityPlanItem_calibrationDeviceId_idx" ON "UretimQualityPlanItem"("calibrationDeviceId");

-- 5. Muayene Kaydı (UretimQualityInspection)
CREATE TABLE IF NOT EXISTS "UretimQualityInspection" (
    "id" TEXT NOT NULL,
    "inspectionNumber" TEXT NOT NULL,
    "planId" TEXT,
    "inspectionType" TEXT NOT NULL DEFAULT 'RECEIVING',
    "itemId" TEXT NOT NULL,
    "workOrderId" TEXT,
    "workOrderOperationId" TEXT,
    "supplierId" TEXT,
    "supplierName" TEXT,
    "purchaseOrderId" TEXT,
    "goodsReceiptId" TEXT,
    "lotNumber" TEXT,
    "serialNumber" TEXT,
    "batchQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sampleQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "totalDefects" INTEGER NOT NULL DEFAULT 0,
    "isStockBlocked" BOOLEAN NOT NULL DEFAULT false,
    "quarantineWarehouseId" TEXT,
    "inspectorUserId" TEXT,
    "approvedByUserId" TEXT,
    "inspectionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decisionNotes" TEXT,
    "certificatePdfUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UretimQualityInspection_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "UretimQualityInspection_planId_fkey" FOREIGN KEY ("planId") REFERENCES "UretimQualityPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "UretimQualityInspection_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UretimQualityInspection_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "UretimWorkOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "UretimQualityInspection_workOrderOperationId_fkey" FOREIGN KEY ("workOrderOperationId") REFERENCES "UretimWorkOrderOperation"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "UretimQualityInspection_inspectionNumber_key" ON "UretimQualityInspection"("inspectionNumber");
CREATE INDEX IF NOT EXISTS "UretimQualityInspection_itemId_idx" ON "UretimQualityInspection"("itemId");
CREATE INDEX IF NOT EXISTS "UretimQualityInspection_workOrderId_idx" ON "UretimQualityInspection"("workOrderId");
CREATE INDEX IF NOT EXISTS "UretimQualityInspection_status_idx" ON "UretimQualityInspection"("status");
CREATE INDEX IF NOT EXISTS "UretimQualityInspection_lotNumber_idx" ON "UretimQualityInspection"("lotNumber");

-- 6. Muayene Ölçüm / Nitelik Sonuçları (UretimQualityInspectionResult)
CREATE TABLE IF NOT EXISTS "UretimQualityInspectionResult" (
    "id" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "planItemId" TEXT,
    "sampleIndex" INTEGER NOT NULL DEFAULT 1,
    "characteristicName" TEXT NOT NULL,
    "characteristicType" TEXT NOT NULL DEFAULT 'VARIABLE',
    "nominalValue" DOUBLE PRECISION,
    "minValue" DOUBLE PRECISION,
    "maxValue" DOUBLE PRECISION,
    "measuredValue" DOUBLE PRECISION,
    "isAttributePassed" BOOLEAN,
    "isConforming" BOOLEAN NOT NULL DEFAULT true,
    "deviation" DOUBLE PRECISION,
    "calibrationDeviceId" TEXT,
    "defectType" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UretimQualityInspectionResult_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "UretimQualityInspectionResult_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "UretimQualityInspection"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UretimQualityInspectionResult_planItemId_fkey" FOREIGN KEY ("planItemId") REFERENCES "UretimQualityPlanItem"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "UretimQualityInspectionResult_calibrationDeviceId_fkey" FOREIGN KEY ("calibrationDeviceId") REFERENCES "UretimQualityCalibration"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "UretimQualityInspectionResult_inspectionId_idx" ON "UretimQualityInspectionResult"("inspectionId");
CREATE INDEX IF NOT EXISTS "UretimQualityInspectionResult_planItemId_idx" ON "UretimQualityInspectionResult"("planItemId");
CREATE INDEX IF NOT EXISTS "UretimQualityInspectionResult_calibrationDeviceId_idx" ON "UretimQualityInspectionResult"("calibrationDeviceId");

-- 7. Uygunsuzluk Raporu & DÖF/CAPA (UretimQualityNcr)
CREATE TABLE IF NOT EXISTS "UretimQualityNcr" (
    "id" TEXT NOT NULL,
    "ncrNumber" TEXT NOT NULL,
    "inspectionId" TEXT,
    "workOrderId" TEXT,
    "itemId" TEXT,
    "lotNumber" TEXT,
    "source" TEXT NOT NULL DEFAULT 'INSPECTION',
    "severity" TEXT NOT NULL DEFAULT 'MAJOR',
    "defectCategory" TEXT NOT NULL DEFAULT 'DIMENSION',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "affectedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rootCauseMethod" TEXT,
    "rootCauseDescription" TEXT,
    "correctiveAction" TEXT,
    "preventiveAction" TEXT,
    "assignedToUserId" TEXT,
    "targetDate" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "closedByUserId" TEXT,
    "effectivenessResult" TEXT,
    "effectivenessNotes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "costImpact" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UretimQualityNcr_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "UretimQualityNcr_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "UretimQualityInspection"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "UretimQualityNcr_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "UretimWorkOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "UretimQualityNcr_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "UretimQualityNcr_ncrNumber_key" ON "UretimQualityNcr"("ncrNumber");
CREATE INDEX IF NOT EXISTS "UretimQualityNcr_inspectionId_idx" ON "UretimQualityNcr"("inspectionId");
CREATE INDEX IF NOT EXISTS "UretimQualityNcr_workOrderId_idx" ON "UretimQualityNcr"("workOrderId");
CREATE INDEX IF NOT EXISTS "UretimQualityNcr_status_idx" ON "UretimQualityNcr"("status");
CREATE INDEX IF NOT EXISTS "UretimQualityNcr_lotNumber_idx" ON "UretimQualityNcr"("lotNumber");

