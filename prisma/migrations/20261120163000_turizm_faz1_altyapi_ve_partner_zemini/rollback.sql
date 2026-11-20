-- Rollback: 20261120163000_turizm_faz1_altyapi_ve_partner_zemini
-- Yalnızca Turizm Faz 1 tarafından eklenen tabloları ve User.partnerCompanyId kolonunu geri alır.

DROP TABLE IF EXISTS "TurizmCrossReservation";
DROP TABLE IF EXISTS "TurizmSharedResource";
DROP TABLE IF EXISTS "TurizmPartnership";
DROP TABLE IF EXISTS "TurizmPartnerCompany";

DROP INDEX IF EXISTS "User_partnerCompanyId_idx";
ALTER TABLE "User" DROP COLUMN IF EXISTS "partnerCompanyId";
