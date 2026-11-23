-- Sunum ERP — Turizm Faz 4: Tur Operatörlüğü (turizm_tur)
-- Additive-Only Migration (Mevcut tablolarda silme, yeniden adlandırma veya tip değişikliği YOK)

CREATE TABLE IF NOT EXISTS "TurizmTourGuide" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "code" TEXT NOT NULL UNIQUE,
  "userId" TEXT,
  "fullName" TEXT NOT NULL,
  "licenseNo" TEXT,
  "languagesJson" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "dailyFeeTry" DOUBLE PRECISION NOT NULL DEFAULT 3500,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "notes" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "ownerCompanyId" TEXT DEFAULT 'trzm-comp-main',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "TurizmTourAgency" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "code" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "partnerCompanyId" TEXT,
  "contactPerson" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "commissionRatePct" DOUBLE PRECISION NOT NULL DEFAULT 12,
  "defaultQuotaPerTour" INTEGER NOT NULL DEFAULT 10,
  "settlementTermDays" INTEGER NOT NULL DEFAULT 15,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "notes" TEXT,
  "ownerCompanyId" TEXT DEFAULT 'trzm-comp-main',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "TurizmTourSeatLayout" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "code" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "vehicleCategory" TEXT NOT NULL DEFAULT 'OTOBUS',
  "totalSeats" INTEGER NOT NULL DEFAULT 45,
  "rowsCount" INTEGER NOT NULL DEFAULT 11,
  "seatsPerRow" INTEGER NOT NULL DEFAULT 4,
  "aisleAfterCol" INTEGER NOT NULL DEFAULT 2,
  "seatMapJson" TEXT,
  "enforceGenderRuleDefault" BOOLEAN NOT NULL DEFAULT true,
  "allowFamilyAdjacentDefault" BOOLEAN NOT NULL DEFAULT true,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "ownerCompanyId" TEXT DEFAULT 'trzm-comp-main',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "TurizmTourPackage" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "code" TEXT NOT NULL UNIQUE,
  "title" TEXT NOT NULL,
  "destinationCity" TEXT NOT NULL,
  "departureCity" TEXT NOT NULL DEFAULT 'İstanbul',
  "tourType" TEXT NOT NULL DEFAULT 'DAY_TRIP',
  "durationDays" INTEGER NOT NULL DEFAULT 1,
  "startAt" TIMESTAMP(3) NOT NULL,
  "endAt" TIMESTAMP(3) NOT NULL,
  "itineraryJson" TEXT,
  "adultPriceTry" DOUBLE PRECISION NOT NULL DEFAULT 2500,
  "childPriceTry" DOUBLE PRECISION NOT NULL DEFAULT 1750,
  "capacity" INTEGER NOT NULL DEFAULT 45,
  "minParticipants" INTEGER NOT NULL DEFAULT 15,
  "status" TEXT NOT NULL DEFAULT 'ON_SALE',
  "branchId" TEXT NOT NULL DEFAULT 'local-debug-branch',
  "vehicleId" TEXT,
  "driverId" TEXT,
  "guideId" TEXT,
  "seatLayoutId" TEXT,
  "hotelAllotmentId" TEXT,
  "hotelRoomIdsJson" TEXT,
  "hotelNightlyCostPerRoomTry" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "agencyQuotasJson" TEXT,
  "enforceGenderSeatRule" BOOLEAN NOT NULL DEFAULT true,
  "allowFamilySeatOverride" BOOLEAN NOT NULL DEFAULT true,
  "estimatedDistanceKm" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "estimatedDurationMinutes" INTEGER NOT NULL DEFAULT 0,
  "notes" TEXT,
  "ownerCompanyId" TEXT DEFAULT 'trzm-comp-main',
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "TurizmTourPickupStop" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tourId" TEXT NOT NULL,
  "sequenceNo" INTEGER NOT NULL DEFAULT 1,
  "stopName" TEXT NOT NULL,
  "district" TEXT,
  "address" TEXT,
  "pickupTime" TEXT NOT NULL DEFAULT '07:00',
  "lat" DOUBLE PRECISION NOT NULL DEFAULT 41.0082,
  "lng" DOUBLE PRECISION NOT NULL DEFAULT 28.9784,
  "estimatedMinutesFromStart" INTEGER NOT NULL DEFAULT 0,
  "ownerCompanyId" TEXT DEFAULT 'trzm-comp-main',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "TurizmTourBooking" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "bookingNo" TEXT NOT NULL UNIQUE,
  "tourId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL DEFAULT 'local-debug-branch',
  "bookingType" TEXT NOT NULL DEFAULT 'INDIVIDUAL',
  "groupName" TEXT,
  "agencyId" TEXT,
  "agencyName" TEXT,
  "channelSource" TEXT NOT NULL DEFAULT 'DIRECT_WEB',
  "passengerCount" INTEGER NOT NULL DEFAULT 1,
  "totalPriceTry" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "paidAmountTry" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "balanceDueTry" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "agencyCommissionRatePct" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "agencyCommissionTry" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID',
  "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
  "hotelReservationIdsJson" TEXT,
  "financeId" TEXT,
  "eDocumentId" TEXT,
  "eDocumentNo" TEXT,
  "cancelReason" TEXT,
  "notes" TEXT,
  "ownerCompanyId" TEXT DEFAULT 'trzm-comp-main',
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "TurizmTourPassenger" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "bookingId" TEXT NOT NULL,
  "tourId" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "tckn" TEXT,
  "passportNo" TEXT,
  "nationality" TEXT NOT NULL DEFAULT 'TR',
  "birthDate" TIMESTAMP(3),
  "phone" TEXT,
  "gender" TEXT NOT NULL DEFAULT 'UNSPECIFIED',
  "familyGroupCode" TEXT,
  "seatNumber" TEXT,
  "pickupStopId" TEXT,
  "boardingStatus" TEXT NOT NULL DEFAULT 'WAITING',
  "boardedAt" TIMESTAMP(3),
  "hotelRoomId" TEXT,
  "hotelReservationId" TEXT,
  "kbsRecordId" TEXT,
  "emergencyNote" TEXT,
  "offlineIdempotencyKey" TEXT UNIQUE,
  "ownerCompanyId" TEXT DEFAULT 'trzm-comp-main',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "TurizmTourExpenseItem" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tourId" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'OTHER',
  "description" TEXT NOT NULL,
  "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "unitCostTry" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "totalCostTry" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "sourceRefType" TEXT,
  "sourceRefId" TEXT,
  "financeId" TEXT,
  "recordedBy" TEXT,
  "ownerCompanyId" TEXT DEFAULT 'trzm-comp-main',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "TurizmTourConflictLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tourId" TEXT,
  "tourCode" TEXT,
  "resourceType" TEXT NOT NULL,
  "resourceId" TEXT,
  "resourceLabel" TEXT NOT NULL,
  "attemptedStartAt" TIMESTAMP(3) NOT NULL,
  "attemptedEndAt" TIMESTAMP(3) NOT NULL,
  "conflictSource" TEXT NOT NULL,
  "conflictRefNo" TEXT,
  "rejectionCode" TEXT NOT NULL,
  "rejectionMessage" TEXT NOT NULL,
  "resolved" BOOLEAN NOT NULL DEFAULT false,
  "resolutionNote" TEXT,
  "actorUserId" TEXT,
  "ownerCompanyId" TEXT DEFAULT 'trzm-comp-main',
  "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "TurizmTourFieldLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tourId" TEXT NOT NULL,
  "logType" TEXT NOT NULL DEFAULT 'EMERGENCY_NOTE',
  "bookingId" TEXT,
  "passengerId" TEXT,
  "amountTry" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "paymentMethod" TEXT,
  "note" TEXT NOT NULL,
  "recordedByUserId" TEXT,
  "recordedByName" TEXT,
  "offlineIdempotencyKey" TEXT UNIQUE,
  "ownerCompanyId" TEXT DEFAULT 'trzm-comp-main',
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "TurizmTourPackage_status_startAt_idx" ON "TurizmTourPackage"("status", "startAt");
CREATE INDEX IF NOT EXISTS "TurizmTourBooking_tourId_status_idx" ON "TurizmTourBooking"("tourId", "status");
CREATE INDEX IF NOT EXISTS "TurizmTourPassenger_tourId_seatNumber_idx" ON "TurizmTourPassenger"("tourId", "seatNumber");
CREATE INDEX IF NOT EXISTS "TurizmTourExpenseItem_tourId_category_idx" ON "TurizmTourExpenseItem"("tourId", "category");
CREATE INDEX IF NOT EXISTS "TurizmTourConflictLog_tourId_attemptedAt_idx" ON "TurizmTourConflictLog"("tourId", "attemptedAt");
