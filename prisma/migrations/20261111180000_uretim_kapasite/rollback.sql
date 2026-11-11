-- ─────────────────────────────────────────────────────────────
-- FAZ 6: KAPASİTE PLANLAMA & ÇİZELGELEME ROLLBACK BETİĞİ
-- Migration: 20261111180000_uretim_kapasite
-- Geri alma (Rollback) kuralları - Yalnızca Faz 6 tablolarını ve kolonlarını kaldırır
-- ─────────────────────────────────────────────────────────────

-- 1. Tabloları Bağımlılık Sırasıyla Kaldır
DROP TABLE IF EXISTS "UretimOperationTimeVariance" CASCADE;
DROP TABLE IF EXISTS "UretimCtpSimulation" CASCADE;
DROP TABLE IF EXISTS "UretimCapacityAlert" CASCADE;
DROP TABLE IF EXISTS "UretimScheduledTask" CASCADE;
DROP TABLE IF EXISTS "UretimCapacityPlanItem" CASCADE;
DROP TABLE IF EXISTS "UretimCapacityPlan" CASCADE;

-- 2. UretimWorkOrderOperation Tablosuna Eklenen Kolonları Kaldır
ALTER TABLE "UretimWorkOrderOperation" DROP COLUMN IF EXISTS "scheduledStartDate";
ALTER TABLE "UretimWorkOrderOperation" DROP COLUMN IF EXISTS "scheduledEndDate";
ALTER TABLE "UretimWorkOrderOperation" DROP COLUMN IF EXISTS "isLocked";
ALTER TABLE "UretimWorkOrderOperation" DROP COLUMN IF EXISTS "sequenceNumber";

