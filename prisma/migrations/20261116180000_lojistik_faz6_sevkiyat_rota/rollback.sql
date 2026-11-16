-- Lojistik Faz 6 Rollback SQL
-- Yeni eklenen 5 tabloyu ve eklemeli kolonları güvenli biçimde geri alır.

DROP TABLE IF EXISTS "LojistikTrackingEvent";
DROP TABLE IF EXISTS "LojistikRouteOptimizationJob";
DROP TABLE IF EXISTS "LojistikDeliveryProof";
DROP TABLE IF EXISTS "LojistikShipmentStop";
DROP TABLE IF EXISTS "LojistikShipmentTrip";

ALTER TABLE "EDocumentRecord" DROP COLUMN IF EXISTS "shipmentStopId";
ALTER TABLE "EDocumentRecord" DROP COLUMN IF EXISTS "shipmentTripId";

ALTER TABLE "OmnichannelOrder" DROP COLUMN IF EXISTS "palletCount";
ALTER TABLE "OmnichannelOrder" DROP COLUMN IF EXISTS "estimatedVolumeM3";
ALTER TABLE "OmnichannelOrder" DROP COLUMN IF EXISTS "estimatedWeightKg";
ALTER TABLE "OmnichannelOrder" DROP COLUMN IF EXISTS "timeWindowEnd";
ALTER TABLE "OmnichannelOrder" DROP COLUMN IF EXISTS "timeWindowStart";
ALTER TABLE "OmnichannelOrder" DROP COLUMN IF EXISTS "shippingLng";
ALTER TABLE "OmnichannelOrder" DROP COLUMN IF EXISTS "shippingLat";
ALTER TABLE "OmnichannelOrder" DROP COLUMN IF EXISTS "trackingToken";
ALTER TABLE "OmnichannelOrder" DROP COLUMN IF EXISTS "shipmentTripId";

ALTER TABLE "Order" DROP COLUMN IF EXISTS "trackingToken";
ALTER TABLE "Order" DROP COLUMN IF EXISTS "shipmentTripId";
