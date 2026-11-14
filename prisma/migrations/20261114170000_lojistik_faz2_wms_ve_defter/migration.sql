-- Sunum ERP — Lojistik Faz 2: Depo & WMS Derinleştirmesi ve Stok Defteri (Additive Migration)
-- Mevcut tablolara yalnızca geriye dönük uyumlu (nullable veya varsayılan değerli) kolonlar eklenir;
-- yeni tabloların tamamı "Lojistik" öneki ile oluşturulur. Mevcut verilere dokunulmaz.

ALTER TABLE "Warehouse" ADD COLUMN IF NOT EXISTS "pickPolicy" TEXT;
ALTER TABLE "Warehouse" ADD COLUMN IF NOT EXISTS "maxCapacityPallets" INTEGER;

ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "pickPolicy" TEXT;
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "defaultPutawayZoneType" TEXT;

ALTER TABLE "UnitConversion" ADD COLUMN IF NOT EXISTS "levelOrder" INTEGER;
ALTER TABLE "UnitConversion" ADD COLUMN IF NOT EXISTS "parentUnit" TEXT;
ALTER TABLE "UnitConversion" ADD COLUMN IF NOT EXISTS "tiCount" INTEGER;
ALTER TABLE "UnitConversion" ADD COLUMN IF NOT EXISTS "hiCount" INTEGER;

ALTER TABLE "StorageBin" ADD COLUMN IF NOT EXISTS "binRole" TEXT;
ALTER TABLE "StorageBin" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "StockMovement" ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;
ALTER TABLE "StockMovement" ADD COLUMN IF NOT EXISTS "deviceId" TEXT;
ALTER TABLE "StockMovement" ADD COLUMN IF NOT EXISTS "method" TEXT;
ALTER TABLE "StockMovement" ADD COLUMN IF NOT EXISTS "reservationId" TEXT;
ALTER TABLE "StockMovement" ADD COLUMN IF NOT EXISTS "balanceAfterQty" DOUBLE PRECISION;
CREATE INDEX IF NOT EXISTS "StockMovement_idempotencyKey_idx" ON "StockMovement"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "StockMovement_referenceDocNo_idx" ON "StockMovement"("referenceDocNo");

ALTER TABLE "WmsTask" ADD COLUMN IF NOT EXISTS "dueAt" TIMESTAMP(3);
ALTER TABLE "WmsTask" ADD COLUMN IF NOT EXISTS "taskCategory" TEXT;
ALTER TABLE "WmsTask" ADD COLUMN IF NOT EXISTS "relatedPoNo" TEXT;

ALTER TABLE "WmsTaskLine" ADD COLUMN IF NOT EXISTS "suggestedLotNumber" TEXT;
ALTER TABLE "WmsTaskLine" ADD COLUMN IF NOT EXISTS "varianceQty" DOUBLE PRECISION;
ALTER TABLE "WmsTaskLine" ADD COLUMN IF NOT EXISTS "varianceReason" TEXT;

ALTER TABLE "WarehouseTransferOrder" ADD COLUMN IF NOT EXISTS "driverPhone" TEXT;
ALTER TABLE "WarehouseTransferOrder" ADD COLUMN IF NOT EXISTS "discrepancyNotes" TEXT;

ALTER TABLE "TransferOrderLine" ADD COLUMN IF NOT EXISTS "inTransitQty" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "TransferOrderLine" ADD COLUMN IF NOT EXISTS "damagedQty" DOUBLE PRECISION NOT NULL DEFAULT 0;

ALTER TABLE "LicensePlate" ADD COLUMN IF NOT EXISTS "ssccCheckDigit" TEXT;
ALTER TABLE "LicensePlate" ADD COLUMN IF NOT EXISTS "volumeM3" DOUBLE PRECISION;

ALTER TABLE "InventoryCountSession" ADD COLUMN IF NOT EXISTS "scheduledDate" TIMESTAMP(3);
ALTER TABLE "InventoryCountSession" ADD COLUMN IF NOT EXISTS "tolerancePercent" DOUBLE PRECISION;
ALTER TABLE "InventoryCountSession" ADD COLUMN IF NOT EXISTS "requiresApproval" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "InventoryCountSession" ADD COLUMN IF NOT EXISTS "approvedBy" TEXT;

ALTER TABLE "InventoryCountLine" ADD COLUMN IF NOT EXISTS "withinTolerance" BOOLEAN;

ALTER TABLE "WmsOfflineSyncLog" ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;
ALTER TABLE "WmsOfflineSyncLog" ADD COLUMN IF NOT EXISTS "conflictReason" TEXT;
CREATE INDEX IF NOT EXISTS "WmsOfflineSyncLog_idempotencyKey_idx" ON "WmsOfflineSyncLog"("idempotencyKey");

CREATE TABLE IF NOT EXISTS "LojistikStockReservation" (
    "id" TEXT NOT NULL,
    "reservationNo" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceRefNo" TEXT,
    "itemId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "storageBinId" TEXT,
    "lotNumber" TEXT,
    "serialNumber" TEXT,
    "reservedQty" DOUBLE PRECISION NOT NULL,
    "fulfilledQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "releasedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LojistikStockReservation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "LojistikStockReservation_reservationNo_key" ON "LojistikStockReservation"("reservationNo");
CREATE INDEX IF NOT EXISTS "LojistikStockReservation_itemId_warehouseId_idx" ON "LojistikStockReservation"("itemId", "warehouseId");
CREATE INDEX IF NOT EXISTS "LojistikStockReservation_sourceType_sourceId_idx" ON "LojistikStockReservation"("sourceType", "sourceId");
CREATE INDEX IF NOT EXISTS "LojistikStockReservation_status_idx" ON "LojistikStockReservation"("status");

CREATE TABLE IF NOT EXISTS "LojistikCrossDockOrder" (
    "id" TEXT NOT NULL,
    "crossDockNo" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "inboundPoNo" TEXT,
    "inboundReceivingBinId" TEXT,
    "outboundOrderRef" TEXT NOT NULL,
    "outboundRampBinId" TEXT,
    "itemId" TEXT NOT NULL,
    "plannedQty" DOUBLE PRECISION NOT NULL,
    "receivedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dispatchedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL DEFAULT 'Adet',
    "lotNumber" TEXT,
    "lpnCode" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "assignedTo" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LojistikCrossDockOrder_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "LojistikCrossDockOrder_crossDockNo_key" ON "LojistikCrossDockOrder"("crossDockNo");
CREATE INDEX IF NOT EXISTS "LojistikCrossDockOrder_warehouseId_status_idx" ON "LojistikCrossDockOrder"("warehouseId", "status");

CREATE TABLE IF NOT EXISTS "LojistikKitOrder" (
    "id" TEXT NOT NULL,
    "kitOrderNo" TEXT NOT NULL,
    "operationType" TEXT NOT NULL DEFAULT 'ASSEMBLE',
    "warehouseId" TEXT NOT NULL,
    "kitItemId" TEXT NOT NULL,
    "targetBinId" TEXT,
    "plannedQty" DOUBLE PRECISION NOT NULL,
    "completedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL DEFAULT 'Adet',
    "lotNumber" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "bomId" TEXT,
    "performedBy" TEXT,
    "notes" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LojistikKitOrder_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "LojistikKitOrder_kitOrderNo_key" ON "LojistikKitOrder"("kitOrderNo");
CREATE INDEX IF NOT EXISTS "LojistikKitOrder_warehouseId_status_idx" ON "LojistikKitOrder"("warehouseId", "status");

CREATE TABLE IF NOT EXISTS "LojistikKitOrderComponent" (
    "id" TEXT NOT NULL,
    "kitOrderId" TEXT NOT NULL,
    "componentItemId" TEXT NOT NULL,
    "requiredPerKit" DOUBLE PRECISION NOT NULL,
    "totalRequiredQty" DOUBLE PRECISION NOT NULL,
    "actualQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL DEFAULT 'Adet',
    "sourceBinId" TEXT,
    "lotNumber" TEXT,

    CONSTRAINT "LojistikKitOrderComponent_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "LojistikKitOrderComponent_kitOrderId_fkey" FOREIGN KEY ("kitOrderId") REFERENCES "LojistikKitOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "LojistikKitOrderComponent_kitOrderId_idx" ON "LojistikKitOrderComponent"("kitOrderId");

CREATE TABLE IF NOT EXISTS "LojistikRfidTagEvent" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT,
    "readerId" TEXT NOT NULL,
    "antennaPort" INTEGER,
    "epcCode" TEXT NOT NULL,
    "rssi" DOUBLE PRECISION,
    "matchedType" TEXT NOT NULL DEFAULT 'UNMATCHED',
    "matchedEntityId" TEXT,
    "matchedLabel" TEXT,
    "warehouseId" TEXT,
    "storageBinId" TEXT,
    "lpnId" TEXT,
    "itemId" TEXT,
    "countSessionId" TEXT,
    "rawPayload" TEXT,
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LojistikRfidTagEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "LojistikRfidTagEvent_epcCode_scannedAt_idx" ON "LojistikRfidTagEvent"("epcCode", "scannedAt");
CREATE INDEX IF NOT EXISTS "LojistikRfidTagEvent_readerId_scannedAt_idx" ON "LojistikRfidTagEvent"("readerId", "scannedAt");
CREATE INDEX IF NOT EXISTS "LojistikRfidTagEvent_idempotencyKey_idx" ON "LojistikRfidTagEvent"("idempotencyKey");
