import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import {
  calculateItemValuationFromDb,
  convertStockUnitFromDb,
  calculateBomRollupFromDb,
  seedRealisticInventoryData
} from "@/lib/services/inventoryServerDb"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const section = searchParams.get("section") || "all"

    // 1. Veritabanı boşsa ilk seferde gerçekçi çiçek & aranjman KOBİ tohum verilerini oluştur
    const itemCount = await (prisma as any).inventoryItem.count().catch(() => 0)
    if (itemCount === 0) {
      await seedRealisticInventoryData()
    }

    // A. TEKİL ÜRÜN ÇEKMECESİ (DRAWER) VE CANLI DETAYLAR
    if (section === "item") {
      const itemId = searchParams.get("itemId") || searchParams.get("id")
      if (!itemId) {
        return NextResponse.json({ success: false, error: "itemId parametresi eksik" }, { status: 400 })
      }

      const item = await (prisma as any).inventoryItem.findUnique({
        where: { id: itemId },
        include: {
          product: true,
          parentItem: true,
          variants: true,
          stockBalances: {
            include: {
              warehouse: true,
              storageBin: true
            }
          },
          costLayers: {
            where: { isExhausted: false },
            orderBy: { layerDate: "asc" }
          },
          unitConversions: true,
          lotSerials: {
            orderBy: { expiryDate: "asc" }
          },
          stockMovements: {
            take: 10,
            orderBy: { createdAt: "desc" },
            include: { warehouse: true }
          },
          bomHeaders: {
            include: {
              components: {
                include: { componentItem: true }
              }
            }
          }
        }
      })

      if (!item) {
        return NextResponse.json({ success: false, error: "Ürün bulunamadı" }, { status: 404 })
      }

      const valuationRes = await calculateItemValuationFromDb(itemId, 1, item.valuationMethod || "FIFO")

      return NextResponse.json({
        success: true,
        item,
        valuation: valuationRes.success ? valuationRes.valuation : null
      })
    }

    // B. CANLI DEĞERLEME HESAPLAMA (FIFO / LIFO / ORTALAMA)
    if (section === "valuation") {
      const itemId = searchParams.get("itemId")
      const qty = Number(searchParams.get("qty") || 1)
      const method = (searchParams.get("method") || "FIFO") as any

      if (!itemId) {
        return NextResponse.json({ success: false, error: "itemId parametresi eksik" }, { status: 400 })
      }

      const result = await calculateItemValuationFromDb(itemId, qty, method)
      return NextResponse.json(result)
    }

    // C. CANLI ÜRÜN REÇETESİ (BOM) ROLL-UP
    if (section === "bom") {
      const bomId = searchParams.get("bomId")
      const batches = Number(searchParams.get("batches") || 1)

      if (!bomId) {
        return NextResponse.json({ success: false, error: "bomId parametresi eksik" }, { status: 400 })
      }

      const result = await calculateBomRollupFromDb(bomId, batches)
      return NextResponse.json(result)
    }

    // D. CANLI BİRİM ÇEVİRİCİ
    if (section === "unit_convert") {
      const itemId = searchParams.get("itemId")
      const quantity = Number(searchParams.get("quantity") || 1)
      const fromUnit = searchParams.get("fromUnit") || "Adet"
      const toUnit = searchParams.get("toUnit") || "Adet"

      if (!itemId) {
        return NextResponse.json({ success: false, error: "itemId parametresi eksik" }, { status: 400 })
      }

      const result = await convertStockUnitFromDb(itemId, quantity, fromUnit, toUnit)
      return NextResponse.json(result)
    }

    // E. ANA LİSTELEME VE 4 NET ÖZET KART (DEFAULT: "all")
    const warehouses = await (prisma as any).warehouse.findMany({
      where: { isActive: true },
      include: {
        bins: true
      },
      orderBy: { createdAt: "asc" }
    })

    const rawItems = await (prisma as any).inventoryItem.findMany({
      where: { isActive: true },
      include: {
        product: true,
        stockBalances: {
          include: {
            warehouse: true,
            storageBin: true
          }
        },
        costLayers: {
          where: { isExhausted: false },
          orderBy: { layerDate: "asc" }
        },
        unitConversions: true,
        lotSerials: true,
        variants: true,
        bomHeaders: true
      },
      orderBy: { createdAt: "desc" }
    })

    // Özet hesaplamaları & temiz formatlama
    let totalStockValue = 0
    let criticalStockCount = 0
    const now = new Date()
    const fifteenDaysLater = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000)
    let expiringCount = 0

    const items = rawItems.map((item: any) => {
      const totalOnHand = (item.stockBalances || []).reduce(
        (acc: number, b: any) => acc + Number(b.onHandQty || 0),
        0
      )
      const totalReserved = (item.stockBalances || []).reduce(
        (acc: number, b: any) => acc + Number(b.reservedQty || 0),
        0
      )
      const totalAvailable = (item.stockBalances || []).reduce(
        (acc: number, b: any) => acc + Number(b.availableQty || 0),
        0
      )

      // Ürün toplam stok değeri (Varsa FIFO/maliyet katmanları toplamı, yoksa ortalama/standart maliyet)
      let itemValue = 0
      if (item.costLayers && item.costLayers.length > 0) {
        itemValue = item.costLayers.reduce(
          (acc: number, l: any) => acc + Number(l.remainingQty || 0) * Number(l.unitCost || 0),
          0
        )
      } else {
        const unitCost = Number(item.fifoUnitCost || item.currentAvgCost || item.standardCost || 0)
        itemValue = totalOnHand * unitCost
      }
      totalStockValue += itemValue

      // Kritik Stok Kontrolü
      if (totalOnHand <= Number(item.minStockLevel || 0)) {
        criticalStockCount++
      }

      // SKT Kontrolü (15 gün içinde dolanlar)
      if (item.lotSerials && item.lotSerials.length > 0) {
        for (const lot of item.lotSerials) {
          if (lot.expiryDate) {
            const exp = new Date(lot.expiryDate)
            if (exp <= fifteenDaysLater && lot.status !== "EXPIRED" && lot.status !== "CONSUMED") {
              expiringCount++
              break
            }
          }
        }
      }

      return {
        ...item,
        totalOnHand,
        totalReserved,
        totalAvailable,
        calculatedStockValue: Number(itemValue.toFixed(2))
      }
    })

    return NextResponse.json({
      success: true,
      stats: {
        totalStockValue: Number(totalStockValue.toFixed(2)),
        criticalStockCount,
        expiringCount,
        activeWarehouseCount: warehouses.length,
        totalItemCount: items.length
      },
      warehouses,
      items
    })
  } catch (error: any) {
    console.error("GET /api/inventory error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Stok verileri alınamadı" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action } = body

    // 1. "+ YENİ ÜRÜN TANIMLA"
    if (action === "create_item") {
      const {
        name,
        sku,
        barcode,
        salesPrice = 0,
        standardCost = 0,
        initialStock = 0,
        warehouseId,
        storageBinId,
        category = "Genel",
        baseUnit = "Adet",
        itemType = "FINISHED_GOOD",
        valuationMethod = "FIFO",
        minStockLevel = 10,
        maxStockLevel = 500,
        trackLot = false,
        trackExpiry = false,
        shelfLifeDays,
        unitConversions = [],
        lotNumber,
        expiryDate,
        variants = [],
        bomComponents = []
      } = body.payload || body

      if (!name || !sku) {
        return NextResponse.json(
          { success: false, error: "Ürün adı ve SKU/Barkod zorunludur" },
          { status: 400 }
        )
      }

      // Ürün SKU benzersizlik kontrolü
      const existing = await (prisma as any).inventoryItem.findUnique({
        where: { sku }
      }).catch(() => null)

      if (existing) {
        return NextResponse.json(
          { success: false, error: `Bu SKU (${sku}) koduyla kayıtlı başka bir ürün zaten var.` },
          { status: 400 }
        )
      }

      // İlgili Product (B2B) kaydı oluştur
      const product = await (prisma as any).product.create({
        data: {
          name,
          unit: baseUnit
        }
      }).catch(() => null)

      // InventoryItem Oluştur
      const createdItem = await (prisma as any).inventoryItem.create({
        data: {
          productId: product?.id,
          sku,
          barcode: barcode || sku,
          name,
          category,
          itemType: variants && variants.length > 0 ? "MATRIX_PARENT" : itemType,
          baseUnit,
          valuationMethod,
          standardCost: Number(standardCost || 0),
          currentAvgCost: Number(standardCost || 0),
          fifoUnitCost: Number(standardCost || 0),
          lifoUnitCost: Number(standardCost || 0),
          lastPurchaseCost: Number(standardCost || 0),
          salesPrice: Number(salesPrice || 0),
          minStockLevel: Number(minStockLevel || 10),
          maxStockLevel: Number(maxStockLevel || 500),
          trackLot: Boolean(trackLot),
          trackExpiry: Boolean(trackExpiry),
          shelfLifeDays: shelfLifeDays ? Number(shelfLifeDays) : null,
          isActive: true
        }
      })

      // Başlangıç stoğu varsa StockBalance, CostLayer ve StockMovement oluştur
      const initQty = Number(initialStock || 0)
      if (initQty > 0 && warehouseId) {
        await (prisma as any).stockBalance.create({
          data: {
            itemId: createdItem.id,
            warehouseId,
            storageBinId: storageBinId || null,
            onHandQty: initQty,
            availableQty: initQty,
            reservedQty: 0
          }
        }).catch(() => null)

        await (prisma as any).costLayer.create({
          data: {
            itemId: createdItem.id,
            warehouseId,
            receiptDocNo: "BASLANGIC-DEVIR",
            layerDate: new Date(),
            initialQty: initQty,
            remainingQty: initQty,
            unitCost: Number(standardCost || 0),
            isExhausted: false
          }
        }).catch(() => null)

        await (prisma as any).stockMovement.create({
          data: {
            itemId: createdItem.id,
            warehouseId,
            movementType: "RECEIPT",
            quantity: initQty,
            unit: baseUnit,
            unitCost: Number(standardCost || 0),
            totalCost: initQty * Number(standardCost || 0),
            referenceDocNo: "BASLANGIC-DEVIR",
            notes: "İlk ürün kartı açılış stok devri"
          }
        }).catch(() => null)
      }

      // Lot / SKT Takibi
      if (trackLot && lotNumber && warehouseId) {
        await (prisma as any).lotSerialRecord.create({
          data: {
            itemId: createdItem.id,
            warehouseId,
            lotNumber,
            expiryDate: expiryDate ? new Date(expiryDate) : null,
            initialQty: initQty,
            remainingQty: initQty,
            unitCost: Number(standardCost || 0),
            status: "AVAILABLE"
          }
        }).catch(() => null)
      }

      // Çoklu Birim Çevrimleri
      if (Array.isArray(unitConversions) && unitConversions.length > 0) {
        for (const conv of unitConversions) {
          if (conv.fromUnit && conv.multiplier) {
            await (prisma as any).unitConversion.create({
              data: {
                itemId: createdItem.id,
                fromUnit: conv.fromUnit,
                toUnit: baseUnit,
                multiplier: Number(conv.multiplier),
                barcode: conv.barcode || null,
                isDefaultSales: Boolean(conv.isDefaultSales),
                isDefaultPurchase: Boolean(conv.isDefaultPurchase)
              }
            }).catch(() => null)
          }
        }
      }

      // Matrix Varyantları (Renk / Beden)
      if (Array.isArray(variants) && variants.length > 0) {
        for (const v of variants) {
          const vSku = v.sku || `${sku}-${String(v.variantName || "VAR").toUpperCase().replace(/\s+/g, "-")}`
          const vItem = await (prisma as any).inventoryItem.create({
            data: {
              parentItemId: createdItem.id,
              sku: vSku,
              barcode: v.barcode || vSku,
              name: `${name} - ${v.variantName}`,
              category,
              itemType: "MATRIX_VARIANT",
              variantAttributes: JSON.stringify(v.attributes || { varyant: v.variantName }),
              baseUnit,
              valuationMethod,
              standardCost: Number(v.standardCost || standardCost || 0),
              salesPrice: Number(v.salesPrice || salesPrice || 0),
              minStockLevel: 2,
              isActive: true
            }
          }).catch(() => null)

          if (vItem && Number(v.initialStock || 0) > 0 && warehouseId) {
            const vQty = Number(v.initialStock)
            await (prisma as any).stockBalance.create({
              data: {
                itemId: vItem.id,
                warehouseId,
                storageBinId: storageBinId || null,
                onHandQty: vQty,
                availableQty: vQty
              }
            }).catch(() => null)
          }
        }
      }

      // BOM (Ürün Reçetesi) Bileşenleri
      if (Array.isArray(bomComponents) && bomComponents.length > 0) {
        const bomHeader = await (prisma as any).bomHeader.create({
          data: {
            finishedItemId: createdItem.id,
            code: `BOM-${sku}-V1`,
            name: `${name} Standart Reçetesi`,
            outputQty: 1,
            outputUnit: baseUnit,
            laborCostPerBatch: Number(body.laborCost || 0),
            overheadCostPerBatch: Number(body.overheadCost || 0),
            isActive: true
          }
        }).catch(() => null)

        if (bomHeader) {
          for (const c of bomComponents) {
            if (c.componentItemId && c.quantity) {
              await (prisma as any).bomComponent.create({
                data: {
                  bomId: bomHeader.id,
                  componentItemId: c.componentItemId,
                  quantity: Number(c.quantity),
                  unit: c.unit || "Adet",
                  scrapPercent: Number(c.scrapPercent || 0),
                  operationStep: c.operationStep || "Standart Hazırlık"
                }
              }).catch(() => null)
            }
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: "Ürün ve ilgili stok katmanları veritabanına başarıyla kaydedildi.",
        item: createdItem
      })
    }

    // 2. "HIZLI STOK GİRİŞİ (ALIŞ/İRSALİYE) & HIZLI STOK ÇIKIŞI (SATIŞ/SARF)"
    if (action === "stock_movement") {
      const {
        movementType, // "IN" (Alış/Giriş) veya "OUT" (Satış/Çıkış/Sarf)
        itemId,
        warehouseId,
        storageBinId,
        quantity,
        unitCost = 0,
        docNo = "IRS-HIZLI",
        lotNumber,
        expiryDate,
        notes
      } = body.payload || body

      if (!itemId || !warehouseId || !quantity || Number(quantity) <= 0) {
        return NextResponse.json(
          { success: false, error: "Ürün, depo ve geçerli bir miktar belirtilmelidir" },
          { status: 400 }
        )
      }

      const moveQty = Number(quantity)
      const cost = Number(unitCost || 0)

      const item = await (prisma as any).inventoryItem.findUnique({
        where: { id: itemId }
      })

      if (!item) {
        return NextResponse.json({ success: false, error: "Ürün bulunamadı" }, { status: 404 })
      }

      // Mevcut bakiye kaydını bul veya oluştur
      let balance = await (prisma as any).stockBalance.findFirst({
        where: {
          itemId,
          warehouseId,
          storageBinId: storageBinId || null
        }
      })

      if (movementType === "IN") {
        // GİRİŞ: Bakiyeyi artır
        if (balance) {
          await (prisma as any).stockBalance.update({
            where: { id: balance.id },
            data: {
              onHandQty: { increment: moveQty },
              availableQty: { increment: moveQty }
            }
          })
        } else {
          balance = await (prisma as any).stockBalance.create({
            data: {
              itemId,
              warehouseId,
              storageBinId: storageBinId || null,
              onHandQty: moveQty,
              availableQty: moveQty,
              reservedQty: 0
            }
          })
        }

        // Yeni maliyet katmanı (CostLayer) ekle
        await (prisma as any).costLayer.create({
          data: {
            itemId,
            warehouseId,
            receiptDocNo: docNo || "IRS-HIZLI",
            layerDate: new Date(),
            initialQty: moveQty,
            remainingQty: moveQty,
            unitCost: cost > 0 ? cost : Number(item.standardCost || item.lastPurchaseCost || 0),
            isExhausted: false
          }
        })

        // Lot kaydı varsa ekle/güncelle
        if (lotNumber) {
          await (prisma as any).lotSerialRecord.create({
            data: {
              itemId,
              warehouseId,
              lotNumber,
              expiryDate: expiryDate ? new Date(expiryDate) : null,
              initialQty: moveQty,
              remainingQty: moveQty,
              unitCost: cost,
              originDocNo: docNo,
              status: "AVAILABLE"
            }
          }).catch(() => null)
        }

        // Hareket günlüğü (StockMovement)
        await (prisma as any).stockMovement.create({
          data: {
            itemId,
            warehouseId,
            movementType: "RECEIPT",
            quantity: moveQty,
            unit: item.baseUnit,
            unitCost: cost,
            totalCost: moveQty * cost,
            referenceDocNo: docNo,
            notes: notes || "Hızlı Stok Girişi (Alış/İrsaliye)"
          }
        })

        // Ürünün son alış fiyatını güncelle
        if (cost > 0) {
          await (prisma as any).inventoryItem.update({
            where: { id: itemId },
            data: {
              lastPurchaseCost: cost,
              fifoUnitCost: cost
            }
          })
        }

        return NextResponse.json({
          success: true,
          message: `${moveQty} ${item.baseUnit} ${item.name} başarıyla stoğa eklendi.`
        })
      } else if (movementType === "OUT") {
        // ÇIKIŞ: Stok kontrolü
        const currentAvail = Number(balance?.availableQty || 0)
        if (currentAvail < moveQty) {
          return NextResponse.json(
            {
              success: false,
              error: `Yetersiz stok! Bu depoda yalnızca ${currentAvail} ${item.baseUnit} mevcut, talep edilen: ${moveQty} ${item.baseUnit}`
            },
            { status: 400 }
          )
        }

        // Bakiyeyi düşür
        await (prisma as any).stockBalance.update({
          where: { id: balance.id },
          data: {
            onHandQty: { decrement: moveQty },
            availableQty: { decrement: moveQty }
          }
        })

        // FIFO / LIFO sırasına göre CostLayer katmanlarını tüket
        let remainingToDeduct = moveQty
        const layers = await (prisma as any).costLayer.findMany({
          where: { itemId, warehouseId, isExhausted: false },
          orderBy: { layerDate: item.valuationMethod === "LIFO" ? "desc" : "asc" }
        })

        let cogsTotal = 0
        for (const layer of layers) {
          if (remainingToDeduct <= 0) break
          const availableInLayer = Number(layer.remainingQty || 0)
          const deductFromLayer = Math.min(availableInLayer, remainingToDeduct)
          const newRemaining = availableInLayer - deductFromLayer
          remainingToDeduct -= deductFromLayer
          cogsTotal += deductFromLayer * Number(layer.unitCost || 0)

          await (prisma as any).costLayer.update({
            where: { id: layer.id },
            data: {
              remainingQty: newRemaining,
              isExhausted: newRemaining <= 0
            }
          })
        }

        // Hareket günlüğü (StockMovement)
        await (prisma as any).stockMovement.create({
          data: {
            itemId,
            warehouseId,
            movementType: "ISSUE",
            quantity: moveQty,
            unit: item.baseUnit,
            unitCost: moveQty > 0 ? Number((cogsTotal / moveQty).toFixed(2)) : 0,
            totalCost: cogsTotal,
            referenceDocNo: docNo || "CIKIS-HIZLI",
            notes: notes || "Hızlı Stok Çıkışı (Satış/Sarf)"
          }
        })

        return NextResponse.json({
          success: true,
          message: `${moveQty} ${item.baseUnit} ${item.name} stoktan başarıyla düşüldü.`
        })
      }

      return NextResponse.json({ success: false, error: "Geçersiz hareket türü" }, { status: 400 })
    }

    // 3. ÜRÜN BİLGİLERİNİ GÜNCELLE
    if (action === "update_item") {
      const { id, ...updateData } = body.payload || body
      if (!id) {
        return NextResponse.json({ success: false, error: "id zorunludur" }, { status: 400 })
      }

      const updated = await (prisma as any).inventoryItem.update({
        where: { id },
        data: {
          name: updateData.name,
          category: updateData.category,
          salesPrice: updateData.salesPrice !== undefined ? Number(updateData.salesPrice) : undefined,
          standardCost: updateData.standardCost !== undefined ? Number(updateData.standardCost) : undefined,
          minStockLevel: updateData.minStockLevel !== undefined ? Number(updateData.minStockLevel) : undefined,
          maxStockLevel: updateData.maxStockLevel !== undefined ? Number(updateData.maxStockLevel) : undefined,
          valuationMethod: updateData.valuationMethod,
          trackLot: updateData.trackLot !== undefined ? Boolean(updateData.trackLot) : undefined,
          trackExpiry: updateData.trackExpiry !== undefined ? Boolean(updateData.trackExpiry) : undefined
        }
      })

      return NextResponse.json({ success: true, item: updated })
    }

    // 4. BAŞLANGIÇ VERİSİ SIFIRLAMA / YENİDEN TOHUM
    if (action === "seed_reset") {
      const res = await seedRealisticInventoryData()
      return NextResponse.json(res)
    }

    return NextResponse.json({ success: false, error: "Tanımsız eylem (action)" }, { status: 400 })
  } catch (error: any) {
    console.error("POST /api/inventory error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "İşlem sırasında hata oluştu" },
      { status: 500 }
    )
  }
}
