-- Sunum ERP — Lojistik Faz 5 (lojistik_filo) Rollback
-- Not: Üretim tablolarına (Uretim*) hiç dokunulmadığı için yalnızca Lojistik Faz 5 tablolarını ve eklenen bağlantıları kaldırır.

DROP TABLE IF EXISTS "LojistikTelematicErrorLog";
DROP TABLE IF EXISTS "LojistikTelemetryEvent";
DROP TABLE IF EXISTS "LojistikVehicleTelematicMap";
DROP TABLE IF EXISTS "LojistikTelematicConnection";
DROP TABLE IF EXISTS "LojistikCo2EmissionFactor";
DROP TABLE IF EXISTS "LojistikFuelLog";
DROP TABLE IF EXISTS "LojistikVehicleTire";
DROP TABLE IF EXISTS "LojistikVehicleFaultLog";
DROP TABLE IF EXISTS "LojistikVehicleMaintenanceChecklistResult";
DROP TABLE IF EXISTS "LojistikVehicleMaintenanceSparePart";
DROP TABLE IF EXISTS "LojistikVehicleMaintenanceWorkOrder";
DROP TABLE IF EXISTS "LojistikVehicleMaintenancePlan";
DROP TABLE IF EXISTS "LojistikTrafficPenalty";
DROP TABLE IF EXISTS "LojistikVehicleDocument";
DROP TABLE IF EXISTS "LojistikDriver";
DROP TABLE IF EXISTS "LojistikVehicleLease";
DROP TABLE IF EXISTS "LojistikVehicle";

ALTER TABLE "EDocumentRecord"
  DROP COLUMN IF EXISTS "driverId",
  DROP COLUMN IF EXISTS "vehicleId";

ALTER TABLE "WarehouseTransferOrder"
  DROP COLUMN IF EXISTS "driverId",
  DROP COLUMN IF EXISTS "vehicleId";

DROP INDEX IF EXISTS "Finance_vehicleId_idx";
ALTER TABLE "Finance"
  DROP COLUMN IF EXISTS "fleetCostCategory",
  DROP COLUMN IF EXISTS "driverId",
  DROP COLUMN IF EXISTS "vehicleId";
