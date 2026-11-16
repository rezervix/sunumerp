-- Sunum ERP — Lojistik Faz 5 (lojistik_filo): Bağımsız Filo, Araç, Şoför, Bakım, Yakıt, Maliyet, CO2 ve Telematik (Additive Migration)
-- ÖNEMLİ: Uretim* tablolarına dokunulmaz; yalnızca Filo modülüne özel additive Lojistik* tablolar ve Finance/Transfer/EDocument bağlantıları eklenir.

ALTER TABLE "Finance"
  ADD COLUMN IF NOT EXISTS "vehicleId" TEXT,
  ADD COLUMN IF NOT EXISTS "driverId" TEXT,
  ADD COLUMN IF NOT EXISTS "fleetCostCategory" TEXT;

CREATE INDEX IF NOT EXISTS "Finance_vehicleId_idx" ON "Finance"("vehicleId");

ALTER TABLE "WarehouseTransferOrder"
  ADD COLUMN IF NOT EXISTS "vehicleId" TEXT,
  ADD COLUMN IF NOT EXISTS "driverId" TEXT;

ALTER TABLE "EDocumentRecord"
  ADD COLUMN IF NOT EXISTS "vehicleId" TEXT,
  ADD COLUMN IF NOT EXISTS "driverId" TEXT;

CREATE TABLE IF NOT EXISTS "LojistikVehicle" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "code" TEXT NOT NULL UNIQUE,
  "plate" TEXT NOT NULL UNIQUE,
  "vin" TEXT UNIQUE,
  "brand" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "modelYear" INTEGER NOT NULL DEFAULT 2024,
  "vehicleType" TEXT NOT NULL DEFAULT 'PANEL_VAN',
  "fuelType" TEXT NOT NULL DEFAULT 'DIESEL',
  "ownershipType" TEXT NOT NULL DEFAULT 'OWNED',
  "branchId" TEXT NOT NULL DEFAULT 'local-debug-branch',
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "capacityKg" DOUBLE PRECISION NOT NULL DEFAULT 1500,
  "capacityM3" DOUBLE PRECISION NOT NULL DEFAULT 10,
  "palletSlots" INTEGER NOT NULL DEFAULT 4,
  "isRefrigerated" BOOLEAN NOT NULL DEFAULT false,
  "targetTempMinC" DOUBLE PRECISION,
  "targetTempMaxC" DOUBLE PRECISION,
  "odometerKm" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "engineHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "expectedLPer100Km" DOUBLE PRECISION NOT NULL DEFAULT 12,
  "tankCapacityLiters" DOUBLE PRECISION NOT NULL DEFAULT 80,
  "acquisitionCostTry" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "monthlyDepreciationTry" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "currentLat" DOUBLE PRECISION,
  "currentLng" DOUBLE PRECISION,
  "currentSpeedKmh" DOUBLE PRECISION,
  "currentHeadingDeg" DOUBLE PRECISION,
  "currentTempC" DOUBLE PRECISION,
  "lastTelemetryAt" TIMESTAMP(3),
  "lastTelemetryProvider" TEXT,
  "assignedDriverId" TEXT,
  "notes" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "LojistikVehicle_branchId_status_idx" ON "LojistikVehicle"("branchId", "status");
CREATE INDEX IF NOT EXISTS "LojistikVehicle_assignedDriverId_idx" ON "LojistikVehicle"("assignedDriverId");

CREATE TABLE IF NOT EXISTS "LojistikVehicleLease" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "vehicleId" TEXT NOT NULL REFERENCES "LojistikVehicle"("id") ON DELETE CASCADE,
  "lessorName" TEXT NOT NULL,
  "contractNo" TEXT NOT NULL,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "monthlyCostTry" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "annualKmLimit" INTEGER NOT NULL DEFAULT 50000,
  "depreciationMonthlyTry" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "notes" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "LojistikVehicleLease_vehicleId_idx" ON "LojistikVehicleLease"("vehicleId");
CREATE INDEX IF NOT EXISTS "LojistikVehicleLease_endDate_idx" ON "LojistikVehicleLease"("endDate");

CREATE TABLE IF NOT EXISTS "LojistikDriver" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "code" TEXT NOT NULL UNIQUE,
  "userId" TEXT,
  "branchId" TEXT NOT NULL DEFAULT 'local-debug-branch',
  "fullName" TEXT NOT NULL,
  "tckn" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "homeAddress" TEXT,
  "emergencyContact" TEXT,
  "licenseClass" TEXT NOT NULL DEFAULT 'B',
  "licenseNumber" TEXT,
  "licenseExpiresAt" TIMESTAMP(3),
  "srcType" TEXT,
  "srcNumber" TEXT,
  "srcExpiresAt" TIMESTAMP(3),
  "psychotechNumber" TEXT,
  "psychotechExpiresAt" TIMESTAMP(3),
  "shiftName" TEXT NOT NULL DEFAULT 'Gündüz Vardiyası',
  "shiftStart" TEXT NOT NULL DEFAULT '08:00',
  "shiftEnd" TEXT NOT NULL DEFAULT '17:30',
  "monthlySalaryCostTry" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
  "notes" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "LojistikDriver_branchId_status_idx" ON "LojistikDriver"("branchId", "status");
CREATE INDEX IF NOT EXISTS "LojistikDriver_userId_idx" ON "LojistikDriver"("userId");

CREATE TABLE IF NOT EXISTS "LojistikVehicleDocument" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "vehicleId" TEXT NOT NULL REFERENCES "LojistikVehicle"("id") ON DELETE CASCADE,
  "docType" TEXT NOT NULL,
  "documentNo" TEXT,
  "issuer" TEXT,
  "issuedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "costTry" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "reminderDaysBefore" INTEGER NOT NULL DEFAULT 30,
  "financeId" TEXT,
  "notes" TEXT,
  "status" TEXT NOT NULL DEFAULT 'VALID',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "LojistikVehicleDocument_vehicleId_docType_idx" ON "LojistikVehicleDocument"("vehicleId", "docType");
CREATE INDEX IF NOT EXISTS "LojistikVehicleDocument_expiresAt_idx" ON "LojistikVehicleDocument"("expiresAt");

CREATE TABLE IF NOT EXISTS "LojistikTrafficPenalty" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "penaltyNo" TEXT NOT NULL UNIQUE,
  "vehicleId" TEXT NOT NULL REFERENCES "LojistikVehicle"("id") ON DELETE CASCADE,
  "driverId" TEXT,
  "violationDate" TIMESTAMP(3) NOT NULL,
  "dueDate" TIMESTAMP(3),
  "location" TEXT,
  "violationType" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "amountTry" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "discountedAmountTry" DOUBLE PRECISION,
  "paidAt" TIMESTAMP(3),
  "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID',
  "financeId" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "LojistikTrafficPenalty_vehicleId_violationDate_idx" ON "LojistikTrafficPenalty"("vehicleId", "violationDate");
CREATE INDEX IF NOT EXISTS "LojistikTrafficPenalty_driverId_idx" ON "LojistikTrafficPenalty"("driverId");
CREATE INDEX IF NOT EXISTS "LojistikTrafficPenalty_paymentStatus_idx" ON "LojistikTrafficPenalty"("paymentStatus");

CREATE TABLE IF NOT EXISTS "LojistikVehicleMaintenancePlan" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "code" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "vehicleId" TEXT REFERENCES "LojistikVehicle"("id") ON DELETE CASCADE,
  "vehicleTypeFilter" TEXT,
  "planType" TEXT NOT NULL DEFAULT 'METER_KM',
  "frequencyDays" INTEGER,
  "frequencyKm" DOUBLE PRECISION,
  "frequencyHours" DOUBLE PRECISION,
  "conditionParameter" TEXT,
  "conditionThreshold" DOUBLE PRECISION,
  "lastTriggeredDate" TIMESTAMP(3),
  "lastTriggeredKm" DOUBLE PRECISION,
  "lastTriggeredHours" DOUBLE PRECISION,
  "nextScheduledDate" TIMESTAMP(3),
  "estimatedCostTry" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "checklistJson" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "LojistikVehicleMaintenancePlan_vehicleId_isActive_idx" ON "LojistikVehicleMaintenancePlan"("vehicleId", "isActive");

CREATE TABLE IF NOT EXISTS "LojistikVehicleMaintenanceWorkOrder" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "workOrderNumber" TEXT NOT NULL UNIQUE,
  "vehicleId" TEXT NOT NULL REFERENCES "LojistikVehicle"("id") ON DELETE CASCADE,
  "planId" TEXT REFERENCES "LojistikVehicleMaintenancePlan"("id") ON DELETE SET NULL,
  "orderType" TEXT NOT NULL DEFAULT 'PREVENTIVE',
  "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
  "status" TEXT NOT NULL DEFAULT 'REQUESTED',
  "title" TEXT NOT NULL,
  "description" TEXT,
  "serviceProviderName" TEXT,
  "odometerKmAtService" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "engineHoursAtService" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "downtimeMinutes" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "laborHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "laborCostTry" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "sparePartCostTry" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "externalServiceCostTry" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "totalCostTry" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "failureReasonCode" TEXT,
  "rootCause" TEXT,
  "checklistResultsJson" TEXT,
  "financeId" TEXT,
  "plannedDate" TIMESTAMP(3),
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "LojistikVehicleMaintenanceWorkOrder_vehicleId_status_idx" ON "LojistikVehicleMaintenanceWorkOrder"("vehicleId", "status");
CREATE INDEX IF NOT EXISTS "LojistikVehicleMaintenanceWorkOrder_orderType_idx" ON "LojistikVehicleMaintenanceWorkOrder"("orderType");

CREATE TABLE IF NOT EXISTS "LojistikVehicleMaintenanceSparePart" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "workOrderId" TEXT NOT NULL REFERENCES "LojistikVehicleMaintenanceWorkOrder"("id") ON DELETE CASCADE,
  "itemId" TEXT NOT NULL,
  "quantityUsed" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "unitCostTry" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "totalCostTry" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "stockMovementId" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "LojistikVehicleMaintenanceSparePart_workOrderId_idx" ON "LojistikVehicleMaintenanceSparePart"("workOrderId");
CREATE INDEX IF NOT EXISTS "LojistikVehicleMaintenanceSparePart_itemId_idx" ON "LojistikVehicleMaintenanceSparePart"("itemId");

CREATE TABLE IF NOT EXISTS "LojistikVehicleMaintenanceChecklistResult" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "workOrderId" TEXT NOT NULL REFERENCES "LojistikVehicleMaintenanceWorkOrder"("id") ON DELETE CASCADE,
  "sequence" INTEGER NOT NULL DEFAULT 10,
  "instruction" TEXT NOT NULL,
  "isPassed" BOOLEAN NOT NULL DEFAULT true,
  "measuredVal" TEXT,
  "notes" TEXT,
  "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "LojistikVehicleMaintenanceChecklistResult_workOrderId_idx" ON "LojistikVehicleMaintenanceChecklistResult"("workOrderId");

CREATE TABLE IF NOT EXISTS "LojistikVehicleFaultLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "faultCode" TEXT NOT NULL UNIQUE,
  "vehicleId" TEXT NOT NULL REFERENCES "LojistikVehicle"("id") ON DELETE CASCADE,
  "driverId" TEXT,
  "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "odometerKm" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
  "category" TEXT NOT NULL DEFAULT 'MEKANIK',
  "title" TEXT NOT NULL,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "linkedWorkOrderId" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "LojistikVehicleFaultLog_vehicleId_status_idx" ON "LojistikVehicleFaultLog"("vehicleId", "status");

CREATE TABLE IF NOT EXISTS "LojistikVehicleTire" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "vehicleId" TEXT NOT NULL REFERENCES "LojistikVehicle"("id") ON DELETE CASCADE,
  "serialOrDot" TEXT NOT NULL,
  "brandModel" TEXT NOT NULL,
  "sizeCode" TEXT NOT NULL,
  "position" TEXT NOT NULL DEFAULT 'FRONT_LEFT',
  "installedOdometerKm" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "currentTreadDepthMm" DOUBLE PRECISION NOT NULL DEFAULT 8.0,
  "minTreadDepthMm" DOUBLE PRECISION NOT NULL DEFAULT 3.0,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "lastInspectedAt" TIMESTAMP(3),
  "costTry" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "LojistikVehicleTire_vehicleId_position_idx" ON "LojistikVehicleTire"("vehicleId", "position");
CREATE INDEX IF NOT EXISTS "LojistikVehicleTire_status_idx" ON "LojistikVehicleTire"("status");

CREATE TABLE IF NOT EXISTS "LojistikFuelLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "vehicleId" TEXT NOT NULL REFERENCES "LojistikVehicle"("id") ON DELETE CASCADE,
  "driverId" TEXT,
  "fuelDate" TIMESTAMP(3) NOT NULL,
  "fuelType" TEXT NOT NULL DEFAULT 'DIESEL',
  "odometerKm" DOUBLE PRECISION NOT NULL,
  "liters" DOUBLE PRECISION NOT NULL,
  "unitPriceTry" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "totalAmountTry" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "fullTank" BOOLEAN NOT NULL DEFAULT true,
  "stationName" TEXT,
  "fuelCardNo" TEXT,
  "invoiceRef" TEXT,
  "invoiceLiters" DOUBLE PRECISION,
  "invoiceAmountTry" DOUBLE PRECISION,
  "source" TEXT NOT NULL DEFAULT 'MANUAL',
  "calculatedLPer100Km" DOUBLE PRECISION,
  "isAnomaly" BOOLEAN NOT NULL DEFAULT false,
  "anomalyNote" TEXT,
  "financeId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "LojistikFuelLog_vehicleId_fuelDate_idx" ON "LojistikFuelLog"("vehicleId", "fuelDate");
CREATE INDEX IF NOT EXISTS "LojistikFuelLog_invoiceRef_idx" ON "LojistikFuelLog"("invoiceRef");

CREATE TABLE IF NOT EXISTS "LojistikCo2EmissionFactor" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "fuelType" TEXT NOT NULL UNIQUE,
  "unit" TEXT NOT NULL DEFAULT 'L',
  "kgCo2ePerUnit" DOUBLE PRECISION NOT NULL,
  "sourceName" TEXT NOT NULL,
  "sourceYear" INTEGER NOT NULL,
  "sourceVersion" TEXT,
  "sourceUrl" TEXT,
  "notes" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "updatedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "LojistikTelematicConnection" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "providerCode" TEXT NOT NULL UNIQUE,
  "displayName" TEXT NOT NULL,
  "mode" TEXT NOT NULL DEFAULT 'DEMO_DB',
  "authType" TEXT NOT NULL DEFAULT 'BEARER',
  "baseUrl" TEXT,
  "isEnabled" BOOLEAN NOT NULL DEFAULT true,
  "status" TEXT NOT NULL DEFAULT 'DEMO_READY',
  "lastEventAt" TIMESTAMP(3),
  "lastSyncAt" TIMESTAMP(3),
  "fieldMappingJson" TEXT,
  "docsUrl" TEXT,
  "docsAccessDate" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "LojistikVehicleTelematicMap" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "vehicleId" TEXT NOT NULL REFERENCES "LojistikVehicle"("id") ON DELETE CASCADE,
  "providerCode" TEXT NOT NULL,
  "externalDeviceId" TEXT NOT NULL,
  "externalVehicleRef" TEXT,
  "plateSnapshot" TEXT,
  "vinSnapshot" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "lastSeenAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("providerCode", "externalDeviceId")
);

CREATE INDEX IF NOT EXISTS "LojistikVehicleTelematicMap_vehicleId_idx" ON "LojistikVehicleTelematicMap"("vehicleId");

CREATE TABLE IF NOT EXISTS "LojistikTelemetryEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "vehicleId" TEXT NOT NULL REFERENCES "LojistikVehicle"("id") ON DELETE CASCADE,
  "driverId" TEXT,
  "providerCode" TEXT NOT NULL,
  "externalDeviceId" TEXT NOT NULL,
  "sourceOrigin" TEXT NOT NULL DEFAULT 'DEMO_DB',
  "idempotencyKey" TEXT NOT NULL UNIQUE,
  "eventType" TEXT NOT NULL,
  "eventTime" TIMESTAMP(3) NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "isBackfill" BOOLEAN NOT NULL DEFAULT false,
  "lat" DOUBLE PRECISION,
  "lng" DOUBLE PRECISION,
  "speedKmh" DOUBLE PRECISION,
  "headingDeg" DOUBLE PRECISION,
  "ignitionOn" BOOLEAN,
  "fuelLevelLiters" DOUBLE PRECISION,
  "fuelLevelPct" DOUBLE PRECISION,
  "odometerKm" DOUBLE PRECISION,
  "temperatureC" DOUBLE PRECISION,
  "idleMinutes" DOUBLE PRECISION,
  "rawPayloadJson" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "LojistikTelemetryEvent_vehicleId_eventTime_idx" ON "LojistikTelemetryEvent"("vehicleId", "eventTime");
CREATE INDEX IF NOT EXISTS "LojistikTelemetryEvent_providerCode_eventType_idx" ON "LojistikTelemetryEvent"("providerCode", "eventType");

CREATE TABLE IF NOT EXISTS "LojistikTelematicErrorLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "providerCode" TEXT NOT NULL,
  "externalDeviceId" TEXT,
  "eventType" TEXT,
  "errorCode" TEXT NOT NULL,
  "errorMessage" TEXT NOT NULL,
  "rawPayloadJson" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "LojistikTelematicErrorLog_providerCode_createdAt_idx" ON "LojistikTelematicErrorLog"("providerCode", "createdAt");
