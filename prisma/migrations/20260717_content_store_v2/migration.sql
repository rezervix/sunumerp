-- Migration: Content Store V2 (Phase 2, 4, 5)
-- Bu migration oncesinde calis: onceki veriler approved yapilmali!

-- 1. ContentStore tablosuna yeni kolonlar
ALTER TABLE "ContentStore"
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'pending_approval',
  ADD COLUMN IF NOT EXISTS "approvedById" TEXT,
  ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT,
  ADD COLUMN IF NOT EXISTS "fileHash" TEXT,
  ADD COLUMN IF NOT EXISTS "currentVersionNumber" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "duplicateOfContentId" TEXT,
  ADD COLUMN IF NOT EXISTS "viewCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "downloadCount" INTEGER NOT NULL DEFAULT 0;

-- KRITiK: Mevcut tum icerikler 'approved' olarak isaretleniyor
-- Aksi halde hepsi 'pending_approval' kalir ve listeden kaybolur!
UPDATE "ContentStore" SET "status" = 'approved' WHERE "status" = 'pending_approval';

-- 2. ContentStore Foreign Keys
ALTER TABLE "ContentStore"
  ADD CONSTRAINT IF NOT EXISTS "ContentStore_approvedById_fkey"
    FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL,
  ADD CONSTRAINT IF NOT EXISTS "ContentStore_duplicateOfContentId_fkey"
    FOREIGN KEY ("duplicateOfContentId") REFERENCES "ContentStore"("id") ON DELETE SET NULL;

-- 3. ContentStore indexleri
CREATE INDEX IF NOT EXISTS "ContentStore_status_idx" ON "ContentStore"("status");
CREATE INDEX IF NOT EXISTS "ContentStore_uploadedById_status_idx" ON "ContentStore"("uploadedById", "status");
CREATE INDEX IF NOT EXISTS "ContentStore_fileHash_idx" ON "ContentStore"("fileHash");

-- 4. ContentVersion tablosu (yeni)
CREATE TABLE IF NOT EXISTS "ContentVersion" (
  "id" TEXT NOT NULL,
  "contentId" TEXT NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "fileHash" TEXT,
  "fileSizeBytes" BIGINT NOT NULL,
  "uploadedById" TEXT NOT NULL,
  "changeNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContentVersion_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "ContentVersion"
  ADD CONSTRAINT IF NOT EXISTS "ContentVersion_contentId_fkey"
    FOREIGN KEY ("contentId") REFERENCES "ContentStore"("id") ON DELETE CASCADE,
  ADD CONSTRAINT IF NOT EXISTS "ContentVersion_uploadedById_fkey"
    FOREIGN KEY ("uploadedById") REFERENCES "User"("id");
CREATE INDEX IF NOT EXISTS "ContentVersion_contentId_idx" ON "ContentVersion"("contentId");
CREATE INDEX IF NOT EXISTS "ContentVersion_contentId_versionNumber_idx" ON "ContentVersion"("contentId", "versionNumber");

-- 5. ContentAnalyticsEvent tablosu (yeni)
CREATE TABLE IF NOT EXISTS "ContentAnalyticsEvent" (
  "id" TEXT NOT NULL,
  "contentId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContentAnalyticsEvent_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "ContentAnalyticsEvent"
  ADD CONSTRAINT IF NOT EXISTS "ContentAnalyticsEvent_contentId_fkey"
    FOREIGN KEY ("contentId") REFERENCES "ContentStore"("id") ON DELETE CASCADE,
  ADD CONSTRAINT IF NOT EXISTS "ContentAnalyticsEvent_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id");
CREATE INDEX IF NOT EXISTS "ContentAnalyticsEvent_contentId_createdAt_idx" ON "ContentAnalyticsEvent"("contentId", "createdAt");
CREATE INDEX IF NOT EXISTS "ContentAnalyticsEvent_userId_idx" ON "ContentAnalyticsEvent"("userId");
CREATE INDEX IF NOT EXISTS "ContentAnalyticsEvent_eventType_idx" ON "ContentAnalyticsEvent"("eventType");
