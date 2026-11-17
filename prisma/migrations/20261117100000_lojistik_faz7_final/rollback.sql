-- Lojistik Faz 7 Rollback SQL

ALTER TABLE "LojistikShipmentStop" DROP COLUMN IF EXISTS "eInvoiceStatus";
ALTER TABLE "LojistikShipmentStop" DROP COLUMN IF EXISTS "eInvoiceNo";
ALTER TABLE "LojistikShipmentStop" DROP COLUMN IF EXISTS "eInvoiceId";

ALTER TABLE "LojistikShipmentTrip" DROP COLUMN IF EXISTS "maintenanceImpactWarning";

ALTER TABLE "EDocumentRecord" DROP COLUMN IF EXISTS "eInvoiceTimingMode";
ALTER TABLE "EDocumentRecord" DROP COLUMN IF EXISTS "documentStatus";

ALTER TABLE "OmnichannelOrder" DROP COLUMN IF EXISTS "eInvoiceStatus";

ALTER TABLE "Order" DROP COLUMN IF EXISTS "eInvoiceStatus";
ALTER TABLE "Order" DROP COLUMN IF EXISTS "eInvoiceNo";

ALTER TABLE "User" DROP COLUMN IF EXISTS "logisticsNotificationPrefsJson";
