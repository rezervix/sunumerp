-- Rollback: 20261114190000_lojistik_faz3_tedarikci_ve_satin_alma

DROP TABLE IF EXISTS "LojistikSupplierPortalInvite";
DROP TABLE IF EXISTS "LojistikSupplierScoreSnapshot";
DROP TABLE IF EXISTS "LojistikSupplierScoreConfig";
DROP TABLE IF EXISTS "LojistikSupplierAsnLine";
DROP TABLE IF EXISTS "LojistikSupplierAsn";
DROP TABLE IF EXISTS "LojistikPoApprovalStep";
DROP TABLE IF EXISTS "LojistikPurchaseOrderLine";
DROP TABLE IF EXISTS "LojistikPurchaseOrder";
DROP TABLE IF EXISTS "LojistikRfqQuoteLine";
DROP TABLE IF EXISTS "LojistikRfqQuote";
DROP TABLE IF EXISTS "LojistikRfqItem";
DROP TABLE IF EXISTS "LojistikRfq";
DROP TABLE IF EXISTS "LojistikSupplierDocument";
DROP TABLE IF EXISTS "LojistikSupplierItemLink";

ALTER TABLE "PurchaseRequisition" DROP COLUMN IF EXISTS "promisedDeliveryDate";
ALTER TABLE "PurchaseRequisition" DROP COLUMN IF EXISTS "supplierResponseNote";
ALTER TABLE "PurchaseRequisition" DROP COLUMN IF EXISTS "supplierConfirmedStatus";
ALTER TABLE "PurchaseRequisition" DROP COLUMN IF EXISTS "dispatchedChannel";
ALTER TABLE "PurchaseRequisition" DROP COLUMN IF EXISTS "dispatchedAt";
ALTER TABLE "PurchaseRequisition" DROP COLUMN IF EXISTS "requiredApprovalTier";
ALTER TABLE "PurchaseRequisition" DROP COLUMN IF EXISTS "approvalTier";
ALTER TABLE "PurchaseRequisition" DROP COLUMN IF EXISTS "rfqNo";
ALTER TABLE "PurchaseRequisition" DROP COLUMN IF EXISTS "rfqId";
ALTER TABLE "PurchaseRequisition" DROP COLUMN IF EXISTS "poNumber";

ALTER TABLE "ReorderPolicy" DROP COLUMN IF EXISTS "unitCostTry";
ALTER TABLE "ReorderPolicy" DROP COLUMN IF EXISTS "holdingCostTry";
ALTER TABLE "ReorderPolicy" DROP COLUMN IF EXISTS "orderingCostTry";
ALTER TABLE "ReorderPolicy" DROP COLUMN IF EXISTS "annualDemand";

ALTER TABLE "Supplier" DROP COLUMN IF EXISTS "isAlternativeReady";
ALTER TABLE "Supplier" DROP COLUMN IF EXISTS "scorecardTier";
ALTER TABLE "Supplier" DROP COLUMN IF EXISTS "scorecardScore";
ALTER TABLE "Supplier" DROP COLUMN IF EXISTS "notes";
ALTER TABLE "Supplier" DROP COLUMN IF EXISTS "iban";
ALTER TABLE "Supplier" DROP COLUMN IF EXISTS "taxOffice";
ALTER TABLE "Supplier" DROP COLUMN IF EXISTS "paymentTermsLabel";
ALTER TABLE "Supplier" DROP COLUMN IF EXISTS "blacklistedReason";
ALTER TABLE "Supplier" DROP COLUMN IF EXISTS "approvalStatus";
ALTER TABLE "Supplier" DROP COLUMN IF EXISTS "criticalityLevel";
ALTER TABLE "Supplier" DROP COLUMN IF EXISTS "category";
ALTER TABLE "Supplier" DROP COLUMN IF EXISTS "glnNumber";
