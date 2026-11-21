-- Sunum ERP — Turizm Faz 2: Araç Kiralama (Rent-a-Car) — turizm_rentacar
-- Kural: Mevcut tablolarda kolon silme, yeniden adlandırma veya tip değiştirme YOKTUR.
-- Yalnızca geri alınabilir (additive) kolon ve tablo eklemeleri yapılır.

-- 1. Mevcut Customer tablosuna KVKK maskeli kiracı/ehliyet alanları (additive nullable)
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "tckn" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "passportNo" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "nationality" TEXT DEFAULT 'TR';
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "birthDate" TIMESTAMP(3);
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "driverLicenseNo" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "driverLicenseClass" TEXT DEFAULT 'B';
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "driverLicenseIssuedAt" TIMESTAMP(3);
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "driverLicenseExpiresAt" TIMESTAMP(3);
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "isBlacklisted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "blacklistReason" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "ownerCompanyId" TEXT;

-- 2. Mevcut LojistikVehicle tablosuna kiralama filosu ortak alanları (additive nullable)
ALTER TABLE "LojistikVehicle" ADD COLUMN IF NOT EXISTS "isRentalPool" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "LojistikVehicle" ADD COLUMN IF NOT EXISTS "rentalClassId" TEXT;
ALTER TABLE "LojistikVehicle" ADD COLUMN IF NOT EXISTS "rentalStatus" TEXT DEFAULT 'AVAILABLE';
ALTER TABLE "LojistikVehicle" ADD COLUMN IF NOT EXISTS "transmissionType" TEXT DEFAULT 'AUTOMATIC';
ALTER TABLE "LojistikVehicle" ADD COLUMN IF NOT EXISTS "seatCount" INTEGER DEFAULT 5;
ALTER TABLE "LojistikVehicle" ADD COLUMN IF NOT EXISTS "doorCount" INTEGER DEFAULT 4;
ALTER TABLE "LojistikVehicle" ADD COLUMN IF NOT EXISTS "baggageCapacity" INTEGER DEFAULT 3;
ALTER TABLE "LojistikVehicle" ADD COLUMN IF NOT EXISTS "currentFuelPct" INTEGER DEFAULT 100;
ALTER TABLE "LojistikVehicle" ADD COLUMN IF NOT EXISTS "ownerCompanyId" TEXT;
CREATE INDEX IF NOT EXISTS "LojistikVehicle_isRentalPool_rentalClassId_idx" ON "LojistikVehicle"("isRentalPool", "rentalClassId");

-- 3. Mevcut LojistikTrafficPenalty tablosuna kiralama eşleştirme/yansıtma alanları (additive nullable)
ALTER TABLE "LojistikTrafficPenalty" ADD COLUMN IF NOT EXISTS "matchedReservationId" TEXT;
ALTER TABLE "LojistikTrafficPenalty" ADD COLUMN IF NOT EXISTS "matchedContractId" TEXT;
ALTER TABLE "LojistikTrafficPenalty" ADD COLUMN IF NOT EXISTS "matchedCustomerId" TEXT;
ALTER TABLE "LojistikTrafficPenalty" ADD COLUMN IF NOT EXISTS "reflectionStatus" TEXT DEFAULT 'UNMATCHED';
ALTER TABLE "LojistikTrafficPenalty" ADD COLUMN IF NOT EXISTS "reflectedExtraChargeId" TEXT;
ALTER TABLE "LojistikTrafficPenalty" ADD COLUMN IF NOT EXISTS "reflectedInvoiceId" TEXT;
ALTER TABLE "LojistikTrafficPenalty" ADD COLUMN IF NOT EXISTS "reflectedAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "LojistikTrafficPenalty_matchedReservationId_idx" ON "LojistikTrafficPenalty"("matchedReservationId");

-- 4. Araç Sınıfı / Kategori Tablosu
CREATE TABLE IF NOT EXISTS "TurizmRentVehicleClass" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "segmentCode" TEXT NOT NULL DEFAULT 'C',
    "transmissionDefault" TEXT NOT NULL DEFAULT 'AUTOMATIC',
    "fuelTypeDefault" TEXT NOT NULL DEFAULT 'PETROL',
    "minDriverAge" INTEGER NOT NULL DEFAULT 21,
    "minLicenseYears" INTEGER NOT NULL DEFAULT 2,
    "defaultDepositTry" DOUBLE PRECISION NOT NULL DEFAULT 5000,
    "dailyKmLimit" INTEGER NOT NULL DEFAULT 250,
    "extraKmUnitPriceTry" DOUBLE PRECISION NOT NULL DEFAULT 6.5,
    "lateReturnHourlyTry" DOUBLE PRECISION NOT NULL DEFAULT 350,
    "missingFuelPricePerPctTry" DOUBLE PRECISION NOT NULL DEFAULT 32,
    "seatCountDefault" INTEGER NOT NULL DEFAULT 5,
    "baggageCountDefault" INTEGER NOT NULL DEFAULT 3,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 10,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "ownerCompanyId" TEXT DEFAULT 'trzm-comp-main',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TurizmRentVehicleClass_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "TurizmRentVehicleClass_code_key" ON "TurizmRentVehicleClass"("code");
CREATE INDEX IF NOT EXISTS "TurizmRentVehicleClass_isActive_sortOrder_idx" ON "TurizmRentVehicleClass"("isActive", "sortOrder");
CREATE INDEX IF NOT EXISTS "TurizmRentVehicleClass_ownerCompanyId_idx" ON "TurizmRentVehicleClass"("ownerCompanyId");

-- 5. Fiyat Tarifeleri Tablosu
CREATE TABLE IF NOT EXISTS "TurizmRentTariff" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "vehicleClassId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL DEFAULT 'local-debug-branch',
    "seasonType" TEXT NOT NULL DEFAULT 'STANDARD',
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3) NOT NULL,
    "dailyRateTry" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "weeklyDailyRateTry" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "monthlyDailyRateTry" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dailyKmLimit" INTEGER NOT NULL DEFAULT 250,
    "extraKmRateTry" DOUBLE PRECISION NOT NULL DEFAULT 6.5,
    "depositAmountTry" DOUBLE PRECISION NOT NULL DEFAULT 5000,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "ownerCompanyId" TEXT DEFAULT 'trzm-comp-main',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TurizmRentTariff_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TurizmRentTariff_vehicleClassId_fkey" FOREIGN KEY ("vehicleClassId") REFERENCES "TurizmRentVehicleClass"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "TurizmRentTariff_code_key" ON "TurizmRentTariff"("code");
CREATE INDEX IF NOT EXISTS "TurizmRentTariff_vehicleClassId_isActive_idx" ON "TurizmRentTariff"("vehicleClassId", "isActive");
CREATE INDEX IF NOT EXISTS "TurizmRentTariff_branchId_seasonType_idx" ON "TurizmRentTariff"("branchId", "seasonType");

-- 6. Ek Hizmetler Tablosu
CREATE TABLE IF NOT EXISTS "TurizmRentExtraService" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'EQUIPMENT',
    "pricingType" TEXT NOT NULL DEFAULT 'DAILY',
    "unitPriceTry" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "isMandatory" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "ownerCompanyId" TEXT DEFAULT 'trzm-comp-main',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TurizmRentExtraService_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "TurizmRentExtraService_code_key" ON "TurizmRentExtraService"("code");
CREATE INDEX IF NOT EXISTS "TurizmRentExtraService_category_isActive_idx" ON "TurizmRentExtraService"("category", "isActive");
CREATE INDEX IF NOT EXISTS "TurizmRentExtraService_ownerCompanyId_idx" ON "TurizmRentExtraService"("ownerCompanyId");

-- 7. Kiralama Politika ve Şablon Ayarları Tablosu
CREATE TABLE IF NOT EXISTS "TurizmRentPolicyConfig" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL DEFAULT 'local-debug-branch',
    "ownerCompanyId" TEXT DEFAULT 'trzm-comp-main',
    "minDriverAgeDefault" INTEGER NOT NULL DEFAULT 21,
    "minLicenseYearsDefault" INTEGER NOT NULL DEFAULT 2,
    "gracePeriodMinutes" INTEGER NOT NULL DEFAULT 60,
    "lateHourToFullDayThreshold" INTEGER NOT NULL DEFAULT 4,
    "missingFuelRatePerPctTry" DOUBLE PRECISION NOT NULL DEFAULT 32,
    "cleaningFeeTry" DOUBLE PRECISION NOT NULL DEFAULT 750,
    "adminServiceFeeForPenaltyTry" DOUBLE PRECISION NOT NULL DEFAULT 250,
    "invoiceTimingMode" TEXT NOT NULL DEFAULT 'ON_RETURN_COMPLETION',
    "defaultVatRatePct" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "contractTemplateTitle" TEXT NOT NULL DEFAULT 'ARAÇ KİRALAMA SÖZLEŞMESİ (ÖRNEK ŞABLON)',
    "contractTemplateBodyText" TEXT NOT NULL,
    "legalReviewNoticeText" TEXT NOT NULL DEFAULT 'Bu metin yalnızca örnek/yer tutucu bir şablondur; canlı kullanımdan önce firmanızın hukuk müşaviri tarafından incelenmesi gerekir.',
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TurizmRentPolicyConfig_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "TurizmRentPolicyConfig_branchId_key" ON "TurizmRentPolicyConfig"("branchId");
CREATE INDEX IF NOT EXISTS "TurizmRentPolicyConfig_ownerCompanyId_idx" ON "TurizmRentPolicyConfig"("ownerCompanyId");

-- 8. Kiralama Rezervasyonları Tablosu
CREATE TABLE IF NOT EXISTS "TurizmRentReservation" (
    "id" TEXT NOT NULL,
    "reservationNo" TEXT NOT NULL,
    "branchId" TEXT NOT NULL DEFAULT 'local-debug-branch',
    "pickupBranchId" TEXT NOT NULL DEFAULT 'local-debug-branch',
    "returnBranchId" TEXT NOT NULL DEFAULT 'local-debug-branch',
    "pickupLocationLabel" TEXT NOT NULL DEFAULT 'Merkez Ofis',
    "returnLocationLabel" TEXT NOT NULL DEFAULT 'Merkez Ofis',
    "vehicleId" TEXT NOT NULL,
    "vehicleClassId" TEXT NOT NULL,
    "tariffId" TEXT,
    "customerId" TEXT NOT NULL,
    "additionalDriverName" TEXT,
    "additionalDriverTckn" TEXT,
    "additionalDriverLicenseNo" TEXT,
    "additionalDriverLicenseClass" TEXT,
    "additionalDriverLicenseExpiresAt" TIMESTAMP(3),
    "withChauffeur" BOOLEAN NOT NULL DEFAULT false,
    "chauffeurDriverId" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "originalEndAt" TIMESTAMP(3),
    "actualPickupAt" TIMESTAMP(3),
    "actualReturnAt" TIMESTAMP(3),
    "rentalDays" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "dailyRateTry" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "baseRentalAmountTry" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "extrasTotalTry" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountAmountTry" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalEstimatedTry" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "finalTotalTry" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "depositRequiredTry" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dailyKmLimit" INTEGER NOT NULL DEFAULT 250,
    "totalKmLimit" INTEGER NOT NULL DEFAULT 250,
    "extraKmRateTry" DOUBLE PRECISION NOT NULL DEFAULT 6.5,
    "extrasJson" TEXT,
    "extensionCount" INTEGER NOT NULL DEFAULT 0,
    "swappedFromVehicleId" TEXT,
    "swapReason" TEXT,
    "cancelReason" TEXT,
    "conflictLockKey" TEXT,
    "notes" TEXT,
    "ownerCompanyId" TEXT DEFAULT 'trzm-comp-main',
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TurizmRentReservation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TurizmRentReservation_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "LojistikVehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TurizmRentReservation_vehicleClassId_fkey" FOREIGN KEY ("vehicleClassId") REFERENCES "TurizmRentVehicleClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TurizmRentReservation_tariffId_fkey" FOREIGN KEY ("tariffId") REFERENCES "TurizmRentTariff"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TurizmRentReservation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "TurizmRentReservation_reservationNo_key" ON "TurizmRentReservation"("reservationNo");
CREATE INDEX IF NOT EXISTS "TurizmRentReservation_vehicleId_startAt_endAt_idx" ON "TurizmRentReservation"("vehicleId", "startAt", "endAt");
CREATE INDEX IF NOT EXISTS "TurizmRentReservation_branchId_status_idx" ON "TurizmRentReservation"("branchId", "status");
CREATE INDEX IF NOT EXISTS "TurizmRentReservation_customerId_idx" ON "TurizmRentReservation"("customerId");
CREATE INDEX IF NOT EXISTS "TurizmRentReservation_ownerCompanyId_idx" ON "TurizmRentReservation"("ownerCompanyId");

-- 9. Çift Rezervasyon ve Bakım Çakışma Girişimi Red Günlüğü Tablosu
CREATE TABLE IF NOT EXISTS "TurizmRentConflictAttemptLog" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "vehiclePlate" TEXT NOT NULL,
    "attemptedStartAt" TIMESTAMP(3) NOT NULL,
    "attemptedEndAt" TIMESTAMP(3) NOT NULL,
    "conflictingSourceType" TEXT NOT NULL DEFAULT 'RESERVATION',
    "conflictingSourceId" TEXT,
    "conflictingRefNo" TEXT,
    "customerId" TEXT,
    "rejectionCode" TEXT NOT NULL DEFAULT 'DOUBLE_BOOKING_LOCKED',
    "rejectionMessage" TEXT NOT NULL,
    "actorUserId" TEXT,
    "ownerCompanyId" TEXT DEFAULT 'trzm-comp-main',
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TurizmRentConflictAttemptLog_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TurizmRentConflictAttemptLog_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "LojistikVehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "TurizmRentConflictAttemptLog_vehicleId_attemptedAt_idx" ON "TurizmRentConflictAttemptLog"("vehicleId", "attemptedAt");
CREATE INDEX IF NOT EXISTS "TurizmRentConflictAttemptLog_rejectionCode_idx" ON "TurizmRentConflictAttemptLog"("rejectionCode");

-- 10. Kiralama Sözleşmeleri Tablosu
CREATE TABLE IF NOT EXISTS "TurizmRentContract" (
    "id" TEXT NOT NULL,
    "contractNo" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL DEFAULT 'local-debug-branch',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "templateVersionLabel" TEXT NOT NULL DEFAULT 'ÖRNEK ŞABLON v1.0 (Hukuki İnceleme Gerektirir)',
    "renderedTermsText" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "agreedDailyRateTry" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "agreedTotalTry" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "depositAmountTry" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dailyKmLimit" INTEGER NOT NULL DEFAULT 250,
    "totalKmLimit" INTEGER NOT NULL DEFAULT 250,
    "extraKmRateTry" DOUBLE PRECISION NOT NULL DEFAULT 6.5,
    "customerSignatureDataUrl" TEXT,
    "customerSignedByName" TEXT,
    "customerSignedAt" TIMESTAMP(3),
    "staffSignedByUserId" TEXT,
    "staffSignedByName" TEXT,
    "staffSignedAt" TIMESTAMP(3),
    "eDocumentId" TEXT,
    "eDocumentNo" TEXT,
    "financeId" TEXT,
    "ownerCompanyId" TEXT DEFAULT 'trzm-comp-main',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TurizmRentContract_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TurizmRentContract_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "TurizmRentReservation"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TurizmRentContract_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "LojistikVehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TurizmRentContract_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "TurizmRentContract_contractNo_key" ON "TurizmRentContract"("contractNo");
CREATE UNIQUE INDEX IF NOT EXISTS "TurizmRentContract_reservationId_key" ON "TurizmRentContract"("reservationId");
CREATE INDEX IF NOT EXISTS "TurizmRentContract_branchId_status_idx" ON "TurizmRentContract"("branchId", "status");
CREATE INDEX IF NOT EXISTS "TurizmRentContract_vehicleId_idx" ON "TurizmRentContract"("vehicleId");
CREATE INDEX IF NOT EXISTS "TurizmRentContract_customerId_idx" ON "TurizmRentContract"("customerId");

-- 11. Teslim ve İade Ekspertiz Formları Tablosu
CREATE TABLE IF NOT EXISTS "TurizmRentInspectionForm" (
    "id" TEXT NOT NULL,
    "formNo" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "contractId" TEXT,
    "vehicleId" TEXT NOT NULL,
    "formType" TEXT NOT NULL DEFAULT 'DELIVERY',
    "odometerKm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fuelLevelPct" INTEGER NOT NULL DEFAULT 100,
    "fuelEighths" INTEGER NOT NULL DEFAULT 8,
    "exteriorConditionNote" TEXT,
    "interiorConditionNote" TEXT,
    "damageMarkersJson" TEXT,
    "damagePhotoUrlsJson" TEXT,
    "hasNewDamage" BOOLEAN NOT NULL DEFAULT false,
    "estimatedDamageCostTry" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "comparisonSummaryJson" TEXT,
    "customerSignatureUrl" TEXT,
    "staffSignatureUrl" TEXT,
    "signedByCustomerName" TEXT,
    "inspectedByUserId" TEXT,
    "inspectedByName" TEXT,
    "capturedLat" DOUBLE PRECISION,
    "capturedLng" DOUBLE PRECISION,
    "inspectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ownerCompanyId" TEXT DEFAULT 'trzm-comp-main',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TurizmRentInspectionForm_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TurizmRentInspectionForm_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "TurizmRentReservation"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TurizmRentInspectionForm_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "TurizmRentContract"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TurizmRentInspectionForm_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "LojistikVehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "TurizmRentInspectionForm_formNo_key" ON "TurizmRentInspectionForm"("formNo");
CREATE INDEX IF NOT EXISTS "TurizmRentInspectionForm_reservationId_formType_idx" ON "TurizmRentInspectionForm"("reservationId", "formType");
CREATE INDEX IF NOT EXISTS "TurizmRentInspectionForm_vehicleId_idx" ON "TurizmRentInspectionForm"("vehicleId");

-- 12. Depozito ve Ek Ücretler Defteri Tablosu
CREATE TABLE IF NOT EXISTS "TurizmRentDepositAndCharge" (
    "id" TEXT NOT NULL,
    "entryNo" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "contractId" TEXT,
    "vehicleId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "entryType" TEXT NOT NULL DEFAULT 'DEPOSIT_COLLECT',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unitPriceTry" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amountTry" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vatRatePct" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "totalWithVatTry" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "calculationRuleNote" TEXT,
    "financeId" TEXT,
    "eDocumentId" TEXT,
    "eDocumentNo" TEXT,
    "settledAt" TIMESTAMP(3),
    "notes" TEXT,
    "ownerCompanyId" TEXT DEFAULT 'trzm-comp-main',
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TurizmRentDepositAndCharge_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TurizmRentDepositAndCharge_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "TurizmRentReservation"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TurizmRentDepositAndCharge_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "TurizmRentContract"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TurizmRentDepositAndCharge_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "LojistikVehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TurizmRentDepositAndCharge_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "TurizmRentDepositAndCharge_entryNo_key" ON "TurizmRentDepositAndCharge"("entryNo");
CREATE INDEX IF NOT EXISTS "TurizmRentDepositAndCharge_reservationId_entryType_idx" ON "TurizmRentDepositAndCharge"("reservationId", "entryType");
CREATE INDEX IF NOT EXISTS "TurizmRentDepositAndCharge_status_idx" ON "TurizmRentDepositAndCharge"("status");
CREATE INDEX IF NOT EXISTS "TurizmRentDepositAndCharge_customerId_idx" ON "TurizmRentDepositAndCharge"("customerId");

-- 13. HGS/OGS Geçiş ve Eşleştirme Tablosu
CREATE TABLE IF NOT EXISTS "TurizmRentTollPassLog" (
    "id" TEXT NOT NULL,
    "passNo" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "plate" TEXT NOT NULL,
    "passDateTime" TIMESTAMP(3) NOT NULL,
    "highwayOrBridgeName" TEXT NOT NULL,
    "entryPoint" TEXT,
    "exitPoint" TEXT,
    "amountTry" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sourceMode" TEXT NOT NULL DEFAULT 'DEMO_ADAPTER',
    "matchedReservationId" TEXT,
    "matchedContractId" TEXT,
    "matchedCustomerId" TEXT,
    "reflectionStatus" TEXT NOT NULL DEFAULT 'UNMATCHED',
    "serviceFeeTry" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reflectedChargeId" TEXT,
    "notes" TEXT,
    "ownerCompanyId" TEXT DEFAULT 'trzm-comp-main',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TurizmRentTollPassLog_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TurizmRentTollPassLog_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "LojistikVehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "TurizmRentTollPassLog_passNo_key" ON "TurizmRentTollPassLog"("passNo");
CREATE INDEX IF NOT EXISTS "TurizmRentTollPassLog_vehicleId_passDateTime_idx" ON "TurizmRentTollPassLog"("vehicleId", "passDateTime");
CREATE INDEX IF NOT EXISTS "TurizmRentTollPassLog_plate_passDateTime_idx" ON "TurizmRentTollPassLog"("plate", "passDateTime");
CREATE INDEX IF NOT EXISTS "TurizmRentTollPassLog_matchedReservationId_idx" ON "TurizmRentTollPassLog"("matchedReservationId");
CREATE INDEX IF NOT EXISTS "TurizmRentTollPassLog_reflectionStatus_idx" ON "TurizmRentTollPassLog"("reflectionStatus");

-- 14. KABİS Bildirim Hazırlık ve Dışa Aktarma Tablosu
CREATE TABLE IF NOT EXISTS "TurizmRentKabisRecord" (
    "id" TEXT NOT NULL,
    "kabisRefNo" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "contractId" TEXT,
    "vehicleId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "notificationType" TEXT NOT NULL DEFAULT 'KIRALAMA_ACILIS',
    "plate" TEXT NOT NULL,
    "vehicleVin" TEXT,
    "renterFullName" TEXT NOT NULL,
    "renterTcknMasked" TEXT,
    "renterPassportMasked" TEXT,
    "renterNationality" TEXT NOT NULL DEFAULT 'TR',
    "renterLicenseNoMasked" TEXT,
    "additionalDriverFullName" TEXT,
    "pickupAt" TIMESTAMP(3) NOT NULL,
    "expectedReturnAt" TIMESTAMP(3) NOT NULL,
    "actualReturnAt" TIMESTAMP(3),
    "missingFieldsJson" TEXT,
    "isPayloadComplete" BOOLEAN NOT NULL DEFAULT true,
    "preparationStatus" TEXT NOT NULL DEFAULT 'HAZIRLANDI',
    "exportedFormat" TEXT,
    "lastExportedAt" TIMESTAMP(3),
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "lastErrorNote" TEXT,
    "preparedPayloadJson" TEXT,
    "notes" TEXT,
    "ownerCompanyId" TEXT DEFAULT 'trzm-comp-main',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TurizmRentKabisRecord_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TurizmRentKabisRecord_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "TurizmRentReservation"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TurizmRentKabisRecord_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "TurizmRentContract"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TurizmRentKabisRecord_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "LojistikVehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TurizmRentKabisRecord_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "TurizmRentKabisRecord_kabisRefNo_key" ON "TurizmRentKabisRecord"("kabisRefNo");
CREATE INDEX IF NOT EXISTS "TurizmRentKabisRecord_reservationId_notificationType_idx" ON "TurizmRentKabisRecord"("reservationId", "notificationType");
CREATE INDEX IF NOT EXISTS "TurizmRentKabisRecord_preparationStatus_idx" ON "TurizmRentKabisRecord"("preparationStatus");
CREATE INDEX IF NOT EXISTS "TurizmRentKabisRecord_vehicleId_idx" ON "TurizmRentKabisRecord"("vehicleId");
