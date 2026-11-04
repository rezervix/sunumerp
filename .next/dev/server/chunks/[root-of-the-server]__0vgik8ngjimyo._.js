module.exports = [
(()=>{"use strict";return[
"[project]/app/api/inventory/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET,
    "POST",
    ()=>POST
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/db.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$inventoryServerDb$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/services/inventoryServerDb.ts [app-route] (ecmascript)");
;
;
;
async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const section = searchParams.get("section") || "all";
        // 1. Veritabanı boşsa ilk seferde gerçekçi çiçek & aranjman KOBİ tohum verilerini oluştur
        const itemCount = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].inventoryItem.count().catch(()=>0);
        if (itemCount === 0) {
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$inventoryServerDb$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["seedRealisticInventoryData"])();
        }
        // A. TEKİL ÜRÜN ÇEKMECESİ (DRAWER) VE CANLI DETAYLAR
        if (section === "item") {
            const itemId = searchParams.get("itemId") || searchParams.get("id");
            if (!itemId) {
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    success: false,
                    error: "itemId parametresi eksik"
                }, {
                    status: 400
                });
            }
            const item = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].inventoryItem.findUnique({
                where: {
                    id: itemId
                },
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
                        where: {
                            isExhausted: false
                        },
                        orderBy: {
                            layerDate: "asc"
                        }
                    },
                    unitConversions: true,
                    lotSerials: {
                        orderBy: {
                            expiryDate: "asc"
                        }
                    },
                    stockMovements: {
                        take: 10,
                        orderBy: {
                            createdAt: "desc"
                        },
                        include: {
                            warehouse: true
                        }
                    },
                    bomHeaders: {
                        include: {
                            components: {
                                include: {
                                    componentItem: true
                                }
                            }
                        }
                    }
                }
            });
            if (!item) {
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    success: false,
                    error: "Ürün bulunamadı"
                }, {
                    status: 404
                });
            }
            const valuationRes = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$inventoryServerDb$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["calculateItemValuationFromDb"])(itemId, 1, item.valuationMethod || "FIFO");
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                success: true,
                item,
                valuation: valuationRes.success ? valuationRes.valuation : null
            });
        }
        // B. CANLI DEĞERLEME HESAPLAMA (FIFO / LIFO / ORTALAMA)
        if (section === "valuation") {
            const itemId = searchParams.get("itemId");
            const qty = Number(searchParams.get("qty") || 1);
            const method = searchParams.get("method") || "FIFO";
            if (!itemId) {
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    success: false,
                    error: "itemId parametresi eksik"
                }, {
                    status: 400
                });
            }
            const result = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$inventoryServerDb$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["calculateItemValuationFromDb"])(itemId, qty, method);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json(result);
        }
        // C. CANLI ÜRÜN REÇETESİ (BOM) ROLL-UP
        if (section === "bom") {
            const bomId = searchParams.get("bomId");
            const batches = Number(searchParams.get("batches") || 1);
            if (!bomId) {
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    success: false,
                    error: "bomId parametresi eksik"
                }, {
                    status: 400
                });
            }
            const result = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$inventoryServerDb$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["calculateBomRollupFromDb"])(bomId, batches);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json(result);
        }
        // D. CANLI BİRİM ÇEVİRİCİ
        if (section === "unit_convert") {
            const itemId = searchParams.get("itemId");
            const quantity = Number(searchParams.get("quantity") || 1);
            const fromUnit = searchParams.get("fromUnit") || "Adet";
            const toUnit = searchParams.get("toUnit") || "Adet";
            if (!itemId) {
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    success: false,
                    error: "itemId parametresi eksik"
                }, {
                    status: 400
                });
            }
            const result = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$inventoryServerDb$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["convertStockUnitFromDb"])(itemId, quantity, fromUnit, toUnit);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json(result);
        }
        // E. ANA LİSTELEME VE 4 NET ÖZET KART (DEFAULT: "all")
        const warehouses = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].warehouse.findMany({
            where: {
                isActive: true
            },
            include: {
                bins: true
            },
            orderBy: {
                createdAt: "asc"
            }
        });
        const rawItems = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].inventoryItem.findMany({
            where: {
                isActive: true
            },
            include: {
                product: true,
                stockBalances: {
                    include: {
                        warehouse: true,
                        storageBin: true
                    }
                },
                costLayers: {
                    where: {
                        isExhausted: false
                    },
                    orderBy: {
                        layerDate: "asc"
                    }
                },
                unitConversions: true,
                lotSerials: true,
                variants: true,
                bomHeaders: true
            },
            orderBy: {
                createdAt: "desc"
            }
        });
        // Özet hesaplamaları & temiz formatlama
        let totalStockValue = 0;
        let criticalStockCount = 0;
        const now = new Date();
        const fifteenDaysLater = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
        let expiringCount = 0;
        const items = rawItems.map((item)=>{
            const totalOnHand = (item.stockBalances || []).reduce((acc, b)=>acc + Number(b.onHandQty || 0), 0);
            const totalReserved = (item.stockBalances || []).reduce((acc, b)=>acc + Number(b.reservedQty || 0), 0);
            const totalAvailable = (item.stockBalances || []).reduce((acc, b)=>acc + Number(b.availableQty || 0), 0);
            // Ürün toplam stok değeri (Varsa FIFO/maliyet katmanları toplamı, yoksa ortalama/standart maliyet)
            let itemValue = 0;
            if (item.costLayers && item.costLayers.length > 0) {
                itemValue = item.costLayers.reduce((acc, l)=>acc + Number(l.remainingQty || 0) * Number(l.unitCost || 0), 0);
            } else {
                const unitCost = Number(item.fifoUnitCost || item.currentAvgCost || item.standardCost || 0);
                itemValue = totalOnHand * unitCost;
            }
            totalStockValue += itemValue;
            // Kritik Stok Kontrolü
            if (totalOnHand <= Number(item.minStockLevel || 0)) {
                criticalStockCount++;
            }
            // SKT Kontrolü (15 gün içinde dolanlar)
            if (item.lotSerials && item.lotSerials.length > 0) {
                for (const lot of item.lotSerials){
                    if (lot.expiryDate) {
                        const exp = new Date(lot.expiryDate);
                        if (exp <= fifteenDaysLater && lot.status !== "EXPIRED" && lot.status !== "CONSUMED") {
                            expiringCount++;
                            break;
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
            };
        });
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
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
        });
    } catch (error) {
        console.error("GET /api/inventory error:", error);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            success: false,
            error: error.message || "Stok verileri alınamadı"
        }, {
            status: 500
        });
    }
}
async function POST(request) {
    try {
        const body = await request.json();
        const { action } = body;
        // 1. "+ YENİ ÜRÜN TANIMLA"
        if (action === "create_item") {
            const { name, sku, barcode, salesPrice = 0, standardCost = 0, initialStock = 0, warehouseId, storageBinId, category = "Genel", baseUnit = "Adet", itemType = "FINISHED_GOOD", valuationMethod = "FIFO", minStockLevel = 10, maxStockLevel = 500, trackLot = false, trackExpiry = false, shelfLifeDays, unitConversions = [], lotNumber, expiryDate, variants = [], bomComponents = [] } = body.payload || body;
            if (!name || !sku) {
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    success: false,
                    error: "Ürün adı ve SKU/Barkod zorunludur"
                }, {
                    status: 400
                });
            }
            // Ürün SKU benzersizlik kontrolü
            const existing = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].inventoryItem.findUnique({
                where: {
                    sku
                }
            }).catch(()=>null);
            if (existing) {
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    success: false,
                    error: `Bu SKU (${sku}) koduyla kayıtlı başka bir ürün zaten var.`
                }, {
                    status: 400
                });
            }
            // İlgili Product (B2B) kaydı oluştur
            const product = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].product.create({
                data: {
                    name,
                    unit: baseUnit
                }
            }).catch(()=>null);
            // InventoryItem Oluştur
            const createdItem = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].inventoryItem.create({
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
            });
            // Başlangıç stoğu varsa StockBalance, CostLayer ve StockMovement oluştur
            const initQty = Number(initialStock || 0);
            if (initQty > 0 && warehouseId) {
                await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].stockBalance.create({
                    data: {
                        itemId: createdItem.id,
                        warehouseId,
                        storageBinId: storageBinId || null,
                        onHandQty: initQty,
                        availableQty: initQty,
                        reservedQty: 0
                    }
                }).catch(()=>null);
                await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].costLayer.create({
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
                }).catch(()=>null);
                await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].stockMovement.create({
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
                }).catch(()=>null);
            }
            // Lot / SKT Takibi
            if (trackLot && lotNumber && warehouseId) {
                await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].lotSerialRecord.create({
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
                }).catch(()=>null);
            }
            // Çoklu Birim Çevrimleri
            if (Array.isArray(unitConversions) && unitConversions.length > 0) {
                for (const conv of unitConversions){
                    if (conv.fromUnit && conv.multiplier) {
                        await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].unitConversion.create({
                            data: {
                                itemId: createdItem.id,
                                fromUnit: conv.fromUnit,
                                toUnit: baseUnit,
                                multiplier: Number(conv.multiplier),
                                barcode: conv.barcode || null,
                                isDefaultSales: Boolean(conv.isDefaultSales),
                                isDefaultPurchase: Boolean(conv.isDefaultPurchase)
                            }
                        }).catch(()=>null);
                    }
                }
            }
            // Matrix Varyantları (Renk / Beden)
            if (Array.isArray(variants) && variants.length > 0) {
                for (const v of variants){
                    const vSku = v.sku || `${sku}-${String(v.variantName || "VAR").toUpperCase().replace(/\s+/g, "-")}`;
                    const vItem = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].inventoryItem.create({
                        data: {
                            parentItemId: createdItem.id,
                            sku: vSku,
                            barcode: v.barcode || vSku,
                            name: `${name} - ${v.variantName}`,
                            category,
                            itemType: "MATRIX_VARIANT",
                            variantAttributes: JSON.stringify(v.attributes || {
                                varyant: v.variantName
                            }),
                            baseUnit,
                            valuationMethod,
                            standardCost: Number(v.standardCost || standardCost || 0),
                            salesPrice: Number(v.salesPrice || salesPrice || 0),
                            minStockLevel: 2,
                            isActive: true
                        }
                    }).catch(()=>null);
                    if (vItem && Number(v.initialStock || 0) > 0 && warehouseId) {
                        const vQty = Number(v.initialStock);
                        await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].stockBalance.create({
                            data: {
                                itemId: vItem.id,
                                warehouseId,
                                storageBinId: storageBinId || null,
                                onHandQty: vQty,
                                availableQty: vQty
                            }
                        }).catch(()=>null);
                    }
                }
            }
            // BOM (Ürün Reçetesi) Bileşenleri
            if (Array.isArray(bomComponents) && bomComponents.length > 0) {
                const bomHeader = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].bomHeader.create({
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
                }).catch(()=>null);
                if (bomHeader) {
                    for (const c of bomComponents){
                        if (c.componentItemId && c.quantity) {
                            await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].bomComponent.create({
                                data: {
                                    bomId: bomHeader.id,
                                    componentItemId: c.componentItemId,
                                    quantity: Number(c.quantity),
                                    unit: c.unit || "Adet",
                                    scrapPercent: Number(c.scrapPercent || 0),
                                    operationStep: c.operationStep || "Standart Hazırlık"
                                }
                            }).catch(()=>null);
                        }
                    }
                }
            }
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                success: true,
                message: "Ürün ve ilgili stok katmanları veritabanına başarıyla kaydedildi.",
                item: createdItem
            });
        }
        // 2. "HIZLI STOK GİRİŞİ (ALIŞ/İRSALİYE) & HIZLI STOK ÇIKIŞI (SATIŞ/SARF)"
        if (action === "stock_movement") {
            const { movementType, itemId, warehouseId, storageBinId, quantity, unitCost = 0, docNo = "IRS-HIZLI", lotNumber, expiryDate, notes } = body.payload || body;
            if (!itemId || !warehouseId || !quantity || Number(quantity) <= 0) {
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    success: false,
                    error: "Ürün, depo ve geçerli bir miktar belirtilmelidir"
                }, {
                    status: 400
                });
            }
            const moveQty = Number(quantity);
            const cost = Number(unitCost || 0);
            const item = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].inventoryItem.findUnique({
                where: {
                    id: itemId
                }
            });
            if (!item) {
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    success: false,
                    error: "Ürün bulunamadı"
                }, {
                    status: 404
                });
            }
            // Mevcut bakiye kaydını bul veya oluştur
            let balance = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].stockBalance.findFirst({
                where: {
                    itemId,
                    warehouseId,
                    storageBinId: storageBinId || null
                }
            });
            if (movementType === "IN") {
                // GİRİŞ: Bakiyeyi artır
                if (balance) {
                    await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].stockBalance.update({
                        where: {
                            id: balance.id
                        },
                        data: {
                            onHandQty: {
                                increment: moveQty
                            },
                            availableQty: {
                                increment: moveQty
                            }
                        }
                    });
                } else {
                    balance = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].stockBalance.create({
                        data: {
                            itemId,
                            warehouseId,
                            storageBinId: storageBinId || null,
                            onHandQty: moveQty,
                            availableQty: moveQty,
                            reservedQty: 0
                        }
                    });
                }
                // Yeni maliyet katmanı (CostLayer) ekle
                await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].costLayer.create({
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
                });
                // Lot kaydı varsa ekle/güncelle
                if (lotNumber) {
                    await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].lotSerialRecord.create({
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
                    }).catch(()=>null);
                }
                // Hareket günlüğü (StockMovement)
                await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].stockMovement.create({
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
                });
                // Ürünün son alış fiyatını güncelle
                if (cost > 0) {
                    await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].inventoryItem.update({
                        where: {
                            id: itemId
                        },
                        data: {
                            lastPurchaseCost: cost,
                            fifoUnitCost: cost
                        }
                    });
                }
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    success: true,
                    message: `${moveQty} ${item.baseUnit} ${item.name} başarıyla stoğa eklendi.`
                });
            } else if (movementType === "OUT") {
                // ÇIKIŞ: Stok kontrolü
                const currentAvail = Number(balance?.availableQty || 0);
                if (currentAvail < moveQty) {
                    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                        success: false,
                        error: `Yetersiz stok! Bu depoda yalnızca ${currentAvail} ${item.baseUnit} mevcut, talep edilen: ${moveQty} ${item.baseUnit}`
                    }, {
                        status: 400
                    });
                }
                // Bakiyeyi düşür
                await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].stockBalance.update({
                    where: {
                        id: balance.id
                    },
                    data: {
                        onHandQty: {
                            decrement: moveQty
                        },
                        availableQty: {
                            decrement: moveQty
                        }
                    }
                });
                // FIFO / LIFO sırasına göre CostLayer katmanlarını tüket
                let remainingToDeduct = moveQty;
                const layers = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].costLayer.findMany({
                    where: {
                        itemId,
                        warehouseId,
                        isExhausted: false
                    },
                    orderBy: {
                        layerDate: item.valuationMethod === "LIFO" ? "desc" : "asc"
                    }
                });
                let cogsTotal = 0;
                for (const layer of layers){
                    if (remainingToDeduct <= 0) break;
                    const availableInLayer = Number(layer.remainingQty || 0);
                    const deductFromLayer = Math.min(availableInLayer, remainingToDeduct);
                    const newRemaining = availableInLayer - deductFromLayer;
                    remainingToDeduct -= deductFromLayer;
                    cogsTotal += deductFromLayer * Number(layer.unitCost || 0);
                    await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].costLayer.update({
                        where: {
                            id: layer.id
                        },
                        data: {
                            remainingQty: newRemaining,
                            isExhausted: newRemaining <= 0
                        }
                    });
                }
                // Hareket günlüğü (StockMovement)
                await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].stockMovement.create({
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
                });
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    success: true,
                    message: `${moveQty} ${item.baseUnit} ${item.name} stoktan başarıyla düşüldü.`
                });
            }
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                success: false,
                error: "Geçersiz hareket türü"
            }, {
                status: 400
            });
        }
        // 3. ÜRÜN BİLGİLERİNİ GÜNCELLE
        if (action === "update_item") {
            const { id, ...updateData } = body.payload || body;
            if (!id) {
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    success: false,
                    error: "id zorunludur"
                }, {
                    status: 400
                });
            }
            const updated = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].inventoryItem.update({
                where: {
                    id
                },
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
            });
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                success: true,
                item: updated
            });
        }
        // 4. BAŞLANGIÇ VERİSİ SIFIRLAMA / YENİDEN TOHUM
        if (action === "seed_reset") {
            const res = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$inventoryServerDb$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["seedRealisticInventoryData"])();
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json(res);
        }
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            success: false,
            error: "Tanımsız eylem (action)"
        }, {
            status: 400
        });
    } catch (error) {
        console.error("POST /api/inventory error:", error);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            success: false,
            error: error.message || "İşlem sırasında hata oluştu"
        }, {
            status: 500
        });
    }
}
}),
"[project]/lib/db.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "prisma",
    ()=>prisma
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f40$prisma$2f$client__$5b$external$5d$__$2840$prisma$2f$client$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f40$prisma$2f$client$29$__ = __turbopack_context__.i("[externals]/@prisma/client [external] (@prisma/client, cjs, [project]/node_modules/@prisma/client)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/fs [external] (fs, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/path [external] (path, cjs)");
;
;
;
const globalForPrisma = globalThis;
const rawPrisma = globalForPrisma.prisma ?? new __TURBOPACK__imported__module__$5b$externals$5d2f40$prisma$2f$client__$5b$external$5d$__$2840$prisma$2f$client$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f40$prisma$2f$client$29$__["PrismaClient"]({
    log: [
        "query"
    ]
});
if ("TURBOPACK compile-time truthy", 1) globalForPrisma.prisma = rawPrisma;
// Start the Content Cron Service automatically on boot
__turbopack_context__.A("[project]/lib/services/cronService.ts [app-route] (ecmascript, async loader)").catch((err)=>{
    console.error("Content Cron Service startup failed:", err);
});
// ═══════════════════════════════════════════════════════════════════════════════
// DEVRESILIENCE: YEREL HAFİF VERİTABANI VE İLİŞKİ SİMÜLATÖRÜ (JSON DB FALLBACK)
// ═══════════════════════════════════════════════════════════════════════════════
const JSON_DB_PATH = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(process.cwd(), "storage", "ajans-kutuphanesi", ".local-db.json");
const initialData = {
    libraryFile: [],
    libraryFolder: [],
    libraryFilePermission: [],
    libraryConversionJob: [],
    libraryActivityLog: [],
    libraryUploadChunk: [],
    contentStore: [],
    niche: [],
    faq: [],
    customer: [],
    userSession: [],
    passwordResetLog: [],
    module: [],
    project: [],
    lead: [],
    order: [],
    file: [],
    reminder: [],
    product: [],
    branchPrice: [],
    stockRequest: [],
    cargoTracking: [],
    message: [],
    announcement: [],
    auditLog: [],
    todo: [],
    note: [],
    calculationHistory: [],
    notification: [],
    finance: [],
    customerNote: [],
    customerChat: [],
    customerDocument: [],
    customerTask: [],
    taskStatusHistory: [],
    contentCalendar: [],
    customerContact: [],
    candidate: [],
    candidateDocument: [],
    candidateChat: [],
    appointment: [],
    contentItem: [],
    productionShoot: [],
    contentMedia: [],
    contentStatusHistory: [],
    contentChatLink: [],
    revisionRequest: [],
    internalTask: [],
    internalTaskStatusLog: [],
    activeTask: [],
    eodReport: [],
    eodReportAuditLog: [],
    branch: [
        {
            id: "local-debug-branch",
            name: "Merkez Şube",
            code: "HQ",
            themeColor: "#3B82F6"
        }
    ],
    userBranchRole: [
        {
            id: "mock-ubr-1",
            userId: "local-debug-user",
            branchId: "local-debug-branch",
            roleId: "mock-role-id"
        }
    ],
    user: [
        {
            id: "local-debug-user",
            username: "cicekana.dev",
            fullName: "Test Geliştirici",
            email: "dev@cicekana.local",
            avatarUrl: null,
            isActive: true
        }
    ],
    role: [],
    // ── WhatsApp Chat Initial Datasets ──────────────────
    chatConversation: [],
    chatParticipant: [],
    messageReaction: [],
    messageReadReceipt: [],
    messageMention: [],
    pinnedMessage: [],
    voiceMessage: [],
    messageForward: [],
    messageStar: [],
    chatMuteSettings: [],
    userPresence: [],
    userBlock: [],
    broadcastList: [],
    broadcastListMember: [],
    chatWallpaper: [],
    supportTicket: [],
    supportTicketAttachment: [],
    trashItem: [],
    // ── WhatsApp AI Agent Initial Datasets ──────────────
    aiKnowledgeChunk: [],
    aiConversationMemory: [],
    aiAgentLog: [],
    // ── Faz 1–6: Stok, WMS, Satın Alma, Omnichannel, AI & Ekosistem ──
    warehouse: [],
    inventoryItem: [],
    stockBalance: [],
    unitConversion: [],
    alternativeProduct: [],
    lotSerialRecord: [],
    traceabilityLog: [],
    bomHeader: [],
    bomComponent: [],
    costLayer: [],
    stockMovement: [],
    warehouseZone: [],
    storageBin: [],
    locationDirective: [],
    wmsTask: [],
    wmsTaskLine: [],
    warehouseTransferOrder: [],
    licensePlate: [],
    inventoryCountSession: [],
    inventoryCountLine: [],
    wmsOfflineSyncLog: [],
    supplier: [],
    reorderPolicy: [],
    lowStockAlert: [],
    purchaseRequisition: [],
    consignmentStock: [],
    salesChannel: [],
    omnichannelOrder: [],
    returnRmaRecord: [],
    logisticsAdapterConfig: [],
    eDocumentRecord: [],
    demandForecastRecord: [],
    aiNarrativeReport: [],
    inventoryApiKey: [],
    inventoryWebhook: [],
    marketplacePlugin: [],
    erpMigrationJob: [],
    transferOrderLine: [],
    purchaseRequisitionLine: [],
    orderShipmentLine: [],
    licensePlateContent: []
};
// JSON DB Yardımcıları
function readJsonDb() {
    try {
        if (!__TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["default"].existsSync(JSON_DB_PATH)) {
            __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["default"].mkdirSync(__TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].dirname(JSON_DB_PATH), {
                recursive: true
            });
            __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["default"].writeFileSync(JSON_DB_PATH, JSON.stringify(initialData, null, 2), "utf8");
            return initialData;
        }
        const content = __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["default"].readFileSync(JSON_DB_PATH, "utf8");
        const parsed = JSON.parse(content);
        let changed = false;
        for(const key in initialData){
            if (!(key in parsed)) {
                parsed[key] = initialData[key];
                changed = true;
            }
        }
        if (changed) {
            writeJsonDb(parsed);
        }
        return parsed;
    } catch (err) {
        console.error("[DEVRESILIENCE] JSON DB okuma hatası, varsayılan veri dönüyor:", err);
        return initialData;
    }
}
function writeJsonDb(data) {
    try {
        __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["default"].mkdirSync(__TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].dirname(JSON_DB_PATH), {
            recursive: true
        });
        __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["default"].writeFileSync(JSON_DB_PATH, JSON.stringify(data, null, 2), "utf8");
    } catch (err) {
        console.error("[DEVRESILIENCE] JSON DB yazma hatası:", err);
    }
}
// Prisma metodlarını simüle eden nesne
class ModelSimulate {
    modelName;
    constructor(modelName){
        this.modelName = modelName;
    }
    getCollection() {
        const db = readJsonDb();
        if (!db[this.modelName]) {
            db[this.modelName] = [];
            writeJsonDb(db);
        }
        return db[this.modelName];
    }
    saveCollection(collection) {
        const db = readJsonDb();
        db[this.modelName] = collection;
        writeJsonDb(db);
    }
    filterByWhere(items, where) {
        if (!where) return items;
        return items.filter((item)=>{
            for (const [key, value] of Object.entries(where)){
                if (value === undefined) continue;
                // nested objects like { in: [...] }, { contains: "text" }, { gte/lte }, veya bileşik anahtar { itemId, warehouseId, storageBinId }
                if (value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
                    const valObj = value;
                    if ("in" in valObj) {
                        if (!Array.isArray(valObj.in)) return false;
                        if (!valObj.in.includes(item[key])) return false;
                        continue;
                    }
                    if ("not" in valObj) {
                        if (item[key] === valObj.not) return false;
                        continue;
                    }
                    if ("contains" in valObj) {
                        const query = String(valObj.contains).toLowerCase();
                        const itemVal = String(item[key] ?? "").toLowerCase();
                        if (!itemVal.includes(query)) return false;
                        continue;
                    }
                    if ("startsWith" in valObj) {
                        const query = String(valObj.startsWith).toLowerCase();
                        const itemVal = String(item[key] ?? "").toLowerCase();
                        if (!itemVal.startsWith(query)) return false;
                        continue;
                    }
                    if ("gte" in valObj) {
                        if (item[key] < valObj.gte) return false;
                        continue;
                    }
                    if ("lte" in valObj) {
                        if (item[key] > valObj.lte) return false;
                        continue;
                    }
                    if ("gt" in valObj) {
                        if (item[key] <= valObj.gt) return false;
                        continue;
                    }
                    if ("lt" in valObj) {
                        if (item[key] >= valObj.lt) return false;
                        continue;
                    }
                    // Bileşik anahtar eşleşmesi kontrolü (Örn: itemId_warehouseId_storageBinId)
                    let isCompoundMatch = true;
                    let hasCompoundKeys = false;
                    for (const [subKey, subVal] of Object.entries(valObj)){
                        if (subKey in item || subKey === "storageBinId" || subKey === "warehouseId" || subKey === "itemId") {
                            hasCompoundKeys = true;
                            const actualVal = item[subKey] === undefined ? null : item[subKey];
                            const expectedVal = subVal === undefined ? null : subVal;
                            if (actualVal !== expectedVal) {
                                isCompoundMatch = false;
                                break;
                            }
                        }
                    }
                    if (hasCompoundKeys) {
                        if (!isCompoundMatch) return false;
                        continue;
                    }
                }
                // Normal eşleşme (Prisma'da NULL ile undefined yerel JSON eşleşmesini düzeltmek için)
                let itemVal = item[key];
                if (key === "isActive" && (itemVal === undefined || itemVal === null)) {
                    itemVal = true;
                } else if (typeof value === "boolean" && (itemVal === undefined || itemVal === null)) {
                    itemVal = false;
                } else if (itemVal === undefined) {
                    itemVal = null;
                }
                const queryVal = value === undefined ? null : value;
                if (itemVal !== queryVal) return false;
            }
            return true;
        });
    }
    enrichItem(item, include) {
        const db = readJsonDb();
        const enriched = {
            ...item
        };
        // Dinamik _count hesaplamaları
        const fileVersions = db.libraryFile.filter((f)=>f.parentFileId === item.id).length;
        const derivedFiles = db.libraryFile.filter((f)=>f.derivedFromFileId === item.id).length;
        const filesCount = db.libraryFile.filter((f)=>f.folderId === item.id).length;
        const childFoldersCount = db.libraryFolder.filter((f)=>f.parentFolderId === item.id).length;
        enriched._count = {
            fileVersions,
            derivedFiles,
            files: filesCount,
            childFolders: childFoldersCount
        };
        // İlişki dahil etme (include) simülasyonu
        if (include) {
            if (include.uploadedBy || include.user) {
                enriched.uploadedBy = db.user[0] ?? {
                    fullName: "Test Geliştirici"
                };
                enriched.user = db.user[0] ?? {
                    fullName: "Test Geliştirici"
                };
            }
            if (include.folder) {
                enriched.folder = db.libraryFolder.find((f)=>f.id === item.folderId) ?? null;
            }
            if (include.file && item.fileId) {
                enriched.file = db.libraryFile.find((f)=>f.id === item.fileId);
            }
            if (include.fileVersions) {
                enriched.fileVersions = db.libraryFile.filter((f)=>f.parentFileId === item.id);
            }
            if (include.derivedFiles) {
                enriched.derivedFiles = db.libraryFile.filter((f)=>f.derivedFromFileId === item.id);
            }
        }
        if (this.modelName === "contentStore" && include) {
            if (include.niche) {
                enriched.niche = db.niche.find((n)=>n.id === item.nicheId) ?? {
                    id: item.nicheId,
                    name: "Genel"
                };
            }
            if (include.uploadedBy) {
                enriched.uploadedBy = db.user[0] ?? {
                    fullName: "Test Geliştirici"
                };
            }
        }
        if (this.modelName === "user" && include) {
            if (include.branches) {
                const ubrs = (db.userBranchRole || []).filter((ubr)=>ubr.userId === item.id);
                enriched.branches = ubrs.map((ubr)=>{
                    const br = (db.branch || []).find((b)=>b.id === ubr.branchId);
                    const roleName = ubr.roleId === "mock-role-id" ? "Super Admin" : "Personel";
                    return {
                        ...ubr,
                        branch: br ?? {
                            id: ubr.branchId,
                            name: "Şube",
                            themeColor: "#3B82F6"
                        },
                        role: {
                            id: ubr.roleId,
                            name: roleName
                        }
                    };
                });
            }
        }
        if (this.modelName === "contentItem" && include) {
            if (include.branch) {
                enriched.branch = db.branch.find((b)=>b.id === item.branchId) ?? {
                    id: item.branchId,
                    name: "Merkez Şube",
                    themeColor: "#3B82F6"
                };
            }
            if (include.shoot) {
                enriched.shoot = item.shootId ? db.productionShoot.find((s)=>s.id === item.shootId) ?? null : null;
            }
            if (include.media) {
                enriched.media = db.contentMedia.filter((m)=>m.contentItemId === item.id);
            }
            if (include.statusHistory) {
                enriched.statusHistory = db.contentStatusHistory.filter((h)=>h.entityId === item.id && h.entityType === "content_item");
            }
            if (include.chatLinks) {
                enriched.chatLinks = db.contentChatLink.filter((c)=>c.contentItemId === item.id);
            }
            if (include.revisions) {
                enriched.revisions = db.revisionRequest.filter((r)=>r.contentItemId === item.id);
            }
        }
        if (this.modelName === "revisionRequest" && include) {
            if (include.createdBy) {
                enriched.createdBy = db.user.find((u)=>u.id === item.createdById) ?? db.user[0] ?? {
                    id: item.createdById,
                    fullName: "Test Geliştirici"
                };
            }
            if (include.completedBy) {
                enriched.completedBy = item.completedById ? db.user.find((u)=>u.id === item.completedById) ?? null : null;
            }
        }
        if (this.modelName === "internalTask" && include) {
            if (include.assignee) {
                enriched.assignee = db.user.find((u)=>u.id === item.assigneeId) ?? db.user[0];
            }
            if (include.assigner) {
                enriched.assigner = db.user.find((u)=>u.id === item.assignerId) ?? db.user[0];
            }
            if (include.branch) {
                enriched.branch = db.branch.find((b)=>b.id === item.branchId) ?? null;
            }
        }
        if (this.modelName === "eodReport" && include) {
            if (include.user) {
                enriched.user = db.user.find((u)=>u.id === item.userId) ?? db.user[0];
            }
            if (include.auditLogs) {
                enriched.auditLogs = db.eodReportAuditLog.filter((l)=>l.reportId === item.id);
            }
        }
        if (this.modelName === "eodReportAuditLog" && include) {
            if (include.report) {
                enriched.report = db.eodReport.find((r)=>r.id === item.reportId) ?? null;
            }
        }
        if (this.modelName === "activeTask" && include) {
            if (include.user) {
                enriched.user = db.user.find((u)=>u.id === item.userId) ?? db.user[0];
            }
            if (include.task) {
                enriched.task = (db.internalTask || []).find((t)=>t.id === item.taskId) ?? null;
            }
        }
        if (this.modelName === "internalTaskStatusLog" && include) {
            if (include.user) {
                enriched.user = db.user.find((u)=>u.id === item.userId) ?? db.user[0];
            }
            if (include.task) {
                enriched.task = (db.internalTask || []).find((t)=>t.id === item.taskId) ?? null;
            }
        }
        if (this.modelName === "supportTicket" && include) {
            if (include.reporter) {
                enriched.reporter = db.user.find((u)=>u.id === item.reporterUserId) ?? db.user[0] ?? {
                    id: item.reporterUserId,
                    fullName: "Test Kullanıcı"
                };
            }
            if (include.assignedUser) {
                enriched.assignedUser = item.assignedTo ? db.user.find((u)=>u.id === item.assignedTo) ?? null : null;
            }
            if (include.attachments) {
                enriched.attachments = db.supportTicketAttachment.filter((a)=>a.ticketId === item.id);
            }
        }
        if (this.modelName === "supportTicketAttachment" && include) {
            if (include.ticket) {
                enriched.ticket = db.supportTicket.find((t)=>t.id === item.ticketId) ?? null;
            }
        }
        if (this.modelName === "customer" && include) {
            if (include.branch) enriched.branch = db.branch.find((b)=>b.id === item.branchId) ?? null;
            if (include.notes) enriched.notes = (db.customerNote || []).filter((n)=>n.customerId === item.id);
            if (include.chats) enriched.chats = (db.customerChat || []).filter((c)=>c.customerId === item.id);
            if (include.documents) enriched.documents = (db.customerDocument || []).filter((d)=>d.customerId === item.id);
            if (include.tasks) enriched.tasks = (db.customerTask || []).filter((t)=>t.customerId === item.id);
            if (include.contacts) enriched.contacts = (db.customerContact || []).filter((c)=>c.customerId === item.id);
            if (include.orders) enriched.orders = (db.order || []).filter((o)=>o.customerId === item.id);
        }
        if (this.modelName === "order" && include) {
            if (include.customer) enriched.customer = (db.customer || []).find((c)=>c.id === item.customerId) ?? null;
            if (include.branch) enriched.branch = (db.branch || []).find((b)=>b.id === item.branchId) ?? null;
        }
        if (this.modelName === "lead" && include) {
            if (include.branch) enriched.branch = (db.branch || []).find((b)=>b.id === item.branchId) ?? null;
            if (include.createdBy) enriched.createdBy = (db.user || []).find((u)=>u.id === item.createdById) ?? db.user[0] ?? null;
        }
        if (this.modelName === "project" && include) {
            if (include.branch) enriched.branch = (db.branch || []).find((b)=>b.id === item.branchId) ?? null;
        }
        if (this.modelName === "finance" && include) {
            if (include.branch) enriched.branch = (db.branch || []).find((b)=>b.id === item.branchId) ?? null;
        }
        if (this.modelName === "cargoTracking" && include) {
            if (include.branch) enriched.branch = (db.branch || []).find((b)=>b.id === item.branchId) ?? null;
        }
        if (this.modelName === "product" && include) {
            if (include.prices) {
                enriched.prices = (db.branchPrice || []).filter((bp)=>bp.productId === item.id).map((bp)=>({
                        ...bp,
                        branch: (db.branch || []).find((b)=>b.id === bp.branchId) ?? null
                    }));
            }
            if (include.stockRequests) enriched.stockRequests = (db.stockRequest || []).filter((sr)=>sr.productId === item.id);
        }
        if (this.modelName === "branchPrice" && include) {
            if (include.branch) enriched.branch = (db.branch || []).find((b)=>b.id === item.branchId) ?? null;
            if (include.product) enriched.product = (db.product || []).find((p)=>p.id === item.productId) ?? null;
        }
        if (this.modelName === "stockRequest" && include) {
            if (include.branch) enriched.branch = (db.branch || []).find((b)=>b.id === item.branchId) ?? null;
            if (include.product) enriched.product = (db.product || []).find((p)=>p.id === item.productId) ?? null;
        }
        if (this.modelName === "candidate" && include) {
            if (include.branch) enriched.branch = (db.branch || []).find((b)=>b.id === item.branchId) ?? null;
            if (include.documents) enriched.documents = (db.candidateDocument || []).filter((d)=>d.candidateId === item.id);
            if (include.chats) enriched.chats = (db.candidateChat || []).filter((c)=>c.candidateId === item.id);
        }
        if (this.modelName === "chatConversation" && include) {
            if (include.participants) {
                enriched.participants = (db.chatParticipant || []).filter((p)=>p.conversationId === item.id).map((p)=>({
                        ...p,
                        user: (db.user || []).find((u)=>u.id === p.userId) ?? {
                            fullName: "Kullanıcı"
                        }
                    }));
            }
            if (include.messages) {
                const msgs = (db.message || []).filter((m)=>m.conversationId === item.id && !m.isDeleted);
                enriched.messages = msgs.slice(-1).map((m)=>({
                        ...m,
                        fromUser: (db.user || []).find((u)=>u.id === m.fromUserId) ?? {
                            fullName: "Kullanıcı"
                        },
                        reactions: (db.messageReaction || []).filter((r)=>r.messageId === m.id).map((r)=>({
                                ...r,
                                user: (db.user || []).find((u)=>u.id === r.userId) ?? {
                                    fullName: "Kullanıcı"
                                }
                            })),
                        readReceipts: (db.messageReadReceipt || []).filter((rr)=>rr.messageId === m.id)
                    }));
            }
            if (include.pinnedMessages) {
                enriched.pinnedMessages = (db.pinnedMessage || []).filter((pm)=>pm.conversationId === item.id).map((pm)=>({
                        ...pm,
                        message: (db.message || []).find((m)=>m.id === pm.messageId) ?? null
                    }));
            }
            if (include.muteSettings) {
                enriched.muteSettings = (db.chatMuteSettings || []).filter((ms)=>ms.conversationId === item.id);
            }
        }
        if (this.modelName === "message" && include) {
            if (include.fromUser) enriched.fromUser = (db.user || []).find((u)=>u.id === item.fromUserId) ?? db.user[0] ?? {
                fullName: "Kullanıcı"
            };
            if (include.reactions) {
                enriched.reactions = (db.messageReaction || []).filter((r)=>r.messageId === item.id).map((r)=>({
                        ...r,
                        user: (db.user || []).find((u)=>u.id === r.userId) ?? {
                            fullName: "Kullanıcı"
                        }
                    }));
            }
            if (include.readReceipts) enriched.readReceipts = (db.messageReadReceipt || []).filter((rr)=>rr.messageId === item.id);
            if (include.replyToMessage && item.replyToMessageId) {
                enriched.replyToMessage = (db.message || []).find((m)=>m.id === item.replyToMessageId) ?? null;
            }
        }
        if (this.modelName === "trashItem" && include) {
            if (include.user) enriched.user = (db.user || []).find((u)=>u.id === item.deletedByUserId) ?? db.user[0] ?? {
                fullName: item.deletedByFullName
            };
            if (include.branch) enriched.branch = item.branchId ? (db.branch || []).find((b)=>b.id === item.branchId) ?? null : null;
        }
        if (this.modelName === "todo" && include) {
            if (include.user) enriched.user = (db.user || []).find((u)=>u.id === item.userId) ?? db.user[0];
        }
        if (this.modelName === "note" && include) {
            if (include.user) enriched.user = (db.user || []).find((u)=>u.id === item.userId) ?? db.user[0];
        }
        if (this.modelName === "announcement" && include) {
            if (include.createdBy) enriched.createdBy = (db.user || []).find((u)=>u.id === item.createdById) ?? db.user[0];
        }
        if (this.modelName === "appointment" && include) {
            if (include.branch) enriched.branch = (db.branch || []).find((b)=>b.id === item.branchId) ?? null;
        }
        if (this.modelName === "reminder" && include) {
            if (include.branch) enriched.branch = (db.branch || []).find((b)=>b.id === item.branchId) ?? null;
        }
        if (this.modelName === "inventoryItem" && include) {
            if (include.variants) enriched.variants = (db.inventoryItem || []).filter((v)=>v.parentItemId === item.id);
            if (include.parentItem && item.parentItemId) enriched.parentItem = (db.inventoryItem || []).find((p)=>p.id === item.parentItemId) ?? null;
            if (include.stockBalances) {
                enriched.stockBalances = (db.stockBalance || []).filter((sb)=>sb.itemId === item.id).map((sb)=>({
                        ...sb,
                        warehouse: (db.warehouse || []).find((w)=>w.id === sb.warehouseId) ?? null,
                        storageBin: (db.storageBin || []).find((b)=>b.id === sb.storageBinId) ?? null
                    }));
            }
            if (include.unitConversions) enriched.unitConversions = (db.unitConversion || []).filter((u)=>u.itemId === item.id);
            if (include.alternativesFrom) {
                enriched.alternativesFrom = (db.alternativeProduct || []).filter((a)=>a.sourceItemId === item.id).map((a)=>({
                        ...a,
                        substituteItem: (db.inventoryItem || []).find((it)=>it.id === a.substituteItemId) ?? null
                    }));
            }
            if (include.lotSerials) enriched.lotSerials = (db.lotSerialRecord || []).filter((l)=>l.itemId === item.id);
            if (include.costLayers) enriched.costLayers = (db.costLayer || []).filter((c)=>c.itemId === item.id);
        }
        if (this.modelName === "warehouse" && include) {
            if (include.zones) enriched.zones = (db.warehouseZone || []).filter((z)=>z.warehouseId === item.id);
            if (include.bins) enriched.bins = (db.storageBin || []).filter((b)=>b.warehouseId === item.id);
            if (include.stockBalances) enriched.stockBalances = (db.stockBalance || []).filter((sb)=>sb.warehouseId === item.id);
        }
        if (this.modelName === "lotSerialRecord" && include) {
            if (include.item) enriched.item = (db.inventoryItem || []).find((it)=>it.id === item.itemId) ?? null;
            if (include.warehouse) enriched.warehouse = (db.warehouse || []).find((w)=>w.id === item.warehouseId) ?? null;
            if (include.traceLogs) enriched.traceLogs = (db.traceabilityLog || []).filter((t)=>t.lotSerialId === item.id);
        }
        if (this.modelName === "bomHeader" && include) {
            if (include.finishedItem) enriched.finishedItem = (db.inventoryItem || []).find((it)=>it.id === item.finishedItemId) ?? null;
            if (include.components) {
                enriched.components = (db.bomComponent || []).filter((c)=>c.bomId === item.id).map((c)=>({
                        ...c,
                        componentItem: (db.inventoryItem || []).find((it)=>it.id === c.componentItemId) ?? null
                    }));
            }
        }
        if (this.modelName === "wmsTask" && include) {
            if (include.lines) enriched.lines = (db.wmsTaskLine || []).filter((l)=>l.taskId === item.id);
        }
        if (this.modelName === "inventoryCountSession" && include) {
            if (include.warehouse) enriched.warehouse = (db.warehouse || []).find((w)=>w.id === item.warehouseId) ?? null;
            if (include.lines) enriched.lines = (db.inventoryCountLine || []).filter((l)=>l.sessionId === item.id);
        }
        return enriched;
    }
    async findMany(args = {}) {
        let items = [
            ...this.getCollection()
        ];
        items = this.filterByWhere(items, args.where);
        // Sıralama
        if (args.orderBy) {
            const orderKey = Object.keys(args.orderBy)[0];
            const orderDir = args.orderBy[orderKey];
            items.sort((a, b)=>{
                let valA = a[orderKey];
                let valB = b[orderKey];
                if (valA instanceof Date) valA = valA.getTime();
                if (valB instanceof Date) valB = valB.getTime();
                if (valA < valB) return orderDir === "asc" ? -1 : 1;
                if (valA > valB) return orderDir === "asc" ? 1 : -1;
                return 0;
            });
        }
        // Skip & Take
        const skip = args.skip ?? 0;
        const take = args.take ?? items.length;
        items = items.slice(skip, skip + take);
        // İlişki ve sayaç zenginleştirme
        return items.map((item)=>this.enrichItem(item, args.include));
    }
    async findUnique(args = {}) {
        const items = this.getCollection();
        const filtered = this.filterByWhere(items, args.where);
        const match = filtered[0] ?? null;
        return match ? this.enrichItem(match, args.include) : null;
    }
    async findFirst(args = {}) {
        const items = await this.findMany(args);
        return items.length > 0 ? items[0] : null;
    }
    async count(args = {}) {
        const items = this.getCollection();
        const filtered = this.filterByWhere(items, args.where);
        return filtered.length;
    }
    async aggregate(args = {}) {
        const items = this.getCollection();
        const filtered = this.filterByWhere(items, args.where);
        const sumBytes = filtered.reduce((acc, item)=>acc + Number(item.sizeBytes ?? 0), 0);
        return {
            _sum: {
                sizeBytes: sumBytes
            }
        };
    }
    async groupBy(args = {}) {
        const items = this.getCollection();
        const filtered = this.filterByWhere(items, args.where);
        const groups = {};
        for (const item of filtered){
            const keyObj = {};
            for (const field of args.by || []){
                keyObj[field] = item[field];
            }
            const keyStr = JSON.stringify(keyObj);
            if (!groups[keyStr]) {
                groups[keyStr] = [];
            }
            groups[keyStr].push(item);
        }
        const result = [];
        for (const [keyStr, groupItems] of Object.entries(groups)){
            const groupKey = JSON.parse(keyStr);
            const groupResult = {
                ...groupKey
            };
            if (args._count) {
                groupResult._count = {};
                for (const [field, shouldCount] of Object.entries(args._count)){
                    if (shouldCount) {
                        if (field === "_all") {
                            groupResult._count._all = groupItems.length;
                        } else {
                            groupResult._count[field] = groupItems.filter((item)=>item[field] !== null && item[field] !== undefined).length;
                        }
                    }
                }
            }
            if (args._sum) {
                groupResult._sum = {};
                for (const [field, shouldSum] of Object.entries(args._sum)){
                    if (shouldSum) {
                        groupResult._sum[field] = groupItems.reduce((acc, item)=>acc + Number(item[field] ?? 0), 0);
                    }
                }
            }
            result.push(groupResult);
        }
        return result;
    }
    applyUpdateOperations(target, updateData) {
        if (!updateData) return target;
        const result = {
            ...target
        };
        for (const [key, val] of Object.entries(updateData)){
            if (val !== null && typeof val === "object" && !Array.isArray(val) && !(val instanceof Date)) {
                if (typeof val.increment === "number") {
                    result[key] = (Number(result[key]) || 0) + val.increment;
                    continue;
                }
                if (typeof val.decrement === "number") {
                    result[key] = (Number(result[key]) || 0) - val.decrement;
                    continue;
                }
                if (typeof val.set !== "undefined") {
                    result[key] = val.set;
                    continue;
                }
            }
            result[key] = val;
        }
        return result;
    }
    async create(args = {}) {
        const collection = this.getCollection();
        const newItem = {
            id: args.data.id ?? `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isActive: args.data?.isActive ?? true,
            ...args.data
        };
        collection.push(newItem);
        this.saveCollection(collection);
        return newItem;
    }
    async upsert(args = {}) {
        const collection = this.getCollection();
        const filtered = this.filterByWhere(collection, args.where);
        const match = filtered[0];
        if (match) {
            const idx = collection.findIndex((item)=>item.id === match.id);
            collection[idx] = {
                ...this.applyUpdateOperations(collection[idx], args.update),
                updatedAt: new Date().toISOString()
            };
            this.saveCollection(collection);
            return collection[idx];
        } else {
            const newItem = {
                id: args.create.id ?? `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                ...args.create
            };
            collection.push(newItem);
            this.saveCollection(collection);
            return newItem;
        }
    }
    async update(args = {}) {
        const collection = this.getCollection();
        const filtered = this.filterByWhere(collection, args.where);
        const match = filtered[0];
        if (!match) throw new Error(`Kayıt bulunamadı: ${JSON.stringify(args.where)}`);
        const idx = collection.findIndex((item)=>item.id === match.id);
        collection[idx] = {
            ...this.applyUpdateOperations(collection[idx], args.data),
            updatedAt: new Date().toISOString()
        };
        this.saveCollection(collection);
        return collection[idx];
    }
    async delete(args = {}) {
        const collection = this.getCollection();
        const filtered = this.filterByWhere(collection, args.where);
        const match = filtered[0];
        if (!match) throw new Error(`Kayıt bulunamadı: ${JSON.stringify(args.where)}`);
        const idx = collection.findIndex((item)=>item.id === match.id);
        const deleted = collection.splice(idx, 1)[0];
        this.saveCollection(collection);
        return deleted;
    }
    async updateMany(args = {}) {
        const collection = this.getCollection();
        let count = 0;
        const updated = collection.map((item)=>{
            // Eşleşiyorsa güncelle
            const isMatch = Object.entries(args.where ?? {}).every(([k, v])=>item[k] === v);
            if (isMatch) {
                count++;
                return {
                    ...item,
                    ...args.data,
                    updatedAt: new Date().toISOString()
                };
            }
            return item;
        });
        this.saveCollection(updated);
        return {
            count
        };
    }
    async createMany(args = {}) {
        const collection = this.getCollection();
        const newItems = (args.data || []).map((item)=>({
                id: item.id ?? `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                ...item
            }));
        collection.push(...newItems);
        this.saveCollection(collection);
        return {
            count: newItems.length
        };
    }
    async deleteMany(args = {}) {
        const collection = this.getCollection();
        const initialCount = collection.length;
        const remaining = this.filterByWhere(collection, args.where);
        const matchingIds = new Set(remaining.map((item)=>item.id));
        const kept = collection.filter((item)=>!matchingIds.has(item.id));
        this.saveCollection(kept);
        return {
            count: initialCount - kept.length
        };
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// PRISMA CLIENT PROXY INTERCEPTOR
// ═══════════════════════════════════════════════════════════════════════════════
let isDbOfflineCached = false;
let lastOfflineCheck = 0;
const OFFLINE_CACHE_MS = 60000;
const prisma = new Proxy(rawPrisma, {
    get (target, prop) {
        const propStr = String(prop);
        const fallbackModels = [
            "supportTicket",
            "supportTicketAttachment",
            "libraryFile",
            "libraryFolder",
            "libraryFilePermission",
            "libraryConversionJob",
            "libraryActivityLog",
            "libraryUploadChunk",
            "userBranchRole",
            "user",
            "role",
            "userSession",
            "passwordResetLog",
            "module",
            "contentStore",
            "niche",
            "customer",
            "project",
            "lead",
            "order",
            "file",
            "reminder",
            "product",
            "branchPrice",
            "stockRequest",
            "cargoTracking",
            "message",
            "announcement",
            "auditLog",
            "todo",
            "note",
            "calculationHistory",
            "notification",
            "finance",
            "customerNote",
            "customerChat",
            "customerDocument",
            "customerTask",
            "taskStatusHistory",
            "contentCalendar",
            "customerContact",
            "candidate",
            "candidateDocument",
            "candidateChat",
            "appointment",
            "branch",
            "contentItem",
            "productionShoot",
            "contentMedia",
            "contentStatusHistory",
            "contentChatLink",
            "revisionRequest",
            "internalTask",
            "internalTaskStatusLog",
            "activeTask",
            "eodReport",
            "eodReportAuditLog",
            "faq",
            "trashItem",
            // ── WhatsApp Chat Models ────────────────────────────
            "chatConversation",
            "chatParticipant",
            "messageReaction",
            "messageReadReceipt",
            "messageMention",
            "pinnedMessage",
            "voiceMessage",
            "messageForward",
            "messageStar",
            "chatMuteSettings",
            "userPresence",
            "userBlock",
            "broadcastList",
            "broadcastListMember",
            "chatWallpaper",
            // ── Faz 1–6: Stok, WMS, Satın Alma, Omnichannel, AI & Ekosistem ──
            "warehouse",
            "inventoryItem",
            "stockBalance",
            "unitConversion",
            "alternativeProduct",
            "lotSerialRecord",
            "traceabilityLog",
            "bomHeader",
            "bomComponent",
            "costLayer",
            "stockMovement",
            "warehouseZone",
            "storageBin",
            "locationDirective",
            "wmsTask",
            "wmsTaskLine",
            "warehouseTransferOrder",
            "licensePlate",
            "inventoryCountSession",
            "inventoryCountLine",
            "wmsOfflineSyncLog",
            "supplier",
            "reorderPolicy",
            "lowStockAlert",
            "purchaseRequisition",
            "consignmentStock",
            "salesChannel",
            "omnichannelOrder",
            "returnRmaRecord",
            "logisticsAdapterConfig",
            "eDocumentRecord",
            "demandForecastRecord",
            "aiNarrativeReport",
            "inventoryApiKey",
            "inventoryWebhook",
            "marketplacePlugin",
            "erpMigrationJob",
            "transferOrderLine",
            "purchaseRequisitionLine",
            "orderShipmentLine",
            "licensePlateContent"
        ];
        // $queryRaw stats simülasyonu (yerel test için veritabanı kapalıyken istatistik grafiklerini çalıştırır)
        if (propStr === "$queryRaw" || propStr === "$queryRawUnsafe") {
            return async function(...args) {
                try {
                    return await target[prop].apply(target, args);
                } catch (err) {
                    const isConnectionError = err.message?.includes("P1001") || err.message?.includes("Can't reach database");
                    if (isConnectionError) {
                        const sql = args[0] ? String(args[0]) : "";
                        if (sql.includes("LibraryFile") && sql.includes("mimeType")) {
                            const db = readJsonDb();
                            const activeFiles = db.libraryFile.filter((f)=>!f.isTrashed);
                            const breakdown = {};
                            for (const f of activeFiles){
                                let cat = "other";
                                const mime = f.mimeType ?? "";
                                if (mime.startsWith("image/")) cat = "image";
                                else if (mime.startsWith("video/")) cat = "video";
                                else if (mime.startsWith("audio/")) cat = "audio";
                                else if (mime === "application/pdf" || mime.includes("vnd") || mime.includes("ms") || mime.startsWith("text/")) cat = "document";
                                else if (mime.includes("zip") || mime.includes("rar") || mime.includes("7z")) cat = "archive";
                                if (!breakdown[cat]) breakdown[cat] = {
                                    count: 0,
                                    total_size: 0
                                };
                                breakdown[cat].count++;
                                breakdown[cat].total_size += Number(f.sizeBytes ?? 0);
                            }
                            return Object.entries(breakdown).map(([cat, val])=>({
                                    mime_prefix: cat,
                                    count: BigInt(val.count),
                                    total_size: BigInt(val.total_size)
                                }));
                        }
                        return [];
                    }
                    throw err;
                }
            };
        }
        if (fallbackModels.includes(propStr)) {
            const dbProp = target[propStr];
            // Şemada tanımlı değilse doğrudan local simülasyona yönlendir
            if (dbProp === undefined) {
                console.warn(`[DEVRESILIENCE] '${propStr}' şemada bulunamadı, yerel JSON DB kullanılıyor.`);
                return new ModelSimulate(propStr);
            }
            // Şemada varsa bile, bir metot çağrıldığında DB bağlantısı kopuksa (P1001) otomatik yakalamak için metotları sarmalayalım
            return new Proxy(dbProp, {
                get (modelTarget, modelProp) {
                    const originalMethod = modelTarget[modelProp];
                    if (typeof originalMethod !== "function") return originalMethod;
                    return async function(...args) {
                        const now = Date.now();
                        if (isDbOfflineCached && now - lastOfflineCheck < OFFLINE_CACHE_MS) {
                            const simulator = new ModelSimulate(propStr);
                            const simMethod = simulator[modelProp];
                            if (typeof simMethod === "function") {
                                return await simMethod.apply(simulator, args);
                            }
                        }
                        try {
                            // 1. Orijinal Prisma çağrısını dene
                            const result = await originalMethod.apply(modelTarget, args);
                            isDbOfflineCached = false;
                            return result;
                        } catch (err) {
                            const isConnectionError = err.message?.includes("P1001") || err.message?.includes("Can't reach database") || err.message?.includes("connection") || err.code === "P1001";
                            if (isConnectionError) {
                                isDbOfflineCached = true;
                                lastOfflineCheck = Date.now();
                                console.warn(`[DEVRESILIENCE] Veritabanı çevrimdışı (P1001). ` + `'${propStr}.${String(modelProp)}' isteği otomatik olarak yerel JSON DB'ye yönlendirildi.`);
                                const simulator = new ModelSimulate(propStr);
                                const simMethod = simulator[modelProp];
                                if (typeof simMethod === "function") {
                                    return await simMethod.apply(simulator, args);
                                }
                            }
                            throw err // Diğer hataları normal fırlat
                            ;
                        }
                    };
                }
            });
        }
        // Diğer tüm Prisma özellikleri/metotları için genel kurtarıcı proxy
        const originalValue = target[prop];
        if (typeof originalValue === "function") {
            return function(...args) {
                try {
                    const res = originalValue.apply(target, args);
                    if (res && typeof res.then === "function") {
                        return res.catch((err)=>{
                            if (err.message?.includes("P1001") || err.message?.includes("Can't reach database")) {
                                console.warn("[DEVRESILIENCE] Ham Prisma raw sorgusu veritabanı kapalıyken yoksayıldı veya simüle edildi.");
                                return [];
                            }
                            throw err;
                        });
                    }
                    return res;
                } catch (err) {
                    if (err.message?.includes("P1001") || err.message?.includes("Can't reach database")) {
                        return [];
                    }
                    throw err;
                }
            };
        }
        return originalValue;
    }
});
}),
"[project]/lib/services/inventoryServerDb.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "calculateBomRollupFromDb",
    ()=>calculateBomRollupFromDb,
    "calculateItemValuationFromDb",
    ()=>calculateItemValuationFromDb,
    "convertStockUnitFromDb",
    ()=>convertStockUnitFromDb,
    "seedRealisticInventoryData",
    ()=>seedRealisticInventoryData
]);
/**
 * Sunucu Tarafı Envanter ve Veritabanı Entegrasyon Servisi
 * Bu servis sadece sunucu ortamında (API Routes, Server Actions) çalışır.
 * lib/db (Prisma) erişimini izole ederek istemci bileşenlerinin 'fs' modülü hatası almasını engeller.
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/db.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$inventoryValuationEngine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/services/inventoryValuationEngine.ts [app-route] (ecmascript)");
;
;
async function calculateItemValuationFromDb(itemId, issueQty = 1, method = "FIFO") {
    try {
        const item = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].inventoryItem.findUnique({
            where: {
                id: itemId
            },
            include: {
                costLayers: {
                    where: {
                        isExhausted: false
                    },
                    orderBy: {
                        layerDate: "asc"
                    }
                },
                stockBalances: {
                    include: {
                        warehouse: true,
                        storageBin: true
                    }
                },
                unitConversions: true
            }
        });
        if (!item) {
            throw new Error(`Ürün bulunamadı: ${itemId}`);
        }
        const rawLayers = (item.costLayers || []).map((l)=>({
                id: l.id,
                receiptDocNo: l.receiptDocNo || "GRN",
                layerDate: l.layerDate instanceof Date ? l.layerDate.toISOString() : String(l.layerDate),
                warehouseCode: l.warehouseId,
                lotNumber: l.lotNumber || "GENEL",
                initialQty: Number(l.initialQty || 0),
                remainingQty: Number(l.remainingQty || 0),
                unitCost: Number(l.unitCost || 0)
            }));
        const valuation = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$inventoryValuationEngine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["calculateStockValuation"])(rawLayers, method || item.valuationMethod || "FIFO", Number(item.standardCost || item.currentAvgCost || 0), issueQty);
        const totalStock = (item.stockBalances || []).reduce((acc, b)=>acc + Number(b.onHandQty || 0), 0);
        const totalAvailable = (item.stockBalances || []).reduce((acc, b)=>acc + Number(b.availableQty || 0), 0);
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
        };
    } catch (error) {
        return {
            success: false,
            error: error.message || "Değerleme hesaplanırken hata oluştu"
        };
    }
}
async function convertStockUnitFromDb(itemId, quantity, fromUnit, toUnit) {
    try {
        const item = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].inventoryItem.findUnique({
            where: {
                id: itemId
            },
            include: {
                unitConversions: true
            }
        });
        if (!item) {
            throw new Error(`Ürün bulunamadı: ${itemId}`);
        }
        const record = {
            ...item,
            variantAttributes: undefined,
            warehouseBalances: [],
            costLayers: [],
            unitConversions: (item.unitConversions || []).map((u)=>({
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
        };
        const result = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$inventoryValuationEngine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["convertStockUnit"])(record, quantity, fromUnit, toUnit);
        return {
            success: true,
            data: result
        };
    } catch (error) {
        return {
            success: false,
            error: error.message || "Birim çevrimi başarısız"
        };
    }
}
async function calculateBomRollupFromDb(bomId, batchCount = 1) {
    try {
        const bom = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].bomHeader.findUnique({
            where: {
                id: bomId
            },
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
        });
        if (!bom) {
            throw new Error(`BOM reçetesi bulunamadı: ${bomId}`);
        }
        const components = (bom.components || []).map((comp)=>{
            const cItem = comp.componentItem;
            const availableStock = (cItem?.stockBalances || []).reduce((sum, b)=>sum + Number(b.availableQty || 0), 0);
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
            };
        });
        const bomRecord = {
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
        };
        const rollup = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$inventoryValuationEngine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["calculateBomRollupCost"])(bomRecord, batchCount);
        return {
            success: true,
            bom: bomRecord,
            rollup
        };
    } catch (error) {
        return {
            success: false,
            error: error.message || "BOM maliyet hesaplama başarısız"
        };
    }
}
async function seedRealisticInventoryData() {
    try {
        const existingItems = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].inventoryItem.findMany().catch(()=>[]);
        const existingSkus = new Set(existingItems.map((i)=>i.sku));
        if (existingSkus.size >= 7 && existingSkus.has("GUL-EKV-01") && existingSkus.has("ARJ-VIP-07")) {
            return {
                seeded: false,
                message: "Veritabanında mevcut ürünler var, tohum verisi atlandı."
            };
        }
        // 1. Şube Kontrolü veya Oluşturma
        let branch = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].branch.findFirst().catch(()=>null);
        if (!branch) {
            branch = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].branch.create({
                data: {
                    id: "branch-hq-main",
                    name: "Merkez Genel Merkez",
                    code: "HQ-01",
                    city: "İstanbul"
                }
            }).catch(()=>({
                    id: "local-debug-branch"
                }));
        }
        const branchId = branch?.id || "local-debug-branch";
        // 2. Depoları Bul veya Oluştur
        let whMerkez = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].warehouse.findFirst({
            where: {
                code: "DEP-MRK-01"
            }
        }).catch(()=>null);
        if (!whMerkez) {
            whMerkez = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].warehouse.create({
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
            });
        }
        let whKadikoy = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].warehouse.findFirst({
            where: {
                code: "DEP-KDK-02"
            }
        }).catch(()=>null);
        if (!whKadikoy) {
            whKadikoy = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].warehouse.create({
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
            });
        }
        let whAtolye = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].warehouse.findFirst({
            where: {
                code: "DEP-ATL-03"
            }
        }).catch(()=>null);
        if (!whAtolye) {
            whAtolye = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].warehouse.create({
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
            });
        }
        // 3. Raf / Göz (StorageBin) Tanımları
        const binsToEnsure = [
            {
                id: "bin-mrk-gul",
                warehouseId: whMerkez.id,
                code: "A-01-01",
                aisle: "A",
                rack: "01",
                level: "01",
                position: "Zemin Soğuk Hücre"
            },
            {
                id: "bin-mrk-lil",
                warehouseId: whMerkez.id,
                code: "A-01-02",
                aisle: "A",
                rack: "01",
                level: "02",
                position: "Orta Raf"
            },
            {
                id: "bin-kdk-show",
                warehouseId: whKadikoy.id,
                code: "M-01-01",
                aisle: "M",
                rack: "01",
                level: "01",
                position: "Vitrin Standı"
            },
            {
                id: "bin-atl-tezgah",
                warehouseId: whAtolye.id,
                code: "T-01-01",
                aisle: "T",
                rack: "01",
                level: "01",
                position: "Tasarım Tezgahı"
            }
        ];
        for (const b of binsToEnsure){
            const exists = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].storageBin.findFirst({
                where: {
                    code: b.code,
                    warehouseId: b.warehouseId
                }
            }).catch(()=>null);
            if (!exists) {
                await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].storageBin.create({
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
                }).catch(()=>null);
            }
        }
        // 4. KOBİ / Ticari Çiçek & Aranjman Ürünleri (Ürün + InventoryItem + Bakiye + Maliyet Katmanı)
        // ÜRÜN 1: Ekvator Kırmızı Gül
        let prod1 = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].product.findFirst({
            where: {
                sku: "GUL-EKV-01"
            }
        }).catch(()=>null);
        if (!prod1) {
            prod1 = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].product.create({
                data: {
                    id: "prod-gul-01",
                    name: "Ekvator Kırmızı Gül (1. Kalite - 60cm)",
                    sku: "GUL-EKV-01",
                    price: 45,
                    unit: "Demet",
                    stock: 120,
                    category: "Kesme Çiçek"
                }
            });
        }
        let itemGul = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].inventoryItem.findFirst({
            where: {
                sku: "GUL-EKV-01"
            }
        }).catch(()=>null);
        if (!itemGul) {
            itemGul = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].inventoryItem.create({
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
            });
            // Depo Bakiyesi
            await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].stockBalance.create({
                data: {
                    itemId: itemGul.id,
                    warehouseId: whMerkez.id,
                    storageBinId: "bin-mrk-gul",
                    binCode: "A-01-01",
                    onHandQty: 100,
                    reservedQty: 10,
                    availableQty: 90
                }
            });
            await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].stockBalance.create({
                data: {
                    itemId: itemGul.id,
                    warehouseId: whKadikoy.id,
                    storageBinId: "bin-kdk-show",
                    binCode: "M-01-01",
                    onHandQty: 20,
                    reservedQty: 0,
                    availableQty: 20
                }
            });
            // FIFO Maliyet Katmanları (CostLayer)
            await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].costLayer.create({
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
            });
            await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].costLayer.create({
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
            });
            // Birim Çevrimleri (1 Koli = 10 Demet, 1 Demet = 20 Dal/Adet)
            await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].unitConversion.create({
                data: {
                    itemId: itemGul.id,
                    fromUnit: "Koli",
                    toUnit: "Demet",
                    multiplier: 10,
                    barcode: "8690001001-KOL",
                    isDefaultPurchase: true
                }
            });
            await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].unitConversion.create({
                data: {
                    itemId: itemGul.id,
                    fromUnit: "Demet",
                    toUnit: "Adet",
                    multiplier: 20,
                    barcode: "8690001001-ADT",
                    isDefaultSales: true
                }
            });
            // Lot / Parti Kaydı (SKT'li)
            await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].lotSerialRecord.create({
                data: {
                    itemId: itemGul.id,
                    warehouseId: whMerkez.id,
                    batchNumber: "LOT-GUL-2610A",
                    recordType: "LOT",
                    initialQty: 50,
                    currentQty: 50,
                    productionDate: new Date("2026-10-24"),
                    expiryDate: new Date("2026-11-07"),
                    supplierLotNo: "ECU-FLOWER-9821",
                    qualityStatus: "APPROVED"
                }
            });
        }
        // ÜRÜN 2: Beyaz Kazablanka Lilyum
        let prod2 = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].product.findFirst({
            where: {
                sku: "LIL-KAZ-02"
            }
        }).catch(()=>null);
        if (!prod2) {
            prod2 = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].product.create({
                data: {
                    id: "prod-lil-02",
                    name: "Beyaz Kazablanka Lilyum (Kokulu)",
                    sku: "LIL-KAZ-02",
                    price: 90,
                    unit: "Dal",
                    stock: 60,
                    category: "Kesme Çiçek"
                }
            });
        }
        let itemLil = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].inventoryItem.findFirst({
            where: {
                sku: "LIL-KAZ-02"
            }
        }).catch(()=>null);
        if (!itemLil) {
            itemLil = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].inventoryItem.create({
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
            });
            await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].stockBalance.create({
                data: {
                    itemId: itemLil.id,
                    warehouseId: whMerkez.id,
                    storageBinId: "bin-mrk-lil",
                    binCode: "A-01-02",
                    onHandQty: 60,
                    reservedQty: 5,
                    availableQty: 55
                }
            });
            await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].costLayer.create({
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
            });
            await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].lotSerialRecord.create({
                data: {
                    itemId: itemLil.id,
                    warehouseId: whMerkez.id,
                    batchNumber: "LOT-LIL-28",
                    recordType: "LOT",
                    initialQty: 60,
                    currentQty: 60,
                    productionDate: new Date("2026-10-28"),
                    expiryDate: new Date("2026-11-06"),
                    supplierLotNo: "ANT-LIL-554",
                    qualityStatus: "APPROVED"
                }
            });
        }
        // ÜRÜN 3: İthal Mat Antrasit Seramik Vazo (25cm)
        let prod3 = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].product.findFirst({
            where: {
                sku: "VAZ-ANT-03"
            }
        }).catch(()=>null);
        if (!prod3) {
            prod3 = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].product.create({
                data: {
                    id: "prod-vaz-03",
                    name: "İthal Mat Antrasit Seramik Vazo (25cm)",
                    sku: "VAZ-ANT-03",
                    price: 320,
                    unit: "Adet",
                    stock: 45,
                    category: "Vazo & Seramik"
                }
            });
        }
        let itemVaz = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].inventoryItem.findFirst({
            where: {
                sku: "VAZ-ANT-03"
            }
        }).catch(()=>null);
        if (!itemVaz) {
            itemVaz = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].inventoryItem.create({
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
            });
            await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].stockBalance.create({
                data: {
                    itemId: itemVaz.id,
                    warehouseId: whAtolye.id,
                    storageBinId: "bin-atl-tezgah",
                    binCode: "T-01-01",
                    onHandQty: 45,
                    reservedQty: 0,
                    availableQty: 45
                }
            });
            await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].costLayer.create({
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
            });
        }
        // ÜRÜN 4: Oasis Islak Çiçek Süngeri (20'li Koli)
        let prod4 = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].product.findFirst({
            where: {
                sku: "SNG-OAS-04"
            }
        }).catch(()=>null);
        if (!prod4) {
            prod4 = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].product.create({
                data: {
                    id: "prod-sng-04",
                    name: "Oasis Islak Çiçek Süngeri (20'li Koli)",
                    sku: "SNG-OAS-04",
                    price: 550,
                    unit: "Koli",
                    stock: 25,
                    category: "Sarf & Ambalaj"
                }
            });
        }
        let itemSng = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].inventoryItem.findFirst({
            where: {
                sku: "SNG-OAS-04"
            }
        }).catch(()=>null);
        if (!itemSng) {
            itemSng = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].inventoryItem.create({
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
            });
            await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].stockBalance.create({
                data: {
                    itemId: itemSng.id,
                    warehouseId: whAtolye.id,
                    storageBinId: "bin-atl-tezgah",
                    binCode: "T-01-01",
                    onHandQty: 25,
                    reservedQty: 2,
                    availableQty: 23
                }
            });
            await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].costLayer.create({
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
            });
            await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].unitConversion.create({
                data: {
                    itemId: itemSng.id,
                    fromUnit: "Koli",
                    toUnit: "Adet",
                    multiplier: 20,
                    barcode: "8690001004-ADT"
                }
            });
        }
        // ÜRÜN 5: Mor Phalaenopsis Orkide (Çift Dal) - Kritik Stok Örneği (3 Adet)
        let prod5 = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].product.findFirst({
            where: {
                sku: "ORK-MOR-05"
            }
        }).catch(()=>null);
        if (!prod5) {
            prod5 = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].product.create({
                data: {
                    id: "prod-ork-05",
                    name: "Mor Phalaenopsis Orkide (Çift Dal)",
                    sku: "ORK-MOR-05",
                    price: 950,
                    unit: "Saksı",
                    stock: 3,
                    category: "Saksılı Çiçek"
                }
            });
        }
        let itemOrk = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].inventoryItem.findFirst({
            where: {
                sku: "ORK-MOR-05"
            }
        }).catch(()=>null);
        if (!itemOrk) {
            itemOrk = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].inventoryItem.create({
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
            });
            await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].stockBalance.create({
                data: {
                    itemId: itemOrk.id,
                    warehouseId: whMerkez.id,
                    storageBinId: "bin-mrk-lil",
                    binCode: "A-01-02",
                    onHandQty: 3,
                    reservedQty: 0,
                    availableQty: 3
                }
            });
            await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].costLayer.create({
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
            });
        }
        // ÜRÜN 6: Gelin Buketi (Matrix Parent ve 2 Renk Varyantı)
        let prod6 = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].product.findFirst({
            where: {
                sku: "BKT-PST-06"
            }
        }).catch(()=>null);
        if (!prod6) {
            prod6 = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].product.create({
                data: {
                    id: "prod-bkt-06",
                    name: "Gelin Buketi - Romantik Pastel (Tasarım Serisi)",
                    sku: "BKT-PST-06",
                    price: 1850,
                    unit: "Adet",
                    stock: 8,
                    category: "Gelin & Özel Gün"
                }
            });
        }
        let itemBktParent = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].inventoryItem.findFirst({
            where: {
                sku: "BKT-PST-06"
            }
        }).catch(()=>null);
        if (!itemBktParent) {
            itemBktParent = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].inventoryItem.create({
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
            });
            // Alt Varyant 1: Pudra Pembe
            await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].inventoryItem.create({
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
                    variantAttributes: {
                        renk: "Pudra Pembe",
                        kurdele: "Saten Gül Kurusu"
                    }
                }
            });
            await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].stockBalance.create({
                data: {
                    itemId: "item-bkt-var-pud",
                    warehouseId: whKadikoy.id,
                    storageBinId: "bin-kdk-show",
                    binCode: "M-01-01",
                    onHandQty: 5,
                    reservedQty: 1,
                    availableQty: 4
                }
            });
            // Alt Varyant 2: Kar Beyazı
            await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].inventoryItem.create({
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
                    variantAttributes: {
                        renk: "Kar Beyazı",
                        kurdele: "İnci Beyazı Tül"
                    }
                }
            });
            await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].stockBalance.create({
                data: {
                    itemId: "item-bkt-var-bey",
                    warehouseId: whKadikoy.id,
                    storageBinId: "bin-kdk-show",
                    binCode: "M-01-01",
                    onHandQty: 3,
                    reservedQty: 0,
                    availableQty: 3
                }
            });
        }
        // ÜRÜN 7: VIP Seramik Aranjman (Reçeteli - BOM)
        let prod7 = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].product.findFirst({
            where: {
                sku: "ARJ-VIP-07"
            }
        }).catch(()=>null);
        if (!prod7) {
            prod7 = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].product.create({
                data: {
                    id: "prod-arj-07",
                    name: "Premium VIP Seramik Aranjman (Reçeteli)",
                    sku: "ARJ-VIP-07",
                    price: 1950,
                    unit: "Adet",
                    stock: 6,
                    category: "Lüks Aranjman"
                }
            });
        }
        let itemArj = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].inventoryItem.findFirst({
            where: {
                sku: "ARJ-VIP-07"
            }
        }).catch(()=>null);
        if (!itemArj) {
            itemArj = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].inventoryItem.create({
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
            });
            await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].stockBalance.create({
                data: {
                    itemId: itemArj.id,
                    warehouseId: whAtolye.id,
                    storageBinId: "bin-atl-tezgah",
                    binCode: "T-01-01",
                    onHandQty: 6,
                    reservedQty: 1,
                    availableQty: 5
                }
            });
            await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].costLayer.create({
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
            });
        }
        // 5. BOM (Ürün Reçetesi) Tanımı: VIP Aranjman İçin
        const bomArj = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].bomHeader.create({
            data: {
                id: "bom-arj-vip",
                finishedItemId: itemArj.id,
                code: "BOM-ARJ-VIP-V1",
                name: "VIP Seramik Aranjman Standart İmalat Reçetesi",
                version: "v1.0",
                outputQty: 1,
                outputUnit: "Adet",
                laborCostPerBatch: 120,
                overheadCostPerBatch: 40,
                scrapRatePercent: 2.0,
                leadTimeHours: 1.5,
                isActive: true
            }
        });
        // BOM Bileşenleri
        await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].bomComponent.create({
            data: {
                bomId: bomArj.id,
                componentItemId: itemGul.id,
                quantity: 1,
                unit: "Demet",
                scrapPercent: 1.0,
                operationStep: "10 - Taze Gül Temizleme & Budama"
            }
        });
        await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].bomComponent.create({
            data: {
                bomId: bomArj.id,
                componentItemId: itemLil.id,
                quantity: 2,
                unit: "Dal",
                scrapPercent: 1.0,
                operationStep: "20 - Lilyum Çiçek Yerleşimi"
            }
        });
        await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].bomComponent.create({
            data: {
                bomId: bomArj.id,
                componentItemId: itemVaz.id,
                quantity: 1,
                unit: "Adet",
                scrapPercent: 0.0,
                operationStep: "05 - Taban Vazo Hazırlığı"
            }
        });
        await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].bomComponent.create({
            data: {
                bomId: bomArj.id,
                componentItemId: itemSng.id,
                quantity: 0.05,
                unit: "Koli",
                scrapPercent: 2.0,
                operationStep: "06 - Oasis Islak Sünger Kesimi & Sabitleme"
            }
        });
        return {
            seeded: true,
            message: "Gerçekçi KOBİ / Ticari Çiçek & Aranjman başlangıç verileri başarıyla oluşturuldu."
        };
    } catch (error) {
        console.error("seedRealisticInventoryData error:", error);
        return {
            seeded: false,
            error: error.message || "Tohum verisi oluşturulamadı."
        };
    }
}
}),
"[project]/lib/services/inventoryValuationEngine.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * FAZ 1: Çekirdek Stok ve Envanter Mimarisi Motoru
 * - Çoklu Depo & Şube Anlık Stok Takibi (ATP = OnHand - Reserved)
 * - Ebeveyn-Alt Madde (Matrix) Varyant Yapısı ve Otomatik Ebeveyn Stok Roll-up
 * - Lot, Parti, Seri Numarası ve SKT (FEFO) Uçtan Uca İzlenebilirlik (Forward & Backward Genealogy)
 * - Çoklu Birim Dönüştürme (Adet, Koli, Palet, Kg, Litre) ve Alternatif/Muadil Ürün Öneri Motoru
 * - Ürün Ağacı (BOM) Reçete Maliyet Roll-up ve FIFO, LIFO, Ağırlıklı Ortalama & Standart Maliyet Değerleme Motoru
 */ __turbopack_context__.s([
    "INITIAL_ALTERNATIVE_PRODUCTS",
    ()=>INITIAL_ALTERNATIVE_PRODUCTS,
    "INITIAL_BOM_RECIPES",
    ()=>INITIAL_BOM_RECIPES,
    "INITIAL_INVENTORY_ITEMS",
    ()=>INITIAL_INVENTORY_ITEMS,
    "INITIAL_LOT_SERIAL_BATCHES",
    ()=>INITIAL_LOT_SERIAL_BATCHES,
    "INITIAL_WAREHOUSES",
    ()=>INITIAL_WAREHOUSES,
    "calculateBomRollupCost",
    ()=>calculateBomRollupCost,
    "calculateStockValuation",
    ()=>calculateStockValuation,
    "convertStockUnit",
    ()=>convertStockUnit
]);
const INITIAL_WAREHOUSES = [
    {
        id: "wh-ist-main",
        branchId: "local-debug-branch",
        branchName: "Merkez Şube (İstanbul)",
        code: "DEP-IST-01",
        name: "Tuzla Merkez Akıllı Lojistik & WMS Üssü",
        type: "MAIN",
        city: "İstanbul / Tuzla",
        address: "İTOSB Lojistik Bulvarı No: 42, Tuzla / İstanbul",
        managerName: "Hakan Çelik",
        temperatureRange: "+18°C / +22°C (İklimlendirmeli)",
        capacityVolumeM3: 12000,
        usedVolumeM3: 8640,
        capacityWeightKg: 450000,
        usedWeightKg: 312000,
        totalSkuCount: 1480,
        totalStockValueTry: 18450000,
        isActive: true
    },
    {
        id: "wh-ist-kadikoy",
        branchId: "local-debug-branch",
        branchName: "Kadıköy Mağaza & Omnichannel Hub",
        code: "DEP-KDK-02",
        name: "Kadıköy Mağaza & Hızlı Teslimat (Dark Store) Deposu",
        type: "BRANCH_STORE",
        city: "İstanbul / Kadıköy",
        address: "Bağdat Cad. No: 214, Kadıköy / İstanbul",
        managerName: "Zeynep Aksoy",
        temperatureRange: "+20°C Oda Sıcaklığı",
        capacityVolumeM3: 1800,
        usedVolumeM3: 1390,
        capacityWeightKg: 60000,
        usedWeightKg: 44500,
        totalSkuCount: 620,
        totalStockValueTry: 4920000,
        isActive: true
    },
    {
        id: "wh-ank-hub",
        branchId: "local-debug-branch",
        branchName: "Ankara Bölge Müdürlüğü",
        code: "DEP-ANK-03",
        name: "Ankara İç Anadolu Bölge Dağıtım Merkezi",
        type: "MAIN",
        city: "Ankara / Sincan OSB",
        address: "ASO 2. OSB Lojistik Cad. No: 19, Ankara",
        managerName: "Serkan Demirtaş",
        temperatureRange: "+16°C / +22°C",
        capacityVolumeM3: 6500,
        usedVolumeM3: 4120,
        capacityWeightKg: 220000,
        usedWeightKg: 148000,
        totalSkuCount: 890,
        totalStockValueTry: 8740000,
        isActive: true
    },
    {
        id: "wh-gebze-cold",
        branchId: "local-debug-branch",
        branchName: "Gebze Üretim & Soğuk Zincir",
        code: "DEP-GBZ-04",
        name: "Gebze Soğuk Zincir & SKT Hassas Hammadde Deposu",
        type: "COLD_CHAIN",
        city: "Kocaeli / Gebze",
        address: "GOSB Teknopark Yanı 4. Cad. No: 8, Gebze",
        managerName: "Gökhan Arslan",
        temperatureRange: "+2°C / +6°C (Sensör İzlemeli)",
        capacityVolumeM3: 3200,
        usedVolumeM3: 2410,
        capacityWeightKg: 110000,
        usedWeightKg: 82000,
        totalSkuCount: 310,
        totalStockValueTry: 6180000,
        isActive: true
    },
    {
        id: "wh-izmir-consign",
        branchId: "local-debug-branch",
        branchName: "İzmir Ege Şubesi",
        code: "DEP-IZM-05",
        name: "İzmir Konsinye (Emanet) & 3PL Entegre Depo",
        type: "CONSIGNMENT",
        city: "İzmir / Kemalpaşa",
        address: "KOSBİ Lojistik Köyü B Blok, Kemalpaşa / İzmir",
        managerName: "Elif Yalçın",
        temperatureRange: "+18°C / +24°C",
        capacityVolumeM3: 4000,
        usedVolumeM3: 2650,
        capacityWeightKg: 140000,
        usedWeightKg: 91000,
        totalSkuCount: 440,
        totalStockValueTry: 5390000,
        isActive: true
    }
];
const INITIAL_INVENTORY_ITEMS = [
    // 1. Ebeveyn-Alt Madde (Matrix) Ana Ürün
    {
        id: "item-mat-parent-01",
        sku: "MTX-PRO-JACKET",
        barcode: "8690001100001",
        gtin: "08690001100001",
        rfidEpcPrefix: "3034257BF400",
        name: "Endüstriyel Pro-Shield Akıllı İş Montu (Matrix Ana Kart)",
        category: "Teknik Tekstil & KKD",
        brand: "SunumPro Gear",
        itemType: "MATRIX_PARENT",
        parentItemId: null,
        variantAttributes: {
            matrisYapisi: "Renk x Beden (Otomatik Toplam)"
        },
        baseUnit: "Adet",
        valuationMethod: "FIFO",
        standardCost: 1450,
        currentAvgCost: 1510,
        fifoUnitCost: 1480,
        lifoUnitCost: 1560,
        lastPurchaseCost: 1560,
        salesPrice: 2850,
        taxRate: 20,
        trackLot: true,
        trackSerial: false,
        trackExpiry: false,
        abcClass: "A",
        xyzClass: "X",
        minStockLevel: 120,
        maxStockLevel: 1200,
        leadTimeDays: 7,
        totalOnHand: 460,
        totalReserved: 65,
        totalAvailable: 395,
        totalInTransit: 40,
        totalQuarantine: 10,
        totalConsignment: 50,
        warehouseBalances: [
            {
                warehouseId: "wh-ist-main",
                warehouseCode: "DEP-IST-01",
                warehouseName: "Tuzla Merkez Akıllı Lojistik & WMS Üssü",
                binCode: "IST-Z2-A01-R02-L01-B01",
                onHandQty: 310,
                reservedQty: 45,
                availableQty: 265,
                inTransitQty: 25,
                quarantineQty: 10,
                consignmentQty: 30
            },
            {
                warehouseId: "wh-ist-kadikoy",
                warehouseCode: "DEP-KDK-02",
                warehouseName: "Kadıköy Mağaza & Hızlı Teslimat Deposu",
                binCode: "KDK-Z1-A02-R01-L02-B03",
                onHandQty: 150,
                reservedQty: 20,
                availableQty: 130,
                inTransitQty: 15,
                quarantineQty: 0,
                consignmentQty: 20
            }
        ],
        unitConversions: [
            {
                id: "uc-1",
                fromUnit: "Koli",
                toUnit: "Adet",
                multiplier: 12,
                barcode: "18690001100008",
                weightKg: 14.4,
                volumeM3: 0.08,
                isDefaultPurchase: true,
                isDefaultSales: false
            },
            {
                id: "uc-2",
                fromUnit: "Euro Palet",
                toUnit: "Adet",
                multiplier: 144,
                barcode: "28690001100005",
                weightKg: 185,
                volumeM3: 1.15,
                isDefaultPurchase: false,
                isDefaultSales: false
            }
        ],
        costLayers: [
            {
                id: "cl-1",
                receiptDocNo: "GRN-2026-0812",
                layerDate: "2026-09-10",
                warehouseCode: "DEP-IST-01",
                lotNumber: "LOT-2609-A1",
                initialQty: 200,
                remainingQty: 140,
                unitCost: 1420
            },
            {
                id: "cl-2",
                receiptDocNo: "GRN-2026-0945",
                layerDate: "2026-10-05",
                warehouseCode: "DEP-IST-01",
                lotNumber: "LOT-2610-B4",
                initialQty: 200,
                remainingQty: 180,
                unitCost: 1510
            },
            {
                id: "cl-3",
                receiptDocNo: "GRN-2026-1088",
                layerDate: "2026-10-28",
                warehouseCode: "DEP-KDK-02",
                lotNumber: "LOT-2610-C9",
                initialQty: 140,
                remainingQty: 140,
                unitCost: 1560
            }
        ],
        isActive: true
    },
    // Alt Varyant 1
    {
        id: "item-mat-var-01",
        sku: "MTX-PRO-JACKET-NVY-M",
        barcode: "8690001100018",
        gtin: "08690001100018",
        rfidEpcPrefix: "3034257BF401",
        name: "Endüstriyel Pro-Shield Mont — Gece Mavisi / M Beden",
        category: "Teknik Tekstil & KKD",
        brand: "SunumPro Gear",
        itemType: "MATRIX_VARIANT",
        parentItemId: "item-mat-parent-01",
        variantAttributes: {
            renk: "Gece Mavisi",
            beden: "M",
            kumas: "Gore-Tex 3L"
        },
        baseUnit: "Adet",
        valuationMethod: "FIFO",
        standardCost: 1450,
        currentAvgCost: 1495,
        fifoUnitCost: 1460,
        lifoUnitCost: 1540,
        lastPurchaseCost: 1540,
        salesPrice: 2850,
        taxRate: 20,
        trackLot: true,
        trackSerial: false,
        trackExpiry: false,
        abcClass: "A",
        xyzClass: "X",
        minStockLevel: 40,
        maxStockLevel: 400,
        leadTimeDays: 7,
        totalOnHand: 180,
        totalReserved: 25,
        totalAvailable: 155,
        totalInTransit: 15,
        totalQuarantine: 0,
        totalConsignment: 20,
        warehouseBalances: [
            {
                warehouseId: "wh-ist-main",
                warehouseCode: "DEP-IST-01",
                warehouseName: "Tuzla Merkez Akıllı Lojistik & WMS Üssü",
                binCode: "IST-Z2-A01-R02-L01-B01",
                onHandQty: 120,
                reservedQty: 15,
                availableQty: 105,
                inTransitQty: 10,
                quarantineQty: 0,
                consignmentQty: 10
            },
            {
                warehouseId: "wh-ist-kadikoy",
                warehouseCode: "DEP-KDK-02",
                warehouseName: "Kadıköy Mağaza & Hızlı Teslimat Deposu",
                binCode: "KDK-Z1-A02-R01-L02-B03",
                onHandQty: 60,
                reservedQty: 10,
                availableQty: 50,
                inTransitQty: 5,
                quarantineQty: 0,
                consignmentQty: 10
            }
        ],
        unitConversions: [
            {
                id: "uc-v1",
                fromUnit: "Koli",
                toUnit: "Adet",
                multiplier: 12,
                barcode: "18690001100015",
                weightKg: 14.0,
                volumeM3: 0.08,
                isDefaultPurchase: true,
                isDefaultSales: false
            }
        ],
        costLayers: [
            {
                id: "cl-v1",
                receiptDocNo: "GRN-2026-0812",
                layerDate: "2026-09-10",
                warehouseCode: "DEP-IST-01",
                lotNumber: "LOT-2609-A1",
                initialQty: 100,
                remainingQty: 80,
                unitCost: 1460
            },
            {
                id: "cl-v2",
                receiptDocNo: "GRN-2026-1088",
                layerDate: "2026-10-28",
                warehouseCode: "DEP-KDK-02",
                lotNumber: "LOT-2610-C9",
                initialQty: 100,
                remainingQty: 100,
                unitCost: 1540
            }
        ],
        isActive: true
    },
    // Alt Varyant 2
    {
        id: "item-mat-var-02",
        sku: "MTX-PRO-JACKET-NVY-L",
        barcode: "8690001100025",
        gtin: "08690001100025",
        rfidEpcPrefix: "3034257BF402",
        name: "Endüstriyel Pro-Shield Mont — Gece Mavisi / L Beden",
        category: "Teknik Tekstil & KKD",
        brand: "SunumPro Gear",
        itemType: "MATRIX_VARIANT",
        parentItemId: "item-mat-parent-01",
        variantAttributes: {
            renk: "Gece Mavisi",
            beden: "L",
            kumas: "Gore-Tex 3L"
        },
        baseUnit: "Adet",
        valuationMethod: "FIFO",
        standardCost: 1450,
        currentAvgCost: 1520,
        fifoUnitCost: 1500,
        lifoUnitCost: 1560,
        lastPurchaseCost: 1560,
        salesPrice: 2850,
        taxRate: 20,
        trackLot: true,
        trackSerial: false,
        trackExpiry: false,
        abcClass: "A",
        xyzClass: "X",
        minStockLevel: 50,
        maxStockLevel: 400,
        leadTimeDays: 7,
        totalOnHand: 190,
        totalReserved: 30,
        totalAvailable: 160,
        totalInTransit: 15,
        totalQuarantine: 5,
        totalConsignment: 20,
        warehouseBalances: [
            {
                warehouseId: "wh-ist-main",
                warehouseCode: "DEP-IST-01",
                warehouseName: "Tuzla Merkez Akıllı Lojistik & WMS Üssü",
                binCode: "IST-Z2-A01-R02-L01-B02",
                onHandQty: 130,
                reservedQty: 20,
                availableQty: 110,
                inTransitQty: 10,
                quarantineQty: 5,
                consignmentQty: 15
            },
            {
                warehouseId: "wh-ist-kadikoy",
                warehouseCode: "DEP-KDK-02",
                warehouseName: "Kadıköy Mağaza & Hızlı Teslimat Deposu",
                binCode: "KDK-Z1-A02-R01-L02-B04",
                onHandQty: 60,
                reservedQty: 10,
                availableQty: 50,
                inTransitQty: 5,
                quarantineQty: 0,
                consignmentQty: 5
            }
        ],
        unitConversions: [],
        costLayers: [
            {
                id: "cl-v3",
                receiptDocNo: "GRN-2026-0945",
                layerDate: "2026-10-05",
                warehouseCode: "DEP-IST-01",
                lotNumber: "LOT-2610-B4",
                initialQty: 190,
                remainingQty: 190,
                unitCost: 1520
            }
        ],
        isActive: true
    },
    // Alt Varyant 3
    {
        id: "item-mat-var-03",
        sku: "MTX-PRO-JACKET-ORG-XL",
        barcode: "8690001100032",
        gtin: "08690001100032",
        rfidEpcPrefix: "3034257BF403",
        name: "Endüstriyel Pro-Shield Mont — Reflektörlü Turuncu / XL Beden",
        category: "Teknik Tekstil & KKD",
        brand: "SunumPro Gear",
        itemType: "MATRIX_VARIANT",
        parentItemId: "item-mat-parent-01",
        variantAttributes: {
            renk: "Reflektörlü Turuncu",
            beden: "XL",
            kumas: "Gore-Tex 3L"
        },
        baseUnit: "Adet",
        valuationMethod: "FIFO",
        standardCost: 1480,
        currentAvgCost: 1550,
        fifoUnitCost: 1520,
        lifoUnitCost: 1580,
        lastPurchaseCost: 1580,
        salesPrice: 2950,
        taxRate: 20,
        trackLot: true,
        trackSerial: false,
        trackExpiry: false,
        abcClass: "B",
        xyzClass: "Y",
        minStockLevel: 30,
        maxStockLevel: 300,
        leadTimeDays: 7,
        totalOnHand: 90,
        totalReserved: 10,
        totalAvailable: 80,
        totalInTransit: 10,
        totalQuarantine: 5,
        totalConsignment: 10,
        warehouseBalances: [
            {
                warehouseId: "wh-ist-main",
                warehouseCode: "DEP-IST-01",
                warehouseName: "Tuzla Merkez Akıllı Lojistik & WMS Üssü",
                binCode: "IST-Z2-A01-R02-L01-B03",
                onHandQty: 60,
                reservedQty: 10,
                availableQty: 50,
                inTransitQty: 5,
                quarantineQty: 5,
                consignmentQty: 5
            },
            {
                warehouseId: "wh-ist-kadikoy",
                warehouseCode: "DEP-KDK-02",
                warehouseName: "Kadıköy Mağaza & Hızlı Teslimat Deposu",
                binCode: "KDK-Z1-A02-R01-L02-B05",
                onHandQty: 30,
                reservedQty: 0,
                availableQty: 30,
                inTransitQty: 5,
                quarantineQty: 0,
                consignmentQty: 5
            }
        ],
        unitConversions: [],
        costLayers: [
            {
                id: "cl-v4",
                receiptDocNo: "GRN-2026-1088",
                layerDate: "2026-10-28",
                warehouseCode: "DEP-IST-01",
                lotNumber: "LOT-2610-C9",
                initialQty: 90,
                remainingQty: 90,
                unitCost: 1550
            }
        ],
        isActive: true
    },
    // 2. Seri & BOM Üretimi Takipli Mamul (Akıllı El Terminali)
    {
        id: "item-fg-terminal",
        sku: "WMS-HHT-X900",
        barcode: "8690002200900",
        gtin: "08690002200900",
        rfidEpcPrefix: "3034991AA100",
        name: "SunumTech X900 Endüstriyel 2D Barkod & UHF RFID El Terminali",
        category: "Otomasyon & Donanım",
        brand: "SunumTech",
        itemType: "FINISHED_GOOD",
        parentItemId: null,
        baseUnit: "Adet",
        valuationMethod: "FIFO",
        standardCost: 14200,
        currentAvgCost: 14850,
        fifoUnitCost: 14400,
        lifoUnitCost: 15300,
        lastPurchaseCost: 15300,
        salesPrice: 24900,
        taxRate: 20,
        trackLot: true,
        trackSerial: true,
        trackExpiry: false,
        abcClass: "A",
        xyzClass: "X",
        minStockLevel: 35,
        maxStockLevel: 250,
        leadTimeDays: 10,
        totalOnHand: 84,
        totalReserved: 19,
        totalAvailable: 65,
        totalInTransit: 12,
        totalQuarantine: 2,
        totalConsignment: 15,
        warehouseBalances: [
            {
                warehouseId: "wh-ist-main",
                warehouseCode: "DEP-IST-01",
                warehouseName: "Tuzla Merkez Akıllı Lojistik & WMS Üssü",
                binCode: "IST-Z2-A03-R01-L02-B01",
                onHandQty: 54,
                reservedQty: 14,
                availableQty: 40,
                inTransitQty: 8,
                quarantineQty: 2,
                consignmentQty: 10
            },
            {
                warehouseId: "wh-ank-hub",
                warehouseCode: "DEP-ANK-03",
                warehouseName: "Ankara İç Anadolu Bölge Dağıtım Merkezi",
                binCode: "ANK-Z1-A01-R04-L01-B02",
                onHandQty: 30,
                reservedQty: 5,
                availableQty: 25,
                inTransitQty: 4,
                quarantineQty: 0,
                consignmentQty: 5
            }
        ],
        unitConversions: [
            {
                id: "uc-3",
                fromUnit: "Master Koli (6'lı)",
                toUnit: "Adet",
                multiplier: 6,
                barcode: "18690002200907",
                weightKg: 4.8,
                volumeM3: 0.035,
                isDefaultPurchase: true,
                isDefaultSales: true
            },
            {
                id: "uc-4",
                fromUnit: "Konteyner Palet",
                toUnit: "Adet",
                multiplier: 120,
                barcode: "28690002200904",
                weightKg: 108,
                volumeM3: 0.85,
                isDefaultPurchase: false,
                isDefaultSales: false
            }
        ],
        costLayers: [
            {
                id: "cl-4",
                receiptDocNo: "PRD-2026-0410",
                layerDate: "2026-09-02",
                warehouseCode: "DEP-IST-01",
                lotNumber: "LOT-X900-01",
                initialQty: 40,
                remainingQty: 24,
                unitCost: 14100
            },
            {
                id: "cl-5",
                receiptDocNo: "PRD-2026-0522",
                layerDate: "2026-10-11",
                warehouseCode: "DEP-IST-01",
                lotNumber: "LOT-X900-02",
                initialQty: 35,
                remainingQty: 30,
                unitCost: 14800
            },
            {
                id: "cl-6",
                receiptDocNo: "PRD-2026-0609",
                layerDate: "2026-10-30",
                warehouseCode: "DEP-ANK-03",
                lotNumber: "LOT-X900-03",
                initialQty: 30,
                remainingQty: 30,
                unitCost: 15300
            }
        ],
        isActive: true
    },
    // 3. SKT & Soğuk Zincir Takipli Ürün (FEFO Kritik)
    {
        id: "item-cold-bio-01",
        sku: "BIO-THERM-GEL-5L",
        barcode: "8690003300501",
        gtin: "08690003300501",
        rfidEpcPrefix: "3034882CC200",
        name: "BioTherm Medikal & Gıda Soğuk Zincir Faz Değişim Jeli (5 Litre)",
        category: "Soğuk Zincir & Kimyasal",
        brand: "BioTherm ColdPack",
        itemType: "FINISHED_GOOD",
        parentItemId: null,
        baseUnit: "Bidon",
        valuationMethod: "FIFO",
        standardCost: 620,
        currentAvgCost: 665,
        fifoUnitCost: 640,
        lifoUnitCost: 690,
        lastPurchaseCost: 690,
        salesPrice: 1180,
        taxRate: 20,
        trackLot: true,
        trackSerial: false,
        trackExpiry: true,
        shelfLifeDays: 180,
        abcClass: "A",
        xyzClass: "Y",
        minStockLevel: 150,
        maxStockLevel: 900,
        leadTimeDays: 4,
        totalOnHand: 118,
        totalReserved: 38,
        totalAvailable: 80,
        totalInTransit: 50,
        totalQuarantine: 12,
        totalConsignment: 0,
        warehouseBalances: [
            {
                warehouseId: "wh-gebze-cold",
                warehouseCode: "DEP-GBZ-04",
                warehouseName: "Gebze Soğuk Zincir & SKT Hassas Hammadde Deposu",
                binCode: "GBZ-Z3-C01-R01-L01-B02",
                onHandQty: 118,
                reservedQty: 38,
                availableQty: 80,
                inTransitQty: 50,
                quarantineQty: 12,
                consignmentQty: 0
            }
        ],
        unitConversions: [
            {
                id: "uc-5",
                fromUnit: "Litre",
                toUnit: "Bidon",
                multiplier: 0.2,
                barcode: "8690003300501-L",
                weightKg: 1.05,
                volumeM3: 0.001,
                isDefaultPurchase: false,
                isDefaultSales: false
            },
            {
                id: "uc-6",
                fromUnit: "Koli (4 Bidon / 20 Lt)",
                toUnit: "Bidon",
                multiplier: 4,
                barcode: "18690003300508",
                weightKg: 21.4,
                volumeM3: 0.028,
                isDefaultPurchase: true,
                isDefaultSales: true
            }
        ],
        costLayers: [
            {
                id: "cl-7",
                receiptDocNo: "GRN-2026-0710",
                layerDate: "2026-08-15",
                warehouseCode: "DEP-GBZ-04",
                lotNumber: "LOT-BIO-2608",
                initialQty: 80,
                remainingQty: 38,
                unitCost: 640
            },
            {
                id: "cl-8",
                receiptDocNo: "GRN-2026-1012",
                layerDate: "2026-10-18",
                warehouseCode: "DEP-GBZ-04",
                lotNumber: "LOT-BIO-2610",
                initialQty: 80,
                remainingQty: 80,
                unitCost: 690
            }
        ],
        isActive: true
    },
    // 4. BOM Alt Bileşenleri (Yarı Mamul & Hammadde)
    {
        id: "item-raw-rfid-mod",
        sku: "CMP-UHF-IMPINJ-E710",
        barcode: "8690004400710",
        gtin: "08690004400710",
        rfidEpcPrefix: "3034771DD100",
        name: "Impinj E710 UHF RFID Okuyucu Modül Çipi (BOM Bileşeni)",
        category: "Elektronik Komponent",
        brand: "Impinj Corp",
        itemType: "RAW_MATERIAL",
        parentItemId: null,
        baseUnit: "Adet",
        valuationMethod: "FIFO",
        standardCost: 4800,
        currentAvgCost: 5120,
        fifoUnitCost: 4950,
        lifoUnitCost: 5350,
        lastPurchaseCost: 5350,
        salesPrice: 7200,
        taxRate: 20,
        trackLot: true,
        trackSerial: true,
        trackExpiry: false,
        abcClass: "A",
        xyzClass: "X",
        minStockLevel: 80,
        maxStockLevel: 400,
        leadTimeDays: 14,
        totalOnHand: 52,
        totalReserved: 20,
        totalAvailable: 32,
        totalInTransit: 100,
        totalQuarantine: 0,
        totalConsignment: 45,
        warehouseBalances: [
            {
                warehouseId: "wh-ist-main",
                warehouseCode: "DEP-IST-01",
                warehouseName: "Tuzla Merkez Akıllı Lojistik & WMS Üssü",
                binCode: "IST-Z2-A04-R02-L03-B04",
                onHandQty: 52,
                reservedQty: 20,
                availableQty: 32,
                inTransitQty: 100,
                quarantineQty: 0,
                consignmentQty: 45
            }
        ],
        unitConversions: [
            {
                id: "uc-7",
                fromUnit: "Anti-Statik Tepsi (25'li)",
                toUnit: "Adet",
                multiplier: 25,
                barcode: "18690004400717",
                weightKg: 1.2,
                volumeM3: 0.005,
                isDefaultPurchase: true,
                isDefaultSales: false
            }
        ],
        costLayers: [
            {
                id: "cl-9",
                receiptDocNo: "GRN-2026-0890",
                layerDate: "2026-09-19",
                warehouseCode: "DEP-IST-01",
                lotNumber: "LOT-IMP-09",
                initialQty: 50,
                remainingQty: 22,
                unitCost: 4950
            },
            {
                id: "cl-10",
                receiptDocNo: "GRN-2026-1055",
                layerDate: "2026-10-22",
                warehouseCode: "DEP-IST-01",
                lotNumber: "LOT-IMP-10",
                initialQty: 30,
                remainingQty: 30,
                unitCost: 5350
            }
        ],
        isActive: true
    },
    {
        id: "item-raw-batt-6000",
        sku: "CMP-LION-6000MAH",
        barcode: "8690004400600",
        gtin: "08690004400600",
        rfidEpcPrefix: "3034771DD200",
        name: "Endüstriyel Hot-Swap Li-Ion Batarya Paketi 6000mAh (SKT & Lot Takipli)",
        category: "Enerji & Batarya",
        brand: "Panasonic Energy",
        itemType: "SEMI_FINISHED",
        parentItemId: null,
        baseUnit: "Adet",
        valuationMethod: "WEIGHTED_AVERAGE",
        standardCost: 1850,
        currentAvgCost: 1920,
        fifoUnitCost: 1880,
        lifoUnitCost: 1960,
        lastPurchaseCost: 1960,
        salesPrice: 3100,
        taxRate: 20,
        trackLot: true,
        trackSerial: true,
        trackExpiry: true,
        shelfLifeDays: 730,
        abcClass: "B",
        xyzClass: "X",
        minStockLevel: 100,
        maxStockLevel: 600,
        leadTimeDays: 9,
        totalOnHand: 210,
        totalReserved: 30,
        totalAvailable: 180,
        totalInTransit: 0,
        totalQuarantine: 4,
        totalConsignment: 60,
        warehouseBalances: [
            {
                warehouseId: "wh-ist-main",
                warehouseCode: "DEP-IST-01",
                warehouseName: "Tuzla Merkez Akıllı Lojistik & WMS Üssü",
                binCode: "IST-Z2-A04-R03-L01-B02",
                onHandQty: 140,
                reservedQty: 20,
                availableQty: 120,
                inTransitQty: 0,
                quarantineQty: 4,
                consignmentQty: 20
            },
            {
                warehouseId: "wh-izmir-consign",
                warehouseCode: "DEP-IZM-05",
                warehouseName: "İzmir Konsinye (Emanet) & 3PL Entegre Depo",
                binCode: "IZM-Z1-A01-R01-L01-B01",
                onHandQty: 70,
                reservedQty: 10,
                availableQty: 60,
                inTransitQty: 0,
                quarantineQty: 0,
                consignmentQty: 40
            }
        ],
        unitConversions: [
            {
                id: "uc-8",
                fromUnit: "Kutu (10'lu)",
                toUnit: "Adet",
                multiplier: 10,
                barcode: "18690004400607",
                weightKg: 3.5,
                volumeM3: 0.012,
                isDefaultPurchase: true,
                isDefaultSales: true
            }
        ],
        costLayers: [
            {
                id: "cl-11",
                receiptDocNo: "GRN-2026-0840",
                layerDate: "2026-09-05",
                warehouseCode: "DEP-IST-01",
                lotNumber: "LOT-BAT-2609",
                initialQty: 120,
                remainingQty: 110,
                unitCost: 1880
            },
            {
                id: "cl-12",
                receiptDocNo: "GRN-2026-1019",
                layerDate: "2026-10-15",
                warehouseCode: "DEP-IZM-05",
                lotNumber: "LOT-BAT-2610",
                initialQty: 100,
                remainingQty: 100,
                unitCost: 1960
            }
        ],
        isActive: true
    },
    {
        id: "item-sub-zebra-alt",
        sku: "ZBR-TC58-PRO",
        barcode: "8690002200999",
        gtin: "08690002200999",
        rfidEpcPrefix: "3034991AA999",
        name: "Zebra TC58e Kurumsal Mobil Terminal (Muadil / Üst Segment İkame)",
        category: "Otomasyon & Donanım",
        brand: "Zebra Technologies",
        itemType: "MERCHANDISE",
        parentItemId: null,
        baseUnit: "Adet",
        valuationMethod: "STANDARD",
        standardCost: 16500,
        currentAvgCost: 16800,
        fifoUnitCost: 16600,
        lifoUnitCost: 17100,
        lastPurchaseCost: 17100,
        salesPrice: 27500,
        taxRate: 20,
        trackLot: true,
        trackSerial: true,
        trackExpiry: false,
        abcClass: "A",
        xyzClass: "Y",
        minStockLevel: 20,
        maxStockLevel: 150,
        leadTimeDays: 6,
        totalOnHand: 48,
        totalReserved: 6,
        totalAvailable: 42,
        totalInTransit: 10,
        totalQuarantine: 0,
        totalConsignment: 25,
        warehouseBalances: [
            {
                warehouseId: "wh-ist-main",
                warehouseCode: "DEP-IST-01",
                warehouseName: "Tuzla Merkez Akıllı Lojistik & WMS Üssü",
                binCode: "IST-Z2-A03-R01-L02-B04",
                onHandQty: 48,
                reservedQty: 6,
                availableQty: 42,
                inTransitQty: 10,
                quarantineQty: 0,
                consignmentQty: 25
            }
        ],
        unitConversions: [],
        costLayers: [
            {
                id: "cl-13",
                receiptDocNo: "GRN-2026-1002",
                layerDate: "2026-10-12",
                warehouseCode: "DEP-IST-01",
                lotNumber: "LOT-ZBR-10",
                initialQty: 48,
                remainingQty: 48,
                unitCost: 16800
            }
        ],
        isActive: true
    }
];
const INITIAL_ALTERNATIVE_PRODUCTS = [
    {
        id: "alt-01",
        sourceItemId: "item-fg-terminal",
        sourceSku: "WMS-HHT-X900",
        substituteItemId: "item-sub-zebra-alt",
        substituteSku: "ZBR-TC58-PRO",
        substituteName: "Zebra TC58e Kurumsal Mobil Terminal (Muadil / Üst Segment İkame)",
        relationType: "EXACT_SUBSTITUTE",
        priority: 1,
        conversionRatio: 1.0,
        priceDiffPercent: 10.4,
        availableStock: 42,
        autoSuggestOnOutStock: true,
        notes: "Ana terminal stokta kalmadığında B2B ve kurumsal siparişlerde birebir ikame olarak otomatik önerilir."
    },
    {
        id: "alt-02",
        sourceItemId: "item-mat-var-01",
        sourceSku: "MTX-PRO-JACKET-NVY-M",
        substituteItemId: "item-mat-var-02",
        substituteSku: "MTX-PRO-JACKET-NVY-L",
        substituteName: "Endüstriyel Pro-Shield Mont — Gece Mavisi / L Beden",
        relationType: "COMPATIBLE",
        priority: 2,
        conversionRatio: 1.0,
        priceDiffPercent: 0,
        availableStock: 160,
        autoSuggestOnOutStock: true,
        notes: "Ayarlanabilir bel/kol bandı sayesinde M beden tükendiğinde L beden alternatif olarak sunulabilir."
    }
];
const INITIAL_LOT_SERIAL_BATCHES = [
    {
        id: "lot-rec-01",
        itemId: "item-cold-bio-01",
        sku: "BIO-THERM-GEL-5L",
        itemName: "BioTherm Medikal & Gıda Soğuk Zincir Faz Değişim Jeli (5 Litre)",
        warehouseId: "wh-gebze-cold",
        warehouseName: "Gebze Soğuk Zincir & SKT Hassas Hammadde Deposu",
        binCode: "GBZ-Z3-C01-R01-L01-B02",
        lotNumber: "LOT-BIO-2608",
        batchNumber: "BATCH-2026-A88",
        serialNumber: undefined,
        manufacturingDate: "2026-05-18",
        expiryDate: "2026-11-18",
        daysUntilExpiry: 15,
        supplierName: "Korozo & BioChem Endüstriyel A.Ş.",
        supplierLotNo: "VND-KRZ-9981",
        status: "EXPIRING_SOON",
        qcStatus: "PASSED",
        initialQty: 80,
        remainingQty: 38,
        unit: "Bidon",
        unitCost: 640,
        originDocNo: "GRN-2026-0710",
        events: [
            {
                id: "tev-1",
                eventDate: "2026-08-15 09:15",
                eventType: "SUPPLIER_RECEIPT",
                title: "Tedarikçi Mal Kabulü (ASN-8841)",
                quantity: 80,
                unit: "Bidon",
                fromLocation: "Korozo & BioChem Fabrikası",
                toLocation: "DEP-GBZ-04 / Mal Kabul Peronu-2",
                referenceDocNo: "GRN-2026-0710",
                partnerName: "Korozo & BioChem Endüstriyel A.Ş.",
                operatorName: "Murat Karahan",
                notes: "Soğuk zincir datalogger (+3.8°C) doğrulandı."
            },
            {
                id: "tev-2",
                eventDate: "2026-08-15 11:40",
                eventType: "QC_INSPECTION",
                title: "Kalite Kontrol & Viskozite Testi Onayı",
                quantity: 80,
                unit: "Bidon",
                fromLocation: "DEP-GBZ-04 / QC Alanı",
                toLocation: "GBZ-Z3-C01-R01-L01-B02",
                referenceDocNo: "QC-2026-319",
                partnerName: "İç Kalite Laboratuvarı",
                operatorName: "Kimyager Selin Aydın",
                notes: "pH 7.1, termal iletkenlik %99.4 uyumlu."
            },
            {
                id: "tev-3",
                eventDate: "2026-09-22 14:20",
                eventType: "CUSTOMER_SHIPMENT",
                title: "Müşteri Sevkiyatı (FEFO Öncelikli Çıkış)",
                quantity: 42,
                unit: "Bidon",
                fromLocation: "GBZ-Z3-C01-R01-L01-B02",
                toLocation: "Acıbadem Sağlık Grubu Lojistik",
                referenceDocNo: "SHP-2026-4410",
                partnerName: "Acıbadem Sağlık Hizmetleri A.Ş.",
                operatorName: "Gökhan Arslan",
                notes: "E-İrsaliye SNR2026000001412 ile teslim edildi."
            }
        ]
    },
    {
        id: "lot-rec-02",
        itemId: "item-fg-terminal",
        sku: "WMS-HHT-X900",
        itemName: "SunumTech X900 Endüstriyel 2D Barkod & UHF RFID El Terminali",
        warehouseId: "wh-ist-main",
        warehouseName: "Tuzla Merkez Akıllı Lojistik & WMS Üssü",
        binCode: "IST-Z2-A03-R01-L02-B01",
        lotNumber: "LOT-X900-01",
        batchNumber: "PRD-BATCH-901",
        serialNumber: "SN-X900-2026-00418",
        manufacturingDate: "2026-09-01",
        expiryDate: "2029-09-01",
        daysUntilExpiry: 1032,
        supplierName: "SunumTech Elektronik Üretim Hattı-1",
        supplierLotNo: "INT-LINE-01",
        status: "AVAILABLE",
        qcStatus: "PASSED",
        initialQty: 40,
        remainingQty: 24,
        unit: "Adet",
        unitCost: 14100,
        originDocNo: "PRD-2026-0410",
        events: [
            {
                id: "tev-4",
                eventDate: "2026-09-01 10:00",
                eventType: "BOM_CONSUMPTION",
                title: "BOM Reçete Alt Bileşen Tüketimi (LOT-IMP-09 & LOT-BAT-2609)",
                quantity: 40,
                unit: "Set",
                fromLocation: "IST-Z2-A04 (Komponent Rafları)",
                toLocation: "Tuzla SMT & Montaj Hattı-1",
                referenceDocNo: "WO-2026-0410",
                partnerName: "İç Üretim",
                operatorName: "Başmühendis Emre Tekin",
                notes: "Impinj E710 (LOT-IMP-09) ve Panasonic 6000mAh (LOT-BAT-2609) kullanıldı."
            },
            {
                id: "tev-5",
                eventDate: "2026-09-02 16:30",
                eventType: "PRODUCTION_OUTPUT",
                title: "Mamul Üretim Girişi & Seri No Eşleştirme",
                quantity: 40,
                unit: "Adet",
                fromLocation: "Tuzla Montaj Hattı-1",
                toLocation: "IST-Z2-A03-R01-L02-B01",
                referenceDocNo: "PRD-2026-0410",
                partnerName: "Tuzla Merkez Depo",
                operatorName: "Hakan Çelik",
                notes: "SN-X900-2026-00401 .. 00440 aralığı RFID EPC kodlarıyla doğrulandı."
            },
            {
                id: "tev-6",
                eventDate: "2026-10-14 15:10",
                eventType: "CUSTOMER_SHIPMENT",
                title: "Kurumsal Sipariş Teslimatı (Koç Holding A.Ş.)",
                quantity: 16,
                unit: "Adet",
                fromLocation: "IST-Z2-A03-R01-L02-B01",
                toLocation: "Koç Holding Nakkaştepe Kampüsü",
                referenceDocNo: "ORD-2026-001",
                partnerName: "Koç Holding A.Ş.",
                operatorName: "Hakan Çelik",
                notes: "LPN-TR-2026-00890 paleti ile sevk edildi."
            }
        ]
    },
    {
        id: "lot-rec-03",
        itemId: "item-mat-parent-01",
        sku: "MTX-PRO-JACKET",
        itemName: "Endüstriyel Pro-Shield Akıllı İş Montu",
        warehouseId: "wh-ist-main",
        warehouseName: "Tuzla Merkez Akıllı Lojistik & WMS Üssü",
        binCode: "IST-Z4-KARANTINA-B01",
        lotNumber: "LOT-2610-Q1",
        batchNumber: "BATCH-TEX-409",
        serialNumber: undefined,
        manufacturingDate: "2026-10-10",
        expiryDate: "2031-10-10",
        daysUntilExpiry: 1800,
        supplierName: "Kordsa & Akın Tekstil Конsorsiyumu",
        supplierLotNo: "KRD-2026-771",
        status: "QUARANTINE",
        qcStatus: "PENDING_QC",
        initialQty: 10,
        remainingQty: 10,
        unit: "Adet",
        unitCost: 1510,
        originDocNo: "GRN-2026-1092",
        events: [
            {
                id: "tev-7",
                eventDate: "2026-10-29 13:05",
                eventType: "QC_INSPECTION",
                title: "Su Geçirmezlik & Dikiş Basınç Testi Karantinası",
                quantity: 10,
                unit: "Adet",
                fromLocation: "DEP-IST-01 / Mal Kabul",
                toLocation: "IST-Z4-KARANTINA-B01",
                referenceDocNo: "QC-HOLD-2026-19",
                partnerName: "Kordsa & Akın Tekstil",
                operatorName: "Kalite Uzmanı Deniz Kurt",
                notes: "Numune testi tamamlanana kadar satışa/toplamaya kapalı (Karantina)."
            }
        ]
    }
];
const INITIAL_BOM_RECIPES = [
    {
        id: "bom-x900-v2",
        code: "BOM-WMS-X900-V2",
        name: "SunumTech X900 UHF RFID & 2D Endüstriyel El Terminali Üretim Reçetesi",
        version: "v2.4 (Endüstriyel)",
        finishedItemId: "item-fg-terminal",
        finishedSku: "WMS-HHT-X900",
        finishedName: "SunumTech X900 Endüstriyel 2D Barkod & UHF RFID El Terminali",
        outputQty: 1,
        outputUnit: "Adet",
        laborCostPerBatch: 1450,
        overheadCostPerBatch: 920,
        scrapRatePercent: 1.5,
        leadTimeHours: 6.5,
        isActive: true,
        components: [
            {
                id: "bomc-1",
                componentItemId: "item-raw-rfid-mod",
                componentSku: "CMP-UHF-IMPINJ-E710",
                componentName: "Impinj E710 UHF RFID Okuyucu Modül Çipi",
                itemType: "RAW_MATERIAL",
                quantity: 1,
                unit: "Adet",
                scrapPercent: 1.0,
                fifoUnitCost: 4950,
                lifoUnitCost: 5350,
                avgUnitCost: 5120,
                standardUnitCost: 4800,
                availableStock: 32,
                operationStep: "10 - SMT Anakart Dizgi"
            },
            {
                id: "bomc-2",
                componentItemId: "item-raw-batt-6000",
                componentSku: "CMP-LION-6000MAH",
                componentName: "Endüstriyel Hot-Swap Li-Ion Batarya Paketi 6000mAh",
                itemType: "SEMI_FINISHED",
                quantity: 2,
                unit: "Adet (Çift Batarya Seti)",
                scrapPercent: 0.5,
                fifoUnitCost: 1880,
                lifoUnitCost: 1960,
                avgUnitCost: 1920,
                standardUnitCost: 1850,
                availableStock: 180,
                operationStep: "20 - Güç Modülü & Gövde Montajı"
            },
            {
                id: "bomc-3",
                componentItemId: "item-raw-screen-ip68",
                componentSku: "CMP-OLED-55-IP68",
                componentName: "5.5 inç Gorilla Glass Victus IP68 Dokunmatik Ekran & Zebra SE4770 2D Optik Motor",
                itemType: "RAW_MATERIAL",
                quantity: 1,
                unit: "Set",
                scrapPercent: 2.0,
                fifoUnitCost: 3420,
                lifoUnitCost: 3680,
                avgUnitCost: 3550,
                standardUnitCost: 3350,
                availableStock: 95,
                operationStep: "30 - Optik Kalibrasyon & IP68 Sızdırmazlık Testi"
            }
        ]
    }
];
function convertStockUnit(item, quantity, fromUnit, toUnit) {
    if (fromUnit === toUnit) {
        return {
            convertedQty: quantity,
            formulaText: `${quantity} ${fromUnit} = ${quantity} ${toUnit}`,
            estimatedWeightKg: Number((quantity * 0.8).toFixed(2)),
            estimatedVolumeM3: Number((quantity * 0.006).toFixed(3))
        };
    }
    // Önce baz birime (item.baseUnit) çevir
    let baseQty = quantity;
    let unitWeight = 0.8;
    let unitVolume = 0.006;
    if (fromUnit !== item.baseUnit) {
        const ruleFrom = item.unitConversions.find((u)=>u.fromUnit.toLowerCase() === fromUnit.toLowerCase());
        if (ruleFrom) {
            baseQty = quantity * ruleFrom.multiplier;
            unitWeight = ruleFrom.weightKg / ruleFrom.multiplier;
            unitVolume = ruleFrom.volumeM3 / ruleFrom.multiplier;
        }
    }
    let finalQty = baseQty;
    if (toUnit !== item.baseUnit) {
        const ruleTo = item.unitConversions.find((u)=>u.fromUnit.toLowerCase() === toUnit.toLowerCase());
        if (ruleTo && ruleTo.multiplier > 0) {
            finalQty = baseQty / ruleTo.multiplier;
        }
    }
    return {
        convertedQty: Number(finalQty.toFixed(4)),
        formulaText: `${quantity} ${fromUnit} → ${baseQty} ${item.baseUnit} → ${Number(finalQty.toFixed(2))} ${toUnit}`,
        estimatedWeightKg: Number((baseQty * unitWeight).toFixed(2)),
        estimatedVolumeM3: Number((baseQty * unitVolume).toFixed(3))
    };
}
function calculateStockValuation(itemOrLayers, methodOrIssueQty, standardCostParam, issueQtyParam) {
    // 1. Katmanları ve temel maliyetleri güvenli şekilde çıkart
    let rawLayers = [];
    let fallbackCost = 500;
    let itemId = "item-val";
    let sku = "SKU-VAL";
    let name = "Valuation Item";
    if (Array.isArray(itemOrLayers)) {
        rawLayers = [
            ...itemOrLayers
        ];
    } else if (itemOrLayers && typeof itemOrLayers === "object") {
        rawLayers = Array.isArray(itemOrLayers.costLayers) ? [
            ...itemOrLayers.costLayers
        ] : [];
        fallbackCost = Number(itemOrLayers.fifoUnitCost || itemOrLayers.standardCost || itemOrLayers.currentAvgCost || 500);
        itemId = itemOrLayers.id || itemId;
        sku = itemOrLayers.sku || sku;
        name = itemOrLayers.name || name;
    }
    // Güvenlik: Eğer hiçbir katman yoksa sanal varsayılan katman ekle
    if (rawLayers.length === 0) {
        rawLayers = [
            {
                id: "cl-default",
                receiptDocNo: "GRN-DEFAULT",
                layerDate: new Date().toISOString().split("T")[0],
                warehouseCode: "DEP-01",
                lotNumber: "LOT-DEFAULT",
                initialQty: 1000,
                remainingQty: 1000,
                unitCost: Number(standardCostParam || fallbackCost || 500)
            }
        ];
    }
    // 2. Parametreleri çözümle
    let selectedMethod = "FIFO";
    let issueQty = 50;
    if (typeof methodOrIssueQty === "string") {
        selectedMethod = methodOrIssueQty;
        issueQty = typeof issueQtyParam === "number" ? issueQtyParam : 50;
    } else if (typeof methodOrIssueQty === "number") {
        issueQty = methodOrIssueQty;
    }
    const safeQty = Math.max(1, issueQty);
    const standardCost = Number(standardCostParam || fallbackCost || 500);
    const layersAsc = [
        ...rawLayers
    ].sort((a, b)=>new Date(a.layerDate).getTime() - new Date(b.layerDate).getTime());
    const layersDesc = [
        ...rawLayers
    ].sort((a, b)=>new Date(b.layerDate).getTime() - new Date(a.layerDate).getTime());
    // Toplam mevcut envanter adedi ve maliyeti
    const totalRemainingUnits = rawLayers.reduce((s, l)=>s + (l.remainingQty || 0), 0);
    const totalInventoryCost = rawLayers.reduce((s, l)=>s + (l.remainingQty || 0) * (l.unitCost || 0), 0);
    const avgCost = totalRemainingUnits > 0 ? Number((totalInventoryCost / totalRemainingUnits).toFixed(2)) : standardCost;
    // 1. FIFO Hesaplama (İlk Giren İlk Çıkar)
    let remFifo = safeQty;
    let fifoTotalCost = 0;
    const consumedLayersFifo = [];
    const consumedFifoBreakdown = [];
    for (const layer of layersAsc){
        if (remFifo <= 0) break;
        const take = Math.min(remFifo, layer.remainingQty || 0);
        if (take > 0) {
            const sub = take * layer.unitCost;
            fifoTotalCost += sub;
            remFifo -= take;
            consumedLayersFifo.push({
                layerNo: `${layer.receiptDocNo || "GRN"} (${layer.lotNumber || "LOT"})`,
                qtyUsed: take,
                unitCost: layer.unitCost,
                subtotal: sub,
                lotNumber: layer.lotNumber || "LOT-FIFO",
                consumedQty: take
            });
            consumedFifoBreakdown.push({
                lotNumber: layer.lotNumber || "LOT-FIFO",
                consumedQty: take,
                unitCost: layer.unitCost
            });
        }
    }
    if (remFifo > 0) {
        const cost = fallbackCost;
        fifoTotalCost += remFifo * cost;
        consumedLayersFifo.push({
            layerNo: "Son Katman Tamamlama",
            qtyUsed: remFifo,
            unitCost: cost,
            subtotal: remFifo * cost,
            lotNumber: "LOT-FALLBACK",
            consumedQty: remFifo
        });
        consumedFifoBreakdown.push({
            lotNumber: "LOT-FALLBACK",
            consumedQty: remFifo,
            unitCost: cost
        });
    }
    // 2. LIFO Hesaplama (Son Giren İlk Çıkar)
    let remLifo = safeQty;
    let lifoTotalCost = 0;
    const consumedLayersLifo = [];
    const consumedLifoBreakdown = [];
    for (const layer of layersDesc){
        if (remLifo <= 0) break;
        const take = Math.min(remLifo, layer.remainingQty || 0);
        if (take > 0) {
            const sub = take * layer.unitCost;
            lifoTotalCost += sub;
            remLifo -= take;
            consumedLayersLifo.push({
                layerNo: `${layer.receiptDocNo || "GRN"} (${layer.lotNumber || "LOT"})`,
                qtyUsed: take,
                unitCost: layer.unitCost,
                subtotal: sub,
                lotNumber: layer.lotNumber || "LOT-LIFO",
                consumedQty: take
            });
            consumedLifoBreakdown.push({
                lotNumber: layer.lotNumber || "LOT-LIFO",
                consumedQty: take,
                unitCost: layer.unitCost
            });
        }
    }
    if (remLifo > 0) {
        const cost = fallbackCost;
        lifoTotalCost += remLifo * cost;
        consumedLayersLifo.push({
            layerNo: "İlk Katman Tamamlama",
            qtyUsed: remLifo,
            unitCost: cost,
            subtotal: remLifo * cost,
            lotNumber: "LOT-FALLBACK",
            consumedQty: remLifo
        });
        consumedLifoBreakdown.push({
            lotNumber: "LOT-FALLBACK",
            consumedQty: remLifo,
            unitCost: cost
        });
    }
    // 3. Ağırlıklı Ortalama (Weighted Average)
    const weightedAvgUnitCost = avgCost;
    const weightedAvgTotalCost = Number((weightedAvgUnitCost * safeQty).toFixed(2));
    // 4. Standart Maliyet ve Sapma (Variance)
    const standardUnitCost = standardCost;
    const standardTotalCost = Number((standardUnitCost * safeQty).toFixed(2));
    const standardCostVariance = Number((fifoTotalCost - standardTotalCost).toFixed(2));
    // Seçilen yönteme özel alanlar
    let methodUnitCost = Number((fifoTotalCost / safeQty).toFixed(2));
    let methodCogs = Number(fifoTotalCost.toFixed(2));
    let methodConsumedBreakdown = consumedFifoBreakdown;
    if (selectedMethod === "LIFO") {
        methodUnitCost = Number((lifoTotalCost / safeQty).toFixed(2));
        methodCogs = Number(lifoTotalCost.toFixed(2));
        methodConsumedBreakdown = consumedLifoBreakdown;
    } else if (selectedMethod === "WEIGHTED_AVERAGE") {
        methodUnitCost = weightedAvgUnitCost;
        methodCogs = weightedAvgTotalCost;
        methodConsumedBreakdown = [
            {
                lotNumber: "Ağırlıklı Ortalama Havuzu",
                consumedQty: safeQty,
                unitCost: weightedAvgUnitCost
            }
        ];
    } else if (selectedMethod === "STANDARD") {
        methodUnitCost = standardUnitCost;
        methodCogs = standardTotalCost;
        methodConsumedBreakdown = [
            {
                lotNumber: "Standart Reçete Maliyeti",
                consumedQty: safeQty,
                unitCost: standardUnitCost
            }
        ];
    }
    const endingInventoryValue = Math.max(0, totalInventoryCost - methodCogs);
    return {
        // UI Karşılaştırma Alanları (app/dashboard/stok/page.tsx ve inventoryAiEngine)
        method: selectedMethod,
        unitCost: methodUnitCost,
        cogsForSimulatedIssue: methodCogs,
        endingInventoryValue,
        consumedLayersBreakdown: methodConsumedBreakdown,
        // Standart ValuationComparisonResult Alanları (Geriye dönük tam uyum)
        itemId,
        sku,
        name,
        issueQty: safeQty,
        fifoTotalCost: Number(fifoTotalCost.toFixed(2)),
        fifoUnitCost: Number((fifoTotalCost / safeQty).toFixed(2)),
        lifoTotalCost: Number(lifoTotalCost.toFixed(2)),
        lifoUnitCost: Number((lifoTotalCost / safeQty).toFixed(2)),
        weightedAvgTotalCost,
        weightedAvgUnitCost,
        standardTotalCost,
        standardUnitCost,
        standardCostVariance,
        consumedLayersFifo,
        consumedLayersLifo
    };
}
function calculateBomRollupCost(bom, batchCount = 1) {
    if (!bom) {
        return {
            fifoBatchCost: 0,
            lifoBatchCost: 0,
            avgBatchCost: 0,
            standardBatchCost: 0,
            maxProducibleBatches: 0,
            bottleneckComponentSku: "-"
        };
    }
    let fifoMat = 0;
    let lifoMat = 0;
    let avgMat = 0;
    let stdMat = 0;
    let maxProducibleBatches = 999999;
    let bottleneckComponentSku = "-";
    const components = Array.isArray(bom.components) ? bom.components : [];
    for (const comp of components){
        const effectiveQty = (comp.quantity || 0) * (1 + (comp.scrapPercent || 0) / 100) * batchCount;
        fifoMat += effectiveQty * (comp.fifoUnitCost || 0);
        lifoMat += effectiveQty * (comp.lifoUnitCost || 0);
        avgMat += effectiveQty * (comp.avgUnitCost || 0);
        stdMat += effectiveQty * (comp.standardUnitCost || 0);
        const compQty = comp.quantity || 1;
        const possibleForComp = Math.floor((comp.availableStock || 0) / compQty);
        if (possibleForComp < maxProducibleBatches) {
            maxProducibleBatches = possibleForComp;
            bottleneckComponentSku = `${comp.componentSku || "-"} (${comp.availableStock || 0} ${comp.unit || "Adet"} mevcut)`;
        }
    }
    const opsCost = ((bom.laborCostPerBatch || 0) + (bom.overheadCostPerBatch || 0)) * batchCount;
    return {
        fifoBatchCost: Number((fifoMat + opsCost).toFixed(2)),
        lifoBatchCost: Number((lifoMat + opsCost).toFixed(2)),
        avgBatchCost: Number((avgMat + opsCost).toFixed(2)),
        standardBatchCost: Number((stdMat + opsCost).toFixed(2)),
        maxProducibleBatches: maxProducibleBatches === 999999 ? 0 : maxProducibleBatches,
        bottleneckComponentSku
    };
}
}),
]})(),
"[externals]/crypto [external] (crypto, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("crypto", () => require("crypto"));

module.exports = mod;
}),
"[externals]/fs [external] (fs, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("fs", () => require("fs"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/action-async-storage.external.js [external] (next/dist/server/app-render/action-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/server/app-render/action-async-storage.external.js", () => require("next/dist/server/app-render/action-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/runtime-reacts.external.js [external] (next/dist/server/runtime-reacts.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/server/runtime-reacts.external.js", () => require("next/dist/server/runtime-reacts.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/node:stream [external] (node:stream, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("node:stream", () => require("node:stream"));

module.exports = mod;
}),
"[externals]/path [external] (path, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("path", () => require("path"));

module.exports = mod;
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__0vgik8ngjimyo._.js.map