-- ─────────────────────────────────────────────────────────────
-- FAZ 6: KAPASİTE PLANLAMA & ÇİZELGELEME (CRP & ADVANCED SCHEDULING)
-- Migration: 20261111180000_uretim_kapasite
-- Additive Only - Mevcut hiçbir veri silinmez veya değiştirilmez
-- ─────────────────────────────────────────────────────────────

-- 1. UretimWorkOrderOperation tablosuna Çizelgeleme Alanları Ekleme
ALTER TABLE "UretimWorkOrderOperation" ADD COLUMN IF NOT EXISTS "scheduledStartDate" TIMESTAMP(3);
ALTER TABLE "UretimWorkOrderOperation" ADD COLUMN IF NOT EXISTS "scheduledEndDate" TIMESTAMP(3);
ALTER TABLE "UretimWorkOrderOperation" ADD COLUMN IF NOT EXISTS "isLocked" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "UretimWorkOrderOperation" ADD COLUMN IF NOT EXISTS "sequenceNumber" INTEGER NOT NULL DEFAULT 0;

-- 2. Kapasite Planı (Planlama Senaryosu)
CREATE TABLE IF NOT EXISTS "UretimCapacityPlan" (
    "id" TEXT NOT NULL,
    "branchId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "schedulingMode" TEXT NOT NULL DEFAULT 'FINITE', -- INFINITE, FINITE
    "schedulingDirection" TEXT NOT NULL DEFAULT 'FORWARD', -- FORWARD, BACKWARD
    "priorityRule" TEXT NOT NULL DEFAULT 'EDD', -- EDD, FCFS, CR, PRIORITY
    "status" TEXT NOT NULL DEFAULT 'DRAFT', -- DRAFT, ACTIVE, ARCHIVED
    "totalLoadHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCapacityHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bottleneckWorkCenterId" TEXT,
    "overloadedWorkCentersJson" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UretimCapacityPlan_pkey" PRIMARY KEY ("id")
);

-- 3. Kapasite Planı Satırları (İş Merkezi x Dönem Yük Özeti)
CREATE TABLE IF NOT EXISTS "UretimCapacityPlanItem" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "workCenterId" TEXT NOT NULL,
    "periodDate" TEXT NOT NULL,
    "availableCapacityHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "plannedLoadHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "mrpLoadHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalLoadHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "loadPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isOverloaded" BOOLEAN NOT NULL DEFAULT false,
    "operationCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UretimCapacityPlanItem_pkey" PRIMARY KEY ("id")
);

-- 4. Çizelgelenen Operasyon Görevleri (Gantt Blokları)
CREATE TABLE IF NOT EXISTS "UretimScheduledTask" (
    "id" TEXT NOT NULL,
    "planId" TEXT,
    "workOrderId" TEXT NOT NULL,
    "operationId" TEXT NOT NULL,
    "workCenterId" TEXT NOT NULL,
    "setupMinutes" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "runMinutes" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalMinutes" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "scheduledStart" TIMESTAMP(3) NOT NULL,
    "scheduledEnd" TIMESTAMP(3) NOT NULL,
    "sequenceOrder" INTEGER NOT NULL DEFAULT 0,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "isDelayed" BOOLEAN NOT NULL DEFAULT false,
    "delayMinutes" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED', -- SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UretimScheduledTask_pkey" PRIMARY KEY ("id")
);

-- 5. Kapasite & Çizelgeleme Uyarıları (Aşırı Yük, Darboğaz, Çakışma, Gecikme)
CREATE TABLE IF NOT EXISTS "UretimCapacityAlert" (
    "id" TEXT NOT NULL,
    "branchId" TEXT,
    "workCenterId" TEXT,
    "workOrderId" TEXT,
    "operationId" TEXT,
    "alertType" TEXT NOT NULL, -- OVERLOAD, BOTTLENECK, DELAY, CAPACITY_EXCEEDED, DEPENDENCY_CONFLICT
    "severity" TEXT NOT NULL DEFAULT 'WARNING', -- INFO, WARNING, CRITICAL
    "message" TEXT NOT NULL,
    "loadPercentage" DOUBLE PRECISION,
    "periodDate" TEXT,
    "isAcknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acknowledgedBy" TEXT,
    "acknowledgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UretimCapacityAlert_pkey" PRIMARY KEY ("id")
);

-- 6. Söz Verilebilir Teslim Tarihi (CTP - Capable-To-Promise) Simülasyonu
CREATE TABLE IF NOT EXISTS "UretimCtpSimulation" (
    "id" TEXT NOT NULL,
    "branchId" TEXT,
    "simulationNumber" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "requestedDueDate" TIMESTAMP(3),
    "calculatedEarliestDueDate" TIMESTAMP(3) NOT NULL,
    "isFeasible" BOOLEAN NOT NULL DEFAULT true,
    "bottleneckWorkCenterId" TEXT,
    "criticalPathDays" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "simulatedScheduleJson" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UretimCtpSimulation_pkey" PRIMARY KEY ("id")
);

-- 7. Fiili vs Planlanan Süre Varyansı & Standart İyileştirme
CREATE TABLE IF NOT EXISTS "UretimOperationTimeVariance" (
    "id" TEXT NOT NULL,
    "operationId" TEXT,
    "workCenterId" TEXT NOT NULL,
    "operationName" TEXT NOT NULL,
    "plannedStandardMinutes" DOUBLE PRECISION NOT NULL,
    "actualAverageMinutes" DOUBLE PRECISION NOT NULL,
    "sampleCount" INTEGER NOT NULL DEFAULT 1,
    "variancePercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "suggestedStandardMinutes" DOUBLE PRECISION NOT NULL,
    "isApplied" BOOLEAN NOT NULL DEFAULT false,
    "appliedAt" TIMESTAMP(3),
    "appliedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UretimOperationTimeVariance_pkey" PRIMARY KEY ("id")
);

-- İndeksler
CREATE UNIQUE INDEX IF NOT EXISTS "UretimCapacityPlan_code_key" ON "UretimCapacityPlan"("code");
CREATE INDEX IF NOT EXISTS "UretimCapacityPlan_branchId_idx" ON "UretimCapacityPlan"("branchId");
CREATE INDEX IF NOT EXISTS "UretimCapacityPlan_status_idx" ON "UretimCapacityPlan"("status");

CREATE INDEX IF NOT EXISTS "UretimCapacityPlanItem_planId_idx" ON "UretimCapacityPlanItem"("planId");
CREATE INDEX IF NOT EXISTS "UretimCapacityPlanItem_workCenterId_idx" ON "UretimCapacityPlanItem"("workCenterId");
CREATE INDEX IF NOT EXISTS "UretimCapacityPlanItem_periodDate_idx" ON "UretimCapacityPlanItem"("periodDate");

CREATE INDEX IF NOT EXISTS "UretimScheduledTask_planId_idx" ON "UretimScheduledTask"("planId");
CREATE INDEX IF NOT EXISTS "UretimScheduledTask_workOrderId_idx" ON "UretimScheduledTask"("workOrderId");
CREATE INDEX IF NOT EXISTS "UretimScheduledTask_workCenterId_idx" ON "UretimScheduledTask"("workCenterId");
CREATE INDEX IF NOT EXISTS "UretimScheduledTask_operationId_idx" ON "UretimScheduledTask"("operationId");
CREATE INDEX IF NOT EXISTS "UretimScheduledTask_scheduledStart_idx" ON "UretimScheduledTask"("scheduledStart");

CREATE INDEX IF NOT EXISTS "UretimCapacityAlert_branchId_idx" ON "UretimCapacityAlert"("branchId");
CREATE INDEX IF NOT EXISTS "UretimCapacityAlert_workCenterId_idx" ON "UretimCapacityAlert"("workCenterId");
CREATE INDEX IF NOT EXISTS "UretimCapacityAlert_alertType_idx" ON "UretimCapacityAlert"("alertType");
CREATE INDEX IF NOT EXISTS "UretimCapacityAlert_isAcknowledged_idx" ON "UretimCapacityAlert"("isAcknowledged");

CREATE UNIQUE INDEX IF NOT EXISTS "UretimCtpSimulation_simulationNumber_key" ON "UretimCtpSimulation"("simulationNumber");
CREATE INDEX IF NOT EXISTS "UretimCtpSimulation_itemId_idx" ON "UretimCtpSimulation"("itemId");

CREATE INDEX IF NOT EXISTS "UretimOperationTimeVariance_workCenterId_idx" ON "UretimOperationTimeVariance"("workCenterId");
CREATE INDEX IF NOT EXISTS "UretimOperationTimeVariance_isApplied_idx" ON "UretimOperationTimeVariance"("isApplied");
