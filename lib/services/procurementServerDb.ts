import { prisma } from "@/lib/db"
import { calculateDynamicReorderPoint } from "@/lib/services/procurementReorderEngine"

export interface ProcurementSummaryStats {
  totalCriticalItems: number
  stockoutItems: number
  belowRopItems: number
  pendingPrCount: number
  pendingPrTotalAmount: number
  totalConsignmentValue: number
  unbilledConsignmentPayable: number
  activeSupplierCount: number
}

/**
 * Başlangıç Tedarikçi, Konsinye Stok ve Satın Alma Başlangıç Verilerini Seed Eder
 */
export async function seedRealisticProcurementData() {
  try {
    // 1. Tedarikçileri Oluştur
    const supplierCount = await (prisma as any).supplier.count().catch(() => 0)
    let supHolland: any = null
    let supYalova: any = null
    let supPasabahce: any = null
    let supAmbalaj: any = null

    if (supplierCount === 0) {
      supHolland = await (prisma as any).supplier.create({
        data: {
          id: "sup-holland-01",
          name: "Royal Flora Holland İthalat Konsorsiyumu",
          code: "SUP-FLORA-01",
          taxNumber: "8472910382",
          taxOffice: "Marmara Kurumlar",
          contactPerson: "Johan Van Der Berg / Arzu Kaya",
          email: "orders@royalfloraholland.com.tr",
          phone: "0212 465 88 00",
          address: "Atatürk Havalimanı Serbest Bölge A-12 Bakırköy / İstanbul",
          paymentTerms: "30 Gün Vadeli",
          leadTimeDays: 4,
          rating: 4.9,
          notes: "Ekvator gülü, Hollanda orkidesi ve egzotik kesme çiçek ithalatçısı"
        }
      }).catch(() => null)

      supYalova = await (prisma as any).supplier.create({
        data: {
          id: "sup-yalova-02",
          name: "Yalova Çiçekçilik & Kesme Gül Üreticileri Kooperatifi",
          code: "SUP-YALOVA-02",
          taxNumber: "9381029381",
          taxOffice: "Yalova",
          contactPerson: "Mehmet Çiftçi",
          email: "tedarik@yalovacicek.coop",
          phone: "0226 814 30 40",
          address: "Sera Bölgesi No: 18 Çınarcık / Yalova",
          paymentTerms: "Peşin / 15 Gün",
          leadTimeDays: 2,
          rating: 4.8,
          notes: "Yerli kesme gül, yeşillik ve mevsimlik süs bitkileri"
        }
      }).catch(() => null)

      supPasabahce = await (prisma as any).supplier.create({
        data: {
          id: "sup-pasabahce-03",
          name: "Paşabahçe & Paşa Cam Sanayi A.Ş.",
          code: "SUP-PASA-03",
          taxNumber: "7210948271",
          taxOffice: "Boğaziçi",
          contactPerson: "Sevgi Eryılmaz",
          email: "b2bkurumsal@pasabahce.com.tr",
          phone: "0216 578 70 00",
          address: "İçmeler Mah. D-100 Tuzla / İstanbul",
          paymentTerms: "45 Gün Vadeli",
          leadTimeDays: 5,
          rating: 4.85,
          notes: "Dekoratif cam vazolar, fanuslar, teraryum kapları"
        }
      }).catch(() => null)

      supAmbalaj = await (prisma as any).supplier.create({
        data: {
          id: "sup-ambalaj-04",
          name: "Marmara Kraft Ambalaj & Koli Sanayi",
          code: "SUP-AMB-04",
          taxNumber: "6109283741",
          taxOffice: "İkitelli",
          contactPerson: "Erol Gür",
          email: "siparis@marmarakraft.com",
          phone: "0212 549 12 34",
          address: "İOSB Triko Dokumacılar San. Sit. No: 44 Başakşehir / İstanbul",
          paymentTerms: "30 Gün Vadeli",
          leadTimeDays: 3,
          rating: 4.7,
          notes: "Özel tasarım buket kraft kağıtları, kurdele ve koli ambalajı"
        }
      }).catch(() => null)
    } else {
      supHolland = await (prisma as any).supplier.findFirst({ where: { code: "SUP-FLORA-01" } })
      supYalova = await (prisma as any).supplier.findFirst({ where: { code: "SUP-YALOVA-02" } })
      supPasabahce = await (prisma as any).supplier.findFirst({ where: { code: "SUP-PASA-03" } })
      supAmbalaj = await (prisma as any).supplier.findFirst({ where: { code: "SUP-AMB-04" } })
    }

    // 2. Ürünleri ve Depoyu Bul
    const whMerkez =
      (await (prisma as any).warehouse.findFirst({
        where: {
          OR: [{ code: "DEP-MRK-01" }, { code: "DEP-MERKEZ" }, { id: "wh-merkez-01" }]
        }
      })) || (await (prisma as any).warehouse.findFirst())
    const itemGul = await (prisma as any).inventoryItem.findFirst({ where: { sku: "GUL-EKV-01" } })
    const itemLil = await (prisma as any).inventoryItem.findFirst({ where: { sku: "LIL-KAZ-02" } })
    const itemVaz = await (prisma as any).inventoryItem.findFirst({ where: { sku: "VAZ-ANT-03" } })

    // 3. Konsinye (Emanet) Stok Seed
    const consignCount = await (prisma as any).consignmentStock.count().catch(() => 0)
    if (consignCount === 0 && whMerkez && supHolland && itemGul) {
      await (prisma as any).consignmentStock.create({
        data: {
          id: "consign-01",
          agreementNo: "KSN-2026-FLORA-001",
          supplierId: supHolland.id,
          itemId: itemGul.id,
          warehouseId: whMerkez.id,
          binCode: "A-01-01",
          lotNumber: "LOT-CONSIGN-26A",
          receivedConsignQty: 250,
          availableConsignQty: 170,
          consumedOrSoldQty: 80,
          returnedToVendorQty: 0,
          agreedUnitCost: 32.5,
          commissionPercent: 12.0,
          unbilledPayableAmt: 80 * 32.5, // 2600 TL
          status: "ACTIVE"
        }
      }).catch(() => null)
    }

    if (consignCount === 0 && whMerkez && supPasabahce && itemVaz) {
      await (prisma as any).consignmentStock.create({
        data: {
          id: "consign-02",
          agreementNo: "KSN-2026-PASA-002",
          supplierId: supPasabahce.id,
          itemId: itemVaz.id,
          warehouseId: whMerkez.id,
          binCode: "C-01-01",
          lotNumber: "LOT-CONSIGN-PASA-01",
          receivedConsignQty: 60,
          availableConsignQty: 45,
          consumedOrSoldQty: 15,
          returnedToVendorQty: 0,
          agreedUnitCost: 260.0,
          commissionPercent: 15.0,
          unbilledPayableAmt: 15 * 260.0, // 3900 TL
          status: "ACTIVE"
        }
      }).catch(() => null)
    }

    // 4. Satın Alma Talebi (Purchase Requisition) Seed
    const reqCount = await (prisma as any).purchaseRequisition.count().catch(() => 0)
    if (reqCount === 0 && whMerkez && supHolland && itemLil) {
      const pr1 = await (prisma as any).purchaseRequisition.create({
        data: {
          id: "pr-seed-01",
          reqNumber: "PR-2026-001",
          warehouseId: whMerkez.id,
          supplierId: supHolland.id,
          supplierName: supHolland.name,
          triggerSource: "AUTO_ROP_ENGINE",
          status: "PENDING_APPROVAL",
          priority: "HIGH",
          totalAmount: 18500,
          currency: "TRY",
          notes: "Kazablanka Lilyum stoğu kritik güvenlik eşiğine (SS: 15) yaklaştı. Otomatik sipariş önerisi.",
          linesJson: JSON.stringify([
            { itemId: itemLil.id, sku: itemLil.sku, itemName: itemLil.name, quantity: 100, unit: "Demet", estimatedCost: 185 }
          ])
        }
      }).catch(() => null)

      if (pr1) {
        await (prisma as any).purchaseRequisitionLine.create({
          data: {
            requisitionId: pr1.id,
            itemId: itemLil.id,
            sku: itemLil.sku,
            itemName: itemLil.name,
            quantity: 100,
            unit: "Demet",
            estimatedCost: 185,
            totalCost: 18500,
            notes: "Otomatik ROP tetiklemesi"
          }
        }).catch(() => null)
      }
    }

    return { success: true }
  } catch (error: any) {
    console.error("seedRealisticProcurementData error:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Veritabanındaki Tüm Ürünlerin Canlı ROP, Güvenlik Stoğu ve Kritik Durumlarını Hesaplar
 */
export async function getProcurementOverviewSnapshot() {
  try {
    // Gerekirse ilk çalıştırmada seed yap
    const supCount = await (prisma as any).supplier.count().catch(() => 0)
    if (supCount === 0) {
      await seedRealisticProcurementData()
    }

    const [items, suppliers, requisitions, consignmentStocks] = await Promise.all([
      (prisma as any).inventoryItem.findMany({
        include: {
          stockBalances: {
            include: { warehouse: true, storageBin: true }
          }
        },
        orderBy: { name: "asc" }
      }).catch(() => []),
      (prisma as any).supplier.findMany({
        orderBy: { name: "asc" }
      }).catch(() => []),
      (prisma as any).purchaseRequisition.findMany({
        include: { lines: { include: { item: true } }, warehouse: true },
        orderBy: { createdAt: "desc" }
      }).catch(() => []),
      (prisma as any).consignmentStock.findMany({
        include: { item: true, supplier: true, warehouse: true },
        orderBy: { updatedAt: "desc" }
      }).catch(() => [])
    ])

    // Açık satın alma siparişlerindeki kalemleri hesapla (On-Order Qty)
    const onOrderMap: Record<string, number> = {}
    for (const pr of requisitions) {
      if (pr.status === "PENDING_APPROVAL" || pr.status === "APPROVED_PO_SENT") {
        for (const line of pr.lines || []) {
          onOrderMap[line.itemId] = (onOrderMap[line.itemId] || 0) + Number(line.quantity || 0)
        }
      }
    }

    // Her ürün için dinamik ROP hesapla
    const evaluatedItems: any[] = []
    let stockoutCount = 0
    let belowRopCount = 0
    let criticalSafetyCount = 0

    for (const item of items) {
      const balances = item.stockBalances || []
      const totalOnHand = balances.reduce((s: number, b: any) => s + Number(b.onHandQty || 0), 0)
      const totalReserved = balances.reduce((s: number, b: any) => s + Number(b.reservedQty || 0), 0)
      const availableQty = Math.max(0, totalOnHand - totalReserved)
      const onOrderQty = onOrderMap[item.id] || 0

      // Dinamik parametreler (Veritabanındaki min/max stok veya standart değerler)
      const leadTimeDays = item.leadTimeDays || 4
      const minOrderQtyMoq = item.reorderPoint || 20
      const unitCost = Number(item.purchasePrice || item.salesPrice * 0.55 || 50)
      const avgDailyDemand = item.avgDailyDemand || (item.minStock ? Math.round(item.minStock / 3) : 5)
      const demandStdDev = Math.max(1, Math.round(avgDailyDemand * 0.35))

      const ropCalc = calculateDynamicReorderPoint({
        avgDailyDemand,
        demandStdDev,
        leadTimeDays,
        serviceLevelPercent: 95,
        seasonalityMultiplier: 1.2,
        currentAvailableQty: availableQty,
        onOrderQty,
        minOrderQtyMoq
      })

      if (ropCalc.status === "STOCKOUT") stockoutCount++
      else if (ropCalc.status === "CRITICAL_SAFETY") criticalSafetyCount++
      else if (ropCalc.status === "BELOW_ROP") belowRopCount++

      evaluatedItems.push({
        id: item.id,
        sku: item.sku,
        name: item.name,
        category: item.category,
        unit: item.baseUnit || "Adet",
        unitCost,
        totalOnHand,
        totalReserved,
        availableQty,
        onOrderQty,
        avgDailyDemand,
        demandStdDev,
        leadTimeDays,
        minOrderQtyMoq,
        safetyStock: ropCalc.safetyStock,
        reorderPointRop: ropCalc.reorderPointRop,
        recommendedOrderQty: ropCalc.recommendedOrderQty,
        status: ropCalc.status,
        warehouseName: balances[0]?.warehouse?.name || "Merkez Depo",
        warehouseId: balances[0]?.warehouseId || null
      })
    }

    // Kritik ürünleri (STOCKOUT, CRITICAL_SAFETY, BELOW_ROP) öne filtrele
    const criticalItems = evaluatedItems
      .filter((it) => it.status !== "HEALTHY")
      .sort((a, b) => {
        const priorityOrder: Record<string, number> = {
          STOCKOUT: 1,
          CRITICAL_SAFETY: 2,
          BELOW_ROP: 3
        }
        return (priorityOrder[a.status] || 99) - (priorityOrder[b.status] || 99)
      })

    // Özet Metrikler
    const pendingPrs = requisitions.filter((r: any) => r.status === "PENDING_APPROVAL")
    const pendingPrTotalAmount = pendingPrs.reduce((sum: number, r: any) => sum + Number(r.totalAmount || 0), 0)
    const totalConsignmentValue = consignmentStocks.reduce(
      (sum: number, c: any) => sum + Number(c.availableConsignQty || 0) * Number(c.agreedUnitCost || 0),
      0
    )
    const unbilledConsignmentPayable = consignmentStocks.reduce(
      (sum: number, c: any) => sum + Number(c.unbilledPayableAmt || 0),
      0
    )

    const stats: ProcurementSummaryStats = {
      totalCriticalItems: criticalItems.length,
      stockoutItems: stockoutCount,
      belowRopItems: belowRopCount + criticalSafetyCount,
      pendingPrCount: pendingPrs.length,
      pendingPrTotalAmount,
      totalConsignmentValue,
      unbilledConsignmentPayable,
      activeSupplierCount: suppliers.length
    }

    return {
      success: true,
      stats,
      criticalItems,
      allItems: evaluatedItems,
      suppliers,
      purchaseRequisitions: requisitions,
      consignmentStocks
    }
  } catch (error: any) {
    console.error("getProcurementOverviewSnapshot error:", error)
    return {
      success: false,
      error: error.message || "Tedarik verileri alınamadı",
      stats: {
        totalCriticalItems: 0,
        stockoutItems: 0,
        belowRopItems: 0,
        pendingPrCount: 0,
        pendingPrTotalAmount: 0,
        totalConsignmentValue: 0,
        unbilledConsignmentPayable: 0,
        activeSupplierCount: 0
      },
      criticalItems: [],
      allItems: [],
      suppliers: [],
      purchaseRequisitions: [],
      consignmentStocks: []
    }
  }
}

/**
 * Yeni Satın Alma Talebi / Siparişi (Purchase Requisition) Oluşturur
 */
export async function createPurchaseRequisition(data: {
  warehouseId?: string
  supplierId: string
  itemId: string
  quantity: number
  unitCost?: number
  priority?: "NORMAL" | "HIGH" | "CRITICAL"
  notes?: string
  triggerSource?: string
}) {
  try {
    const item = await (prisma as any).inventoryItem.findUnique({ where: { id: data.itemId } })
    if (!item) throw new Error("Ürün bulunamadı")

    const supplier = await (prisma as any).supplier.findUnique({ where: { id: data.supplierId } })
    if (!supplier) throw new Error("Tedarikçi bulunamadı")

    const wh = data.warehouseId
      ? await (prisma as any).warehouse.findUnique({ where: { id: data.warehouseId } })
      : await (prisma as any).warehouse.findFirst({ where: { code: "DEP-MERKEZ" } })

    const count = await (prisma as any).purchaseRequisition.count().catch(() => 0)
    const reqNumber = `PR-2026-${String(count + 1).padStart(3, "0")}`

    const unitCost = data.unitCost || Number(item.purchasePrice || item.salesPrice * 0.55 || 50)
    const totalAmount = data.quantity * unitCost

    const requisition = await (prisma as any).purchaseRequisition.create({
      data: {
        reqNumber,
        warehouseId: wh?.id || "wh-merkez",
        supplierId: supplier.id,
        supplierName: supplier.name,
        triggerSource: data.triggerSource || "AUTO_ROP_ENGINE",
        status: "PENDING_APPROVAL",
        priority: data.priority || "HIGH",
        totalAmount,
        currency: "TRY",
        notes: data.notes || `Otomatik ROP Sipariş Talebi (${item.name})`,
        linesJson: JSON.stringify([
          {
            itemId: item.id,
            sku: item.sku,
            itemName: item.name,
            quantity: data.quantity,
            unit: item.baseUnit || "Adet",
            estimatedCost: unitCost,
            totalCost: totalAmount
          }
        ])
      }
    })

    await (prisma as any).purchaseRequisitionLine.create({
      data: {
        requisitionId: requisition.id,
        itemId: item.id,
        sku: item.sku,
        itemName: item.name,
        quantity: data.quantity,
        unit: item.baseUnit || "Adet",
        estimatedCost: unitCost,
        totalCost: totalAmount,
        notes: data.notes || "Kritik stok ikmal talebi"
      }
    })

    return { success: true, requisition }
  } catch (error: any) {
    return { success: false, error: error.message || "Satın alma talebi oluşturulamadı" }
  }
}

/**
 * Satın Alma Talebini Onaylar (PENDING_APPROVAL -> APPROVED_PO_SENT)
 */
export async function approvePurchaseRequisition(reqId: string, approvedBy = "Satın Alma Müdürü") {
  try {
    const pr = await (prisma as any).purchaseRequisition.findUnique({
      where: { id: reqId },
      include: { lines: true }
    })
    if (!pr) throw new Error("Satın alma talebi bulunamadı")

    const updated = await (prisma as any).purchaseRequisition.update({
      where: { id: reqId },
      data: {
        status: "APPROVED_PO_SENT",
        approvedBy
      }
    })

    return { success: true, requisition: updated }
  } catch (error: any) {
    return { success: false, error: error.message || "Onaylama işlemi başarısız" }
  }
}

/**
 * Konsinye (Emanet) Stok Satış / Sarfiyat Mutabakatı
 * Ürün satıldığında veya üretimde kullanıldığında konsinye bakiyesi düşer ve tedarikçi hakedişi tahakkuk eder.
 */
export async function settleConsignmentStock(
  consignId: string,
  consumeQty: number,
  notes?: string
) {
  try {
    const record = await (prisma as any).consignmentStock.findUnique({
      where: { id: consignId },
      include: { item: true, supplier: true, warehouse: true }
    })
    if (!record) throw new Error("Konsinye stok kaydı bulunamadı")

    if (consumeQty > Number(record.availableConsignQty || 0)) {
      throw new Error(`Tüketim miktarı (${consumeQty}) mevcut konsinye stoğundan (${record.availableConsignQty}) fazla olamaz!`)
    }

    const newAvailable = Number(record.availableConsignQty) - consumeQty
    const newConsumed = Number(record.consumedOrSoldQty) + consumeQty
    const addedPayable = consumeQty * Number(record.agreedUnitCost || 0)
    const newPayable = Number(record.unbilledPayableAmt || 0) + addedPayable

    const updated = await (prisma as any).consignmentStock.update({
      where: { id: consignId },
      data: {
        availableConsignQty: newAvailable,
        consumedOrSoldQty: newConsumed,
        unbilledPayableAmt: newPayable,
        status: newAvailable === 0 ? "SETTLED" : "ACTIVE",
        lastSettlementDate: new Date().toISOString()
      }
    })

    // Hareket kaydı oluştur
    await (prisma as any).stockMovement.create({
      data: {
        itemId: record.itemId,
        warehouseId: record.warehouseId,
        movementType: "OUT",
        quantity: consumeQty,
        documentType: "CONSIGNMENT_SETTLEMENT",
        documentNo: record.agreementNo,
        notes: notes || `Konsinye Stok Tüketimi / Satışı. Tedarikçi Hakedişi: +₺${addedPayable.toLocaleString('tr-TR')}`
      }
    }).catch(() => null)

    return {
      success: true,
      data: updated,
      message: `${consumeQty} adet konsinye ürün düşüldü. ₺${addedPayable.toLocaleString('tr-TR')} hakediş tahakkuk etti.`
    }
  } catch (error: any) {
    return { success: false, error: error.message || "Konsinye mutabakatı başarısız" }
  }
}
