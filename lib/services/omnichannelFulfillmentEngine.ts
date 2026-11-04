/**
 * FAZ 3 & 4: Omnichannel Satış, Lojistik, 3PL ve E-Dönüşüm Motoru
 * - E-Ticaret (Shopify, WooCommerce), Pazaryerleri (Trendyol, Hepsiburada, Amazon),
 *   B2B Bayi Portalı ve Fiziksel POS kasaları ile gerçek zamanlı ATP stok senkronizasyonu
 * - Parçalı Sevkiyat (Split Shipment), Bekleyen Sipariş (Backorder), Muadil Ürün ve RMA İade Yönetimi
 * - Kargo firmaları (UPS, Yurtiçi, Aras, MNG) & 3PL Depo adaptörleri
 * - GİB UBL-TR 2.1 E-Fatura, E-Arşiv ve Karekodlu Sevk E-İrsaliyesi üretimi
 */

export interface OmnichannelConnection {
  id: string
  code: string
  name: string
  channelType: "MARKETPLACE" | "ECOMMERCE" | "B2B_PORTAL" | "POS_TERMINAL"
  status: "CONNECTED" | "SYNCING" | "PAUSED"
  stockBufferPercent: number
  minStockThreshold: number
  syncedSkuCount: number
  publishedTotalUnits: number
  dailyOrders: number
  dailyRevenueTry: number
  webhookLatencyMs: number
  lastSyncAt: string
}

export interface ShipmentPackageSplit {
  splitNo: string
  warehouseCode: string
  warehouseName: string
  carrierName: string
  trackingNumber: string
  status: "PACKED" | "IN_TRANSIT" | "DELIVERED" | "DROPSHIP_DISPATCHED"
  itemsDesc: string
}

export interface OmnichannelFulfillmentOrder {
  id: string
  orderNumber: string
  channelCode: string
  channelName: string
  CustomerName: string
  city: string
  fulfillmentStrategy: "SPLIT_SHIPMENT" | "DROPSHIPPING" | "BACKORDER_PARTIAL" | "3PL_FULFILLMENT" | "STANDARD"
  status: "ALLOCATED" | "PARTIALLY_SHIPPED" | "BACKORDERED" | "DROPSHIP_SENT" | "DELIVERED"
  sku: string
  itemName: string
  orderedQty: number
  shippedQty: number
  backorderQty: number
  dropshipSupplierName?: string
  totalAmountTry: number
  eInvoiceNo?: string
  eWaybillNo?: string
  splits: ShipmentPackageSplit[]
  orderDate: string
}

export interface RmaReturnRecord {
  id: string
  rmaNumber: string
  orderNumber: string
  channelName: string
  customerName: string
  sku: string
  itemName: string
  returnQty: number
  returnReason: string
  qcDisposition: "PENDING_QC" | "RESTOCK_TO_BIN" | "QUARANTINE_REPAIR" | "RETURN_TO_VENDOR" | "SCRAP"
  targetBinCode: string
  refundAmountTry: number
  refundStatus: "PENDING" | "APPROVED_CREDITED" | "REPLACEMENT_SHIPPED"
  carrierTrackingNo: string
  createdAt: string
}

export interface Logistics3PlAdapter {
  id: string
  providerCode: string
  providerName: string
  adapterType: "GLOBAL_COURIER" | "DOMESTIC_CARGO" | "3PL_FULFILLMENT_CENTER"
  status: "ACTIVE" | "STANDBY"
  apiProtocol: string
  supportsZplBarcode: boolean
  supportsColdChain: boolean
  avgTransitDays: number
  costPerDesiTry: number
  activeShipments: number
  onTimeSlaPercent: number
}

export interface GibEDocumentRecord {
  id: string
  ettnUuid: string
  documentNo: string
  documentType: "E_IRSALIYE" | "E_FATURA" | "E_ARSIV"
  profileId: "TEMELIRSALIYE" | "TICARIFATURA" | "TEMELFATURA" | "IHRACAT"
  relatedOrderNo: string
  receiverTitle: string
  receiverVkn: string
  dispatchDate: string
  carrierName: string
  carrierVkn: string
  vehiclePlate: string
  driverName: string
  driverTckn: string
  totalNetTry: number
  totalVatTry: number
  totalGrossTry: number
  gibStatusCode: string
  gibStatusDescription: string
  signedXmlUrl: string
  qrCodePayload: string
}

export const INITIAL_CHANNELS: OmnichannelConnection[] = [
  {
    id: "ch-01",
    code: "TRENDYOL",
    name: "Trendyol Kurumsal & B2C Pazaryeri",
    channelType: "MARKETPLACE",
    status: "CONNECTED",
    stockBufferPercent: 5,
    minStockThreshold: 2,
    syncedSkuCount: 10,
    publishedTotalUnits: 420,
    dailyOrders: 42,
    dailyRevenueTry: 54600,
    webhookLatencyMs: 145,
    lastSyncAt: new Date().toISOString()
  },
  {
    id: "ch-02",
    code: "HEPSIBURADA",
    name: "Hepsiburada Kurumsal Mağaza",
    channelType: "MARKETPLACE",
    status: "CONNECTED",
    stockBufferPercent: 5,
    minStockThreshold: 2,
    syncedSkuCount: 8,
    publishedTotalUnits: 280,
    dailyOrders: 28,
    dailyRevenueTry: 36400,
    webhookLatencyMs: 160,
    lastSyncAt: new Date().toISOString()
  },
  {
    id: "ch-03",
    code: "SHOPIFY",
    name: "Sunum Çiçekçilik D2C Online Mağaza (Shopify)",
    channelType: "ECOMMERCE",
    status: "CONNECTED",
    stockBufferPercent: 0,
    minStockThreshold: 1,
    syncedSkuCount: 10,
    publishedTotalUnits: 510,
    dailyOrders: 19,
    dailyRevenueTry: 28900,
    webhookLatencyMs: 85,
    lastSyncAt: new Date().toISOString()
  },
  {
    id: "ch-04",
    code: "SUNUM-B2B",
    name: "Sunum Kurumsal Bayi & Otel Portalı",
    channelType: "B2B_PORTAL",
    status: "CONNECTED",
    stockBufferPercent: 0,
    minStockThreshold: 0,
    syncedSkuCount: 10,
    publishedTotalUnits: 650,
    dailyOrders: 7,
    dailyRevenueTry: 68500,
    webhookLatencyMs: 40,
    lastSyncAt: new Date().toISOString()
  }
]

export const INITIAL_OMNICHANNEL_CONNECTIONS = INITIAL_CHANNELS

export const INITIAL_OMNICHANNEL_ORDERS: OmnichannelFulfillmentOrder[] = [
  {
    id: "omni-ord-01",
    orderNumber: "OMN-2026-9041",
    channelCode: "SUNUM-B2B",
    channelName: "Sunum Kurumsal Bayi & Otel Portalı",
    CustomerName: "KoçSistem Bilgi ve İletişim Hizmetleri A.Ş.",
    city: "İstanbul / Üsküdar",
    fulfillmentStrategy: "SPLIT_SHIPMENT",
    status: "PARTIALLY_SHIPPED",
    sku: "GUL-EKV-01",
    itemName: "Ekvator Kırmızı Gül (1. Kalite - 60cm)",
    orderedQty: 50,
    shippedQty: 30,
    backorderQty: 0,
    totalAmountTry: 18450,
    eInvoiceNo: "SNR2026000001481",
    eWaybillNo: "IRS2026000000891",
    orderDate: "2026-11-03 10:15",
    splits: [
      {
        splitNo: "PAKET-1/2",
        warehouseCode: "DEP-MERKEZ",
        warehouseName: "Merkez Soğuk Hava Deposu",
        carrierName: "Yurtiçi Kargo VIP",
        trackingNumber: "YK-90881234912",
        status: "IN_TRANSIT",
        itemsDesc: "30 Adet Ekvator Kırmızı Gül"
      }
    ]
  }
]

export const INITIAL_RMA_RETURNS: RmaReturnRecord[] = [
  {
    id: "rma-01",
    rmaNumber: "RMA-2026-001",
    orderNumber: "OMN-2026-8810",
    channelName: "Trendyol Kurumsal Pazaryeri",
    customerName: "Tekfen İnşaat ve Tesisat A.Ş.",
    sku: "GUL-EKV-01",
    itemName: "Ekvator Kırmızı Gül (1. Kalite - 60cm)",
    returnQty: 10,
    returnReason: "Müşteri adres değişikliği / teslim edilemedi",
    qcDisposition: "RESTOCK_TO_BIN",
    targetBinCode: "A-01-01",
    refundAmountTry: 850,
    refundStatus: "APPROVED_CREDITED",
    carrierTrackingNo: "YK-RMA-6651209",
    createdAt: "2026-11-02 15:20"
  }
]
