-- Sunum ERP — Lojistik Faz 1 Altyapı & Tedarikçi Rolü Kapsam Bağlantısı (Additive Migration)
-- Mevcut User tablosuna yalnızca nullable supplierId kolonu ve indeksi eklenir; mevcut veriye dokunulmaz.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "supplierId" TEXT;
CREATE INDEX IF NOT EXISTS "User_supplierId_idx" ON "User"("supplierId");
