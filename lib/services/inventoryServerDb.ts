/**
 * Sunucu Tarafı Envanter ve Veritabanı Entegrasyon Servisi
 * Bu servis sadece sunucu ortamında (API Routes, Server Actions) çalışır.
 * lib/db (Prisma) erişimini izole ederek istemci bileşenlerinin 'fs' modülü hatası almasını engeller.
 */

import { prisma } from "@/lib/db"
import {
  ValuationMethod,
  CostLayerRecord,
  calculateStockValuation,
  InventoryItemRecord,
  convertStockUnit,
  BomRecipeRecord,
  calculateBomRollupCost
} from "./inventoryValuationEngine"

/**
 * Veritabanından Canlı Değerleme (FIFO / LIFO / Ağırlıklı Ortalama) Hesaplayıcı
 */
export async function calculateItemValuationFromDb(
  itemId: string,
  issueQty = 1,
  method: ValuationMethod = "FIFO"
) {
  try {
    const item = await (prisma as any).inventoryItem.findUnique({
      where: { id: itemId },
      include: {
        costLayers: {
          where: { isExhausted: false },
          orderBy: { layerDate: "asc" }
        },
        stockBalances: {
          include: {
            warehouse: true,
            storageBin: true
          }
        },
        unitConversions: true
      }
    })

    if (!item) {
      throw new Error(`Ürün bulunamadı: ${itemId}`)
    }

    const rawLayers: CostLayerRecord[] = (item.costLayers || []).map((l: any) => ({
      id: l.id,
      receiptDocNo: l.receiptDocNo || "GRN",
      layerDate: l.layerDate instanceof Date ? l.layerDate.toISOString() : String(l.layerDate),
      warehouseCode: l.warehouseId,
      lotNumber: l.lotNumber || "GENEL",
      initialQty: Number(l.initialQty || 0),
      remainingQty: Number(l.remainingQty || 0),
      unitCost: Number(l.unitCost || 0)
    }))

    const valuation = calculateStockValuation(
      rawLayers,
      method || item.valuationMethod || "FIFO",
      Number(item.standardCost || item.currentAvgCost || 0),
      issueQty
    )

    const totalStock = (item.stockBalances || []).reduce((acc: number, b: any) => acc + Number(b.onHandQty || 0), 0)
    const totalAvailable = (item.stockBalances || []).reduce((acc: number, b: any) => acc + Number(b.availableQty || 0), 0)

    return {
      success: true,
      item: {
        id: item.id,
        sku: item.sku,
        name: item.name,
        baseUnit: item.baseUnit,
        totalStock,
        totalAvailable,
        salesPrice: Number(item.salesPrice || 0)
      },
      valuation
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Değerleme hesaplanırken hata oluştu"
    }
  }
}

/**
 * Veritabanından Canlı Birim Çevirici
 */
export async function convertStockUnitFromDb(
  itemId: string,
  quantity: number,
  fromUnit: string,
  toUnit: string
) {
  try {
    const item = await (prisma as any).inventoryItem.findUnique({
      where: { id: itemId },
      include: { unitConversions: true }
    })

    if (!item) {
      throw new Error(`Ürün bulunamadı: ${itemId}`)
    }

    const record: InventoryItemRecord = {
      ...item,
      variantAttributes: undefined,
      warehouseBalances: [],
      costLayers: [],
      unitConversions: (item.unitConversions || []).map((u: any) => ({
        id: u.id,
        fromUnit: u.fromUnit,
        toUnit: u.toUnit,
        multiplier: Number(u.multiplier || 1),
        barcode: u.barcode || "",
        weightKg: Number(u.weightKg || 0),
        volumeM3: Number(u.volumeM3 || 0),
        isDefaultPurchase: Boolean(u.isDefaultPurchase),
        isDefaultSales: Boolean(u.isDefaultSales)
      })),
      totalOnHand: 0,
      totalReserved: 0,
      totalAvailable: 0,
      totalInTransit: 0,
      totalQuarantine: 0,
      totalConsignment: 0
    }

    const result = convertStockUnit(record, quantity, fromUnit, toUnit)
    return { success: true, data: result }
  } catch (error: any) {
    return { success: false, error: error.message || "Birim çevrimi başarısız" }
  }
}

/**
 * Veritabanından Canlı BOM (Ürün Reçetesi) Roll-up Hesaplayıcı
 */
export async function calculateBomRollupFromDb(bomId: string, batchCount = 1) {
  try {
    const bom = await (prisma as any).bomHeader.findUnique({
      where: { id: bomId },
      include: {
        finishedItem: true,
        components: {
          include: {
            componentItem: {
              include: {
                stockBalances: true
              }
            }
          }
        }
      }
    })

    if (!bom) {
      throw new Error(`BOM reçetesi bulunamadı: ${bomId}`)
    }

    const components = (bom.components || []).map((comp: any) => {
      const cItem = comp.componentItem
      const availableStock = (cItem?.stockBalances || []).reduce(
        (sum: number, b: any) => sum + Number(b.availableQty || 0),
        0
      )
      return {
        id: comp.id,
        componentItemId: comp.componentItemId,
        componentSku: cItem?.sku || "SKU",
        componentName: cItem?.name || "Bileşen",
        itemType: cItem?.itemType || "RAW_MATERIAL",
        quantity: Number(comp.quantity || 1),
        unit: comp.unit || cItem?.baseUnit || "Adet",
        scrapPercent: Number(comp.scrapPercent || 0),
        fifoUnitCost: Number(cItem?.fifoUnitCost || cItem?.standardCost || 0),
        lifoUnitCost: Number(cItem?.lifoUnitCost || cItem?.standardCost || 0),
        avgUnitCost: Number(cItem?.currentAvgCost || cItem?.standardCost || 0),
        standardUnitCost: Number(cItem?.standardCost || 0),
        availableStock,
        operationStep: comp.operationStep || "Standart Montaj / Hazırlık"
      }
    })

    const bomRecord: BomRecipeRecord = {
      id: bom.id,
      code: bom.code,
      name: bom.name,
      version: bom.version,
      finishedItemId: bom.finishedItemId,
      finishedSku: bom.finishedItem?.sku || "SKU",
      finishedName: bom.finishedItem?.name || "Mamul",
      outputQty: Number(bom.outputQty || 1),
      outputUnit: bom.outputUnit || "Adet",
      laborCostPerBatch: Number(bom.laborCostPerBatch || 0),
      overheadCostPerBatch: Number(bom.overheadCostPerBatch || 0),
      scrapRatePercent: Number(bom.scrapRatePercent || 0),
      leadTimeHours: Number(bom.leadTimeHours || 1),
      components,
      isActive: Boolean(bom.isActive)
    }

    const rollup = calculateBomRollupCost(bomRecord, batchCount)
    return { success: true, bom: bomRecord, rollup }
  } catch (error: any) {
    return { success: false, error: error.message || "BOM maliyet hesaplama başarısız" }
  }
}

/**
 * İlk Çalıştırma İçin Gerçekçi KOBİ / Ticari Çiçek & Aranjman Tohum Verilerini (Seed) Yazar
 */
export async function seedRealisticInventoryData() {
  try {
    const existingItems = await (prisma as any).inventoryItem.findMany().catch(() => [])
    const existingSkus = new Set(existingItems.map((i: any) => i.sku))
    if (existingSkus.size >= 7 && existingSkus.has("GUL-EKV-01") && existingSkus.has("ARJ-VIP-07")) {
      return { seeded: false, message: "Veritabanında mevcut ürünler var, tohum verisi atlandı." }
    }

    // 1. Şube Kontrolü veya Oluşturma
    let branch = await (prisma as any).branch.findFirst().catch(() => null)
    if (!branch) {
      branch = await (prisma as any).branch.create({
        data: {
          id: "branch-hq-main",
          name: "Merkez Genel Merkez",
          code: "HQ-01",
          city: "İstanbul"
        }
      }).catch(() => ({ id: "local-debug-branch" }))
    }
    const branchId = branch?.id || "local-debug-branch"

    // 2. Depoları Bul veya Oluştur
    let whMerkez = await (prisma as any).warehouse.findFirst({ where: { code: "DEP-MRK-01" } }).catch(() => null)
    if (!whMerkez) {
      whMerkez = await (prisma as any).warehouse.create({
        data: {
          id: "wh-merkez-01",
          branchId,
          code: "DEP-MRK-01",
          name: "Merkez Soğuk Hava & Lojistik Deposu (+4°C)",
          type: "MAIN",
          city: "İstanbul / Tuzla",
          temperatureRange: "+2°C / +4°C (Soğuk Zincir)",
          capacityVolumeM3: 4500,
          usedVolumeM3: 1800,
          isDefault: true
        }
      })
    }

    let whKadikoy = await (prisma as any).warehouse.findFirst({ where: { code: "DEP-KDK-02" } }).catch(() => null)
    if (!whKadikoy) {
      whKadikoy = await (prisma as any).warehouse.create({
        data: {
          id: "wh-kadikoy-02",
          branchId,
          code: "DEP-KDK-02",
          name: "Kadıköy Mağaza & Hızlı Sevkiyat Deposu",
          type: "STORE",
          city: "İstanbul / Kadıköy",
          temperatureRange: "+18°C / +22°C (Oda Sıcaklığı)",
          capacityVolumeM3: 850,
          usedVolumeM3: 420,
          isDefault: false
        }
      })
    }

    let whAtolye = await (prisma as any).warehouse.findFirst({ where: { code: "DEP-ATL-03" } }).catch(() => null)
    if (!whAtolye) {
      whAtolye = await (prisma as any).warehouse.create({
        data: {
          id: "wh-atolye-03",
          branchId,
          code: "DEP-ATL-03",
          name: "Aranjman & Tasarım Üretim Atölyesi",
          type: "MANUFACTURING",
          city: "İstanbul / Ataşehir",
          temperatureRange: "+16°C / +20°C",
          capacityVolumeM3: 1200,
          usedVolumeM3: 650,
          isDefault: false
        }
      })
    }

    // 3. Raf / Göz (StorageBin) Tanımları
    const binsToEnsure = [
      { id: "bin-mrk-gul", warehouseId: whMerkez.id, code: "A-01-01", aisle: "A", rack: "01", level: "01", position: "Zemin Soğuk Hücre" },
      { id: "bin-mrk-lil", warehouseId: whMerkez.id, code: "A-01-02", aisle: "A", rack: "01", level: "02", position: "Orta Raf" },
      { id: "bin-kdk-show", warehouseId: whKadikoy.id, code: "M-01-01", aisle: "M", rack: "01", level: "01", position: "Vitrin Standı" },
      { id: "bin-atl-tezgah", warehouseId: whAtolye.id, code: "T-01-01", aisle: "T", rack: "01", level: "01", position: "Tasarım Tezgahı" },
    ]

    for (const b of binsToEnsure) {
      const exists = await (prisma as any).storageBin.findFirst({ where: { code: b.code, warehouseId: b.warehouseId } }).catch(() => null)
      if (!exists) {
        await (prisma as any).storageBin.create({
          data: {
            id: b.id,
            warehouseId: b.warehouseId,
            zoneId: "zone-cold",
            code: b.code,
            aisle: b.aisle,
            rack: b.rack,
            level: b.level,
            binPosition: b.position,
            binType: "COLD_CELL"
          }
        }).catch(() => null)
      }
    }

    // 4. KOBİ / Ticari Çiçek & Aranjman Ürünleri (Ürün + InventoryItem + Bakiye + Maliyet Katmanı)
    
    // ÜRÜN 1: Ekvator Kırmızı Gül
    let prod1 = await (prisma as any).product.findFirst({ where: { sku: "GUL-EKV-01" } }).catch(() => null)
    if (!prod1) {
      prod1 = await (prisma as any).product.create({
        data: {
          id: "prod-gul-01",
          name: "Ekvator Kırmızı Gül (1. Kalite - 60cm)",
          sku: "GUL-EKV-01",
          price: 45,
          unit: "Demet",
          stock: 120,
          category: "Kesme Çiçek"
        }
      })
    }

    let itemGul = await (prisma as any).inventoryItem.findFirst({ where: { sku: "GUL-EKV-01" } }).catch(() => null)
    if (!itemGul) {
      itemGul = await (prisma as any).inventoryItem.create({
        data: {
          id: "item-gul-01",
          productId: prod1.id,
          sku: "GUL-EKV-01",
          barcode: "8690001001",
          name: "Ekvator Kırmızı Gül (1. Kalite - 60cm)",
          category: "Kesme Çiçek",
          itemType: "RAW_MATERIAL",
          baseUnit: "Demet",
          valuationMethod: "FIFO",
          standardCost: 250,
          currentAvgCost: 255,
          fifoUnitCost: 250,
          lifoUnitCost: 260,
          lastPurchaseCost: 260,
          salesPrice: 450,
          taxRate: 20,
          trackLot: true,
          trackExpiry: true,
          shelfLifeDays: 14,
          minStockLevel: 20,
          maxStockLevel: 500,
          leadTimeDays: 3
        }
      })

      // Depo Bakiyesi
      await (prisma as any).stockBalance.create({
        data: {
          itemId: itemGul.id,
          warehouseId: whMerkez.id,
          storageBinId: "bin-mrk-gul",
          binCode: "A-01-01",
          onHandQty: 100,
          reservedQty: 10,
          availableQty: 90
        }
      })

      await (prisma as any).stockBalance.create({
        data: {
          itemId: itemGul.id,
          warehouseId: whKadikoy.id,
          storageBinId: "bin-kdk-show",
          binCode: "M-01-01",
          onHandQty: 20,
          reservedQty: 0,
          availableQty: 20
        }
      })

      // FIFO Maliyet Katmanları (CostLayer)
      await (prisma as any).costLayer.create({
        data: {
          itemId: itemGul.id,
          warehouseId: whMerkez.id,
          receiptDocNo: "IRS-2026-001",
          layerDate: new Date("2026-10-25"),
          lotNumber: "LOT-GUL-2610A",
          initialQty: 50,
          remainingQty: 50,
          unitCost: 250,
          totalCost: 12500,
          isExhausted: false
        }
      })

      await (prisma as any).costLayer.create({
        data: {
          itemId: itemGul.id,
          warehouseId: whMerkez.id,
          receiptDocNo: "IRS-2026-004",
          layerDate: new Date("2026-11-01"),
          lotNumber: "LOT-GUL-2611B",
          initialQty: 70,
          remainingQty: 70,
          unitCost: 260,
          totalCost: 18200,
          isExhausted: false
        }
      })

      // Birim Çevrimleri (1 Koli = 10 Demet, 1 Demet = 20 Dal/Adet)
      await (prisma as any).unitConversion.create({
        data: {
          itemId: itemGul.id,
          fromUnit: "Koli",
          toUnit: "Demet",
          multiplier: 10,
          barcode: "8690001001-KOL",
          isDefaultPurchase: true
        }
      })

      await (prisma as any).unitConversion.create({
        data: {
          itemId: itemGul.id,
          fromUnit: "Demet",
          toUnit: "Adet",
          multiplier: 20,
          barcode: "8690001001-ADT",
          isDefaultSales: true
        }
      })

      // Lot / Parti Kaydı (SKT'li)
      await (prisma as any).lotSerialRecord.create({
        data: {
          itemId: itemGul.id,
          warehouseId: whMerkez.id,
          batchNumber: "LOT-GUL-2610A",
          recordType: "LOT",
          initialQty: 50,
          currentQty: 50,
          productionDate: new Date("2026-10-24"),
          expiryDate: new Date("2026-11-07"), // Yaklaşan SKT
          supplierLotNo: "ECU-FLOWER-9821",
          qualityStatus: "APPROVED"
        }
      })
    }

    // ÜRÜN 2: Beyaz Kazablanka Lilyum
    let prod2 = await (prisma as any).product.findFirst({ where: { sku: "LIL-KAZ-02" } }).catch(() => null)
    if (!prod2) {
      prod2 = await (prisma as any).product.create({
        data: {
          id: "prod-lil-02",
          name: "Beyaz Kazablanka Lilyum (Kokulu)",
          sku: "LIL-KAZ-02",
          price: 90,
          unit: "Dal",
          stock: 60,
          category: "Kesme Çiçek"
        }
      })
    }

    let itemLil = await (prisma as any).inventoryItem.findFirst({ where: { sku: "LIL-KAZ-02" } }).catch(() => null)
    if (!itemLil) {
      itemLil = await (prisma as any).inventoryItem.create({
        data: {
          id: "item-lil-02",
          productId: prod2.id,
          sku: "LIL-KAZ-02",
          barcode: "8690001002",
          name: "Beyaz Kazablanka Lilyum (Kokulu)",
          category: "Kesme Çiçek",
          itemType: "RAW_MATERIAL",
          baseUnit: "Dal",
          valuationMethod: "FIFO",
          standardCost: 120,
          currentAvgCost: 120,
          fifoUnitCost: 120,
          lifoUnitCost: 120,
          lastPurchaseCost: 120,
          salesPrice: 220,
          taxRate: 20,
          trackLot: true,
          trackExpiry: true,
          shelfLifeDays: 10,
          minStockLevel: 15,
          maxStockLevel: 200,
          leadTimeDays: 2
        }
      })

      await (prisma as any).stockBalance.create({
        data: {
          itemId: itemLil.id,
          warehouseId: whMerkez.id,
          storageBinId: "bin-mrk-lil",
          binCode: "A-01-02",
          onHandQty: 60,
          reservedQty: 5,
          availableQty: 55
        }
      })

      await (prisma as any).costLayer.create({
        data: {
          itemId: itemLil.id,
          warehouseId: whMerkez.id,
          receiptDocNo: "IRS-2026-003",
          layerDate: new Date("2026-10-28"),
          lotNumber: "LOT-LIL-28",
          initialQty: 60,
          remainingQty: 60,
          unitCost: 120,
          totalCost: 7200,
          isExhausted: false
        }
      })

      await (prisma as any).lotSerialRecord.create({
        data: {
          itemId: itemLil.id,
          warehouseId: whMerkez.id,
          batchNumber: "LOT-LIL-28",
          recordType: "LOT",
          initialQty: 60,
          currentQty: 60,
          productionDate: new Date("2026-10-28"),
          expiryDate: new Date("2026-11-06"), // Kritik SKT (2 gün kaldı)
          supplierLotNo: "ANT-LIL-554",
          qualityStatus: "APPROVED"
        }
      })
    }

    // ÜRÜN 3: İthal Mat Antrasit Seramik Vazo (25cm)
    let prod3 = await (prisma as any).product.findFirst({ where: { sku: "VAZ-ANT-03" } }).catch(() => null)
    if (!prod3) {
      prod3 = await (prisma as any).product.create({
        data: {
          id: "prod-vaz-03",
          name: "İthal Mat Antrasit Seramik Vazo (25cm)",
          sku: "VAZ-ANT-03",
          price: 320,
          unit: "Adet",
          stock: 45,
          category: "Vazo & Seramik"
        }
      })
    }

    let itemVaz = await (prisma as any).inventoryItem.findFirst({ where: { sku: "VAZ-ANT-03" } }).catch(() => null)
    if (!itemVaz) {
      itemVaz = await (prisma as any).inventoryItem.create({
        data: {
          id: "item-vaz-03",
          productId: prod3.id,
          sku: "VAZ-ANT-03",
          barcode: "8690001003",
          name: "İthal Mat Antrasit Seramik Vazo (25cm)",
          category: "Vazo & Seramik",
          itemType: "RAW_MATERIAL",
          baseUnit: "Adet",
          valuationMethod: "WEIGHTED_AVERAGE",
          standardCost: 180,
          currentAvgCost: 180,
          fifoUnitCost: 180,
          lifoUnitCost: 180,
          lastPurchaseCost: 180,
          salesPrice: 320,
          taxRate: 20,
          minStockLevel: 10,
          maxStockLevel: 150
        }
      })

      await (prisma as any).stockBalance.create({
        data: {
          itemId: itemVaz.id,
          warehouseId: whAtolye.id,
          storageBinId: "bin-atl-tezgah",
          binCode: "T-01-01",
          onHandQty: 45,
          reservedQty: 0,
          availableQty: 45
        }
      })

      await (prisma as any).costLayer.create({
        data: {
          itemId: itemVaz.id,
          warehouseId: whAtolye.id,
          receiptDocNo: "IRS-2026-005",
          layerDate: new Date("2026-10-15"),
          initialQty: 45,
          remainingQty: 45,
          unitCost: 180,
          totalCost: 8100,
          isExhausted: false
        }
      })
    }

    // ÜRÜN 4: Oasis Islak Çiçek Süngeri (20'li Koli)
    let prod4 = await (prisma as any).product.findFirst({ where: { sku: "SNG-OAS-04" } }).catch(() => null)
    if (!prod4) {
      prod4 = await (prisma as any).product.create({
        data: {
          id: "prod-sng-04",
          name: "Oasis Islak Çiçek Süngeri (20'li Koli)",
          sku: "SNG-OAS-04",
          price: 550,
          unit: "Koli",
          stock: 25,
          category: "Sarf & Ambalaj"
        }
      })
    }

    let itemSng = await (prisma as any).inventoryItem.findFirst({ where: { sku: "SNG-OAS-04" } }).catch(() => null)
    if (!itemSng) {
      itemSng = await (prisma as any).inventoryItem.create({
        data: {
          id: "item-sng-04",
          productId: prod4.id,
          sku: "SNG-OAS-04",
          barcode: "8690001004",
          name: "Oasis Islak Çiçek Süngeri (20'li Koli)",
          category: "Sarf & Ambalaj",
          itemType: "CONSUMABLE",
          baseUnit: "Koli",
          valuationMethod: "FIFO",
          standardCost: 340,
          currentAvgCost: 340,
          fifoUnitCost: 340,
          lifoUnitCost: 340,
          lastPurchaseCost: 340,
          salesPrice: 550,
          taxRate: 20,
          minStockLevel: 5,
          maxStockLevel: 50
        }
      })

      await (prisma as any).stockBalance.create({
        data: {
          itemId: itemSng.id,
          warehouseId: whAtolye.id,
          storageBinId: "bin-atl-tezgah",
          binCode: "T-01-01",
          onHandQty: 25,
          reservedQty: 2,
          availableQty: 23
        }
      })

      await (prisma as any).costLayer.create({
        data: {
          itemId: itemSng.id,
          warehouseId: whAtolye.id,
          receiptDocNo: "IRS-2026-002",
          layerDate: new Date("2026-10-20"),
          initialQty: 25,
          remainingQty: 25,
          unitCost: 340,
          totalCost: 8500,
          isExhausted: false
        }
      })

      await (prisma as any).unitConversion.create({
        data: {
          itemId: itemSng.id,
          fromUnit: "Koli",
          toUnit: "Adet",
          multiplier: 20,
          barcode: "8690001004-ADT"
        }
      })
    }

    // ÜRÜN 5: Mor Phalaenopsis Orkide (Çift Dal) - Kritik Stok Örneği (3 Adet)
    let prod5 = await (prisma as any).product.findFirst({ where: { sku: "ORK-MOR-05" } }).catch(() => null)
    if (!prod5) {
      prod5 = await (prisma as any).product.create({
        data: {
          id: "prod-ork-05",
          name: "Mor Phalaenopsis Orkide (Çift Dal)",
          sku: "ORK-MOR-05",
          price: 950,
          unit: "Saksı",
          stock: 3,
          category: "Saksılı Çiçek"
        }
      })
    }

    let itemOrk = await (prisma as any).inventoryItem.findFirst({ where: { sku: "ORK-MOR-05" } }).catch(() => null)
    if (!itemOrk) {
      itemOrk = await (prisma as any).inventoryItem.create({
        data: {
          id: "item-ork-05",
          productId: prod5.id,
          sku: "ORK-MOR-05",
          barcode: "8690001005",
          name: "Mor Phalaenopsis Orkide (Çift Dal)",
          category: "Saksılı Çiçek",
          itemType: "FINISHED_GOOD",
          baseUnit: "Saksı",
          valuationMethod: "FIFO",
          standardCost: 420,
          currentAvgCost: 420,
          fifoUnitCost: 420,
          lifoUnitCost: 420,
          lastPurchaseCost: 420,
          salesPrice: 950,
          minStockLevel: 10 // KRİTİK SEVİYE: Mevcut 3 <= 10
        }
      })

      await (prisma as any).stockBalance.create({
        data: {
          itemId: itemOrk.id,
          warehouseId: whMerkez.id,
          storageBinId: "bin-mrk-lil",
          binCode: "A-01-02",
          onHandQty: 3,
          reservedQty: 0,
          availableQty: 3
        }
      })

      await (prisma as any).costLayer.create({
        data: {
          itemId: itemOrk.id,
          warehouseId: whMerkez.id,
          receiptDocNo: "IRS-2026-006",
          layerDate: new Date("2026-10-30"),
          initialQty: 3,
          remainingQty: 3,
          unitCost: 420,
          totalCost: 1260,
          isExhausted: false
        }
      })
    }

    // ÜRÜN 6: Gelin Buketi (Matrix Parent ve 2 Renk Varyantı)
    let prod6 = await (prisma as any).product.findFirst({ where: { sku: "BKT-PST-06" } }).catch(() => null)
    if (!prod6) {
      prod6 = await (prisma as any).product.create({
        data: {
          id: "prod-bkt-06",
          name: "Gelin Buketi - Romantik Pastel (Tasarım Serisi)",
          sku: "BKT-PST-06",
          price: 1850,
          unit: "Adet",
          stock: 8,
          category: "Gelin & Özel Gün"
        }
      })
    }

    let itemBktParent = await (prisma as any).inventoryItem.findFirst({ where: { sku: "BKT-PST-06" } }).catch(() => null)
    if (!itemBktParent) {
      itemBktParent = await (prisma as any).inventoryItem.create({
        data: {
          id: "item-bkt-parent-06",
          productId: prod6.id,
          sku: "BKT-PST-06",
          barcode: "8690001006",
          name: "Gelin Buketi - Romantik Pastel (Tasarım Serisi)",
          category: "Gelin & Özel Gün",
          itemType: "MATRIX_PARENT",
          baseUnit: "Adet",
          valuationMethod: "FIFO",
          standardCost: 750,
          salesPrice: 1850,
          minStockLevel: 4
        }
      })

      // Alt Varyant 1: Pudra Pembe
      await (prisma as any).inventoryItem.create({
        data: {
          id: "item-bkt-var-pud",
          parentItemId: itemBktParent.id,
          sku: "BKT-PST-06-PUD",
          barcode: "8690001006-PUD",
          name: "Gelin Buketi - Pudra Pembe",
          category: "Gelin & Özel Gün",
          itemType: "MATRIX_VARIANT",
          baseUnit: "Adet",
          valuationMethod: "FIFO",
          standardCost: 750,
          currentAvgCost: 750,
          fifoUnitCost: 750,
          lifoUnitCost: 750,
          salesPrice: 1850,
          variantAttributes: { renk: "Pudra Pembe", kurdele: "Saten Gül Kurusu" }
        }
      })

      await (prisma as any).stockBalance.create({
        data: {
          itemId: "item-bkt-var-pud",
          warehouseId: whKadikoy.id,
          storageBinId: "bin-kdk-show",
          binCode: "M-01-01",
          onHandQty: 5,
          reservedQty: 1,
          availableQty: 4
        }
      })

      // Alt Varyant 2: Kar Beyazı
      await (prisma as any).inventoryItem.create({
        data: {
          id: "item-bkt-var-bey",
          parentItemId: itemBktParent.id,
          sku: "BKT-PST-06-BEY",
          barcode: "8690001006-BEY",
          name: "Gelin Buketi - Kar Beyazı",
          category: "Gelin & Özel Gün",
          itemType: "MATRIX_VARIANT",
          baseUnit: "Adet",
          valuationMethod: "FIFO",
          standardCost: 750,
          currentAvgCost: 750,
          fifoUnitCost: 750,
          lifoUnitCost: 750,
          salesPrice: 1850,
          variantAttributes: { renk: "Kar Beyazı", kurdele: "İnci Beyazı Tül" }
        }
      })

      await (prisma as any).stockBalance.create({
        data: {
          itemId: "item-bkt-var-bey",
          warehouseId: whKadikoy.id,
          storageBinId: "bin-kdk-show",
          binCode: "M-01-01",
          onHandQty: 3,
          reservedQty: 0,
          availableQty: 3
        }
      })
    }

    // ÜRÜN 7: VIP Seramik Aranjman (Reçeteli - BOM)
    let prod7 = await (prisma as any).product.findFirst({ where: { sku: "ARJ-VIP-07" } }).catch(() => null)
    if (!prod7) {
      prod7 = await (prisma as any).product.create({
        data: {
          id: "prod-arj-07",
          name: "Premium VIP Seramik Aranjman (Reçeteli)",
          sku: "ARJ-VIP-07",
          price: 1950,
          unit: "Adet",
          stock: 6,
          category: "Lüks Aranjman"
        }
      })
    }

    let itemArj = await (prisma as any).inventoryItem.findFirst({ where: { sku: "ARJ-VIP-07" } }).catch(() => null)
    if (!itemArj) {
      itemArj = await (prisma as any).inventoryItem.create({
        data: {
          id: "item-arj-07",
          productId: prod7.id,
          sku: "ARJ-VIP-07",
          barcode: "8690001007",
          name: "Premium VIP Seramik Aranjman (Reçeteli)",
          category: "Lüks Aranjman",
          itemType: "FINISHED_GOOD",
          baseUnit: "Adet",
          valuationMethod: "FIFO",
          standardCost: 852.24,
          currentAvgCost: 852.24,
          fifoUnitCost: 852.24,
          lifoUnitCost: 862.34,
          salesPrice: 1950,
          minStockLevel: 5
        }
      })

      await (prisma as any).stockBalance.create({
        data: {
          itemId: itemArj.id,
          warehouseId: whAtolye.id,
          storageBinId: "bin-atl-tezgah",
          binCode: "T-01-01",
          onHandQty: 6,
          reservedQty: 1,
          availableQty: 5
        }
      })

      await (prisma as any).costLayer.create({
        data: {
          itemId: itemArj.id,
          warehouseId: whAtolye.id,
          receiptDocNo: "BOM-PROD-001",
          layerDate: new Date("2026-11-02"),
          initialQty: 6,
          remainingQty: 6,
          unitCost: 852.24,
          totalCost: 5113.44,
          isExhausted: false
        }
      })
    }

    // 5. BOM (Ürün Reçetesi) Tanımı: VIP Aranjman İçin
    const bomArj = await (prisma as any).bomHeader.create({
      data: {
        id: "bom-arj-vip",
        finishedItemId: itemArj.id,
        code: "BOM-ARJ-VIP-V1",
        name: "VIP Seramik Aranjman Standart İmalat Reçetesi",
        version: "v1.0",
        outputQty: 1,
        outputUnit: "Adet",
        laborCostPerBatch: 120, // 120 TL Usta Çiçekçi İşçiliği
        overheadCostPerBatch: 40, // 40 TL Atölye & Ambalaj genel gideri
        scrapRatePercent: 2.0,
        leadTimeHours: 1.5,
        isActive: true
      }
    })

    // BOM Bileşenleri
    await (prisma as any).bomComponent.create({
      data: {
        bomId: bomArj.id,
        componentItemId: itemGul.id,
        quantity: 1, // 1 Demet Kırmızı Gül
        unit: "Demet",
        scrapPercent: 1.0,
        operationStep: "10 - Taze Gül Temizleme & Budama"
      }
    })

    await (prisma as any).bomComponent.create({
      data: {
        bomId: bomArj.id,
        componentItemId: itemLil.id,
        quantity: 2, // 2 Dal Lilyum
        unit: "Dal",
        scrapPercent: 1.0,
        operationStep: "20 - Lilyum Çiçek Yerleşimi"
      }
    })

    await (prisma as any).bomComponent.create({
      data: {
        bomId: bomArj.id,
        componentItemId: itemVaz.id,
        quantity: 1, // 1 Adet Antrasit Seramik Vazo
        unit: "Adet",
        scrapPercent: 0.0,
        operationStep: "05 - Taban Vazo Hazırlığı"
      }
    })

    await (prisma as any).bomComponent.create({
      data: {
        bomId: bomArj.id,
        componentItemId: itemSng.id,
        quantity: 0.05, // 1 Adet Sünger (1/20 Koli)
        unit: "Koli",
        scrapPercent: 2.0,
        operationStep: "06 - Oasis Islak Sünger Kesimi & Sabitleme"
      }
    })

    return {
      seeded: true,
      message: "Gerçekçi KOBİ / Ticari Çiçek & Aranjman başlangıç verileri başarıyla oluşturuldu."
    }
  } catch (error: any) {
    console.error("seedRealisticInventoryData error:", error)
    return {
      seeded: false,
      error: error.message || "Tohum verisi oluşturulamadı."
    }
  }
}

