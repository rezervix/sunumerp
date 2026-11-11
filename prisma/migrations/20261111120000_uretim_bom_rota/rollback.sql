-- Rollback: 20261111120000_uretim_bom_rota
-- Faz 3: Ürün Reçeteleri (BOM) & Rotalar (Routing) Geri Alma Betiği
-- Bağımlılık sırasına göre eklenen tabloları güvenle kaldırır.

DROP TABLE IF EXISTS "UretimOperationMaterial";
DROP TABLE IF EXISTS "UretimOperationAlternativeWorkCenter";
DROP TABLE IF EXISTS "UretimOperation";
DROP TABLE IF EXISTS "UretimRoutingHeader";
DROP TABLE IF EXISTS "UretimBomRevisionLog";
DROP TABLE IF EXISTS "UretimBomSubstitute";
DROP TABLE IF EXISTS "UretimBomItem";
DROP TABLE IF EXISTS "UretimBomHeader";

