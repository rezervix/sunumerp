-- ============================================================================
-- SUNUM ERP — FAZ 9: ÜRETİM ENTEGRASYON, BİLDİRİM MERKEZİ & KONSOLİDE DASHBOARD
-- ADDITIVE MIGRATION (Geriye Dönük Uyumluluk Tam Olarak Korunmuştur)
-- ============================================================================

-- 1. Bildirim Kuralları Tablosu
CREATE TABLE IF NOT EXISTS "UretimNotificationRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'WARNING',
    "channel" TEXT NOT NULL DEFAULT 'IN_APP',
    "targetRoles" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "UretimNotificationRule_eventType_idx" ON "UretimNotificationRule"("eventType");
CREATE INDEX IF NOT EXISTS "UretimNotificationRule_isActive_idx" ON "UretimNotificationRule"("isActive");

-- 2. Kullanıcı Bildirim Tercihleri / Abonelik Tablosu
CREATE TABLE IF NOT EXISTS "UretimNotificationPreference" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT false,
    "smsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UretimNotificationPreference_userId_eventType_key" UNIQUE ("userId", "eventType")
);

CREATE INDEX IF NOT EXISTS "UretimNotificationPreference_userId_idx" ON "UretimNotificationPreference"("userId");

