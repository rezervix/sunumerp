-- Lojistik Faz 6 (lojistik_sevkiyat_rota): Sevkiyat, Sefer Planlama, CVRPTW Rota, e-POD & Müşteri Takip
-- Additive-Only Migration (Kolon silme / tip değiştirme / yeniden adlandırma YOK)

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "shipmentTripId" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "trackingToken" TEXT;

ALTER TABLE "OmnichannelOrder" ADD COLUMN IF NOT EXISTS "shipmentTripId" TEXT;
ALTER TABLE "OmnichannelOrder" ADD COLUMN IF NOT EXISTS "trackingToken" TEXT;
ALTER TABLE "OmnichannelOrder" ADD COLUMN IF NOT EXISTS "shippingLat" DOUBLE PRECISION;
ALTER TABLE "OmnichannelOrder" ADD COLUMN IF NOT EXISTS "shippingLng" DOUBLE PRECISION;
ALTER TABLE "OmnichannelOrder" ADD COLUMN IF NOT EXISTS "timeWindowStart" TEXT;
ALTER TABLE "OmnichannelOrder" ADD COLUMN IF NOT EXISTS "timeWindowEnd" TEXT;
ALTER TABLE "OmnichannelOrder" ADD COLUMN IF NOT EXISTS "estimatedWeightKg" DOUBLE PRECISION;
ALTER TABLE "OmnichannelOrder" ADD COLUMN IF NOT EXISTS "estimatedVolumeM3" DOUBLE PRECISION;
ALTER TABLE "OmnichannelOrder" ADD COLUMN IF NOT EXISTS "palletCount" INTEGER;

ALTER TABLE "EDocumentRecord" ADD COLUMN IF NOT EXISTS "shipmentTripId" TEXT;
ALTER TABLE "EDocumentRecord" ADD COLUMN IF NOT EXISTS "shipmentStopId" TEXT;

CREATE TABLE IF NOT EXISTS "LojistikShipmentTrip" (
    "id" TEXT NOT NULL,
    "tripNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "branchId" TEXT NOT NULL DEFAULT 'local-debug-branch',
    "originWarehouseId" TEXT NOT NULL,
    "originLabel" TEXT NOT NULL,
    "originLat" DOUBLE PRECISION NOT NULL,
    "originLng" DOUBLE PRECISION NOT NULL,
    "vehicleId" TEXT,
    "driverId" TEXT,
    "vehiclePlate" TEXT,
    "driverName" TEXT,
    "plannedDateKey" TEXT NOT NULL,
    "plannedDepartureAt" TIMESTAMP(3) NOT NULL,
    "actualDepartureAt" TIMESTAMP(3),
    "plannedCompletionAt" TIMESTAMP(3),
    "actualCompletionAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'TASLAK',
    "totalWeightKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalVolumeM3" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPallets" INTEGER NOT NULL DEFAULT 0,
    "capacityLoadPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "baselineUnoptimizedDistanceKm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "plannedDistanceKm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actualDistanceKm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "plannedDurationMin" INTEGER NOT NULL DEFAULT 0,
    "actualDurationMin" INTEGER NOT NULL DEFAULT 0,
    "routeProviderMode" TEXT NOT NULL DEFAULT 'local-solver',
    "routeSolverName" TEXT,
    "eWaybillId" TEXT,
    "eWaybillNo" TEXT,
    "eWaybillEttn" TEXT,
    "replanReason" TEXT,
    "replanHistoryJson" TEXT,
    "polylineJson" TEXT,
    "notes" TEXT,
    "createdBy" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LojistikShipmentTrip_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "LojistikShipmentTrip_tripNumber_key" ON "LojistikShipmentTrip"("tripNumber");
CREATE INDEX IF NOT EXISTS "LojistikShipmentTrip_branchId_status_idx" ON "LojistikShipmentTrip"("branchId", "status");
CREATE INDEX IF NOT EXISTS "LojistikShipmentTrip_plannedDateKey_idx" ON "LojistikShipmentTrip"("plannedDateKey");
CREATE INDEX IF NOT EXISTS "LojistikShipmentTrip_vehicleId_idx" ON "LojistikShipmentTrip"("vehicleId");
CREATE INDEX IF NOT EXISTS "LojistikShipmentTrip_driverId_idx" ON "LojistikShipmentTrip"("driverId");

CREATE TABLE IF NOT EXISTS "LojistikShipmentStop" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "sequenceNo" INTEGER NOT NULL DEFAULT 1,
    "sourceType" TEXT NOT NULL DEFAULT 'OMNICHANNEL_ORDER',
    "sourceId" TEXT,
    "sourceRefNo" TEXT,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "contactPhone" TEXT,
    "addressText" TEXT NOT NULL,
    "cityDistrict" TEXT,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "timeWindowStart" TEXT,
    "timeWindowEnd" TEXT,
    "serviceMinutes" INTEGER NOT NULL DEFAULT 10,
    "weightKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "volumeM3" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "palletCount" INTEGER NOT NULL DEFAULT 0,
    "requiresColdChain" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "plannedEtaAt" TIMESTAMP(3),
    "actualArrivalAt" TIMESTAMP(3),
    "actualDepartureAt" TIMESTAMP(3),
    "legDistanceKm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cumulativeDistanceKm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "delayMinutes" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'BEKLIYOR',
    "failureReasonCode" TEXT,
    "failureReasonNote" TEXT,
    "driverNote" TEXT,
    "trackingToken" TEXT NOT NULL,
    "trackingExpiresAt" TIMESTAMP(3) NOT NULL,
    "reassignedFromTripId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LojistikShipmentStop_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "LojistikShipmentStop_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "LojistikShipmentTrip"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "LojistikShipmentStop_trackingToken_key" ON "LojistikShipmentStop"("trackingToken");
CREATE INDEX IF NOT EXISTS "LojistikShipmentStop_tripId_sequenceNo_idx" ON "LojistikShipmentStop"("tripId", "sequenceNo");
CREATE INDEX IF NOT EXISTS "LojistikShipmentStop_status_idx" ON "LojistikShipmentStop"("status");
CREATE INDEX IF NOT EXISTS "LojistikShipmentStop_sourceType_sourceId_idx" ON "LojistikShipmentStop"("sourceType", "sourceId");

CREATE TABLE IF NOT EXISTS "LojistikDeliveryProof" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "stopId" TEXT NOT NULL,
    "captureMethod" TEXT NOT NULL DEFAULT 'IMZA_CIZIM',
    "recipientName" TEXT NOT NULL,
    "recipientRelation" TEXT NOT NULL DEFAULT 'ALICI',
    "note" TEXT,
    "signatureFileUrl" TEXT,
    "photoFileUrlsJson" TEXT,
    "checksumSha256" TEXT,
    "capturedLat" DOUBLE PRECISION,
    "capturedLng" DOUBLE PRECISION,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "capturedByDriverId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LojistikDeliveryProof_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "LojistikDeliveryProof_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "LojistikShipmentTrip"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LojistikDeliveryProof_stopId_fkey" FOREIGN KEY ("stopId") REFERENCES "LojistikShipmentStop"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "LojistikDeliveryProof_tripId_idx" ON "LojistikDeliveryProof"("tripId");
CREATE INDEX IF NOT EXISTS "LojistikDeliveryProof_stopId_idx" ON "LojistikDeliveryProof"("stopId");

CREATE TABLE IF NOT EXISTS "LojistikRouteOptimizationJob" (
    "id" TEXT NOT NULL,
    "tripId" TEXT,
    "jobStatus" TEXT NOT NULL DEFAULT 'QUEUED',
    "stageLabel" TEXT NOT NULL DEFAULT 'Sırada',
    "progressPct" INTEGER NOT NULL DEFAULT 0,
    "stopCount" INTEGER NOT NULL DEFAULT 0,
    "vehicleCount" INTEGER NOT NULL DEFAULT 1,
    "providerMode" TEXT NOT NULL DEFAULT 'local-solver',
    "solverName" TEXT,
    "unoptimizedDistanceKm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "optimizedDistanceKm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "timeWindowViolations" INTEGER NOT NULL DEFAULT 0,
    "capacityOverflowPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "resultJson" TEXT,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LojistikRouteOptimizationJob_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "LojistikRouteOptimizationJob_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "LojistikShipmentTrip"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "LojistikRouteOptimizationJob_tripId_createdAt_idx" ON "LojistikRouteOptimizationJob"("tripId", "createdAt");
CREATE INDEX IF NOT EXISTS "LojistikRouteOptimizationJob_jobStatus_idx" ON "LojistikRouteOptimizationJob"("jobStatus");

CREATE TABLE IF NOT EXISTS "LojistikTrackingEvent" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "stopId" TEXT,
    "eventType" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorName" TEXT,
    "message" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "metadataJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LojistikTrackingEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "LojistikTrackingEvent_tripId_createdAt_idx" ON "LojistikTrackingEvent"("tripId", "createdAt");
CREATE INDEX IF NOT EXISTS "LojistikTrackingEvent_stopId_idx" ON "LojistikTrackingEvent"("stopId");
