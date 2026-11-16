-- Sunum ERP — Lojistik Faz 3: Tedarikçi Yönetimi, RFQ, Çok Kademeli PO, ASN ve Portal (Additive Migration)
-- Mevcut tablolara yalnızca geriye dönük uyumlu (nullable veya varsayılan değerli) kolonlar eklenir;
-- yeni tabloların tamamı "Lojistik" önekine sahiptir ve mevcut verilere zarar verilmez.

ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "glnNumber" TEXT;
ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "criticalityLevel" TEXT NOT NULL DEFAULT 'ORTA';
ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "approvalStatus" TEXT NOT NULL DEFAULT 'ONAYLI';
ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "blacklistedReason" TEXT;
ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "paymentTermsLabel" TEXT;
ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "taxOffice" TEXT;
ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "iban" TEXT;
ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "scorecardScore" DOUBLE PRECISION;
ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "scorecardTier" TEXT;
ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "isAlternativeReady" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "ReorderPolicy" ADD COLUMN IF NOT EXISTS "annualDemand" DOUBLE PRECISION;
ALTER TABLE "ReorderPolicy" ADD COLUMN IF NOT EXISTS "orderingCostTry" DOUBLE PRECISION;
ALTER TABLE "ReorderPolicy" ADD COLUMN IF NOT EXISTS "holdingCostTry" DOUBLE PRECISION;
ALTER TABLE "ReorderPolicy" ADD COLUMN IF NOT EXISTS "unitCostTry" DOUBLE PRECISION;

ALTER TABLE "PurchaseRequisition" ADD COLUMN IF NOT EXISTS "poNumber" TEXT;
ALTER TABLE "PurchaseRequisition" ADD COLUMN IF NOT EXISTS "rfqId" TEXT;
ALTER TABLE "PurchaseRequisition" ADD COLUMN IF NOT EXISTS "rfqNo" TEXT;
ALTER TABLE "PurchaseRequisition" ADD COLUMN IF NOT EXISTS "approvalTier" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "PurchaseRequisition" ADD COLUMN IF NOT EXISTS "requiredApprovalTier" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "PurchaseRequisition" ADD COLUMN IF NOT EXISTS "dispatchedAt" TIMESTAMP(3);
ALTER TABLE "PurchaseRequisition" ADD COLUMN IF NOT EXISTS "dispatchedChannel" TEXT;
ALTER TABLE "PurchaseRequisition" ADD COLUMN IF NOT EXISTS "supplierConfirmedStatus" TEXT;
ALTER TABLE "PurchaseRequisition" ADD COLUMN IF NOT EXISTS "supplierResponseNote" TEXT;
ALTER TABLE "PurchaseRequisition" ADD COLUMN IF NOT EXISTS "promisedDeliveryDate" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "LojistikSupplierItemLink" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "supplierSku" TEXT,
    "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "moq" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "leadTimeDays" INTEGER NOT NULL DEFAULT 3,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastQuotedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LojistikSupplierItemLink_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "LojistikSupplierItemLink_supplierId_itemId_key" ON "LojistikSupplierItemLink"("supplierId", "itemId");
CREATE INDEX IF NOT EXISTS "LojistikSupplierItemLink_itemId_idx" ON "LojistikSupplierItemLink"("itemId");
CREATE INDEX IF NOT EXISTS "LojistikSupplierItemLink_supplierId_idx" ON "LojistikSupplierItemLink"("supplierId");

CREATE TABLE IF NOT EXISTS "LojistikSupplierDocument" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "docType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "mimeType" TEXT,
    "fileSizeBytes" INTEGER,
    "validFrom" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'GECERLI',
    "uploadedBy" TEXT NOT NULL,
    "uploadedVia" TEXT NOT NULL DEFAULT 'ERP',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LojistikSupplierDocument_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "LojistikSupplierDocument_supplierId_status_idx" ON "LojistikSupplierDocument"("supplierId", "status");

CREATE TABLE IF NOT EXISTS "LojistikRfq" (
    "id" TEXT NOT NULL,
    "rfqNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'TEKLIFE_ACIK',
    "dueDate" TIMESTAMP(3) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "invitedSuppliers" TEXT,
    "awardedSupplierId" TEXT,
    "awardedQuoteId" TEXT,
    "convertedPoNo" TEXT,
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LojistikRfq_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "LojistikRfq_rfqNumber_key" ON "LojistikRfq"("rfqNumber");
CREATE INDEX IF NOT EXISTS "LojistikRfq_status_dueDate_idx" ON "LojistikRfq"("status", "dueDate");

CREATE TABLE IF NOT EXISTS "LojistikRfqItem" (
    "id" TEXT NOT NULL,
    "rfqId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "requestedQty" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'Adet',
    "targetUnitPrice" DOUBLE PRECISION,
    "notes" TEXT,

    CONSTRAINT "LojistikRfqItem_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "LojistikRfqItem_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "LojistikRfq"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "LojistikRfqItem_rfqId_idx" ON "LojistikRfqItem"("rfqId");
CREATE INDEX IF NOT EXISTS "LojistikRfqItem_itemId_idx" ON "LojistikRfqItem"("itemId");

CREATE TABLE IF NOT EXISTS "LojistikRfqQuote" (
    "id" TEXT NOT NULL,
    "rfqId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "quoteNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'TEKLIF_VERILDI',
    "leadTimeDays" INTEGER NOT NULL DEFAULT 3,
    "validityDate" TIMESTAMP(3),
    "paymentTerms" TEXT NOT NULL DEFAULT '30 Gün Vadeli',
    "shippingCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalQuotedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tcoTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "submittedBy" TEXT,
    "submittedVia" TEXT NOT NULL DEFAULT 'ERP',
    "notes" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LojistikRfqQuote_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "LojistikRfqQuote_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "LojistikRfq"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "LojistikRfqQuote_quoteNumber_key" ON "LojistikRfqQuote"("quoteNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "LojistikRfqQuote_rfqId_supplierId_key" ON "LojistikRfqQuote"("rfqId", "supplierId");
CREATE INDEX IF NOT EXISTS "LojistikRfqQuote_supplierId_idx" ON "LojistikRfqQuote"("supplierId");

CREATE TABLE IF NOT EXISTS "LojistikRfqQuoteLine" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "rfqItemId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "offeredQty" DOUBLE PRECISION NOT NULL,
    "leadTimeDays" INTEGER,
    "lineTotal" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,

    CONSTRAINT "LojistikRfqQuoteLine_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "LojistikRfqQuoteLine_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "LojistikRfqQuote"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LojistikRfqQuoteLine_rfqItemId_fkey" FOREIGN KEY ("rfqItemId") REFERENCES "LojistikRfqItem"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "LojistikRfqQuoteLine_quoteId_idx" ON "LojistikRfqQuoteLine"("quoteId");
CREATE INDEX IF NOT EXISTS "LojistikRfqQuoteLine_rfqItemId_idx" ON "LojistikRfqQuoteLine"("rfqItemId");

CREATE TABLE IF NOT EXISTS "LojistikPurchaseOrder" (
    "id" TEXT NOT NULL,
    "poNumber" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL DEFAULT 'MANUAL',
    "sourceRefNo" TEXT,
    "rfqId" TEXT,
    "requisitionId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ONAY_BEKLIYOR',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "currentApprovalStep" INTEGER NOT NULL DEFAULT 1,
    "requiredApprovalSteps" INTEGER NOT NULL DEFAULT 1,
    "agreedTotalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "baselineTotalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "paymentTerms" TEXT NOT NULL DEFAULT '30 Gün Vadeli',
    "expectedDeliveryDate" TIMESTAMP(3) NOT NULL,
    "actualDeliveryDate" TIMESTAMP(3),
    "promisedDeliveryDate" TIMESTAMP(3),
    "dispatchedAt" TIMESTAMP(3),
    "dispatchedChannel" TEXT,
    "supplierResponseStatus" TEXT NOT NULL DEFAULT 'BEKLIYOR',
    "supplierResponseNote" TEXT,
    "redFlagReason" TEXT,
    "totalOrderedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalReceivedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalRejectedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LojistikPurchaseOrder_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "LojistikPurchaseOrder_poNumber_key" ON "LojistikPurchaseOrder"("poNumber");
CREATE INDEX IF NOT EXISTS "LojistikPurchaseOrder_supplierId_status_idx" ON "LojistikPurchaseOrder"("supplierId", "status");
CREATE INDEX IF NOT EXISTS "LojistikPurchaseOrder_warehouseId_status_idx" ON "LojistikPurchaseOrder"("warehouseId", "status");
CREATE INDEX IF NOT EXISTS "LojistikPurchaseOrder_expectedDeliveryDate_idx" ON "LojistikPurchaseOrder"("expectedDeliveryDate");

CREATE TABLE IF NOT EXISTS "LojistikPurchaseOrderLine" (
    "id" TEXT NOT NULL,
    "poId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "orderedQty" DOUBLE PRECISION NOT NULL,
    "receivedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rejectedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL DEFAULT 'Adet',
    "agreedUnitPrice" DOUBLE PRECISION NOT NULL,
    "baselineUnitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lineTotal" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,

    CONSTRAINT "LojistikPurchaseOrderLine_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "LojistikPurchaseOrderLine_poId_fkey" FOREIGN KEY ("poId") REFERENCES "LojistikPurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "LojistikPurchaseOrderLine_poId_idx" ON "LojistikPurchaseOrderLine"("poId");
CREATE INDEX IF NOT EXISTS "LojistikPurchaseOrderLine_itemId_idx" ON "LojistikPurchaseOrderLine"("itemId");

CREATE TABLE IF NOT EXISTS "LojistikPoApprovalStep" (
    "id" TEXT NOT NULL,
    "poId" TEXT NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "approverRole" TEXT NOT NULL,
    "thresholdMin" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'BEKLIYOR',
    "approvedBy" TEXT,
    "decisionNote" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LojistikPoApprovalStep_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "LojistikPoApprovalStep_poId_fkey" FOREIGN KEY ("poId") REFERENCES "LojistikPurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "LojistikPoApprovalStep_poId_stepOrder_idx" ON "LojistikPoApprovalStep"("poId", "stepOrder");

CREATE TABLE IF NOT EXISTS "LojistikSupplierAsn" (
    "id" TEXT NOT NULL,
    "asnNumber" TEXT NOT NULL,
    "poId" TEXT,
    "poNumber" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "waybillNo" TEXT,
    "trackingNo" TEXT,
    "carrierName" TEXT,
    "vehiclePlate" TEXT,
    "driverName" TEXT,
    "ssccPalletCount" INTEGER NOT NULL DEFAULT 1,
    "expectedArrivalAt" TIMESTAMP(3) NOT NULL,
    "actualArrivalAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ON_IHBAR',
    "sourceChannel" TEXT NOT NULL DEFAULT 'PORTAL',
    "ediExternalRef" TEXT,
    "wmsTaskNo" TEXT,
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LojistikSupplierAsn_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "LojistikSupplierAsn_asnNumber_key" ON "LojistikSupplierAsn"("asnNumber");
CREATE INDEX IF NOT EXISTS "LojistikSupplierAsn_supplierId_status_idx" ON "LojistikSupplierAsn"("supplierId", "status");
CREATE INDEX IF NOT EXISTS "LojistikSupplierAsn_poNumber_idx" ON "LojistikSupplierAsn"("poNumber");
CREATE INDEX IF NOT EXISTS "LojistikSupplierAsn_warehouseId_status_idx" ON "LojistikSupplierAsn"("warehouseId", "status");

CREATE TABLE IF NOT EXISTS "LojistikSupplierAsnLine" (
    "id" TEXT NOT NULL,
    "asnId" TEXT NOT NULL,
    "poLineId" TEXT,
    "itemId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "shippedQty" DOUBLE PRECISION NOT NULL,
    "receivedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "damagedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL DEFAULT 'Adet',
    "lotNumber" TEXT,
    "expiryDate" TIMESTAMP(3),
    "ssccCode" TEXT,
    "notes" TEXT,

    CONSTRAINT "LojistikSupplierAsnLine_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "LojistikSupplierAsnLine_asnId_fkey" FOREIGN KEY ("asnId") REFERENCES "LojistikSupplierAsn"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "LojistikSupplierAsnLine_asnId_idx" ON "LojistikSupplierAsnLine"("asnId");
CREATE INDEX IF NOT EXISTS "LojistikSupplierAsnLine_itemId_idx" ON "LojistikSupplierAsnLine"("itemId");

CREATE TABLE IF NOT EXISTS "LojistikSupplierScoreConfig" (
    "id" TEXT NOT NULL,
    "configKey" TEXT NOT NULL DEFAULT 'DEFAULT',
    "otdWeight" DOUBLE PRECISION NOT NULL DEFAULT 35,
    "qtyWeight" DOUBLE PRECISION NOT NULL DEFAULT 25,
    "qualityWeight" DOUBLE PRECISION NOT NULL DEFAULT 25,
    "priceWeight" DOUBLE PRECISION NOT NULL DEFAULT 15,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LojistikSupplierScoreConfig_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "LojistikSupplierScoreConfig_configKey_key" ON "LojistikSupplierScoreConfig"("configKey");

CREATE TABLE IF NOT EXISTS "LojistikSupplierScoreSnapshot" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "otdRate" DOUBLE PRECISION NOT NULL,
    "qtyComplianceRate" DOUBLE PRECISION NOT NULL,
    "qualityAcceptanceRate" DOUBLE PRECISION NOT NULL,
    "priceVarianceScore" DOUBLE PRECISION NOT NULL,
    "avgPriceVariancePct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "compositeScore" DOUBLE PRECISION NOT NULL,
    "tier" TEXT NOT NULL,
    "poCount" INTEGER NOT NULL DEFAULT 0,
    "onTimePoCount" INTEGER NOT NULL DEFAULT 0,
    "latePoCount" INTEGER NOT NULL DEFAULT 0,
    "totalOrderedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalReceivedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalRejectedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "LojistikSupplierScoreSnapshot_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "LojistikSupplierScoreSnapshot_supplierId_periodKey_key" ON "LojistikSupplierScoreSnapshot"("supplierId", "periodKey");
CREATE INDEX IF NOT EXISTS "LojistikSupplierScoreSnapshot_periodKey_idx" ON "LojistikSupplierScoreSnapshot"("periodKey");

CREATE TABLE IF NOT EXISTS "LojistikSupplierPortalInvite" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "invitedBy" TEXT NOT NULL,
    "purpose" TEXT NOT NULL DEFAULT 'PORTAL_ACCESS',
    "relatedRef" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LojistikSupplierPortalInvite_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "LojistikSupplierPortalInvite_tokenId_key" ON "LojistikSupplierPortalInvite"("tokenId");
CREATE INDEX IF NOT EXISTS "LojistikSupplierPortalInvite_supplierId_idx" ON "LojistikSupplierPortalInvite"("supplierId");
