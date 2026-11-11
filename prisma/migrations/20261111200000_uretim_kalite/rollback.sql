-- ─────────────────────────────────────────────────────────────
-- FAZ 7: ÜRETİM KALİTE KONTROL, MUAYENE, NCR & DÖF (CAPA)
-- Rollback: 20261111200000_uretim_kalite
-- ─────────────────────────────────────────────────────────────

DROP TABLE IF EXISTS "UretimQualityNcr" CASCADE;
DROP TABLE IF EXISTS "UretimQualityInspectionResult" CASCADE;
DROP TABLE IF EXISTS "UretimQualityInspection" CASCADE;
DROP TABLE IF EXISTS "UretimQualityPlanItem" CASCADE;
DROP TABLE IF EXISTS "UretimQualityPlan" CASCADE;
DROP TABLE IF EXISTS "UretimQualityCalibration" CASCADE;

ALTER TABLE "UretimWorkOrderOperation" DROP COLUMN IF EXISTS "isQualityControlPoint";
ALTER TABLE "UretimWorkOrderOperation" DROP COLUMN IF EXISTS "qualityInspectionStatus";
