-- ─────────────────────────────────────────────────────────────
-- FAZ 8: ÜRETİM EKİPMAN & BAKIM YÖNETİMİ (CMMS & PREDICTIVE)
-- Migration: 20261111220000_uretim_bakim
-- Additive Only - Mevcut hiçbir veri silinmez veya değiştirilmez
-- ─────────────────────────────────────────────────────────────

-- 1. UretimMachineAsset Tablosuna Ekipman Hiyerarşisi ve Kritiklik Kolonları Ekleme
ALTER TABLE "UretimMachineAsset" ADD COLUMN IF NOT EXISTS "criticality" TEXT NOT NULL DEFAULT 'B';
ALTER TABLE "UretimMachineAsset" ADD COLUMN IF NOT EXISTS "parentAssetId" TEXT;
ALTER TABLE "UretimMachineAsset" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE "UretimMachineAsset" ADD COLUMN IF NOT EXISTS "acquisitionCost" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "UretimMachineAsset" ADD COLUMN IF NOT EXISTS "documentUrl" TEXT;

-- 2. Ekipman Yedek Parça Listesi (UretimMachineSparePart)
CREATE TABLE IF NOT EXISTS "UretimMachineSparePart" (
    "id" TEXT NOT NULL,
    "machineAssetId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "minRecommendedStock" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "replacementPeriodDays" INTEGER,
    "replacementPeriodHours" DOUBLE PRECISION,
    "criticality" TEXT NOT NULL DEFAULT 'MEDIUM',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UretimMachineSparePart_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "UretimMachineSparePart_machineAssetId_fkey" FOREIGN KEY ("machineAssetId") REFERENCES "UretimMachineAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UretimMachineSparePart_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "UretimMachineSparePart_machineAssetId_idx" ON "UretimMachineSparePart"("machineAssetId");
CREATE INDEX IF NOT EXISTS "UretimMachineSparePart_itemId_idx" ON "UretimMachineSparePart"("itemId");

-- 3. Bakım Planı (UretimMaintenancePlan)
CREATE TABLE IF NOT EXISTS "UretimMaintenancePlan" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "machineAssetId" TEXT,
    "category" TEXT,
    "planType" TEXT NOT NULL DEFAULT 'CALENDAR', -- CALENDAR, METER_HOURS, METER_PRODUCTION, CONDITION
    "frequencyDays" INTEGER,
    "frequencyHours" DOUBLE PRECISION,
    "frequencyCount" DOUBLE PRECISION,
    "conditionParameter" TEXT,
    "conditionThreshold" DOUBLE PRECISION,
    "conditionOperator" TEXT NOT NULL DEFAULT 'GREATER_THAN',
    "estimatedDurationMinutes" DOUBLE PRECISION NOT NULL DEFAULT 60,
    "requiredTechnicians" INTEGER NOT NULL DEFAULT 1,
    "lastTriggeredDate" TIMESTAMP(3),
    "lastTriggeredHours" DOUBLE PRECISION,
    "lastTriggeredCount" DOUBLE PRECISION,
    "nextScheduledDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UretimMaintenancePlan_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "UretimMaintenancePlan_machineAssetId_fkey" FOREIGN KEY ("machineAssetId") REFERENCES "UretimMachineAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "UretimMaintenancePlan_code_key" ON "UretimMaintenancePlan"("code");
CREATE INDEX IF NOT EXISTS "UretimMaintenancePlan_machineAssetId_idx" ON "UretimMaintenancePlan"("machineAssetId");
CREATE INDEX IF NOT EXISTS "UretimMaintenancePlan_planType_idx" ON "UretimMaintenancePlan"("planType");
CREATE INDEX IF NOT EXISTS "UretimMaintenancePlan_isActive_idx" ON "UretimMaintenancePlan"("isActive");

-- 4. Bakım Planı Kontrol Listesi (UretimMaintenancePlanChecklist)
CREATE TABLE IF NOT EXISTS "UretimMaintenancePlanChecklist" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 10,
    "instruction" TEXT NOT NULL,
    "controlType" TEXT NOT NULL DEFAULT 'CHECKBOX', -- CHECKBOX, VALUE_MEASUREMENT, TEXT
    "nominalValue" DOUBLE PRECISION,
    "minValue" DOUBLE PRECISION,
    "maxValue" DOUBLE PRECISION,
    "unit" TEXT,
    "isMandatory" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UretimMaintenancePlanChecklist_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "UretimMaintenancePlanChecklist_planId_fkey" FOREIGN KEY ("planId") REFERENCES "UretimMaintenancePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "UretimMaintenancePlanChecklist_planId_idx" ON "UretimMaintenancePlanChecklist"("planId");

-- 5. Bakım İş Emri (UretimMaintenanceWorkOrder)
CREATE TABLE IF NOT EXISTS "UretimMaintenanceWorkOrder" (
    "id" TEXT NOT NULL,
    "workOrderNumber" TEXT NOT NULL,
    "planId" TEXT,
    "machineAssetId" TEXT NOT NULL,
    "workCenterId" TEXT,
    "orderType" TEXT NOT NULL DEFAULT 'PLANNED', -- PLANNED, BREAKDOWN, IMPROVEMENT
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, CRITICAL_EMERGENCY
    "status" TEXT NOT NULL DEFAULT 'REQUESTED', -- REQUESTED, EVALUATED, SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED
    "title" TEXT NOT NULL,
    "description" TEXT,
    "failureReasonCode" TEXT,
    "rootCauseAnalysis" TEXT,
    "actionTaken" TEXT,
    "technicianUserId" TEXT,
    "teamNotes" TEXT,
    "downtimeStart" TIMESTAMP(3),
    "downtimeEnd" TIMESTAMP(3),
    "totalDowntimeMinutes" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "plannedStartDate" TIMESTAMP(3),
    "plannedEndDate" TIMESTAMP(3),
    "actualStartDate" TIMESTAMP(3),
    "actualEndDate" TIMESTAMP(3),
    "laborDurationMinutes" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "laborHourlyRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalLaborCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalSparePartCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "requestedByUserId" TEXT,
    "approvedByUserId" TEXT,
    "completedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UretimMaintenanceWorkOrder_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "UretimMaintenanceWorkOrder_planId_fkey" FOREIGN KEY ("planId") REFERENCES "UretimMaintenancePlan"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "UretimMaintenanceWorkOrder_machineAssetId_fkey" FOREIGN KEY ("machineAssetId") REFERENCES "UretimMachineAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UretimMaintenanceWorkOrder_workCenterId_fkey" FOREIGN KEY ("workCenterId") REFERENCES "UretimWorkCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "UretimMaintenanceWorkOrder_workOrderNumber_key" ON "UretimMaintenanceWorkOrder"("workOrderNumber");
CREATE INDEX IF NOT EXISTS "UretimMaintenanceWorkOrder_machineAssetId_idx" ON "UretimMaintenanceWorkOrder"("machineAssetId");
CREATE INDEX IF NOT EXISTS "UretimMaintenanceWorkOrder_status_idx" ON "UretimMaintenanceWorkOrder"("status");
CREATE INDEX IF NOT EXISTS "UretimMaintenanceWorkOrder_orderType_idx" ON "UretimMaintenanceWorkOrder"("orderType");

-- 6. Bakım İş Emri Kullanılan Yedek Parça (UretimMaintenanceWorkOrderSparePart)
CREATE TABLE IF NOT EXISTS "UretimMaintenanceWorkOrderSparePart" (
    "id" TEXT NOT NULL,
    "maintenanceWorkOrderId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "plannedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "usedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isProcurementRequested" BOOLEAN NOT NULL DEFAULT false,
    "purchaseRequisitionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UretimMaintenanceWorkOrderSparePart_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "UretimMaintenanceWorkOrderSparePart_mwo_fkey" FOREIGN KEY ("maintenanceWorkOrderId") REFERENCES "UretimMaintenanceWorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UretimMaintenanceWorkOrderSparePart_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "UretimMaintenanceWorkOrderSparePart_mwo_idx" ON "UretimMaintenanceWorkOrderSparePart"("maintenanceWorkOrderId");
CREATE INDEX IF NOT EXISTS "UretimMaintenanceWorkOrderSparePart_itemId_idx" ON "UretimMaintenanceWorkOrderSparePart"("itemId");

-- 7. Bakım İş Emri Kontrol Listesi Sonucu (UretimMaintenanceChecklistResult)
CREATE TABLE IF NOT EXISTS "UretimMaintenanceChecklistResult" (
    "id" TEXT NOT NULL,
    "maintenanceWorkOrderId" TEXT NOT NULL,
    "checklistId" TEXT,
    "sequence" INTEGER NOT NULL DEFAULT 10,
    "instruction" TEXT NOT NULL,
    "controlType" TEXT NOT NULL DEFAULT 'CHECKBOX',
    "isChecked" BOOLEAN NOT NULL DEFAULT false,
    "measuredValue" DOUBLE PRECISION,
    "isPassed" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UretimMaintenanceChecklistResult_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "UretimMaintenanceChecklistResult_mwo_fkey" FOREIGN KEY ("maintenanceWorkOrderId") REFERENCES "UretimMaintenanceWorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "UretimMaintenanceChecklistResult_mwo_idx" ON "UretimMaintenanceChecklistResult"("maintenanceWorkOrderId");

-- 8. Kestirimci Bakım Sensör & Durum Okuması (UretimMaintenanceConditionReading)
CREATE TABLE IF NOT EXISTS "UretimMaintenanceConditionReading" (
    "id" TEXT NOT NULL,
    "machineAssetId" TEXT NOT NULL,
    "sensorCode" TEXT,
    "parameterType" TEXT NOT NULL, -- TEMPERATURE, VIBRATION, PRESSURE, CURRENT
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT,
    "isAlertTriggered" BOOLEAN NOT NULL DEFAULT false,
    "alertSeverity" TEXT,
    "readingDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UretimMaintenanceConditionReading_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "UretimMaintenanceConditionReading_machineAssetId_fkey" FOREIGN KEY ("machineAssetId") REFERENCES "UretimMachineAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "UretimMaintenanceConditionReading_machine_idx" ON "UretimMaintenanceConditionReading"("machineAssetId");
CREATE INDEX IF NOT EXISTS "UretimMaintenanceConditionReading_readingDate_idx" ON "UretimMaintenanceConditionReading"("readingDate");

