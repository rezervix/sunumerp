-- Sunum ERP — Turizm Faz 1: Altyapı, Çok Firmalı (Partner) Kiracı Zemini ve Ortak Havuz İskeleti (Additive Migration)
-- ÖNEMLİ: Mevcut tablolarda kolon silme/yeniden adlandırma/tip değiştirme YOKTUR.
-- Yalnızca User tablosuna nullable partnerCompanyId kolonu ve 4 adet Turizm* tablosu eklenir.

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "partnerCompanyId" TEXT;

CREATE INDEX IF NOT EXISTS "User_partnerCompanyId_idx" ON "User"("partnerCompanyId");

CREATE TABLE IF NOT EXISTS "TurizmPartnerCompany" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "code" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "companyType" TEXT NOT NULL DEFAULT 'RENTACAR',
  "taxNumber" TEXT,
  "taxOffice" TEXT,
  "city" TEXT,
  "district" TEXT,
  "address" TEXT,
  "contactPerson" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "isMainCompany" BOOLEAN NOT NULL DEFAULT false,
  "defaultCommissionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "TurizmPartnerCompany_companyType_status_idx" ON "TurizmPartnerCompany"("companyType", "status");
CREATE INDEX IF NOT EXISTS "TurizmPartnerCompany_isMainCompany_idx" ON "TurizmPartnerCompany"("isMainCompany");

CREATE TABLE IF NOT EXISTS "TurizmPartnership" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "code" TEXT NOT NULL UNIQUE,
  "requesterCompanyId" TEXT NOT NULL REFERENCES "TurizmPartnerCompany"("id") ON DELETE CASCADE,
  "targetCompanyId" TEXT NOT NULL REFERENCES "TurizmPartnerCompany"("id") ON DELETE CASCADE,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "commissionRatePct" DOUBLE PRECISION NOT NULL DEFAULT 10,
  "settlementTermDays" INTEGER NOT NULL DEFAULT 15,
  "allowWhiteLabel" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "respondedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "TurizmPartnership_requesterCompanyId_status_idx" ON "TurizmPartnership"("requesterCompanyId", "status");
CREATE INDEX IF NOT EXISTS "TurizmPartnership_targetCompanyId_status_idx" ON "TurizmPartnership"("targetCompanyId", "status");

CREATE TABLE IF NOT EXISTS "TurizmSharedResource" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "ownerCompanyId" TEXT NOT NULL REFERENCES "TurizmPartnerCompany"("id") ON DELETE CASCADE,
  "resourceType" TEXT NOT NULL DEFAULT 'VEHICLE',
  "externalRefId" TEXT,
  "title" TEXT NOT NULL,
  "category" TEXT,
  "city" TEXT,
  "capacity" INTEGER NOT NULL DEFAULT 1,
  "netPartnerRateTry" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'TRY',
  "visibilityScope" TEXT NOT NULL DEFAULT 'ALL_APPROVED_PARTNERS',
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "TurizmSharedResource_ownerCompanyId_status_idx" ON "TurizmSharedResource"("ownerCompanyId", "status");
CREATE INDEX IF NOT EXISTS "TurizmSharedResource_resourceType_city_idx" ON "TurizmSharedResource"("resourceType", "city");

CREATE TABLE IF NOT EXISTS "TurizmCrossReservation" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "reservationNo" TEXT NOT NULL UNIQUE,
  "ownerCompanyId" TEXT NOT NULL REFERENCES "TurizmPartnerCompany"("id") ON DELETE CASCADE,
  "bookingCompanyId" TEXT NOT NULL REFERENCES "TurizmPartnerCompany"("id") ON DELETE CASCADE,
  "partnershipId" TEXT REFERENCES "TurizmPartnership"("id") ON DELETE SET NULL,
  "sharedResourceId" TEXT REFERENCES "TurizmSharedResource"("id") ON DELETE SET NULL,
  "resourceType" TEXT NOT NULL DEFAULT 'VEHICLE',
  "startAt" TIMESTAMP(3) NOT NULL,
  "endAt" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'HOLD',
  "isWhiteLabel" BOOLEAN NOT NULL DEFAULT true,
  "netAmountTry" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "commissionAmountTry" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'TRY',
  "lockExpiresAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "TurizmCrossReservation_ownerCompanyId_status_idx" ON "TurizmCrossReservation"("ownerCompanyId", "status");
CREATE INDEX IF NOT EXISTS "TurizmCrossReservation_bookingCompanyId_status_idx" ON "TurizmCrossReservation"("bookingCompanyId", "status");
CREATE INDEX IF NOT EXISTS "TurizmCrossReservation_sharedResourceId_startAt_endAt_idx" ON "TurizmCrossReservation"("sharedResourceId", "startAt", "endAt");
