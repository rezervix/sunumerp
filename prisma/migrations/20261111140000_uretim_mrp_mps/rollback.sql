-- Rollback: 20261111140000_uretim_mrp_mps
-- Faz 4: MRP (Malzeme İhtiyaç Planlaması) & MPS (Ana Üretim Çizelgesi) Geri Alma Betiği
-- Bağımlılık sırasına göre eklenen Faz 4 tablolarını güvenle kaldırır.

DROP TABLE IF EXISTS "UretimMrpActionMessage";
DROP TABLE IF EXISTS "UretimMrpPlannedOrder";
DROP TABLE IF EXISTS "UretimMrpRun";
DROP TABLE IF EXISTS "UretimMpsPlanItem";
DROP TABLE IF EXISTS "UretimMpsPlan";
