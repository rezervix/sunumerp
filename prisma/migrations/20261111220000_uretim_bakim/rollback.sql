-- ─────────────────────────────────────────────────────────────
-- FAZ 8: ÜRETİM EKİPMAN & BAKIM YÖNETİMİ (CMMS & PREDICTIVE)
-- Rollback: 20261111220000_uretim_bakim
-- ─────────────────────────────────────────────────────────────

DROP TABLE IF EXISTS "UretimMaintenanceConditionReading" CASCADE;
DROP TABLE IF EXISTS "UretimMaintenanceChecklistResult" CASCADE;
DROP TABLE IF EXISTS "UretimMaintenanceWorkOrderSparePart" CASCADE;
DROP TABLE IF EXISTS "UretimMaintenanceWorkOrder" CASCADE;
DROP TABLE IF EXISTS "UretimMaintenancePlanChecklist" CASCADE;
DROP TABLE IF EXISTS "UretimMaintenancePlan" CASCADE;
DROP TABLE IF EXISTS "UretimMachineSparePart" CASCADE;

ALTER TABLE "UretimMachineAsset" DROP COLUMN IF EXISTS "criticality";
ALTER TABLE "UretimMachineAsset" DROP COLUMN IF EXISTS "parentAssetId";
ALTER TABLE "UretimMachineAsset" DROP COLUMN IF EXISTS "category";
ALTER TABLE "UretimMachineAsset" DROP COLUMN IF EXISTS "acquisitionCost";
ALTER TABLE "UretimMachineAsset" DROP COLUMN IF EXISTS "documentUrl";

