-- Rollback: 20261114153000_lojistik_altyapi_ve_tedarikci_rolu
DROP INDEX IF EXISTS "User_supplierId_idx";
ALTER TABLE "User" DROP COLUMN IF EXISTS "supplierId";
