-- Sunum ERP — Üretim Modülleri Ana Veriler ve Stok Kartı 1-1 Üretim Profili (Additive Migration)
-- Kapsam: Çalışma Takvimi, Vardiya, Tatil Günleri, İş Merkezi/İstasyon, Takvim İstisnaları, Makine/Ekipman, Üretim Parametreleri, Stok Kartı 1-1 Üretim Profili

CREATE TABLE IF NOT EXISTS "UretimWorkCalendar" (
    "id" TEXT NOT NULL,
    "branchId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "workingDaysJson" TEXT NOT NULL DEFAULT '["MON","TUE","WED","THU","FRI","SAT"]',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UretimWorkCalendar_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UretimWorkCalendar_code_key" ON "UretimWorkCalendar"("code");
CREATE INDEX IF NOT EXISTS "UretimWorkCalendar_branchId_idx" ON "UretimWorkCalendar"("branchId");
CREATE INDEX IF NOT EXISTS "UretimWorkCalendar_isActive_idx" ON "UretimWorkCalendar"("isActive");

CREATE TABLE IF NOT EXISTS "UretimShift" (
    "id" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startTime" TEXT NOT NULL DEFAULT '08:00',
    "endTime" TEXT NOT NULL DEFAULT '17:00',
    "breakMinutes" INTEGER NOT NULL DEFAULT 60,
    "netWorkingMinutes" INTEGER NOT NULL DEFAULT 480,
    "capacityMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UretimShift_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "UretimShift_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "UretimWorkCalendar"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "UretimShift_code_key" ON "UretimShift"("code");
CREATE INDEX IF NOT EXISTS "UretimShift_calendarId_idx" ON "UretimShift"("calendarId");
CREATE INDEX IF NOT EXISTS "UretimShift_isActive_idx" ON "UretimShift"("isActive");

CREATE TABLE IF NOT EXISTS "UretimCalendarHoliday" (
    "id" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    "holidayDate" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isHalfDay" BOOLEAN NOT NULL DEFAULT false,
    "isRecurringYearly" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UretimCalendarHoliday_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "UretimCalendarHoliday_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "UretimWorkCalendar"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "UretimCalendarHoliday_calendarId_holidayDate_idx" ON "UretimCalendarHoliday"("calendarId", "holidayDate");

CREATE TABLE IF NOT EXISTS "UretimWorkCenter" (
    "id" TEXT NOT NULL,
    "branchId" TEXT,
    "warehouseId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'MACHINE',
    "hourlyCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "capacityPerHour" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "efficiencyPercent" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "calendarId" TEXT,
    "defaultShiftId" TEXT,
    "alternativeGroupCode" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UretimWorkCenter_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "UretimWorkCenter_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "UretimWorkCalendar"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "UretimWorkCenter_defaultShiftId_fkey" FOREIGN KEY ("defaultShiftId") REFERENCES "UretimShift"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "UretimWorkCenter_code_key" ON "UretimWorkCenter"("code");
CREATE INDEX IF NOT EXISTS "UretimWorkCenter_branchId_idx" ON "UretimWorkCenter"("branchId");
CREATE INDEX IF NOT EXISTS "UretimWorkCenter_type_idx" ON "UretimWorkCenter"("type");
CREATE INDEX IF NOT EXISTS "UretimWorkCenter_alternativeGroupCode_idx" ON "UretimWorkCenter"("alternativeGroupCode");
CREATE INDEX IF NOT EXISTS "UretimWorkCenter_isActive_idx" ON "UretimWorkCenter"("isActive");

CREATE TABLE IF NOT EXISTS "UretimCalendarException" (
    "id" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    "workCenterId" TEXT NOT NULL,
    "exceptionDate" TEXT NOT NULL,
    "exceptionType" TEXT NOT NULL DEFAULT 'CLOSED',
    "availableHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "capacityPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UretimCalendarException_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "UretimCalendarException_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "UretimWorkCalendar"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UretimCalendarException_workCenterId_fkey" FOREIGN KEY ("workCenterId") REFERENCES "UretimWorkCenter"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "UretimCalendarException_calendarId_exceptionDate_idx" ON "UretimCalendarException"("calendarId", "exceptionDate");
CREATE INDEX IF NOT EXISTS "UretimCalendarException_workCenterId_exceptionDate_idx" ON "UretimCalendarException"("workCenterId", "exceptionDate");

CREATE TABLE IF NOT EXISTS "UretimMachineAsset" (
    "id" TEXT NOT NULL,
    "branchId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "warrantyEndDate" TEXT,
    "warrantyProvider" TEXT,
    "location" TEXT,
    "workCenterId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "operatingHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "productionCount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UretimMachineAsset_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "UretimMachineAsset_workCenterId_fkey" FOREIGN KEY ("workCenterId") REFERENCES "UretimWorkCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "UretimMachineAsset_code_key" ON "UretimMachineAsset"("code");
CREATE UNIQUE INDEX IF NOT EXISTS "UretimMachineAsset_serialNumber_key" ON "UretimMachineAsset"("serialNumber");
CREATE INDEX IF NOT EXISTS "UretimMachineAsset_workCenterId_idx" ON "UretimMachineAsset"("workCenterId");
CREATE INDEX IF NOT EXISTS "UretimMachineAsset_status_idx" ON "UretimMachineAsset"("status");
CREATE INDEX IF NOT EXISTS "UretimMachineAsset_branchId_idx" ON "UretimMachineAsset"("branchId");

CREATE TABLE IF NOT EXISTS "UretimParameters" (
    "id" TEXT NOT NULL,
    "branchId" TEXT,
    "planningHorizonDays" INTEGER NOT NULL DEFAULT 30,
    "planningBucket" TEXT NOT NULL DEFAULT 'DAILY',
    "defaultLotSizingRule" TEXT NOT NULL DEFAULT 'L4L',
    "defaultMinLotSize" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "defaultLotMultiple" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "defaultSafetyStockRule" TEXT NOT NULL DEFAULT 'FIXED',
    "defaultSafetyStockValue" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "defaultSafetyStockDays" INTEGER NOT NULL DEFAULT 3,
    "requireWorkOrderApproval" BOOLEAN NOT NULL DEFAULT true,
    "requireQualityCheckOnComplete" BOOLEAN NOT NULL DEFAULT false,
    "autoBackflushOnComplete" BOOLEAN NOT NULL DEFAULT true,
    "autoReserveOnRelease" BOOLEAN NOT NULL DEFAULT true,
    "allowOverProductionPercent" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "allowNegativeStockInProduction" BOOLEAN NOT NULL DEFAULT false,
    "defaultManufacturingWarehouseId" TEXT,
    "statusFlowJson" TEXT NOT NULL DEFAULT '["DRAFT","PLANNED","RELEASED","IN_PROGRESS","QA_PENDING","COMPLETED"]',
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UretimParameters_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UretimParameters_branchId_key" ON "UretimParameters"("branchId");

CREATE TABLE IF NOT EXISTS "UretimItemProfile" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "productionItemType" TEXT NOT NULL DEFAULT 'MAMUL',
    "productionMethod" TEXT NOT NULL DEFAULT 'MAKE_TO_STOCK',
    "leadTimeDays" INTEGER NOT NULL DEFAULT 3,
    "productionLeadTimeHours" DOUBLE PRECISION NOT NULL DEFAULT 4,
    "minStockLevel" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "safetyStockQty" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "lotSizingRule" TEXT NOT NULL DEFAULT 'L4L',
    "standardLotSize" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "minOrderQty" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "orderMultiple" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "defaultBomId" TEXT,
    "defaultWorkCenterId" TEXT,
    "scrapTolerancePercent" DOUBLE PRECISION NOT NULL DEFAULT 2,
    "backflushEnabled" BOOLEAN NOT NULL DEFAULT true,
    "qualityCheckRequired" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UretimItemProfile_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "UretimItemProfile_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UretimItemProfile_defaultBomId_fkey" FOREIGN KEY ("defaultBomId") REFERENCES "BomHeader"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "UretimItemProfile_defaultWorkCenterId_fkey" FOREIGN KEY ("defaultWorkCenterId") REFERENCES "UretimWorkCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "UretimItemProfile_itemId_key" ON "UretimItemProfile"("itemId");
CREATE INDEX IF NOT EXISTS "UretimItemProfile_productionItemType_idx" ON "UretimItemProfile"("productionItemType");
CREATE INDEX IF NOT EXISTS "UretimItemProfile_productionMethod_idx" ON "UretimItemProfile"("productionMethod");
CREATE INDEX IF NOT EXISTS "UretimItemProfile_defaultBomId_idx" ON "UretimItemProfile"("defaultBomId");
CREATE INDEX IF NOT EXISTS "UretimItemProfile_defaultWorkCenterId_idx" ON "UretimItemProfile"("defaultWorkCenterId");
