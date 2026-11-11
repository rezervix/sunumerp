-- Rollback: 20261111160000_uretim_is_emri
-- Faz 5: Üretim/İş Emri & Atölye İcra Geri Alma Betiği
-- Bağımlılık sırasına göre eklenen Faz 5 tablolarını güvenle kaldırır.

DROP TABLE IF EXISTS "UretimIotStaging";
DROP TABLE IF EXISTS "UretimWorkOrderStoppage";
DROP TABLE IF EXISTS "UretimWorkOrderLabor";
DROP TABLE IF EXISTS "UretimWorkOrderMaterial";
DROP TABLE IF EXISTS "UretimWorkOrderOperation";
DROP TABLE IF EXISTS "UretimWorkOrder";

