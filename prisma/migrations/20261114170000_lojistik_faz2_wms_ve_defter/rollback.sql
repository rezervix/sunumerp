-- Rollback: 20261114170000_lojistik_faz2_wms_ve_defter

DROP TABLE IF EXISTS "LojistikRfidTagEvent";
DROP TABLE IF EXISTS "LojistikKitOrderComponent";
DROP TABLE IF EXISTS "LojistikKitOrder";
DROP TABLE IF EXISTS "LojistikCrossDockOrder";
DROP TABLE IF EXISTS "LojistikStockReservation";

DROP INDEX IF EXISTS "WmsOfflineSyncLog_idempotencyKey_idx";
ALTER TABLE "WmsOfflineSyncLog" DROP COLUMN IF EXISTS "conflictReason";
ALTER TABLE "WmsOfflineSyncLog" DROP COLUMN IF EXISTS "idempotencyKey";

ALTER TABLE "InventoryCountLine" DROP COLUMN IF EXISTS "withinTolerance";

ALTER TABLE "InventoryCountSession" DROP COLUMN IF EXISTS "approvedBy";
ALTER TABLE "InventoryCountSession" DROP COLUMN IF EXISTS "requiresApproval";
ALTER TABLE "InventoryCountSession" DROP COLUMN IF EXISTS "tolerancePercent";
ALTER TABLE "InventoryCountSession" DROP COLUMN IF EXISTS "scheduledDate";

ALTER TABLE "LicensePlate" DROP COLUMN IF EXISTS "volumeM3";
ALTER TABLE "LicensePlate" DROP COLUMN IF EXISTS "ssccCheckDigit";

ALTER TABLE "TransferOrderLine" DROP COLUMN IF EXISTS "damagedQty";
ALTER TABLE "TransferOrderLine" DROP COLUMN IF EXISTS "inTransitQty";

ALTER TABLE "WarehouseTransferOrder" DROP COLUMN IF EXISTS "discrepancyNotes";
ALTER TABLE "WarehouseTransferOrder" DROP COLUMN IF EXISTS "driverPhone";

ALTER TABLE "WmsTaskLine" DROP COLUMN IF EXISTS "varianceReason";
ALTER TABLE "WmsTaskLine" DROP COLUMN IF EXISTS "varianceQty";
ALTER TABLE "WmsTaskLine" DROP COLUMN IF EXISTS "suggestedLotNumber";

ALTER TABLE "WmsTask" DROP COLUMN IF EXISTS "relatedPoNo";
ALTER TABLE "WmsTask" DROP COLUMN IF EXISTS "taskCategory";
ALTER TABLE "WmsTask" DROP COLUMN IF EXISTS "dueAt";

DROP INDEX IF EXISTS "StockMovement_referenceDocNo_idx";
DROP INDEX IF EXISTS "StockMovement_idempotencyKey_idx";
ALTER TABLE "StockMovement" DROP COLUMN IF EXISTS "balanceAfterQty";
ALTER TABLE "StockMovement" DROP COLUMN IF EXISTS "reservationId";
ALTER TABLE "StockMovement" DROP COLUMN IF EXISTS "method";
ALTER TABLE "StockMovement" DROP COLUMN IF EXISTS "deviceId";
ALTER TABLE "StockMovement" DROP COLUMN IF EXISTS "idempotencyKey";

ALTER TABLE "StorageBin" DROP COLUMN IF EXISTS "isActive";
ALTER TABLE "StorageBin" DROP COLUMN IF EXISTS "binRole";

ALTER TABLE "UnitConversion" DROP COLUMN IF EXISTS "hiCount";
ALTER TABLE "UnitConversion" DROP COLUMN IF EXISTS "tiCount";
ALTER TABLE "UnitConversion" DROP COLUMN IF EXISTS "parentUnit";
ALTER TABLE "UnitConversion" DROP COLUMN IF EXISTS "levelOrder";

ALTER TABLE "InventoryItem" DROP COLUMN IF EXISTS "defaultPutawayZoneType";
ALTER TABLE "InventoryItem" DROP COLUMN IF EXISTS "pickPolicy";

ALTER TABLE "Warehouse" DROP COLUMN IF EXISTS "maxCapacityPallets";
ALTER TABLE "Warehouse" DROP COLUMN IF EXISTS "pickPolicy";
