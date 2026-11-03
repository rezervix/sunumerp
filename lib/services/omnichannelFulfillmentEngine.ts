/**
 * FAZ 4: Omnichannel Satış, Lojistik, 3PL ve E-Dönüşüm Motoru
 * - E-Ticaret (Shopify, WooCommerce), Pazaryerleri (Trendyol, Hepsiburada, Amazon),
 *   B2B Bayi Portalı ve Fiziksel POS cihazları ile gerçek zamanlı (real-time) ATP stok senkronizasyonu
 * - Dropshipping, Parçalı Sevkiyat (Split Shipment), Bekleyen Sipariş (Backorder) ve RMA İade Yönetimi
 * - Kargo firmaları (UPS, DHL, Yurtiçi, Aras) & 3PL Depo adaptörleri
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
  vehiclePlate: string
  driverName: string
  driverTckn: string
  totalNetTry: number
  totalVatTry: number
  totalGrossTry: number
  gibStatusCode: string
  gibStatusText: string
  itemsSummary: string
}

export const INITIAL_OMNICHANNEL_CONNECTIONS: OmnichannelConnection[] = [
  {
    id: "chn-01",
    code: "TRENDYOL-MP",
    name: "Trendyol Kurumsal Pazaryeri Mağazası",
    channelType: "MARKETPLACE",
    status: "CONNECTED",
    stockBufferPercent: 10,
    minStockThreshold: 3,
    syncedSkuCount: 412,
    publishedTotalUnits: 3840,
    dailyOrders: 148,
    dailyRevenueTry: 462000,
    webhookLatencyMs: 118,
    lastSyncAt: "2026-11-03 15:32:10"
  },
  {
    id: "chn-02",
    code: "HEPSIBURADA-MP",
    name: "Hepsiburada Kurumsal Satıcı Entegrasyonu",
    channelType: "MARKETPLACE",
    status: "CONNECTED",
    stockBufferPercent: 8,
    minStockThreshold: 2,
    syncedSkuCount: 385,
    publishedTotalUnits: 3920,
    dailyOrders: 94,
    dailyRevenueTry: 318500,
    webhookLatencyMs: 142,
    lastSyncAt: "2026-11-03 15:32:08"
  },
  {
    id: "chn-03",
    code: "SHOPIFY-D2C",
    name: "Shopify Global D2C E-Ticaret Vitrinimiz",
    channelType: "ECOMMERCE",
    status: "CONNECTED",
    stockBufferPercent: 5,
    minStockThreshold: 1,
    syncedSkuCount: 620,
    publishedTotalUnits: 4190,
    dailyOrders: 67,
    dailyRevenueTry: 289000,
    webhookLatencyMs: 95,
    lastSyncAt: "2026-11-03 15:32:12"
  },
  {
    id: "chn-04",
    code: "SUNUM-B2B-PORTAL",
    name: "Sunum ERP B2B Kurumsal Bayi & Şube Portalı",
    channelType: "B2B_PORTAL",
    status: "CONNECTED",
    stockBufferPercent: 0,
    minStockThreshold: 0,
    syncedSkuCount: 1480,
    publishedTotalUnits: 8450,
    dailyOrders: 38,
    dailyRevenueTry: 940000,
    webhookLatencyMs: 42,
    lastSyncAt: "2026-11-03 15:32:15"
  },
  {
    id: "chn-05",
    code: "POS-KADIKOY-01",
    name: "Kadıköy Mağaza Fiziksel POS & RFID Kasası",
    channelType: "POS_TERMINAL",
    status: "CONNECTED",
    stockBufferPercent: 0,
    minStockThreshold: 1,
    syncedSkuCount: 620,
    publishedTotalUnits: 1490,
    dailyOrders: 112,
    dailyRevenueTry: 215000,
    webhookLatencyMs: 35,
    lastSyncAt: "2026-11-03 15:32:15"
  },
  {
    id: "chn-06",
    code: "AMAZON-TR-EU",
    name: "Amazon Türkiye & FBA Avrupa Kanalı",
    channelType: "MARKETPLACE",
    status: "CONNECTED",
    stockBufferPercent: 12,
    minStockThreshold: 5,
    syncedSkuCount: 290,
    publishedTotalUnits: 2910,
    dailyOrders: 53,
    dailyRevenueTry: 274000,
    webhookLatencyMs: 164,
    lastSyncAt: "2026-11-03 15:31:55"
  }
]

export const INITIAL_OMNICHANNEL_ORDERS: OmnichannelFulfillmentOrder[] = [
  {
    id: "omni-ord-01",
    orderNumber: "OMN-2026-9041",
    channelCode: "SUNUM-B2B-PORTAL",
    channelName: "Sunum B2B Kurumsal Bayi Portalı",
    CustomerName: "KoçSistem Bilgi ve İletişim Hizmetleri A.Ş.",
    city: "İstanbul / Üsküdar",
    fulfillmentStrategy: "SPLIT_SHIPMENT",
    status: "PARTIALLY_SHIPPED",
    sku: "WMS-HHT-X900",
    itemName: "SunumTech X900 Endüstriyel 2D & RFID El Terminali",
    orderedQty: 30,
    shippedQty: 30,
    backorderQty: 0,
    totalAmountTry: 747000,
    eInvoiceNo: "SNR2026000001481",
    eWaybillNo: "IRS2026000000891",
    orderDate: "2026-11-03 10:15",
    splits: [
      {
        splitNo: "PAKET-1/2",
        warehouseCode: "DEP-IST-01",
        warehouseName: "Tuzla Merkez Depo",
        carrierName: "UPS Express Kurumsal",
        trackingNumber: "1Z999AA10192837465",
        status: "IN_TRANSIT",
        itemsDesc: "20 Adet WMS-HHT-X900 (LOT-X900-01)"
      },
      {
        splitNo: "PAKET-2/2",
        warehouseCode: "DEP-ANK-03",
        warehouseName: "Ankara Bölge Dağıtım",
        carrierName: "DHL Supply Chain",
        trackingNumber: "JD014600009812341",
        status: "PACKED",
        itemsDesc: "10 Adet WMS-HHT-X900 (LOT-X900-03)"
      }
    ]
  },
  {
    id: "omni-ord-02",
    orderNumber: "OMN-2026-9042",
    channelCode: "TRENDYOL-MP",
    channelName: "Trendyol Kurumsal Pazaryeri",
    CustomerName: "Borusan Lojistik Dağıtım Depoculuk A.Ş.",
    city: "Kocaeli / Çayırova",
    fulfillmentStrategy: "DROPSHIPPING",
    status: "DROPSHIP_SENT",
    sku: "CMP-LION-6000MAH",
    itemName: "Endüstriyel Hot-Swap Li-Ion Batarya Paketi 6000mAh",
    orderedQty: 50,
    shippedQty: 50,
    backorderQty: 0,
    dropshipSupplierName: "Panasonic Energy Endüstriyel Batarya Türkiye",
    totalAmountTry: 155000,
    eInvoiceNo: "SNR2026000001482",
    eWaybillNo: "IRS2026000000892",
    orderDate: "2026-11-03 11:40",
    splits: [
      {
        splitNo: "DROPSHIP-DIRECT-1",
        warehouseCode: "VENDOR-DIRECT",
        warehouseName: "Panasonic Türkiye Fabrika Çıkışı (Dropship)",
        carrierName: "Yurtiçi Kargo VIP",
        trackingNumber: "YK-90881234912",
        status: "DROPSHIP_DISPATCHED",
        itemsDesc: "50 Adet CMP-LION-6000MAH (Doğrudan Tedarikçiden Müşteriye)"
      }
    ]
  },
  {
    id: "omni-ord-03",
    orderNumber: "OMN-2026-9043",
    channelCode: "SHOPIFY-D2C",
    channelName: "Shopify Global D2C",
    CustomerName: "Eczacıbaşı Monrol Nükleer Ürünler A.Ş.",
    city: "Kocaeli / Gebze",
    fulfillmentStrategy: "BACKORDER_PARTIAL",
    status: "BACKORDERED",
    sku: "BIO-THERM-GEL-5L",
    itemName: "BioTherm Medikal & Gıda Soğuk Zincir Faz Değişim Jeli (5L)",
    orderedQty: 120,
    shippedQty: 80,
    backorderQty: 40,
    totalAmountTry: 141600,
    eInvoiceNo: "SNR2026000001483",
    eWaybillNo: "IRS2026000000893",
    orderDate: "2026-11-03 13:05",
    splits: [
      {
        splitNo: "SEVK-1 (Mevcut Stok)",
        warehouseCode: "DEP-GBZ-04",
        warehouseName: "Gebze Soğuk Zincir Deposu",
        carrierName: "Netlog ColdChain Frigo",
        trackingNumber: "NTL-COLD-77129",
        status: "IN_TRANSIT",
        itemsDesc: "80 Bidon BIO-THERM-GEL-5L (Hemen Sevk Edildi)"
      },
      {
        splitNo: "BACKORDER-2 (Bekleyen)",
        warehouseCode: "DEP-GBZ-04",
        warehouseName: "Gebze Soğuk Zincir Deposu",
        carrierName: "Otomatik Tahsis Bekliyor (PO: PR-AUTO-2026-0420)",
        trackingNumber: "BACKORDER-WAIT-40",
        status: "PACKED",
        itemsDesc: "40 Bidon — 07.11.2026 Tedarikçi Mal Kabulünde Otomatik Sevk Edilecek"
      }
    ]
  }
]

export const INITIAL_RMA_RETURNS: RmaReturnRecord[] = [
  {
    id: "rma-01",
    rmaNumber: "RMA-2026-0194",
    orderNumber: "OMN-2026-8810",
    channelName: "Trendyol Kurumsal Pazaryeri",
    customerName: "Tekfen İnşaat ve Tesisat A.Ş.",
    sku: "MTX-PRO-JACKET-NVY-M",
    itemName: "Endüstriyel Pro-Shield Mont — Gece Mavisi / M Beden",
    returnQty: 6,
    returnReason: "Beden Değişimi Talebi (Ambalajı Açılmamış Sağlam Ürün)",
    qcDisposition: "RESTOCK_TO_BIN",
    targetBinCode: "IST-Z2-A01-R02-L01-B01",
    refundAmountTry: 17100,
    refundStatus: "REPLACEMENT_SHIPPED",
    carrierTrackingNo: "YK-RMA-6651209",
    createdAt: "2026-11-02 15:20"
  },
  {
    id: "rma-02",
    rmaNumber: "RMA-2026-0195",
    orderNumber: "OMN-2026-8892",
    channelName: "Hepsiburada Kurumsal",
    customerName: "Anadolu Efes Biracılık ve Malt San. A.Ş.",
    sku: "WMS-HHT-X900",
    itemName: "SunumTech X900 Endüstriyel 2D & RFID El Terminali",
    returnQty: 1,
    returnReason: "Kargo Taşıma Sırasında Cam Çatlağı",
    qcDisposition: "QUARANTINE_REPAIR",
    targetBinCode: "IST-Z4-KARANTINA-B01",
    refundAmountTry: 24900,
    refundStatus: "APPROVED_CREDITED",
    carrierTrackingNo: "UPS-RMA-1Z88219",
    createdAt: "2026-11-03 11:10"
  }
]

export const INITIAL_LOGISTICS_ADAPTERS: Logistics3PlAdapter[] = [
  {
    id: "log-01",
    providerCode: "UPS_EXPRESS",
    providerName: "UPS Türkiye & Global Express",
    adapterType: "GLOBAL_COURIER",
    status: "ACTIVE",
    apiProtocol: "REST JSON v2 + ZPL Thermal Printer",
    supportsZplBarcode: true,
    supportsColdChain: false,
    avgTransitDays: 1.1,
    costPerDesiTry: 28.5,
    activeShipments: 64,
    onTimeSlaPercent: 99.1
  },
  {
    id: "log-02",
    providerCode: "DHL_SUPPLY_CHAIN",
    providerName: "DHL Express & 3PL Supply Chain",
    adapterType: "GLOBAL_COURIER",
    status: "ACTIVE",
    apiProtocol: "MyDHL REST API + GS1-128 SSCC",
    supportsZplBarcode: true,
    supportsColdChain: true,
    avgTransitDays: 1.2,
    costPerDesiTry: 32.0,
    activeShipments: 41,
    onTimeSlaPercent: 99.4
  },
  {
    id: "log-03",
    providerCode: "YURTICI_KURUMSAL",
    providerName: "Yurtiçi Kargo Kurumsal ERP WebServis",
    adapterType: "DOMESTIC_CARGO",
    status: "ACTIVE",
    apiProtocol: "SOAP / REST Bridge + Otomatik Barkod",
    supportsZplBarcode: true,
    supportsColdChain: false,
    avgTransitDays: 1.6,
    costPerDesiTry: 19.8,
    activeShipments: 185,
    onTimeSlaPercent: 96.8
  },
  {
    id: "log-04",
    providerCode: "EKOL_3PL_WMS",
    providerName: "Ekol Lojistik 3PL Dış Depo & Kontrat Lojistiği",
    adapterType: "3PL_FULFILLMENT_CENTER",
    status: "ACTIVE",
    apiProtocol: "EDI DESADV / INVRPT + Webhook Sync",
    supportsZplBarcode: true,
    supportsColdChain: true,
    avgTransitDays: 1.4,
    costPerDesiTry: 21.0,
    activeShipments: 92,
    onTimeSlaPercent: 98.5
  }
]

export const INITIAL_EDOCUMENTS: GibEDocumentRecord[] = [
  {
    id: "edoc-01",
    ettnUuid: "e8a1b4c2-9012-4d3e-8f10-202611030001",
    documentNo: "IRS2026000000891",
    documentType: "E_IRSALIYE",
    profileId: "TEMELIRSALIYE",
    relatedOrderNo: "OMN-2026-9041",
    receiverTitle: "KoçSistem Bilgi ve İletişim Hizmetleri A.Ş.",
    receiverVkn: "5740091827",
    dispatchDate: "2026-11-03 10:45",
    carrierName: "UPS Hızlı Paket Taşımacılığı A.Ş.",
    vehiclePlate: "34 UPS 819",
    driverName: "Mustafa Demir",
    driverTckn: "28910482910",
    totalNetTry: 622500,
    totalVatTry: 124500,
    totalGrossTry: 747000,
    gibStatusCode: "1300",
    gibStatusText: "GİB Onaylı — Karekodlu Sevk E-İrsaliyesi Alıcıya İletildi",
    itemsSummary: "30 Adet WMS-HHT-X900 (LOT-X900-01 / LOT-X900-03)"
  },
  {
    id: "edoc-02",
    ettnUuid: "f9c2d5e1-4410-4a8b-9c22-202611030002",
    documentNo: "SNR2026000001481",
    documentType: "E_FATURA",
    profileId: "TICARIFATURA",
    relatedOrderNo: "OMN-2026-9041",
    receiverTitle: "KoçSistem Bilgi ve İletişim Hizmetleri A.Ş.",
    receiverVkn: "5740091827",
    dispatchDate: "2026-11-03 11:00",
    carrierName: "UPS Hızlı Paket Taşımacılığı A.Ş.",
    vehiclePlate: "34 UPS 819",
    driverName: "Mustafa Demir",
    driverTckn: "28910482910",
    totalNetTry: 622500,
    totalVatTry: 124500,
    totalGrossTry: 747000,
    gibStatusCode: "1300",
    gibStatusText: "GİB 1300 — Ticari E-Fatura Alıcı Posta Kutusuna Teslim Edildi",
    itemsSummary: "30 Adet SunumTech X900 Endüstriyel 2D & RFID El Terminali"
  },
  {
    id: "edoc-03",
    ettnUuid: "a1b2c3d4-7788-4e11-b009-202611030003",
    documentNo: "IRS2026000000893",
    documentType: "E_IRSALIYE",
    profileId: "TEMELIRSALIYE",
    relatedOrderNo: "OMN-2026-9043",
    receiverTitle: "Eczacıbaşı Monrol Nükleer Ürünler A.Ş.",
    receiverVkn: "3240551908",
    dispatchDate: "2026-11-03 13:30",
    carrierName: "Netlog Soğuk Zincir Lojistik A.Ş.",
    vehiclePlate: "41 FRG 402",
    driverName: "Hasan Çavuşoğlu",
    driverTckn: "41920394812",
    totalNetTry: 118000,
    totalVatTry: 23600,
    totalGrossTry: 141600,
    gibStatusCode: "1300",
    gibStatusText: "GİB Onaylı — Soğuk Zincir Sevk E-İrsaliyesi (+4°C Datalogger Ekli)",
    itemsSummary: "80 Bidon BioTherm Faz Değişim Jeli (LOT-BIO-2608)"
  }
]

