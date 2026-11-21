-- Rollback: Sunum ERP — Turizm Faz 2: Araç Kiralama (Rent-a-Car) — turizm_rentacar

DROP TABLE IF EXISTS "TurizmRentKabisRecord";
DROP TABLE IF EXISTS "TurizmRentTollPassLog";
DROP TABLE IF EXISTS "TurizmRentDepositAndCharge";
DROP TABLE IF EXISTS "TurizmRentInspectionForm";
DROP TABLE IF EXISTS "TurizmRentContract";
DROP TABLE IF EXISTS "TurizmRentConflictAttemptLog";
DROP TABLE IF EXISTS "TurizmRentReservation";
DROP TABLE IF EXISTS "TurizmRentPolicyConfig";
DROP TABLE IF EXISTS "TurizmRentExtraService";
DROP TABLE IF EXISTS "TurizmRentTariff";
DROP TABLE IF EXISTS "TurizmRentVehicleClass";

DROP INDEX IF EXISTS "LojistikTrafficPenalty_matchedReservationId_idx";
ALTER TABLE "LojistikTrafficPenalty" DROP COLUMN IF EXISTS "reflectedAt";
ALTER TABLE "LojistikTrafficPenalty" DROP COLUMN IF EXISTS "reflectedInvoiceId";
ALTER TABLE "LojistikTrafficPenalty" DROP COLUMN IF EXISTS "reflectedExtraChargeId";
ALTER TABLE "LojistikTrafficPenalty" DROP COLUMN IF EXISTS "reflectionStatus";
ALTER TABLE "LojistikTrafficPenalty" DROP COLUMN IF EXISTS "matchedCustomerId";
ALTER TABLE "LojistikTrafficPenalty" DROP COLUMN IF EXISTS "matchedContractId";
ALTER TABLE "LojistikTrafficPenalty" DROP COLUMN IF EXISTS "matchedReservationId";

DROP INDEX IF EXISTS "LojistikVehicle_isRentalPool_rentalClassId_idx";
ALTER TABLE "LojistikVehicle" DROP COLUMN IF EXISTS "ownerCompanyId";
ALTER TABLE "LojistikVehicle" DROP COLUMN IF EXISTS "currentFuelPct";
ALTER TABLE "LojistikVehicle" DROP COLUMN IF EXISTS "baggageCapacity";
ALTER TABLE "LojistikVehicle" DROP COLUMN IF EXISTS "doorCount";
ALTER TABLE "LojistikVehicle" DROP COLUMN IF EXISTS "seatCount";
ALTER TABLE "LojistikVehicle" DROP COLUMN IF EXISTS "transmissionType";
ALTER TABLE "LojistikVehicle" DROP COLUMN IF EXISTS "rentalStatus";
ALTER TABLE "LojistikVehicle" DROP COLUMN IF EXISTS "rentalClassId";
ALTER TABLE "LojistikVehicle" DROP COLUMN IF EXISTS "isRentalPool";

ALTER TABLE "Customer" DROP COLUMN IF EXISTS "ownerCompanyId";
ALTER TABLE "Customer" DROP COLUMN IF EXISTS "blacklistReason";
ALTER TABLE "Customer" DROP COLUMN IF EXISTS "isBlacklisted";
ALTER TABLE "Customer" DROP COLUMN IF EXISTS "driverLicenseExpiresAt";
ALTER TABLE "Customer" DROP COLUMN IF EXISTS "driverLicenseIssuedAt";
ALTER TABLE "Customer" DROP COLUMN IF EXISTS "driverLicenseClass";
ALTER TABLE "Customer" DROP COLUMN IF EXISTS "driverLicenseNo";
ALTER TABLE "Customer" DROP COLUMN IF EXISTS "birthDate";
ALTER TABLE "Customer" DROP COLUMN IF EXISTS "nationality";
ALTER TABLE "Customer" DROP COLUMN IF EXISTS "passportNo";
ALTER TABLE "Customer" DROP COLUMN IF EXISTS "tckn";
