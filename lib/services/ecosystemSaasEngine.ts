/**
 * FAZ 6: Mimari Kalite, API Ekosistemi, Veri Geçişi (Migration) ve SaaS Lisanslama Motoru
 * - Dış sistemler ve IoT/RFID cihazları için Açık REST API Anahtarları ve HMAC-SHA256 Webhook Altyapısı
 * - Üçüncü Taraf Eklenti Mağazası (Plugin Marketplace)
 * - Eski ERP'lerden (Logo Tiger, Nebim V3, SAP B1, Odoo, Zoho, Excel/CSV) Otomatik Veri Geçiş Sihirbazı
 * - Sistem İçi İnteraktif Eğitim ve Simülasyon Modülü
 * - Depo sayısı, sipariş adedi, SKU limiti ve API işlem hacmine göre ölçeklenen Modüler SaaS Abonelik Yapısı
 */

export interface OpenApiKeyRecord {
  id: string
  name: string
  keyPrefix: string
  maskedKey: string
  iotOrSystemType: "RFID_GATE_READER" | "COLD_CHAIN_IOT" | "EXTERNAL_ERP_BRIDGE" | "B2B_PARTNER_API"
  scopes: string[]
  rateLimitPerMin: number
  requestsToday: number
  lastUsedAt: string
  isActive: boolean
}

export interface WebhookEndpointRecord {
  id: string
  name: string
  targetUrl: string
  secretHeader: string
  subscribedEvents: string[]
  isActive: boolean
  successCount: number
  failureCount: number
  lastStatusCode: number
  lastTriggeredAt: string
  lastPayloadSample: string
}

export interface MarketplacePluginItem {
  id: string
  slug: string
  name: string
  vendor: string
  category: "ECOMMERCE" | "LOGISTICS_3PL" | "HARDWARE_IOT" | "FINANCE_EFATURA" | "AI_ANALYTICS"
  description: string
  version: string
  isInstalled: boolean
  pricingTier: string
  rating: number
  installCount: number
  features: string[]
}

export interface ErpMigrationPreset {
  sourceSystem: "LOGO_TIGER" | "NEBIM_V3" | "SAP_B1" | "ODOO" | "ZOHO_INVENTORY" | "EXCEL_CSV"
  displayName: string
  vendorDescription: string
  sampleSourceTable: string
  defaultFieldMappings: Array<{
    sourceField: string
    targetField: string
    sampleValue: string
    transformRule: string
  }>
}

export interface ErpMigrationJobRecord {
  id: string
  sourceSystem: ErpMigrationPreset["sourceSystem"]
  jobName: string
  entitiesSelected: string[]
  totalRecordsFound: number
  validRecords: number
  warningRecords: number
  migratedRecords: number
  status: "COMPLETED" | "DRY_RUN_READY" | "ROLLED_BACK"
  executedAt: string
  validationNotes: string[]
}

export interface SaasTierDefinition {
  id: "starter" | "growth_wms" | "enterprise_omni"
  name: string
  monthlyPriceTry: number
  maxWarehouses: number
  maxActiveSkus: number
  maxMonthlyOrders: number
  maxMonthlyApiCalls: number
  includedModules: string[]
  badge?: string
}

export interface SaasUsageMetrics {
  activeTierId: SaasTierDefinition["id"]
  currentWarehouses: number
  maxWarehouses: number
  currentActiveSkus: number
  maxActiveSkus: number
  currentMonthlyOrders: number
  maxMonthlyOrders: number
  currentMonthlyApiCalls: number
  maxMonthlyApiCalls: number
  enabledModules: {
    coreInventory: boolean
    matrixAndLotTrace: boolean
    advancedWmsAndLpn: boolean
    offlineMobileTerminal: boolean
    smartProcurementAndConsignment: boolean
    omnichannelAnd3Pl: boolean
    foresightAiAndAma: boolean
    openApiAndWebhooks: boolean
  }
}

export const INITIAL_API_KEYS: OpenApiKeyRecord[] = [
  {
    id: "ak-01",
    name: "Tuzla Depo Zebra FX9600 UHF RFID Portal Okuyucu Geçidi",
    keyPrefix: "sk_live_iot_rfid_",
    maskedKey: "sk_live_iot_rfid_••••••••••••••••94a1",
    iotOrSystemType: "RFID_GATE_READER",
    scopes: ["wms:rfid_ingest", "wms:lpn_move", "inventory:read"],
    rateLimitPerMin: 3000,
    requestsToday: 14820,
    lastUsedAt: "2026-11-03 15:33:40",
    isActive: true
  },
  {
    id: "ak-02",
    name: "Gebze Soğuk Zincir (+2/+6°C) LoRaWAN Sıcaklık & Nem IoT Sensör Ağı",
    keyPrefix: "sk_live_iot_cold_",
    maskedKey: "sk_live_iot_cold_••••••••••••••••38c2",
    iotOrSystemType: "COLD_CHAIN_IOT",
    scopes: ["wms:telemetry_write", "inventory:quarantine_trigger"],
    rateLimitPerMin: 1200,
    requestsToday: 4320,
    lastUsedAt: "2026-11-03 15:34:00",
    isActive: true
  },
  {
    id: "ak-03",
    name: "Kurumsal B2B Bayi & 3PL Lojistik Canlı Stok Sorgu Anahtarı",
    keyPrefix: "sk_live_b2b_omni_",
    maskedKey: "sk_live_b2b_omni_••••••••••••••••71f9",
    iotOrSystemType: "B2B_PARTNER_API",
    scopes: ["inventory:read", "orders:write", "omnichannel:atp_sync"],
    rateLimitPerMin: 2400,
    requestsToday: 29450,
    lastUsedAt: "2026-11-03 15:34:12",
    isActive: true
  }
]

export const INITIAL_WEBHOOKS: WebhookEndpointRecord[] = [
  {
    id: "whk-01",
    name: "Omnichannel Gerçek Zamanlı ATP Stok Değişim Yayını",
    targetUrl: "https://api.sunum-omnichannel-hub.com/v2/webhooks/stock-delta",
    secretHeader: "whsec_sunum_hmac_99812a4b7c",
    subscribedEvents: ["stock.updated", "stock.low_alert", "variant.matrix_rollup"],
    isActive: true,
    successCount: 8420,
    failureCount: 2,
    lastStatusCode: 200,
    lastTriggeredAt: "2026-11-03 15:32:15",
    lastPayloadSample: JSON.stringify({
      event: "stock.updated",
      sku: "WMS-HHT-X900",
      warehouse: "DEP-IST-01",
      availableAtp: 40,
      timestamp: "2026-11-03T15:32:15Z"
    })
  },
  {
    id: "whk-02",
    name: "Ekol 3PL & UPS Otomatik Sevkiyat / LPN Mühürleme Bildirimi",
    targetUrl: "https://edi.ekol-3pl-bridge.com.tr/hooks/asn-desadv",
    secretHeader: "whsec_sunum_3pl_44109f2e1d",
    subscribedEvents: ["wms.lpn_sealed", "order.split_created", "edocument.irsaliye_approved"],
    isActive: true,
    successCount: 1290,
    failureCount: 0,
    lastStatusCode: 202,
    lastTriggeredAt: "2026-11-03 14:50:08",
    lastPayloadSample: JSON.stringify({
      event: "edocument.irsaliye_approved",
      documentNo: "IRS2026000000891",
      lpnCode: "LPN-TR-2026-00890",
      carrier: "UPS_EXPRESS"
    })
  }
]

export const INITIAL_MARKETPLACE_PLUGINS: MarketplacePluginItem[] = [
  {
    id: "plg-01",
    slug: "zebra-savanna-rfid-wedge",
    name: "Zebra Savanna & Impinj UHF RFID Otomatik Kapı Geçidi",
    vendor: "Zebra Technologies & Sunum Labs",
    category: "HARDWARE_IOT",
    description: "Depo kapılarından geçen paletlerin LPN ve EPC etiketlerini saniyede 800 okuma hızıyla otomatik mal kabul/sevkiyata işler.",
    version: "3.2.0",
    isInstalled: true,
    pricingTier: "Enterprise Pakete Dahil",
    rating: 4.95,
    installCount: 1840,
    features: ["Saniyede 800+ RFID Etiket Okuma", "Otomatik LPN Doğrulama", "Çevrimdışı Tampon Bellek"]
  },
  {
    id: "plg-02",
    slug: "gib-ubltr-sovos-foriba",
    name: "Sovos / Foriba & QNB eFinans GİB UBL-TR 2.1 E-İrsaliye Köprüsü",
    vendor: "Sunum E-Dönüşüm Ekosistemi",
    category: "FINANCE_EFATURA",
    description: "WMS paketleme tamamlandığı anda şoför TCKN, plaka ve karekodlu GİB E-İrsaliye / E-Fatura belgesini 1 saniyede üretir.",
    version: "2.8.4",
    isInstalled: true,
    pricingTier: "Ücretsiz / Dahil",
    rating: 4.9,
    installCount: 3420,
    features: ["Karekodlu Sevk E-İrsaliyesi", "İhracat Gümrük UBL-TR", "Otomatik Zarf Durum Sorgu"]
  },
  {
    id: "plg-03",
    slug: "cin7-trendyol-hepsiburada-turbo",
    name: "Omnichannel Pazaryeri Turbo ATP Senkronizatörü",
    vendor: "Sunum Commerce Cloud",
    category: "ECOMMERCE",
    description: "Trendyol, Hepsiburada, Amazon, Pazarama ve Shopify stoklarını güvenlik tamponuyla 100ms altında senkronize eder.",
    version: "4.1.0",
    isInstalled: true,
    pricingTier: "Ücretsiz / Dahil",
    rating: 4.92,
    installCount: 4150,
    features: ["Çifte Satış (Oversell) Koruması", "Kanal Bazlı Fiyat & Tampon", "Parçalı Sipariş Bölme"]
  },
  {
    id: "plg-04",
    slug: "mettler-toledo-scale-bridge",
    name: "Mettler Toledo & Densi Endüstriyel Terazi / Desi Ölçer Entegrasyonu",
    vendor: "Sunum IoT Connect",
    category: "HARDWARE_IOT",
    description: "Paketleme masasında kolinin ağırlık ve 3B hacim (desi) bilgisini RS232/TCP üzerinden otomatik okuyup kargo etiketine yazar.",
    version: "1.9.2",
    isInstalled: false,
    pricingTier: "1.500 ₺ / Ay",
    rating: 4.85,
    installCount: 920,
    features: ["Otomatik Desi & Ağırlık Hesabı", "Kargo Navlun Maliyet Kontrolü", "Ağırlık Sapma Kalite Kilidi"]
  },
  {
    id: "plg-05",
    slug: "oracle-sap-edifact-3pl",
    name: "Global 3PL EDIFACT (DESADV / INVRPT / ORDERS) Adaptörü",
    vendor: "Sunum Enterprise Integration",
    category: "LOGISTICS_3PL",
    description: "Uluslararası 3PL lojistik depoları ve gümrüklü antrepolarla çift yönlü EDI/AS2 mesajlaşması sağlar.",
    version: "2.4.0",
    isInstalled: false,
    pricingTier: "2.500 ₺ / Ay",
    rating: 4.88,
    installCount: 640,
    features: ["AS2 / SFTP EDI Köprüsü", "Antrepo & Serbest Bölge Takibi", "Otomatik Stok Mutabakatı"]
  }
]

export const ERP_MIGRATION_PRESETS: ErpMigrationPreset[] = [
  {
    sourceSystem: "LOGO_TIGER",
    displayName: "Logo Tiger 3 / Wings / DEYS WMS",
    vendorDescription: "LG_XXX_ITEMS, LG_XXX_ITMUNITA, LG_XXX_STLINE ve DEYS raf adres tablolarını otomatik dönüştürür.",
    sampleSourceTable: "LG_001_ITEMS & LG_001_01_STINVTOT",
    defaultFieldMappings: [
      { sourceField: "LG_001_ITEMS.CODE", targetField: "InventoryItem.sku", sampleValue: "MTX-PRO-JACKET", transformRule: "Trim + Uppercase Unique Check" },
      { sourceField: "LG_001_ITEMS.NAME", targetField: "InventoryItem.name", sampleValue: "Endüstriyel Pro-Shield Mont", transformRule: "UTF-8 Türkçe Karakter Düzeltme" },
      { sourceField: "LG_001_ITMUNITA.CONVFACT1/2", targetField: "UnitConversion.multiplier", sampleValue: "1 Koli = 12 Adet", transformRule: "Çoklu Birim Çarpan Hesabı" },
      { sourceField: "LG_001_SLTRANS.SLCODE", targetField: "LotSerialRecord.lotNumber", sampleValue: "LOT-2609-A1", transformRule: "Lot/Seri & SKT Tarih Eşleştirme" },
      { sourceField: "LG_001_STINVTOT.ONHAND", targetField: "StockBalance.onHandQty", sampleValue: "310 Adet (DEP-IST-01)", transformRule: "Ambar No -> Warehouse Eşleştirme" }
    ]
  },
  {
    sourceSystem: "NEBIM_V3",
    displayName: "Nebim V3 Perakende & Toptan",
    vendorDescription: "prItemVariant, cdItem, Renk/Beden (ColorCode/ItemDim1Code) matrisini ve konsinye mağaza stoklarını aktarır.",
    sampleSourceTable: "cdItem + prItemVariant + trStock",
    defaultFieldMappings: [
      { sourceField: "cdItem.ItemCode", targetField: "InventoryItem.parentItemId", sampleValue: "MTX-PRO-JACKET", transformRule: "Matrix Ana Ürün Oluşturma" },
      { sourceField: "prItemVariant.ColorCode + ItemDim1Code", targetField: "InventoryItem.variantAttributes", sampleValue: '{"renk":"Gece Mavisi","beden":"M"}', transformRule: "Renk x Beden JSON Dönüşümü" },
      { sourceField: "prItemBarcode.Barcode", targetField: "InventoryItem.barcode", sampleValue: "8690001100018", transformRule: "EAN-13 / GTIN Doğrulama" }
    ]
  },
  {
    sourceSystem: "SAP_B1",
    displayName: "SAP Business One (OITM / OITW / OBTN)",
    vendorDescription: "OITM (Stok), OITW (Depo), OBTN (Parti/Lot), OSRN (Seri) ve OITT/ITT1 (BOM Ürün Ağacı) tablolarını aktarır.",
    sampleSourceTable: "OITM + OITW + OBTN + ITT1",
    defaultFieldMappings: [
      { sourceField: "OITM.ItemCode", targetField: "InventoryItem.sku", sampleValue: "WMS-HHT-X900", transformRule: "Birebir Anahtar Eşleştirme" },
      { sourceField: "OITM.EvalSystem", targetField: "InventoryItem.valuationMethod", sampleValue: "F -> FIFO / A -> WEIGHTED_AVERAGE", transformRule: "Maliyet Yöntemi Haritalama" },
      { sourceField: "OITT.Code + ITT1.Code", targetField: "BomHeader & BomComponent", sampleValue: "BOM-WMS-X900-V2", transformRule: "Çok Seviyeli Ürün Ağacı İçe Aktarımı" }
    ]
  },
  {
    sourceSystem: "ODOO",
    displayName: "Odoo Inventory & MRP (product.template / stock.quant)",
    vendorDescription: "product.template, product.product varyantlarını, stock.quant bin lokasyonlarını ve mrp.bom reçetelerini çeker.",
    sampleSourceTable: "product.product + stock.quant + stock.lot",
    defaultFieldMappings: [
      { sourceField: "product.product.default_code", targetField: "InventoryItem.sku", sampleValue: "BIO-THERM-GEL-5L", transformRule: "SKU Normalizasyonu" },
      { sourceField: "stock.location.complete_name", targetField: "StorageBin.binCode", sampleValue: "GBZ-Z3-C01-R01-L01-B02", transformRule: "Hiyerarşik Raf Adresi Çözümleme" }
    ]
  },
  {
    sourceSystem: "ZOHO_INVENTORY",
    displayName: "Zoho Inventory & Cin7 Core",
    vendorDescription: "Composite items, item groups, multi-warehouse stock ve yeniden sipariş noktası (reorder level) kurallarını aktarır.",
    sampleSourceTable: "items_export.json / CSV",
    defaultFieldMappings: [
      { sourceField: "item.sku", targetField: "InventoryItem.sku", sampleValue: "CMP-LION-6000MAH", transformRule: "Doğrudan Eşleşme" },
      { sourceField: "item.reorder_level", targetField: "ReorderPolicy.calculatedRop", sampleValue: "100", transformRule: "ROP Başlangıç Değeri Atama" }
    ]
  }
]

export const INITIAL_MIGRATION_JOBS: ErpMigrationJobRecord[] = [
  {
    id: "mig-01",
    sourceSystem: "LOGO_TIGER",
    jobName: "Logo Tiger 3 Enterprise + DEYS WMS Tam Veri Geçişi",
    entitiesSelected: ["Stok Kartları", "Çoklu Birim (Koli/Palet)", "Ambar & Raf Bakiyeleri", "Lot/SKT Kayıtları", "FIFO Maliyet Katmanları"],
    totalRecordsFound: 4820,
    validRecords: 4820,
    warningRecords: 14,
    migratedRecords: 4820,
    status: "COMPLETED",
    executedAt: "2026-10-28 22:15",
    validationNotes: [
      "4.820 kayıt içinde 14 stok kartında eksik GTIN barkodu otomatik EAN-13校验 ile tamamlandı.",
      "Ambar bakiyeleri FIFO maliyet katmanlarıyla %100 mutabık olarak aktarıldı."
    ]
  },
  {
    id: "mig-02",
    sourceSystem: "NEBIM_V3",
    jobName: "Nebim V3 Renk/Beden Varyant Matrisi & Konsinye Mağaza Aktarımı",
    entitiesSelected: ["Matrix Ana Ürünler", "Renk/Beden Varyantları", "Konsinye Sözleşmeleri"],
    totalRecordsFound: 1950,
    validRecords: 1950,
    warningRecords: 0,
    migratedRecords: 1950,
    status: "COMPLETED",
    executedAt: "2026-11-01 19:40",
    validationNotes: [
      "312 ana model ve 1.638 alt renk/beden varyantı ebeveyn-alt madde (Matrix) ilişkisiyle oluşturuldu."
    ]
  }
]

export const SAAS_TIERS: SaasTierDefinition[] = [
  {
    id: "starter",
    name: "KOBİ Başlangıç (Core Stock)",
    monthlyPriceTry: 4900,
    maxWarehouses: 2,
    maxActiveSkus: 2500,
    maxMonthlyOrders: 1500,
    maxMonthlyApiCalls: 50000,
    includedModules: [
      "Çoklu Depo (2 Depo) & Anlık Stok",
      "Varyant Matrisi & Çoklu Birim",
      "Temel Barkod & Sayım",
      "Standart Yeniden Sipariş Uyarıları"
    ]
  },
  {
    id: "growth_wms",
    name: "Profesyonel WMS & Omnichannel",
    monthlyPriceTry: 14900,
    maxWarehouses: 10,
    maxActiveSkus: 50000,
    maxMonthlyOrders: 25000,
    maxMonthlyApiCalls: 1000000,
    badge: "En Çok Tercih Edilen",
    includedModules: [
      "10 Depo + Çok Katmanlı Raf/Bin Adresleme",
      "Lot/Seri/SKT (FEFO) & BOM FIFO/LIFO Motoru",
      "Offline Mobil Saha Terminali (Barkod/QR/RFID)",
      "Omnichannel Pazaryeri Senkronu & E-İrsaliye",
      "Dinamik Mevsimsel ROP & Konsinye Takibi"
    ]
  },
  {
    id: "enterprise_omni",
    name: "Kurumsal Enterprise + ForesightAI",
    monthlyPriceTry: 29900,
    maxWarehouses: 999,
    maxActiveSkus: 1000000,
    maxMonthlyOrders: 500000,
    maxMonthlyApiCalls: 10000000,
    badge: "Tam Kapasite AI",
    includedModules: [
      "Sınırsız Depo, 3PL Antrepo & LPN Palet Yönetimi",
      "ForesightAI Talep Tahminleme & Stok Optimizasyonu",
      "Ask Me Anything (AMA) Doğal Dil AI Asistanı",
      "AI Yönetici Rapor Anlatıları (Narrative Reporting)",
      "Açık REST API, IoT/RFID Geçidi & ERP Veri Geçiş Sihirbazı"
    ]
  }
]

export const INITIAL_SAAS_USAGE: SaasUsageMetrics = {
  activeTierId: "enterprise_omni",
  currentWarehouses: 5,
  maxWarehouses: 15,
  currentActiveSkus: 3740,
  maxActiveSkus: 50000,
  currentMonthlyOrders: 14820,
  maxMonthlyOrders: 50000,
  currentMonthlyApiCalls: 485900,
  maxMonthlyApiCalls: 2500000,
  enabledModules: {
    coreInventory: true,
    matrixAndLotTrace: true,
    advancedWmsAndLpn: true,
    offlineMobileTerminal: true,
    smartProcurementAndConsignment: true,
    omnichannelAnd3Pl: true,
    foresightAiAndAma: true,
    openApiAndWebhooks: true
  }
}

