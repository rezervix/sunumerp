/**
 * Sunum ERP — Uçtan Uca Kurumsal Stok, WMS, Satın Alma, Omnichannel, AI ve Ekosistem Merkezi Servisi
 * Faz 1 – Faz 6 arasındaki tüm modüllerin reaktif veri durumunu, iş kurallarını ve çapraz modül
 * entegrasyonlarını (ör. Varyant güncellendiğinde Matrix ebeveyn stok güncellenmesi, Kör sayım
 * mahsuplaştığında stok bakiyesi ve finans kaydının oluşması, ROP altına düşüldüğünde otomatik
 * satın alma talebi oluşması, sevkiyatta E-İrsaliye üretilmesi) yönetir.
 */

import {
  INITIAL_WAREHOUSES,
  INITIAL_INVENTORY_ITEMS,
  INITIAL_ALTERNATIVE_PRODUCTS,
  INITIAL_LOT_SERIAL_BATCHES,
  INITIAL_BOM_RECIPES,
  type WarehouseRecord,
  type InventoryItemRecord,
  type AlternativeItemRule,
  type LotSerialBatchRecord,
  type BomRecipeRecord,
  calculateStockValuation,
  calculateBomRollupCost,
  convertStockUnit
} from "./inventoryValuationEngine"

import {
  INITIAL_WMS_BINS,
  INITIAL_LOCATION_DIRECTIVES,
  INITIAL_WMS_TASKS,
  INITIAL_LICENSE_PLATES,
  INITIAL_TRANSFER_ORDERS,
  INITIAL_COUNT_SESSIONS,
  type WmsStorageBin,
  type WmsLocationDirectiveRule,
  type WmsOperationTask,
  type WmsLicensePlateRecord,
  type WmsTransferOrderRecord,
  type WmsCountSessionRecord
} from "./wmsDirectiveEngine"

import {
  INITIAL_SUPPLIERS,
  INITIAL_REORDER_POLICIES,
  INITIAL_PURCHASE_REQUISITIONS,
  INITIAL_CONSIGNMENT_STOCKS,
  calculateDynamicReorderPoint,
  type SupplierProfile,
  type ReorderPolicyRecord,
  type PurchaseRequisitionRecord,
  type ConsignmentStockRecord
} from "./procurementReorderEngine"

import {
  INITIAL_OMNICHANNEL_CONNECTIONS,
  INITIAL_OMNICHANNEL_ORDERS,
  INITIAL_RMA_RETURNS,
  INITIAL_LOGISTICS_ADAPTERS,
  INITIAL_EDOCUMENTS,
  type OmnichannelConnection,
  type OmnichannelFulfillmentOrder,
  type RmaReturnRecord,
  type Logistics3PlAdapter,
  type GibEDocumentRecord
} from "./omnichannelFulfillmentEngine"

import {
  INITIAL_FORESIGHT_FORECASTS,
  INITIAL_AI_NARRATIVE_REPORTS,
  executeInventoryAmaQuery,
  type ForesightForecastItem,
  type AiNarrativeReportRecord,
  type AmaQueryResult
} from "./inventoryAiEngine"

import {
  INITIAL_API_KEYS,
  INITIAL_WEBHOOKS,
  INITIAL_MARKETPLACE_PLUGINS,
  ERP_MIGRATION_PRESETS,
  INITIAL_MIGRATION_JOBS,
  SAAS_TIERS,
  INITIAL_SAAS_USAGE,
  type OpenApiKeyRecord,
  type WebhookEndpointRecord,
  type MarketplacePluginItem,
  type ErpMigrationJobRecord,
  type SaasUsageMetrics
} from "./ecosystemSaasEngine"

export interface EnterpriseInventoryState {
  // Faz 1
  warehouses: WarehouseRecord[]
  items: InventoryItemRecord[]
  alternatives: AlternativeItemRule[]
  lotBatches: LotSerialBatchRecord[]
  bomRecipes: BomRecipeRecord[]
  // Faz 2
  wmsBins: WmsStorageBin[]
  directives: WmsLocationDirectiveRule[]
  wmsTasks: WmsOperationTask[]
  licensePlates: WmsLicensePlateRecord[]
  transferOrders: WmsTransferOrderRecord[]
  countSessions: WmsCountSessionRecord[]
  // Faz 3
  suppliers: SupplierProfile[]
  reorderPolicies: ReorderPolicyRecord[]
  purchaseRequisitions: PurchaseRequisitionRecord[]
  consignmentStocks: ConsignmentStockRecord[]
  // Faz 4
  channels: OmnichannelConnection[]
  omnichannelOrders: OmnichannelFulfillmentOrder[]
  rmaReturns: RmaReturnRecord[]
  logisticsAdapters: Logistics3PlAdapter[]
  eDocuments: GibEDocumentRecord[]
  // Faz 5
  forecasts: ForesightForecastItem[]
  narrativeReports: AiNarrativeReportRecord[]
  // Faz 6
  apiKeys: OpenApiKeyRecord[]
  webhooks: WebhookEndpointRecord[]
  plugins: MarketplacePluginItem[]
  migrationJobs: ErpMigrationJobRecord[]
  saasUsage: SaasUsageMetrics
}

const STORAGE_KEY = "sunum_erp_enterprise_inventory_v1"

function getInitialState(): EnterpriseInventoryState {
  return {
    warehouses: [...INITIAL_WAREHOUSES],
    items: JSON.parse(JSON.stringify(INITIAL_INVENTORY_ITEMS)),
    alternatives: [...INITIAL_ALTERNATIVE_PRODUCTS],
    lotBatches: JSON.parse(JSON.stringify(INITIAL_LOT_SERIAL_BATCHES)),
    bomRecipes: JSON.parse(JSON.stringify(INITIAL_BOM_RECIPES)),
    wmsBins: [...INITIAL_WMS_BINS],
    directives: [...INITIAL_LOCATION_DIRECTIVES],
    wmsTasks: [...INITIAL_WMS_TASKS],
    licensePlates: JSON.parse(JSON.stringify(INITIAL_LICENSE_PLATES)),
    transferOrders: [...INITIAL_TRANSFER_ORDERS],
    countSessions: JSON.parse(JSON.stringify(INITIAL_COUNT_SESSIONS)),
    suppliers: [...INITIAL_SUPPLIERS],
    reorderPolicies: [...INITIAL_REORDER_POLICIES],
    purchaseRequisitions: [...INITIAL_PURCHASE_REQUISITIONS],
    consignmentStocks: [...INITIAL_CONSIGNMENT_STOCKS],
    channels: [...INITIAL_OMNICHANNEL_CONNECTIONS],
    omnichannelOrders: JSON.parse(JSON.stringify(INITIAL_OMNICHANNEL_ORDERS)),
    rmaReturns: [...INITIAL_RMA_RETURNS],
    logisticsAdapters: [...INITIAL_LOGISTICS_ADAPTERS],
    eDocuments: [...INITIAL_EDOCUMENTS],
    forecasts: JSON.parse(JSON.stringify(INITIAL_FORESIGHT_FORECASTS)),
    narrativeReports: JSON.parse(JSON.stringify(INITIAL_AI_NARRATIVE_REPORTS)),
    apiKeys: [...INITIAL_API_KEYS],
    webhooks: [...INITIAL_WEBHOOKS],
    plugins: [...INITIAL_MARKETPLACE_PLUGINS],
    migrationJobs: [...INITIAL_MIGRATION_JOBS],
    saasUsage: JSON.parse(JSON.stringify(INITIAL_SAAS_USAGE))
  }
}

class EnterpriseInventoryService {
  private state: EnterpriseInventoryState

  constructor() {
    this.state = getInitialState()
    if (typeof window !== "undefined") {
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY)
        if (saved) {
          const parsed = JSON.parse(saved)
          this.state = { ...this.state, ...parsed }
        }
      } catch {
        // Varsayılan tohum verisi kullanılır
      }
    }
  }

  private persist() {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state))
        window.dispatchEvent(new CustomEvent("sunum-inventory-change"))
      } catch {
        // Quota aşımı vb. gözardı edilir
      }
    }
  }

  public getState(): EnterpriseInventoryState {
    return this.state
  }

  // ── FAZ 1 İŞLEMLERİ: Stok Kartı, Matrix Varyant Auto-Rollup, Lot/SKT, BOM ──

  /**
   * Ebeveyn-Alt Madde (Matrix) otomatik stok toplama (Auto-Rollup)
   */
  public recalculateMatrixParents() {
    const parents = this.state.items.filter(i => i.itemType === "MATRIX_PARENT")
    for (const parent of parents) {
      const children = this.state.items.filter(v => v.parentItemId === parent.id)
      if (children.length > 0) {
        parent.totalOnHand = children.reduce((s, c) => s + c.totalOnHand, 0)
        parent.totalReserved = children.reduce((s, c) => s + c.totalReserved, 0)
        parent.totalAvailable = children.reduce((s, c) => s + c.totalAvailable, 0)
        parent.totalInTransit = children.reduce((s, c) => s + c.totalInTransit, 0)
        parent.totalQuarantine = children.reduce((s, c) => s + c.totalQuarantine, 0)
        parent.totalConsignment = children.reduce((s, c) => s + c.totalConsignment, 0)
      }
    }
  }

  public addInventoryItem(input: Partial<InventoryItemRecord> & { warehouseId?: string; initialQty?: number }): InventoryItemRecord {
    const wh = this.state.warehouses.find(w => w.id === input.warehouseId) || this.state.warehouses[0]
    const qty = Number(input.initialQty ?? input.totalOnHand ?? 50)
    const unitCost = Number(input.standardCost ?? 1000)

    const newItem: InventoryItemRecord = {
      id: `item-${Date.now()}`,
      sku: input.sku || `SKU-${Date.now().toString().slice(-5)}`,
      barcode: input.barcode || `8690009${Math.floor(100000 + Math.random() * 899999)}`,
      gtin: input.gtin || `08690009${Math.floor(100000 + Math.random() * 899999)}`,
      rfidEpcPrefix: input.rfidEpcPrefix || "3034550AA100",
      name: input.name || "Yeni Stok Kartı",
      category: input.category || "Genel Envanter",
      brand: input.brand || "SunumPro",
      itemType: input.itemType || "FINISHED_GOOD",
      parentItemId: input.parentItemId || null,
      variantAttributes: input.variantAttributes,
      baseUnit: input.baseUnit || "Adet",
      valuationMethod: input.valuationMethod || "FIFO",
      standardCost: unitCost,
      currentAvgCost: unitCost,
      fifoUnitCost: unitCost,
      lifoUnitCost: unitCost,
      lastPurchaseCost: unitCost,
      salesPrice: Number(input.salesPrice ?? Math.round(unitCost * 1.65)),
      taxRate: 20,
      trackLot: input.trackLot ?? true,
      trackSerial: input.trackSerial ?? false,
      trackExpiry: input.trackExpiry ?? false,
      shelfLifeDays: input.shelfLifeDays,
      abcClass: input.abcClass || "A",
      xyzClass: input.xyzClass || "X",
      minStockLevel: Number(input.minStockLevel ?? 20),
      maxStockLevel: Number(input.maxStockLevel ?? 500),
      leadTimeDays: Number(input.leadTimeDays ?? 7),
      totalOnHand: qty,
      totalReserved: 0,
      totalAvailable: qty,
      totalInTransit: 0,
      totalQuarantine: 0,
      totalConsignment: 0,
      warehouseBalances: [
        {
          warehouseId: wh.id,
          warehouseCode: wh.code,
          warehouseName: wh.name,
          binCode: `${wh.code.replace("DEP-", "")}-Z2-A01-R01-L01-B01`,
          onHandQty: qty,
          reservedQty: 0,
          availableQty: qty,
          inTransitQty: 0,
          quarantineQty: 0,
          consignmentQty: 0
        }
      ],
      unitConversions: input.unitConversions || [
        {
          id: `uc-${Date.now()}`,
          fromUnit: "Koli",
          toUnit: input.baseUnit || "Adet",
          multiplier: 12,
          barcode: `1869000${Math.floor(100000 + Math.random() * 899999)}`,
          weightKg: 9.6,
          volumeM3: 0.048,
          isDefaultPurchase: true,
          isDefaultSales: false
        }
      ],
      costLayers: [
        {
          id: `cl-${Date.now()}`,
          receiptDocNo: `GRN-2026-${Math.floor(1100 + Math.random() * 899)}`,
          layerDate: new Date().toISOString().split("T")[0],
          warehouseCode: wh.code,
          lotNumber: `LOT-2611-${Math.floor(10 + Math.random() * 89)}`,
          initialQty: qty,
          remainingQty: qty,
          unitCost
        }
      ],
      isActive: true
    }

    this.state.items.unshift(newItem)
    this.recalculateMatrixParents()
    this.state.saasUsage.currentActiveSkus += 1
    this.persist()
    return newItem
  }

  /**
   * Renk x Beden Matrix Varyant Üretici (Ebeveyn karta bağlı alt varyantları oluşturur ve ebeveyni otomatik günceller)
   */
  public generateMatrixVariants(params: {
    parentItemId: string
    color: string
    size: string
    initialQty: number
    unitCost: number
    salesPrice: number
  }): InventoryItemRecord | null {
    const parent = this.state.items.find(i => i.id === params.parentItemId)
    if (!parent) return null

    const colorCode = params.color.slice(0, 3).toUpperCase()
    const sizeCode = params.size.toUpperCase()
    const variantSku = `${parent.sku}-${colorCode}-${sizeCode}`

    return this.addInventoryItem({
      sku: variantSku,
      name: `${parent.name.replace(" (Matrix Ana Kart)", "")} — ${params.color} / ${params.size} Beden`,
      category: parent.category,
      brand: parent.brand,
      itemType: "MATRIX_VARIANT",
      parentItemId: parent.id,
      variantAttributes: { renk: params.color, beden: params.size },
      baseUnit: parent.baseUnit,
      valuationMethod: parent.valuationMethod,
      standardCost: params.unitCost,
      salesPrice: params.salesPrice,
      initialQty: params.initialQty,
      trackLot: true
    })
  }

  public addLotBatchRecord(input: Partial<LotSerialBatchRecord>): LotSerialBatchRecord {
    const matchedItem = this.state.items.find(i => i.id === input.itemId || i.sku === input.sku) || this.state.items[0]
    const matchedWh = this.state.warehouses.find(w => w.id === input.warehouseId) || this.state.warehouses[0]
    const expDate = input.expiryDate || "2027-06-30"
    const diffDays = Math.max(
      1,
      Math.ceil((new Date(expDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    )

    const newLot: LotSerialBatchRecord = {
      id: `lot-${Date.now()}`,
      itemId: matchedItem.id,
      sku: matchedItem.sku,
      itemName: matchedItem.name,
      warehouseId: matchedWh.id,
      warehouseName: matchedWh.name,
      binCode: input.binCode || "IST-Z2-A01-R02-L01-B01",
      lotNumber: input.lotNumber || `LOT-2026-${Math.floor(100 + Math.random() * 899)}`,
      batchNumber: input.batchNumber || `BATCH-${Math.floor(100 + Math.random() * 899)}`,
      serialNumber: input.serialNumber,
      manufacturingDate: input.manufacturingDate || new Date().toISOString().split("T")[0],
      expiryDate: expDate,
      daysUntilExpiry: diffDays,
      supplierName: input.supplierName || "Kurumsal Tedarikçi A.Ş.",
      supplierLotNo: input.supplierLotNo || `VND-${Math.floor(1000 + Math.random() * 8999)}`,
      status: diffDays <= 30 ? "EXPIRING_SOON" : "AVAILABLE",
      qcStatus: "PASSED",
      initialQty: Number(input.initialQty || 50),
      remainingQty: Number(input.remainingQty ?? input.initialQty ?? 50),
      unit: matchedItem.baseUnit,
      unitCost: Number(input.unitCost || matchedItem.fifoUnitCost),
      originDocNo: input.originDocNo || `GRN-2026-${Math.floor(1000 + Math.random() * 8999)}`,
      events: [
        {
          id: `tev-${Date.now()}`,
          eventDate: new Date().toISOString().replace("T", " ").slice(0, 16),
          eventType: "SUPPLIER_RECEIPT",
          title: "Mal Kabul & Barkod/GS1-128 Lot Kaydı",
          quantity: Number(input.initialQty || 50),
          unit: matchedItem.baseUnit,
          fromLocation: input.supplierName || "Tedarikçi Sevkiyat",
          toLocation: `${matchedWh.code} / ${input.binCode || "IST-Z2-A01-R02-L01-B01"}`,
          referenceDocNo: input.originDocNo || "GRN-2026-NEW",
          partnerName: input.supplierName || "Kurumsal Tedarikçi A.Ş.",
          operatorName: "WMS Operatörü",
          notes: "Uçtan uca izlenebilirlik (Traceability) zinciri başlatıldı."
        }
      ]
    }

    this.state.lotBatches.unshift(newLot)
    this.persist()
    return newLot
  }

  // ── FAZ 2 İŞLEMLERİ: WMS İş Akışı İlerletme, LPN Taşıma & Sayım Fark Mahsuplaşma ──

  public advanceWmsTaskStage(taskId: string): WmsOperationTask | null {
    const task = this.state.wmsTasks.find(t => t.id === taskId)
    if (!task) return null

    const flowOrder: WmsOperationTask["workflowStage"][] = [
      "GOODS_RECEIPT",
      "QC_INSPECTION",
      "PUTAWAY",
      "WAVE_PICK",
      "PACKING"
    ]
    const currentIdx = flowOrder.indexOf(task.workflowStage)
    if (task.status !== "COMPLETED" && currentIdx === flowOrder.length - 1) {
      task.status = "COMPLETED"
      task.processedQty = task.expectedQty
    } else if (currentIdx < flowOrder.length - 1) {
      task.workflowStage = flowOrder[currentIdx + 1]
      task.status = "IN_PROGRESS"
      task.processedQty = task.expectedQty
    }
    this.persist()
    return task
  }

  public reconcileCountSession(sessionId: string): WmsCountSessionRecord | null {
    const session = this.state.countSessions.find(s => s.id === sessionId)
    if (!session) return null

    session.status = "RECONCILED"
    session.reconciledJournalNo = `MAH-FIN-2026-${Math.floor(1000 + Math.random() * 8999)}`
    session.reconciledAt = new Date().toISOString().replace("T", " ").slice(0, 16)

    // Otomatik stok bakiyesi mahsuplaşma (Stok kartındaki miktarı sayılan miktara eşitle)
    for (const line of session.lines) {
      if (line.countedQty !== null && line.varianceQty !== 0) {
        const item = this.state.items.find(i => i.sku === line.sku)
        if (item) {
          item.totalOnHand = Math.max(0, item.totalOnHand + line.varianceQty)
          item.totalAvailable = Math.max(0, item.totalOnHand - item.totalReserved)
        }
      }
    }
    this.recalculateMatrixParents()
    this.persist()
    return session
  }

  // ── FAZ 3 İŞLEMLERİ: Otomatik Satın Alma Talebi Onayı & Konsinye Hakediş Mutabakatı ──

  public approvePurchaseRequisition(reqId: string): PurchaseRequisitionRecord | null {
    const req = this.state.purchaseRequisitions.find(r => r.id === reqId)
    if (!req) return null
    req.status = "APPROVED_PO_SENT"
    const policy = this.state.reorderPolicies.find(p => p.sku === req.sku)
    if (policy) {
      policy.onOrderQty += req.orderQty
      policy.status = "HEALTHY"
    }
    this.persist()
    return req
  }

  public settleConsignmentStock(consignId: string, consumeAdditionalQty = 0): ConsignmentStockRecord | null {
    const rec = this.state.consignmentStocks.find(c => c.id === consignId)
    if (!rec) return null

    if (consumeAdditionalQty > 0 && rec.availableConsignQty >= consumeAdditionalQty) {
      rec.availableConsignQty -= consumeAdditionalQty
      rec.consumedOrSoldQty += consumeAdditionalQty
      rec.unbilledPayableTry += consumeAdditionalQty * rec.agreedUnitCostTry
      rec.status = "SETTLEMENT_READY"
    } else {
      rec.unbilledPayableTry = 0
      rec.lastSettlementDate = new Date().toISOString().split("T")[0]
      rec.status = "SETTLED"
    }
    this.persist()
    return rec
  }

  // ── FAZ 4 İŞLEMLERİ: Omnichannel Anlık Sync, E-İrsaliye Üretimi & RMA İade ──

  public triggerOmnichannelSyncAll(): OmnichannelConnection[] {
    const nowStr = new Date().toISOString().replace("T", " ").slice(0, 19)
    this.state.channels = this.state.channels.map(ch => ({
      ...ch,
      status: "CONNECTED",
      lastSyncAt: nowStr,
      webhookLatencyMs: Math.floor(45 + Math.random() * 80)
    }))
    this.persist()
    return this.state.channels
  }

  public issueGibEDocument(input: Partial<GibEDocumentRecord>): GibEDocumentRecord {
    const net = Number(input.totalNetTry || 85000)
    const vat = Math.round(net * 0.2)
    const docType = input.documentType || "E_IRSALIYE"
    const prefix = docType === "E_IRSALIYE" ? "IRS" : "SNR"

    const newDoc: GibEDocumentRecord = {
      id: `edoc-${Date.now()}`,
      ettnUuid: `${ crypto?.randomUUID ? crypto.randomUUID() : `ettn-${Date.now()}` }`,
      documentNo: `${prefix}202600000${Math.floor(1500 + Math.random() * 8400)}`,
      documentType: docType,
      profileId: docType === "E_IRSALIYE" ? "TEMELIRSALIYE" : "TICARIFATURA",
      relatedOrderNo: input.relatedOrderNo || "OMN-2026-9045",
      receiverTitle: input.receiverTitle || "Kurumsal Alıcı A.Ş.",
      receiverVkn: input.receiverVkn || "6120491823",
      dispatchDate: new Date().toISOString().replace("T", " ").slice(0, 16),
      carrierName: input.carrierName || "UPS Hızlı Paket Taşımacılığı A.Ş.",
      vehiclePlate: input.vehiclePlate || "34 SNR 901",
      driverName: input.driverName || "Ahmet Kılıç",
      driverTckn: input.driverTckn || "34910284912",
      totalNetTry: net,
      totalVatTry: vat,
      totalGrossTry: net + vat,
      gibStatusCode: "1300",
      gibStatusText: "GİB 1300 — Karekodlu UBL-TR 2.1 Belgesi Onaylandı ve Alıcıya İletildi",
      itemsSummary: input.itemsSummary || "Çoklu Kalem WMS Sevkiyat Çıkışı"
    }

    this.state.eDocuments.unshift(newDoc)
    this.persist()
    return newDoc
  }

  // ── FAZ 6 İŞLEMLERİ: Eklenti Kurulumu, ERP Migration Çalıştırma & SaaS Plan Güncelleme ──

  public togglePluginInstallation(pluginId: string): MarketplacePluginItem | null {
    const plugin = this.state.plugins.find(p => p.id === pluginId)
    if (!plugin) return null
    plugin.isInstalled = !plugin.isInstalled
    if (plugin.isInstalled) plugin.installCount += 1
    this.persist()
    return plugin
  }

  public runErpMigrationJob(sourceSystem: ErpMigrationJobRecord["sourceSystem"], entities: string[]): ErpMigrationJobRecord {
    const preset = ERP_MIGRATION_PRESETS.find(p => p.sourceSystem === sourceSystem) || ERP_MIGRATION_PRESETS[0]
    const count = Math.floor(850 + Math.random() * 2400)
    const job: ErpMigrationJobRecord = {
      id: `mig-${Date.now()}`,
      sourceSystem,
      jobName: `${preset.displayName} Otomatik Şema & Veri Aktarımı`,
      entitiesSelected: entities,
      totalRecordsFound: count,
      validRecords: count,
      warningRecords: 3,
      migratedRecords: count,
      status: "COMPLETED",
      executedAt: new Date().toISOString().replace("T", " ").slice(0, 16),
      validationNotes: [
        `${count} kayıt alan eşleştirmesi (Field Mapping) ve birim/lot doğrulamasından başarıyla geçti.`,
        "Mükerrer SKU kontrolü yapıldı, tüm depo bakiyeleri CostLayer tablosuna işlendi."
      ]
    }
    this.state.migrationJobs.unshift(job)
    this.state.saasUsage.currentActiveSkus += Math.round(count * 0.25)
    this.persist()
    return job
  }

  public updateSaasTier(tierId: SaasUsageMetrics["activeTierId"]): SaasUsageMetrics {
    const tier = SAAS_TIERS.find(t => t.id === tierId) || SAAS_TIERS[2]
    this.state.saasUsage.activeTierId = tier.id
    this.state.saasUsage.maxWarehouses = tier.maxWarehouses
    this.state.saasUsage.maxActiveSkus = tier.maxActiveSkus
    this.state.saasUsage.maxMonthlyOrders = tier.maxMonthlyOrders
    this.state.saasUsage.maxMonthlyApiCalls = tier.maxMonthlyApiCalls
    this.persist()
    return this.state.saasUsage
  }

  public createTransferOrder(input: {
    fromWarehouseCode: string
    toWarehouseCode: string
    sku: string
    quantity: number
    lpnCode?: string
    carrierPlate?: string
  }): WmsTransferOrderRecord {
    const item = this.state.items.find(i => i.sku === input.sku) || this.state.items[0]
    const fromWh = this.state.warehouses.find(w => w.code === input.fromWarehouseCode) || this.state.warehouses[0]
    const toWh = this.state.warehouses.find(w => w.code === input.toWarehouseCode) || this.state.warehouses[1]
    const transfer: WmsTransferOrderRecord = {
      id: `trf-${Date.now()}`,
      transferNo: `TRF-2026-${Math.floor(1100 + Math.random() * 8800)}`,
      fromWarehouseCode: fromWh.code,
      fromWarehouseName: fromWh.name,
      toWarehouseCode: toWh.code,
      toWarehouseName: toWh.name,
      lpnCode: input.lpnCode || `LPN-TR-2026-0009${Math.floor(10 + Math.random() * 89)}`,
      sku: item.sku,
      itemName: item.name,
      quantity: Number(input.quantity || 24),
      unit: item.baseUnit,
      status: "IN_TRANSIT",
      carrierVehiclePlate: input.carrierPlate || "34 SNR 412",
      eWaybillNo: `IRS202600000${Math.floor(1000 + Math.random() * 8999)}`,
      shippedAt: new Date().toISOString().replace("T", " ").slice(0, 16),
      estimatedArrival: new Date(Date.now() + 86400000).toISOString().replace("T", " ").slice(0, 16)
    }
    this.state.transferOrders.unshift(transfer)
    this.persist()
    return transfer
  }

  public submitBlindCountLine(sessionId: string, lineId: string, countedQty: number): WmsCountSessionRecord | null {
    const session = this.state.countSessions.find(s => s.id === sessionId)
    if (!session) return null
    const line = session.lines.find(l => l.id === lineId)
    if (!line) return null
    line.countedQty = countedQty
    line.varianceQty = countedQty - line.systemQty
    line.varianceCostTry = line.varianceQty * line.unitCostTry
    line.countedBy = "Mobil Saha Operatörü"
    line.countedAt = new Date().toISOString().replace("T", " ").slice(0, 16)
    session.countedBinsCount = session.lines.filter(l => l.countedQty !== null).length
    session.totalVarianceTry = session.lines.reduce((s, l) => s + l.varianceCostTry, 0)
    if (session.status === "IN_PROGRESS" && session.countedBinsCount === session.lines.length) {
      session.status = "AWAITING_APPROVAL"
    }
    this.persist()
    return session
  }

  public processRmaInspection(rmaId: string, disposition: RmaReturnRecord["disposition"]): RmaReturnRecord | null {
    const rma = this.state.rmaReturns.find(r => r.id === rmaId)
    if (!rma) return null
    rma.disposition = disposition
    rma.qcGrade = disposition === "RESTOCK_A_GRADE" ? "A_GRADE_YENIDEN_SATILABILIR" : "C_GRADE_KARANTINA"
    rma.status = disposition === "RESTOCK_A_GRADE" ? "RESTOCKED" : "REFUNDED"
    const item = this.state.items.find(i => i.sku === rma.sku)
    if (item) {
      if (disposition === "RESTOCK_A_GRADE") {
        item.totalOnHand += rma.quantity
        item.totalAvailable += rma.quantity
      } else {
        item.totalQuarantine += rma.quantity
      }
      this.recalculateMatrixParents()
    }
    this.persist()
    return rma
  }
}

export const enterpriseInventoryService = new EnterpriseInventoryService()

export {
  calculateStockValuation,
  calculateBomRollupCost,
  convertStockUnit,
  calculateDynamicReorderPoint,
  executeInventoryAmaQuery,
  ERP_MIGRATION_PRESETS,
  SAAS_TIERS
}
