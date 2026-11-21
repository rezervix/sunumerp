-- Sunum ERP — Turizm Faz 3: Otel Yönetimi (Mini PMS) — turizm_otel
-- Kural: Mevcut tablolarda kolon silme, yeniden adlandırma veya tip değiştirme YOKTUR.
-- Yalnızca geri alınabilir (additive) tablo ve indeks eklemeleri yapılır.

-- 1. Oda Tipleri
CREATE TABLE IF NOT EXISTS "TurizmHotelRoomType" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "baseCapacity" INTEGER NOT NULL DEFAULT 2,
    "maxAdults" INTEGER NOT NULL DEFAULT 2,
    "maxChildren" INTEGER NOT NULL DEFAULT 1,
    "bedConfiguration" TEXT NOT NULL DEFAULT '1 Çift Kişilik Yatak',
    "areaSqm" INTEGER NOT NULL DEFAULT 26,
    "amenitiesJson" TEXT,
    "baseRateTry" DOUBLE PRECISION NOT NULL DEFAULT 3500,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 10,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "ownerCompanyId" TEXT DEFAULT 'trzm-comp-main',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TurizmHotelRoomType_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "TurizmHotelRoomType_code_key" ON "TurizmHotelRoomType"("code");
CREATE INDEX IF NOT EXISTS "TurizmHotelRoomType_isActive_sortOrder_idx" ON "TurizmHotelRoomType"("isActive", "sortOrder");
CREATE INDEX IF NOT EXISTS "TurizmHotelRoomType_ownerCompanyId_idx" ON "TurizmHotelRoomType"("ownerCompanyId");

-- 2. Fiziksel Oda Envanteri ve Kat Planı
CREATE TABLE IF NOT EXISTS "TurizmHotelRoom" (
    "id" TEXT NOT NULL,
    "roomNumber" TEXT NOT NULL,
    "floorNumber" INTEGER NOT NULL DEFAULT 1,
    "wingOrSection" TEXT NOT NULL DEFAULT 'Ana Bina',
    "roomTypeId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL DEFAULT 'local-debug-branch',
    "status" TEXT NOT NULL DEFAULT 'CLEAN_VACANT',
    "keyCardCode" TEXT,
    "isSmokingAllowed" BOOLEAN NOT NULL DEFAULT false,
    "hasBalcony" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "ownerCompanyId" TEXT DEFAULT 'trzm-comp-main',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TurizmHotelRoom_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TurizmHotelRoom_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "TurizmHotelRoomType"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "TurizmHotelRoom_roomNumber_key" ON "TurizmHotelRoom"("roomNumber");
CREATE INDEX IF NOT EXISTS "TurizmHotelRoom_floorNumber_status_idx" ON "TurizmHotelRoom"("floorNumber", "status");
CREATE INDEX IF NOT EXISTS "TurizmHotelRoom_roomTypeId_status_idx" ON "TurizmHotelRoom"("roomTypeId", "status");
CREATE INDEX IF NOT EXISTS "TurizmHotelRoom_branchId_status_idx" ON "TurizmHotelRoom"("branchId", "status");
CREATE INDEX IF NOT EXISTS "TurizmHotelRoom_ownerCompanyId_idx" ON "TurizmHotelRoom"("ownerCompanyId");

-- 3. Oda & Pansiyon Fiyat Tarifeleri
CREATE TABLE IF NOT EXISTS "TurizmHotelTariff" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "roomTypeId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL DEFAULT 'local-debug-branch',
    "seasonType" TEXT NOT NULL DEFAULT 'STANDARD',
    "boardType" TEXT NOT NULL DEFAULT 'BB',
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3) NOT NULL,
    "nightlyRateTry" DOUBLE PRECISION NOT NULL DEFAULT 3500,
    "extraAdultRateTry" DOUBLE PRECISION NOT NULL DEFAULT 1000,
    "childRateTry" DOUBLE PRECISION NOT NULL DEFAULT 500,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "ownerCompanyId" TEXT DEFAULT 'trzm-comp-main',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TurizmHotelTariff_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TurizmHotelTariff_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "TurizmHotelRoomType"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "TurizmHotelTariff_code_key" ON "TurizmHotelTariff"("code");
CREATE INDEX IF NOT EXISTS "TurizmHotelTariff_roomTypeId_boardType_isActive_idx" ON "TurizmHotelTariff"("roomTypeId", "boardType", "isActive");
CREATE INDEX IF NOT EXISTS "TurizmHotelTariff_branchId_seasonType_idx" ON "TurizmHotelTariff"("branchId", "seasonType");

-- 4. Otel Politikaları ve Faturalama Zamanlaması
CREATE TABLE IF NOT EXISTS "TurizmHotelPolicyConfig" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL DEFAULT 'local-debug-branch',
    "hotelDisplayName" TEXT NOT NULL DEFAULT 'Örnek Kıyı Konaklama & Butik Otel',
    "defaultCheckInTime" TEXT NOT NULL DEFAULT '14:00',
    "defaultCheckOutTime" TEXT NOT NULL DEFAULT '12:00',
    "lateCheckOutGraceMinutes" INTEGER NOT NULL DEFAULT 60,
    "lateCheckOutFeePct" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "invoiceTimingMode" TEXT NOT NULL DEFAULT 'ON_CHECKOUT',
    "defaultVatRatePct" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "accommodationExtraRatePct" DOUBLE PRECISION NOT NULL DEFAULT 2,
    "autoCreateHousekeepingOnCheckOut" BOOLEAN NOT NULL DEFAULT true,
    "requireZeroBalanceOnCheckOut" BOOLEAN NOT NULL DEFAULT true,
    "updatedBy" TEXT,
    "ownerCompanyId" TEXT DEFAULT 'trzm-comp-main',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TurizmHotelPolicyConfig_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "TurizmHotelPolicyConfig_branchId_key" ON "TurizmHotelPolicyConfig"("branchId");
CREATE INDEX IF NOT EXISTS "TurizmHotelPolicyConfig_ownerCompanyId_idx" ON "TurizmHotelPolicyConfig"("ownerCompanyId");

-- 5. Acenta Kontenjanı (Allotment)
CREATE TABLE IF NOT EXISTS "TurizmHotelAllotment" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "agencyName" TEXT NOT NULL,
    "agencyCompanyId" TEXT,
    "roomTypeId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL DEFAULT 'local-debug-branch',
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3) NOT NULL,
    "allocatedRoomsPerNight" INTEGER NOT NULL DEFAULT 5,
    "usedRoomNights" INTEGER NOT NULL DEFAULT 0,
    "releaseDaysBefore" INTEGER NOT NULL DEFAULT 7,
    "releaseDeadlineAt" TIMESTAMP(3) NOT NULL,
    "netRatePerNightTry" DOUBLE PRECISION NOT NULL DEFAULT 3000,
    "warningThresholdPct" INTEGER NOT NULL DEFAULT 80,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "ownerCompanyId" TEXT DEFAULT 'trzm-comp-main',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TurizmHotelAllotment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TurizmHotelAllotment_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "TurizmHotelRoomType"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "TurizmHotelAllotment_code_key" ON "TurizmHotelAllotment"("code");
CREATE INDEX IF NOT EXISTS "TurizmHotelAllotment_roomTypeId_status_idx" ON "TurizmHotelAllotment"("roomTypeId", "status");
CREATE INDEX IF NOT EXISTS "TurizmHotelAllotment_agencyCompanyId_idx" ON "TurizmHotelAllotment"("agencyCompanyId");

-- 6. Otel Rezervasyonları
CREATE TABLE IF NOT EXISTS "TurizmHotelReservation" (
    "id" TEXT NOT NULL,
    "reservationNo" TEXT NOT NULL,
    "branchId" TEXT NOT NULL DEFAULT 'local-debug-branch',
    "roomId" TEXT NOT NULL,
    "roomTypeId" TEXT NOT NULL,
    "tariffId" TEXT,
    "allotmentId" TEXT,
    "customerId" TEXT NOT NULL,
    "channelSource" TEXT NOT NULL DEFAULT 'DIRECT_WEB',
    "agencyName" TEXT,
    "boardType" TEXT NOT NULL DEFAULT 'BB',
    "checkInDate" TIMESTAMP(3) NOT NULL,
    "checkOutDate" TIMESTAMP(3) NOT NULL,
    "nightsCount" INTEGER NOT NULL DEFAULT 1,
    "adultsCount" INTEGER NOT NULL DEFAULT 2,
    "childrenCount" INTEGER NOT NULL DEFAULT 0,
    "actualCheckInAt" TIMESTAMP(3),
    "actualCheckOutAt" TIMESTAMP(3),
    "keyCardIssuedCode" TEXT,
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "nightlyRateTry" DOUBLE PRECISION NOT NULL DEFAULT 3500,
    "roomTotalTry" DOUBLE PRECISION NOT NULL DEFAULT 3500,
    "extrasTotalTry" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paidTotalTry" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balanceDueTry" DOUBLE PRECISION NOT NULL DEFAULT 3500,
    "additionalGuestsJson" TEXT,
    "cancelReason" TEXT,
    "conflictLockKey" TEXT,
    "notes" TEXT,
    "ownerCompanyId" TEXT DEFAULT 'trzm-comp-main',
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TurizmHotelReservation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TurizmHotelReservation_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "TurizmHotelRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TurizmHotelReservation_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "TurizmHotelRoomType"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TurizmHotelReservation_tariffId_fkey" FOREIGN KEY ("tariffId") REFERENCES "TurizmHotelTariff"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TurizmHotelReservation_allotmentId_fkey" FOREIGN KEY ("allotmentId") REFERENCES "TurizmHotelAllotment"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TurizmHotelReservation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "TurizmHotelReservation_reservationNo_key" ON "TurizmHotelReservation"("reservationNo");
CREATE INDEX IF NOT EXISTS "TurizmHotelReservation_roomId_checkInDate_checkOutDate_idx" ON "TurizmHotelReservation"("roomId", "checkInDate", "checkOutDate");
CREATE INDEX IF NOT EXISTS "TurizmHotelReservation_branchId_status_idx" ON "TurizmHotelReservation"("branchId", "status");
CREATE INDEX IF NOT EXISTS "TurizmHotelReservation_customerId_idx" ON "TurizmHotelReservation"("customerId");
CREATE INDEX IF NOT EXISTS "TurizmHotelReservation_allotmentId_idx" ON "TurizmHotelReservation"("allotmentId");
CREATE INDEX IF NOT EXISTS "TurizmHotelReservation_ownerCompanyId_idx" ON "TurizmHotelReservation"("ownerCompanyId");

-- 7. Çakışma & Kontenjan Aşımı Red Günlüğü
CREATE TABLE IF NOT EXISTS "TurizmHotelConflictAttemptLog" (
    "id" TEXT NOT NULL,
    "roomId" TEXT,
    "roomNumber" TEXT NOT NULL,
    "attemptedCheckIn" TIMESTAMP(3) NOT NULL,
    "attemptedCheckOut" TIMESTAMP(3) NOT NULL,
    "conflictingSourceType" TEXT NOT NULL DEFAULT 'RESERVATION',
    "conflictingSourceId" TEXT,
    "conflictingRefNo" TEXT,
    "customerId" TEXT,
    "rejectionCode" TEXT NOT NULL DEFAULT 'ROOM_DOUBLE_BOOKING_LOCKED',
    "rejectionMessage" TEXT NOT NULL,
    "actorUserId" TEXT,
    "ownerCompanyId" TEXT DEFAULT 'trzm-comp-main',
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TurizmHotelConflictAttemptLog_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TurizmHotelConflictAttemptLog_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "TurizmHotelRoom"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "TurizmHotelConflictAttemptLog_roomId_attemptedAt_idx" ON "TurizmHotelConflictAttemptLog"("roomId", "attemptedAt");
CREATE INDEX IF NOT EXISTS "TurizmHotelConflictAttemptLog_rejectionCode_idx" ON "TurizmHotelConflictAttemptLog"("rejectionCode");

-- 8. Oda Hesabı (Folio) & Minibar / Ekstra / Ödeme / Hesap Bölme
CREATE TABLE IF NOT EXISTS "TurizmHotelFolioItem" (
    "id" TEXT NOT NULL,
    "entryNo" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "folioGroup" TEXT NOT NULL DEFAULT 'A_ANA_HESAP',
    "entryCategory" TEXT NOT NULL DEFAULT 'ROOM_NIGHT',
    "isPayment" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT NOT NULL,
    "inventoryItemId" TEXT,
    "stockMovementId" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unitPriceTry" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amountTry" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vatRatePct" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "totalWithVatTry" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentMethod" TEXT,
    "financeId" TEXT,
    "eDocumentId" TEXT,
    "eDocumentNo" TEXT,
    "postedByUserId" TEXT,
    "postedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ownerCompanyId" TEXT DEFAULT 'trzm-comp-main',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TurizmHotelFolioItem_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TurizmHotelFolioItem_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "TurizmHotelReservation"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TurizmHotelFolioItem_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "TurizmHotelRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TurizmHotelFolioItem_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "TurizmHotelFolioItem_entryNo_key" ON "TurizmHotelFolioItem"("entryNo");
CREATE INDEX IF NOT EXISTS "TurizmHotelFolioItem_reservationId_folioGroup_idx" ON "TurizmHotelFolioItem"("reservationId", "folioGroup");
CREATE INDEX IF NOT EXISTS "TurizmHotelFolioItem_roomId_idx" ON "TurizmHotelFolioItem"("roomId");
CREATE INDEX IF NOT EXISTS "TurizmHotelFolioItem_entryCategory_idx" ON "TurizmHotelFolioItem"("entryCategory");

-- 9. Housekeeping & Teknik Hizmet Görevleri (Çevrimdışı Senkron Destekli)
CREATE TABLE IF NOT EXISTS "TurizmHotelHousekeepingTask" (
    "id" TEXT NOT NULL,
    "taskNo" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "roomNumber" TEXT NOT NULL,
    "floorNumber" INTEGER NOT NULL DEFAULT 1,
    "reservationId" TEXT,
    "taskType" TEXT NOT NULL DEFAULT 'CHECKOUT_CLEANING',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "assignedToUserId" TEXT,
    "assignedToName" TEXT,
    "inspectedByUserId" TEXT,
    "inspectedByName" TEXT,
    "checklistJson" TEXT,
    "minibarCountJson" TEXT,
    "faultCategory" TEXT,
    "faultDescription" TEXT,
    "offlineIdempotencyKey" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "inspectedAt" TIMESTAMP(3),
    "notes" TEXT,
    "ownerCompanyId" TEXT DEFAULT 'trzm-comp-main',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TurizmHotelHousekeepingTask_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TurizmHotelHousekeepingTask_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "TurizmHotelRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TurizmHotelHousekeepingTask_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "TurizmHotelReservation"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "TurizmHotelHousekeepingTask_taskNo_key" ON "TurizmHotelHousekeepingTask"("taskNo");
CREATE UNIQUE INDEX IF NOT EXISTS "TurizmHotelHousekeepingTask_offlineIdempotencyKey_key" ON "TurizmHotelHousekeepingTask"("offlineIdempotencyKey");
CREATE INDEX IF NOT EXISTS "TurizmHotelHousekeepingTask_assignedToUserId_status_idx" ON "TurizmHotelHousekeepingTask"("assignedToUserId", "status");
CREATE INDEX IF NOT EXISTS "TurizmHotelHousekeepingTask_roomId_status_idx" ON "TurizmHotelHousekeepingTask"("roomId", "status");
CREATE INDEX IF NOT EXISTS "TurizmHotelHousekeepingTask_floorNumber_status_idx" ON "TurizmHotelHousekeepingTask"("floorNumber", "status");

-- 10. KBS Kimlik Bildirimi Hazırlık ve Dışa Aktarma Kayıtları
CREATE TABLE IF NOT EXISTS "TurizmHotelKbsRecord" (
    "id" TEXT NOT NULL,
    "kbsRefNo" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "roomNumber" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "notificationType" TEXT NOT NULL DEFAULT 'MISAFIR_GIRIS',
    "guestFullName" TEXT NOT NULL,
    "guestTcknMasked" TEXT,
    "guestPassportMasked" TEXT,
    "guestNationality" TEXT NOT NULL DEFAULT 'TR',
    "guestBirthYear" INTEGER,
    "checkInAt" TIMESTAMP(3) NOT NULL,
    "expectedCheckOutAt" TIMESTAMP(3) NOT NULL,
    "actualCheckOutAt" TIMESTAMP(3),
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
    CONSTRAINT "TurizmHotelKbsRecord_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TurizmHotelKbsRecord_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "TurizmHotelReservation"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TurizmHotelKbsRecord_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "TurizmHotelRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TurizmHotelKbsRecord_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "TurizmHotelKbsRecord_kbsRefNo_key" ON "TurizmHotelKbsRecord"("kbsRefNo");
CREATE INDEX IF NOT EXISTS "TurizmHotelKbsRecord_reservationId_notificationType_idx" ON "TurizmHotelKbsRecord"("reservationId", "notificationType");
CREATE INDEX IF NOT EXISTS "TurizmHotelKbsRecord_preparationStatus_idx" ON "TurizmHotelKbsRecord"("preparationStatus");
CREATE INDEX IF NOT EXISTS "TurizmHotelKbsRecord_roomId_idx" ON "TurizmHotelKbsRecord"("roomId");
