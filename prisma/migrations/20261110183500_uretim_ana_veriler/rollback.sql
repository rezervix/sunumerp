-- Sunum ERP — Üretim Modülleri Ana Veriler ve Stok Kartı 1-1 Üretim Profili (Rollback / Down Migration)
-- Kapsam: 20261110183500_uretim_ana_veriler ile eklenen tüm Uretim* tablolarını bağımlılık sırasına göre geri alır.

DROP TABLE IF EXISTS "UretimItemProfile" CASCADE;
DROP TABLE IF EXISTS "UretimParameters" CASCADE;
DROP TABLE IF EXISTS "UretimMachineAsset" CASCADE;
DROP TABLE IF EXISTS "UretimCalendarException" CASCADE;
DROP TABLE IF EXISTS "UretimWorkCenter" CASCADE;
DROP TABLE IF EXISTS "UretimCalendarHoliday" CASCADE;
DROP TABLE IF EXISTS "UretimShift" CASCADE;
DROP TABLE IF EXISTS "UretimWorkCalendar" CASCADE;
