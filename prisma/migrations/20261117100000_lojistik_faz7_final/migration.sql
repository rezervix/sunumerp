-- Lojistik Faz 7 (Final Entegrasyon, E-Fatura Taslak/Onay & Kullanici Bildirim Tercihleri)
-- Additive-Only Migration (Kolon silme / tip degistirme / yeniden adlandirma YOK)

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "logisticsNotificationPrefsJson" TEXT;

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "eInvoiceNo" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "eInvoiceStatus" TEXT;

ALTER TABLE "OmnichannelOrder" ADD COLUMN IF NOT EXISTS "eInvoiceStatus" TEXT;

ALTER TABLE "EDocumentRecord" ADD COLUMN IF NOT EXISTS "documentStatus" TEXT NOT NULL DEFAULT 'KESILDI';
ALTER TABLE "EDocumentRecord" ADD COLUMN IF NOT EXISTS "eInvoiceTimingMode" TEXT;

ALTER TABLE "LojistikShipmentTrip" ADD COLUMN IF NOT EXISTS "maintenanceImpactWarning" TEXT;

ALTER TABLE "LojistikShipmentStop" ADD COLUMN IF NOT EXISTS "eInvoiceId" TEXT;
ALTER TABLE "LojistikShipmentStop" ADD COLUMN IF NOT EXISTS "eInvoiceNo" TEXT;
ALTER TABLE "LojistikShipmentStop" ADD COLUMN IF NOT EXISTS "eInvoiceStatus" TEXT;
