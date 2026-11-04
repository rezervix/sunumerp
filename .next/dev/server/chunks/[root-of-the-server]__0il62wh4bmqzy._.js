module.exports = [
(()=>{"use strict";return[
"[project]/app/api/wms/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET,
    "POST",
    ()=>POST
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/db.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$wmsServerDb$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/services/wmsServerDb.ts [app-route] (ecmascript)");
;
;
;
async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const section = searchParams.get("section") || "all";
        // 1. Veritabanı boşsa otomatik tohumla
        const taskCount = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].wmsTask.count().catch(()=>0);
        if (taskCount === 0) {
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$wmsServerDb$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["seedRealisticWmsData"])();
        }
        // A. BARKOD / SKU / ÜRÜN SORGULAMA (Mobil El Terminali ve Barkod Tabancası İçin)
        if (section === "lookup") {
            const barcode = searchParams.get("barcode") || searchParams.get("sku") || searchParams.get("q");
            if (!barcode) {
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    success: false,
                    error: "Barkod veya SKU girilmedi."
                }, {
                    status: 400
                });
            }
            const cleanCode = barcode.trim();
            const item = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].inventoryItem.findFirst({
                where: {
                    OR: [
                        {
                            barcode: cleanCode
                        },
                        {
                            sku: cleanCode
                        },
                        {
                            name: {
                                contains: cleanCode
                            }
                        }
                    ]
                },
                include: {
                    stockBalances: {
                        include: {
                            warehouse: true,
                            storageBin: true
                        }
                    },
                    lotSerials: true,
                    unitConversions: true
                }
            });
            if (!item) {
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    success: false,
                    error: `Barkod veya SKU bulunamadı: ${cleanCode}`
                }, {
                    status: 404
                });
            }
            const totalStock = (item.stockBalances || []).reduce((sum, b)=>sum + Number(b.onHandQty || 0), 0);
            const currentBins = (item.stockBalances || []).filter((b)=>b.storageBin).map((b)=>({
                    binCode: b.storageBin.code,
                    binPosition: b.storageBin.binPosition,
                    warehouseName: b.warehouse?.name || "Depo",
                    onHandQty: b.onHandQty
                }));
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                success: true,
                item: {
                    id: item.id,
                    sku: item.sku,
                    name: item.name,
                    barcode: item.barcode,
                    baseUnit: item.baseUnit,
                    category: item.category,
                    salesPrice: item.salesPrice,
                    totalStock,
                    bins: currentBins,
                    lotSerials: item.lotSerials || []
                }
            });
        }
        // B. TÜM GÖREVLER
        if (section === "tasks") {
            const tasks = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].wmsTask.findMany({
                include: {
                    lines: true,
                    warehouse: true
                },
                orderBy: {
                    createdAt: "desc"
                }
            });
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                success: true,
                tasks
            });
        }
        // C. RAF HÜCRELERİ & BÖLGELER
        if (section === "bins") {
            const bins = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].storageBin.findMany({
                include: {
                    zone: true,
                    warehouse: true,
                    stockBalances: true
                },
                orderBy: {
                    code: "asc"
                }
            });
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                success: true,
                bins
            });
        }
        // D. SAYIM OTURUMLARI
        if (section === "counts") {
            const countSessions = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].inventoryCountSession.findMany({
                include: {
                    warehouse: true,
                    lines: true
                },
                orderBy: {
                    createdAt: "desc"
                }
            });
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                success: true,
                countSessions
            });
        }
        // E. DEPOLAR ARASI TRANSFERLER
        if (section === "transfers") {
            const transfers = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].warehouseTransferOrder.findMany({
                include: {
                    lines: true,
                    fromWarehouse: true,
                    toWarehouse: true
                },
                orderBy: {
                    createdAt: "desc"
                }
            });
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                success: true,
                transfers
            });
        }
        // F. VARSAYILAN: TÜM WMS GENEL SNAPSHOT
        const [tasks, bins, zones, countSessions, transfers, warehouses, stats, items] = await Promise.all([
            __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].wmsTask.findMany({
                include: {
                    lines: true,
                    warehouse: true
                },
                orderBy: {
                    createdAt: "desc"
                }
            }).catch(()=>[]),
            __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].storageBin.findMany({
                include: {
                    zone: true,
                    warehouse: true,
                    stockBalances: true
                },
                orderBy: {
                    code: "asc"
                }
            }).catch(()=>[]),
            __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].warehouseZone.findMany({
                include: {
                    bins: true
                },
                orderBy: {
                    code: "asc"
                }
            }).catch(()=>[]),
            __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].inventoryCountSession.findMany({
                include: {
                    lines: true,
                    warehouse: true
                },
                orderBy: {
                    createdAt: "desc"
                }
            }).catch(()=>[]),
            __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].warehouseTransferOrder.findMany({
                include: {
                    lines: true,
                    fromWarehouse: true,
                    toWarehouse: true
                },
                orderBy: {
                    createdAt: "desc"
                }
            }).catch(()=>[]),
            __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].warehouse.findMany().catch(()=>[]),
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$wmsServerDb$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getWmsOverviewStats"])(),
            __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].inventoryItem.findMany({
                select: {
                    id: true,
                    name: true,
                    sku: true,
                    barcode: true,
                    baseUnit: true
                },
                orderBy: {
                    name: "asc"
                }
            }).catch(()=>[])
        ]);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            success: true,
            stats,
            tasks,
            bins,
            zones,
            countSessions,
            transfers,
            warehouses,
            items
        });
    } catch (error) {
        console.error("GET /api/wms error:", error);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            success: false,
            error: error.message || "WMS verileri alınamadı"
        }, {
            status: 500
        });
    }
}
async function POST(request) {
    try {
        const body = await request.json();
        const { action } = body;
        // 1. GÖREVİ İLERLET (Adım Adım Sihirbaz)
        if (action === "advance_task") {
            if (!body.taskId) {
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    success: false,
                    error: "taskId parametresi zorunludur"
                }, {
                    status: 400
                });
            }
            const result = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$wmsServerDb$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["advanceWmsTaskStage"])(body.taskId, body.notes);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json(result);
        }
        // 2. YENİ WMS GÖREVİ OLUŞTUR
        if (action === "create_task") {
            const count = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].wmsTask.count().catch(()=>0);
            const taskNumber = `TSK-${body.workflowStage?.slice(0, 3) || "GEN"}-${Date.now().toString().slice(-4)}`;
            const task = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].wmsTask.create({
                data: {
                    taskNumber,
                    workflowStage: body.workflowStage || "GOODS_RECEIPT",
                    warehouseId: body.warehouseId || "wh-merkez-01",
                    sourceDocType: body.sourceDocType || "MANUAL_ORDER",
                    sourceDocNo: body.sourceDocNo || `DOC-${Date.now().toString().slice(-5)}`,
                    partnerName: body.partnerName || "Genel Tedarik / Müşteri",
                    priority: body.priority || "NORMAL",
                    status: "PENDING",
                    assignedOperator: body.assignedOperator || "Saha Personeli",
                    notes: body.notes || "",
                    totalLines: 1,
                    completedLines: 0
                }
            });
            if (body.itemId) {
                const item = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].inventoryItem.findUnique({
                    where: {
                        id: body.itemId
                    }
                }).catch(()=>null);
                await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].wmsTaskLine.create({
                    data: {
                        taskId: task.id,
                        itemId: body.itemId,
                        sku: item?.sku || body.sku || "SKU-GEN",
                        itemName: item?.name || body.itemName || "Ürün",
                        expectedQty: Number(body.quantity || 1),
                        processedQty: 0,
                        unit: item?.baseUnit || body.unit || "Adet",
                        suggestedFromBin: body.suggestedFromBin || "R-01-01",
                        suggestedToBin: body.suggestedToBin || "A-01-01",
                        status: "OPEN"
                    }
                });
            }
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                success: true,
                message: `${taskNumber} görevi oluşturuldu.`,
                task
            });
        }
        // 3. SAYIM SATIRI KAYDET
        if (action === "save_count_line") {
            const { sessionId, lineId, countedQty, countedBy } = body;
            if (!lineId || countedQty === undefined) {
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    success: false,
                    error: "lineId ve countedQty zorunludur"
                }, {
                    status: 400
                });
            }
            const result = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$wmsServerDb$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["submitCountLine"])(sessionId, lineId, Number(countedQty), countedBy);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json(result);
        }
        // 4. SAYIM OTURUMUNU MAHSUPLAŞTIR (Envanter & Finans Eşitleme)
        if (action === "reconcile_count") {
            if (!body.sessionId) {
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    success: false,
                    error: "sessionId zorunludur"
                }, {
                    status: 400
                });
            }
            const result = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$wmsServerDb$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["reconcileCountSession"])(body.sessionId, body.reconciledBy);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json(result);
        }
        // 5. YENİ SAYIM OTURUMU BAŞLAT
        if (action === "create_count_session") {
            const count = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].inventoryCountSession.count().catch(()=>0);
            const sessionNumber = `SYM-2026-${String(count + 1).padStart(3, "0")}`;
            const whId = body.warehouseId || "wh-merkez-01";
            const session = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].inventoryCountSession.create({
                data: {
                    sessionNumber,
                    warehouseId: whId,
                    countType: body.countType || "FULL_COUNT",
                    hideSystemQty: body.countType === "BLIND_COUNT" || Boolean(body.hideSystemQty),
                    status: "IN_PROGRESS",
                    assignedCounters: body.assignedCounters || "Saha Ekibi",
                    totalBinsCounted: 0,
                    accuracyPercent: 100
                }
            });
            // Depodaki mevcut bakiyelerden otomatik sayım satırları üret
            const balances = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].stockBalance.findMany({
                where: {
                    warehouseId: whId
                },
                include: {
                    item: true
                }
            }).catch(()=>[]);
            for (const b of balances){
                if (!b.item) continue;
                await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].inventoryCountLine.create({
                    data: {
                        sessionId: session.id,
                        itemId: b.itemId,
                        sku: b.item.sku,
                        itemName: b.item.name,
                        binCode: b.binCode || "A-01-01",
                        systemQty: Number(b.onHandQty || 0),
                        unitCost: Number(b.item.currentAvgCost || b.item.standardCost || 0),
                        scanMethod: "BARCODE",
                        isReconciled: false
                    }
                }).catch(()=>null);
            }
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                success: true,
                message: `${sessionNumber} Sayım Oturumu Başlatıldı.`,
                session
            });
        }
        // 6. DEPOLAR ARASI TRANSFER OLUŞTUR
        if (action === "create_transfer") {
            const result = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$wmsServerDb$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createTransferOrder"])({
                fromWarehouseId: body.fromWarehouseId,
                toWarehouseId: body.toWarehouseId,
                itemId: body.itemId,
                quantity: Number(body.quantity || 1),
                transferReason: body.transferReason,
                driverName: body.driverName,
                vehiclePlate: body.vehiclePlate
            });
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json(result);
        }
        // 7. TRANSFER DURUMUNU İLERLET (Sevk Et / Teslim Al)
        if (action === "advance_transfer") {
            if (!body.transferOrderId || !body.newStatus) {
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    success: false,
                    error: "transferOrderId ve newStatus zorunludur"
                }, {
                    status: 400
                });
            }
            const result = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$wmsServerDb$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["advanceTransferOrderStatus"])(body.transferOrderId, body.newStatus);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json(result);
        }
        // 8. ÇEVRİMDIŞI (OFFLINE) MOBİL KUYRUK TOPLU SENKRONİZASYONU
        if (action === "offline_batch_sync") {
            const operations = Array.isArray(body.operations) ? body.operations : [];
            const result = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$wmsServerDb$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["processOfflineWmsOperations"])(operations);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json(result);
        }
        // 9. TOHUM VERİLERİNİ SIFIRLA / YENİDEN OLUŞTUR
        if (action === "seed_reset") {
            const result = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$wmsServerDb$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["seedRealisticWmsData"])();
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json(result);
        }
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            success: false,
            error: "Bilinmeyen WMS aksiyonu"
        }, {
            status: 400
        });
    } catch (error) {
        console.error("POST /api/wms error:", error);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            success: false,
            error: error.message || "WMS işlemi gerçekleştirilemedi"
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
            // Prisma OR koşulu kontrolü
            if (where.OR && Array.isArray(where.OR)) {
                const passesOr = where.OR.some((subWhere)=>this.filterByWhere([
                        item
                    ], subWhere).length > 0);
                if (!passesOr) return false;
            }
            // Prisma AND koşulu kontrolü
            if (where.AND && Array.isArray(where.AND)) {
                const passesAnd = where.AND.every((subWhere)=>this.filterByWhere([
                        item
                    ], subWhere).length > 0);
                if (!passesAnd) return false;
            }
            for (const [key, value] of Object.entries(where)){
                if (value === undefined || key === "OR" || key === "AND") continue;
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
            if (include.warehouse) enriched.warehouse = (db.warehouse || []).find((w)=>w.id === item.warehouseId) ?? null;
        }
        if (this.modelName === "warehouseTransferOrder" && include) {
            if (include.lines) enriched.lines = (db.transferOrderLine || []).filter((l)=>l.transferOrderId === item.id);
            if (include.fromWarehouse) enriched.fromWarehouse = (db.warehouse || []).find((w)=>w.id === item.fromWarehouseId) ?? null;
            if (include.toWarehouse) enriched.toWarehouse = (db.warehouse || []).find((w)=>w.id === item.toWarehouseId) ?? null;
        }
        if (this.modelName === "storageBin" && include) {
            if (include.zone) enriched.zone = (db.warehouseZone || []).find((z)=>z.id === item.zoneId) ?? null;
            if (include.warehouse) enriched.warehouse = (db.warehouse || []).find((w)=>w.id === item.warehouseId) ?? null;
            if (include.stockBalances) {
                enriched.stockBalances = (db.stockBalance || []).filter((sb)=>sb.storageBinId === item.id).map((sb)=>({
                        ...sb,
                        item: (db.inventoryItem || []).find((it)=>it.id === sb.itemId) ?? null
                    }));
            }
        }
        if (this.modelName === "warehouseZone" && include) {
            if (include.bins) enriched.bins = (db.storageBin || []).filter((b)=>b.zoneId === item.id);
            if (include.warehouse) enriched.warehouse = (db.warehouse || []).find((w)=>w.id === item.warehouseId) ?? null;
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
"[project]/lib/services/wmsServerDb.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "advanceTransferOrderStatus",
    ()=>advanceTransferOrderStatus,
    "advanceWmsTaskStage",
    ()=>advanceWmsTaskStage,
    "createTransferOrder",
    ()=>createTransferOrder,
    "getWmsOverviewStats",
    ()=>getWmsOverviewStats,
    "processOfflineWmsOperations",
    ()=>processOfflineWmsOperations,
    "reconcileCountSession",
    ()=>reconcileCountSession,
    "seedRealisticWmsData",
    ()=>seedRealisticWmsData,
    "submitCountLine",
    ()=>submitCountLine
]);
/**
 * FAZ 2: Sunucu Tarafı Depo Yönetim Sistemi (WMS) Veritabanı Motoru
 * - Mal Kabul -> Kalite Kontrol -> Rafa Yerleştirme (Put-away) -> Sipariş Toplama (Pick) -> Sevkiyat
 * - Gerçek Zamanlı Raf (StorageBin) & Depo Bakiyesi (StockBalance) Senkronizasyonu
 * - Stok Hareket Denetim İzi (StockMovement) ve FIFO Maliyet Katmanı (CostLayer) Tüketimi
 * - Tam, Döngüsel ve Kör Sayım (Blind Count) ile Envanter Mahsuplaşması
 * - Çevrimdışı (Offline) El Terminali İşlemlerinin Veritabanına Toplu Aktarımı
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/db.ts [app-route] (ecmascript)");
;
async function seedRealisticWmsData() {
    try {
        const existingTasks = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].wmsTask.count().catch(()=>0);
        if (existingTasks > 0) {
            return {
                seeded: false,
                message: "WMS veritabanında mevcut görevler var."
            };
        }
        // 1. Depoları Bul
        let whMerkez = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].warehouse.findFirst({
            where: {
                code: "DEP-MRK-01"
            }
        }).catch(()=>null);
        let whKadikoy = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].warehouse.findFirst({
            where: {
                code: "DEP-KDK-02"
            }
        }).catch(()=>null);
        let whAtolye = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].warehouse.findFirst({
            where: {
                code: "DEP-ATL-03"
            }
        }).catch(()=>null);
        if (!whMerkez) {
            whMerkez = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].warehouse.create({
                data: {
                    id: "wh-merkez-01",
                    branchId: "local-debug-branch",
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
        if (!whKadikoy) {
            whKadikoy = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].warehouse.create({
                data: {
                    id: "wh-kadikoy-02",
                    branchId: "local-debug-branch",
                    code: "DEP-KDK-02",
                    name: "Kadıköy Butik Mağaza & Showroom",
                    type: "STORE",
                    city: "İstanbul / Kadıköy",
                    temperatureRange: "+18°C / +22°C (Oda Sıcaklığı)",
                    capacityVolumeM3: 850,
                    usedVolumeM3: 420,
                    isDefault: false
                }
            });
        }
        if (!whAtolye) {
            whAtolye = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].warehouse.create({
                data: {
                    id: "wh-atolye-03",
                    branchId: "local-debug-branch",
                    code: "DEP-ATL-03",
                    name: "E-Ticaret & Hızlı Dağıtım Hub",
                    type: "MANUFACTURING",
                    city: "İstanbul / Ataşehir",
                    temperatureRange: "+16°C / +20°C",
                    capacityVolumeM3: 1200,
                    usedVolumeM3: 650,
                    isDefault: false
                }
            });
        }
        // 2. Bölgeleri (WarehouseZone) Oluştur
        const zonesToCreate = [
            {
                id: "zone-cold-01",
                warehouseId: whMerkez.id,
                code: "Z-SOGUK",
                name: "Taze Çiçek Soğuk Hava Deposu",
                zoneType: "COLD_STORAGE",
                temperatureMin: 2,
                temperatureMax: 4,
                humidityMax: 85
            },
            {
                id: "zone-fast-01",
                warehouseId: whMerkez.id,
                code: "Z-HIZLI",
                name: "Hızlı Sipariş Hazırlama & Toplama",
                zoneType: "FAST_PICK",
                temperatureMin: 15,
                temperatureMax: 20,
                humidityMax: 60
            },
            {
                id: "zone-qc-01",
                warehouseId: whMerkez.id,
                code: "Z-RAMPA",
                name: "Mal Kabul Rampa & Kalite Kontrol",
                zoneType: "RECEIVING",
                temperatureMin: 10,
                temperatureMax: 18,
                humidityMax: 70
            },
            {
                id: "zone-dry-01",
                warehouseId: whMerkez.id,
                code: "Z-KURU",
                name: "Vazo, Ambalaj & Kuru Malzeme",
                zoneType: "BULK_STORAGE",
                temperatureMin: 15,
                temperatureMax: 25,
                humidityMax: 50
            },
            {
                id: "zone-kdk-01",
                warehouseId: whKadikoy.id,
                code: "Z-KDK-MAG",
                name: "Mağaza Satış & Teşhir Alanı",
                zoneType: "STORAGE",
                temperatureMin: 18,
                temperatureMax: 22,
                humidityMax: 60
            }
        ];
        for (const z of zonesToCreate){
            const exists = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].warehouseZone.findFirst({
                where: {
                    code: z.code,
                    warehouseId: z.warehouseId
                }
            }).catch(()=>null);
            if (!exists) {
                await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].warehouseZone.create({
                    data: z
                }).catch(()=>null);
            }
        }
        // 3. Raf Hücrelerini (StorageBin) Oluştur
        const binsToCreate = [
            {
                id: "bin-mrk-gul",
                warehouseId: whMerkez.id,
                zoneId: "zone-cold-01",
                code: "A-01-01",
                aisle: "A",
                rack: "01",
                level: "01",
                binPosition: "Zemin Soğuk Hücre",
                binType: "COLD_CELL",
                abcVelocity: "A",
                maxWeightKg: 1000,
                currentWeightKg: 350,
                maxVolumeM3: 4.5,
                currentVolumeM3: 2.1,
                occupancyPercent: 47
            },
            {
                id: "bin-mrk-lil",
                warehouseId: whMerkez.id,
                zoneId: "zone-cold-01",
                code: "A-01-02",
                aisle: "A",
                rack: "01",
                level: "02",
                binPosition: "Orta Raf",
                binType: "COLD_CELL",
                abcVelocity: "A",
                maxWeightKg: 800,
                currentWeightKg: 280,
                maxVolumeM3: 3.8,
                currentVolumeM3: 1.9,
                occupancyPercent: 50
            },
            {
                id: "bin-mrk-qc",
                warehouseId: whMerkez.id,
                zoneId: "zone-qc-01",
                code: "R-01-01",
                aisle: "R",
                rack: "01",
                level: "01",
                binPosition: "Mal Kabul Rampa 1",
                binType: "RAMP",
                abcVelocity: "A",
                maxWeightKg: 2000,
                currentWeightKg: 0,
                maxVolumeM3: 10.0,
                currentVolumeM3: 0,
                occupancyPercent: 0
            },
            {
                id: "bin-mrk-pick",
                warehouseId: whMerkez.id,
                zoneId: "zone-fast-01",
                code: "B-01-01",
                aisle: "B",
                rack: "01",
                level: "01",
                binPosition: "Hızlı Toplama Tablası",
                binType: "PICK_STATION",
                abcVelocity: "A",
                maxWeightKg: 500,
                currentWeightKg: 120,
                maxVolumeM3: 2.0,
                currentVolumeM3: 0.8,
                occupancyPercent: 40
            },
            {
                id: "bin-mrk-vaz",
                warehouseId: whMerkez.id,
                zoneId: "zone-dry-01",
                code: "C-01-01",
                aisle: "C",
                rack: "01",
                level: "01",
                binPosition: "Palet Rafı - Ağır Yük",
                binType: "PALLET_RACK",
                abcVelocity: "B",
                maxWeightKg: 1500,
                currentWeightKg: 600,
                maxVolumeM3: 6.0,
                currentVolumeM3: 3.2,
                occupancyPercent: 53
            },
            {
                id: "bin-kdk-show",
                warehouseId: whKadikoy.id,
                zoneId: "zone-kdk-01",
                code: "M-01-01",
                aisle: "M",
                rack: "01",
                level: "01",
                binPosition: "Vitrin Teşhir Standı",
                binType: "DISPLAY",
                abcVelocity: "A",
                maxWeightKg: 400,
                currentWeightKg: 180,
                maxVolumeM3: 2.5,
                currentVolumeM3: 1.5,
                occupancyPercent: 60
            },
            {
                id: "bin-atl-tezgah",
                warehouseId: whAtolye.id,
                zoneId: "zone-cold-01",
                code: "T-01-01",
                aisle: "T",
                rack: "01",
                level: "01",
                binPosition: "Usta Tasarım Tezgahı",
                binType: "WORKBENCH",
                abcVelocity: "A",
                maxWeightKg: 600,
                currentWeightKg: 220,
                maxVolumeM3: 3.0,
                currentVolumeM3: 1.2,
                occupancyPercent: 40
            }
        ];
        for (const b of binsToCreate){
            const exists = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].storageBin.findFirst({
                where: {
                    code: b.code,
                    warehouseId: b.warehouseId
                }
            }).catch(()=>null);
            if (!exists) {
                await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].storageBin.create({
                    data: b
                }).catch(()=>null);
            }
        }
        // 4. Mevcut Ürünleri Bul
        const itemGul = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].inventoryItem.findFirst({
            where: {
                sku: "GUL-EKV-01"
            }
        }).catch(()=>null);
        const itemLil = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].inventoryItem.findFirst({
            where: {
                sku: "LIL-KAZ-02"
            }
        }).catch(()=>null);
        const itemVaz = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].inventoryItem.findFirst({
            where: {
                sku: "VAZ-ANT-03"
            }
        }).catch(()=>null);
        // 5. Örnek Gerçekçi WMS İş Akışı Görevleri (WmsTask & WmsTaskLine)
        // Görev 1: Mal Kabul (GOODS_RECEIPT) — Ekvator Gülü İthalat İrsaliyesi
        if (itemGul) {
            const taskReceipt = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].wmsTask.create({
                data: {
                    id: "task-wms-rcv-01",
                    taskNumber: "TSK-RCV-2026-001",
                    workflowStage: "GOODS_RECEIPT",
                    warehouseId: whMerkez.id,
                    sourceDocType: "PURCHASE_INVOICE",
                    sourceDocNo: "IRS-2026-EKV-881",
                    partnerName: "Ecuador Floral Export S.A.",
                    priority: "HIGH",
                    status: "PENDING",
                    assignedOperator: "Ahmet Yılmaz (Mal Kabul)",
                    totalLines: 1,
                    completedLines: 0,
                    notes: "Soğuk zincir tırından teslim alındı. Sıcaklık kontrolü yapınız.",
                    lpnCode: "LPN-2026-001"
                }
            });
            await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].wmsTaskLine.create({
                data: {
                    taskId: taskReceipt.id,
                    itemId: itemGul.id,
                    sku: itemGul.sku,
                    itemName: itemGul.name,
                    expectedQty: 50,
                    processedQty: 0,
                    unit: itemGul.baseUnit || "Demet",
                    suggestedToBin: "R-01-01",
                    actualBin: "R-01-01",
                    status: "OPEN"
                }
            });
        }
        // Görev 2: Kalite Kontrol (QC_INSPECTION) — Beyaz Kazablanka Lilyum
        if (itemLil) {
            const taskQc = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].wmsTask.create({
                data: {
                    id: "task-wms-qc-02",
                    taskNumber: "TSK-QC-2026-002",
                    workflowStage: "QC_INSPECTION",
                    warehouseId: whMerkez.id,
                    sourceDocType: "INTERNAL_INSPECTION",
                    sourceDocNo: "QC-2026-1104",
                    partnerName: "Antalya Çiçek Kooperatifi",
                    priority: "NORMAL",
                    status: "PENDING",
                    assignedOperator: "Elif Demir (Ziraat Müh.)",
                    totalLines: 1,
                    completedLines: 0,
                    notes: "Açılmamış gonca tazelik ve nem kontrolü bekleniyor.",
                    lpnCode: "LPN-2026-002"
                }
            });
            await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].wmsTaskLine.create({
                data: {
                    taskId: taskQc.id,
                    itemId: itemLil.id,
                    sku: itemLil.sku,
                    itemName: itemLil.name,
                    expectedQty: 30,
                    processedQty: 0,
                    unit: itemLil.baseUnit || "Dal",
                    suggestedFromBin: "R-01-01",
                    suggestedToBin: "A-01-02",
                    status: "OPEN"
                }
            });
        }
        // Görev 3: Rafa Yerleştirme (PUTAWAY) — Seramik Vazo
        if (itemVaz) {
            const taskPutaway = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].wmsTask.create({
                data: {
                    id: "task-wms-put-03",
                    taskNumber: "TSK-PUT-2026-003",
                    workflowStage: "PUTAWAY",
                    warehouseId: whMerkez.id,
                    sourceDocType: "PUTAWAY_DIRECTIVE",
                    sourceDocNo: "DIR-PUT-884",
                    priority: "NORMAL",
                    status: "IN_PROGRESS",
                    assignedOperator: "Mehmet Kaya (Forklift)",
                    totalLines: 1,
                    completedLines: 0,
                    notes: "Mal kabulden Kuru Depo C-01-01 palet hücresine yerleştiriniz.",
                    lpnCode: "LPN-2026-003"
                }
            });
            await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].wmsTaskLine.create({
                data: {
                    taskId: taskPutaway.id,
                    itemId: itemVaz.id,
                    sku: itemVaz.sku,
                    itemName: itemVaz.name,
                    expectedQty: 20,
                    processedQty: 0,
                    unit: itemVaz.baseUnit || "Adet",
                    suggestedFromBin: "R-01-01",
                    suggestedToBin: "C-01-01",
                    status: "OPEN"
                }
            });
        }
        // Görev 4: Sipariş Toplama (WAVE_PICK) — Kadıköy Mağaza Talebi
        if (itemGul) {
            const taskPick = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].wmsTask.create({
                data: {
                    id: "task-wms-pck-04",
                    taskNumber: "TSK-PCK-2026-004",
                    workflowStage: "WAVE_PICK",
                    warehouseId: whMerkez.id,
                    sourceDocType: "OUTBOUND_DISPATCH",
                    sourceDocNo: "DSP-2026-KDK-01",
                    partnerName: "Kadıköy Butik Mağaza",
                    priority: "HIGH",
                    status: "PENDING",
                    assignedOperator: "Caner Yıldız (Toplama)",
                    totalLines: 1,
                    completedLines: 0,
                    notes: "SKT en yakın LOT-GUL-2610A partisinden toplayınız.",
                    lpnCode: "LPN-2026-004"
                }
            });
            await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].wmsTaskLine.create({
                data: {
                    taskId: taskPick.id,
                    itemId: itemGul.id,
                    sku: itemGul.sku,
                    itemName: itemGul.name,
                    expectedQty: 15,
                    processedQty: 0,
                    unit: itemGul.baseUnit || "Demet",
                    suggestedFromBin: "A-01-01",
                    suggestedToBin: "B-01-01",
                    lotNumber: "LOT-GUL-2610A",
                    status: "OPEN"
                }
            });
        }
        // 6. Örnek Sayım Oturumu (InventoryCountSession & Lines)
        const countSession = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].inventoryCountSession.create({
            data: {
                id: "cnt-session-01",
                sessionNumber: "SYM-2026-11-01",
                warehouseId: whMerkez.id,
                countType: "BLIND_COUNT",
                hideSystemQty: true,
                status: "IN_PROGRESS",
                assignedCounters: "Ahmet Yılmaz, Elif Demir",
                totalBinsCounted: 2,
                accuracyPercent: 98.5
            }
        });
        if (itemGul) {
            await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].inventoryCountLine.create({
                data: {
                    sessionId: countSession.id,
                    itemId: itemGul.id,
                    sku: itemGul.sku,
                    itemName: itemGul.name,
                    binCode: "A-01-01",
                    lotNumber: "LOT-GUL-2610A",
                    systemQty: 100,
                    countedQty: 98,
                    varianceQty: -2,
                    unitCost: 250,
                    varianceAmount: -500,
                    scanMethod: "BARCODE",
                    isReconciled: false
                }
            });
        }
        if (itemLil) {
            await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].inventoryCountLine.create({
                data: {
                    sessionId: countSession.id,
                    itemId: itemLil.id,
                    sku: itemLil.sku,
                    itemName: itemLil.name,
                    binCode: "A-01-02",
                    lotNumber: "LOT-LIL-28",
                    systemQty: 60,
                    countedQty: 60,
                    varianceQty: 0,
                    unitCost: 120,
                    varianceAmount: 0,
                    scanMethod: "BARCODE",
                    isReconciled: false
                }
            });
        }
        // 7. Örnek Depolar Arası Transfer Emri (WarehouseTransferOrder & Lines)
        if (itemGul) {
            const transferOrder = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].warehouseTransferOrder.create({
                data: {
                    id: "trf-order-01",
                    transferNumber: "TRF-2026-001",
                    fromWarehouseId: whMerkez.id,
                    toWarehouseId: whKadikoy.id,
                    status: "IN_TRANSIT",
                    transferReason: "Kadıköy Mağaza Hafta Sonu Düğün Siparişleri İkmal",
                    lpnCode: "LPN-TRF-001",
                    carrierName: "Sunum Lojistik Filo",
                    vehiclePlate: "34 SNR 808",
                    driverName: "Cemal Kaya",
                    shippedAt: new Date("2026-11-04T07:30:00Z")
                }
            });
            await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].transferOrderLine.create({
                data: {
                    transferOrderId: transferOrder.id,
                    itemId: itemGul.id,
                    sku: itemGul.sku,
                    itemName: itemGul.name,
                    requestedQty: 25,
                    shippedQty: 25,
                    receivedQty: 0,
                    unit: "Demet",
                    fromBinCode: "A-01-01",
                    toBinCode: "M-01-01",
                    lotNumber: "LOT-GUL-2611B",
                    notes: "Kadıköy vitrini için 1. kalite taze gül"
                }
            });
        }
        return {
            seeded: true,
            message: "Gerçekçi WMS bölgeleri, hücreleri, görevleri, sayım ve transfer verileri başarıyla oluşturuldu."
        };
    } catch (error) {
        console.error("seedRealisticWmsData error:", error);
        return {
            seeded: false,
            error: error.message || "WMS tohum verisi oluşturulamadı."
        };
    }
}
async function getWmsOverviewStats() {
    try {
        const tasks = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].wmsTask.findMany().catch(()=>[]);
        const bins = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].storageBin.findMany().catch(()=>[]);
        const transfers = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].warehouseTransferOrder.findMany({
            where: {
                status: {
                    in: [
                        "APPROVED",
                        "IN_TRANSIT"
                    ]
                }
            }
        }).catch(()=>[]);
        const countSessions = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].inventoryCountSession.findMany({
            where: {
                status: "IN_PROGRESS"
            }
        }).catch(()=>[]);
        const pending = tasks.filter((t)=>t.status === "PENDING").length;
        const inProgress = tasks.filter((t)=>t.status === "IN_PROGRESS").length;
        const totalBins = bins.length;
        const occupiedBins = bins.filter((b)=>Number(b.occupancyPercent || 0) > 0).length;
        const avgOcc = totalBins > 0 ? Math.round(bins.reduce((sum, b)=>sum + Number(b.occupancyPercent || 0), 0) / totalBins) : 0;
        return {
            totalPendingTasks: pending,
            inProgressTasks: inProgress,
            totalBins,
            occupiedBins,
            averageOccupancy: avgOcc,
            activeTransfers: transfers.length,
            openCountSessions: countSessions.length
        };
    } catch (error) {
        return {
            totalPendingTasks: 0,
            inProgressTasks: 0,
            totalBins: 0,
            occupiedBins: 0,
            averageOccupancy: 0,
            activeTransfers: 0,
            openCountSessions: 0
        };
    }
}
async function advanceWmsTaskStage(taskId, operatorNotes) {
    try {
        const task = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].wmsTask.findUnique({
            where: {
                id: taskId
            },
            include: {
                lines: true
            }
        });
        if (!task) {
            throw new Error(`Görev bulunamadı: ${taskId}`);
        }
        const currentStage = task.workflowStage;
        let nextStage = currentStage;
        let nextStatus = "IN_PROGRESS";
        let isCompleted = false;
        // 1-2-3-4-5 Adımlı İş Akışı:
        // GOODS_RECEIPT -> QC_INSPECTION -> PUTAWAY -> WAVE_PICK -> PACKING -> COMPLETED
        if (currentStage === "GOODS_RECEIPT") {
            nextStage = "QC_INSPECTION";
            nextStatus = "IN_PROGRESS";
        } else if (currentStage === "QC_INSPECTION") {
            nextStage = "PUTAWAY";
            nextStatus = "IN_PROGRESS";
        } else if (currentStage === "PUTAWAY") {
            // Rafa yerleştirme tamamlandı: Stok gerçek rafa yerleşir!
            nextStage = "WAVE_PICK";
            nextStatus = "IN_PROGRESS";
            await applyPutawayToStockBalances(task);
        } else if (currentStage === "WAVE_PICK") {
            // Toplama tamamlandı: Stok raftan toplanır!
            nextStage = "PACKING";
            nextStatus = "IN_PROGRESS";
            await applyPickToStockBalances(task);
        } else if (currentStage === "PACKING") {
            nextStage = "SHIPPING";
            nextStatus = "COMPLETED";
            isCompleted = true;
        } else {
            nextStatus = "COMPLETED";
            isCompleted = true;
        }
        // Görevi Güncelle
        const updatedTask = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].wmsTask.update({
            where: {
                id: taskId
            },
            data: {
                workflowStage: nextStage,
                status: nextStatus,
                completedAt: isCompleted ? new Date().toISOString() : undefined,
                notes: operatorNotes ? `${task.notes ? task.notes + " | " : ""}${operatorNotes}` : task.notes
            },
            include: {
                lines: true
            }
        });
        return {
            success: true,
            task: updatedTask,
            message: isCompleted ? `${task.taskNumber} numaralı görev tamamen tamamlandı ve arşivlendi.` : `${task.taskNumber} sonraki aşamaya iletildi: ${nextStage}`
        };
    } catch (error) {
        console.error("advanceWmsTaskStage error:", error);
        return {
            success: false,
            error: error.message || "Görev ilerletilemedi"
        };
    }
}
/**
 * Rafa Yerleştirme (Put-away) Tamamlandığında Raf ve Depo Bakiyesini Artırır
 */ async function applyPutawayToStockBalances(task) {
    for (const line of task.lines || []){
        const qty = Number(line.expectedQty || line.processedQty || 1);
        const targetBinCode = line.actualBin || line.suggestedToBin || "A-01-01";
        // Hedef hücreyi bul
        const bin = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].storageBin.findFirst({
            where: {
                code: targetBinCode,
                warehouseId: task.warehouseId
            }
        }).catch(()=>null);
        const binId = bin?.id || null;
        // StockBalance güncelle veya oluştur
        const existingBalance = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].stockBalance.findFirst({
            where: {
                itemId: line.itemId,
                warehouseId: task.warehouseId,
                storageBinId: binId
            }
        }).catch(()=>null);
        if (existingBalance) {
            await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].stockBalance.update({
                where: {
                    id: existingBalance.id
                },
                data: {
                    onHandQty: {
                        increment: qty
                    },
                    availableQty: {
                        increment: qty
                    }
                }
            });
        } else {
            await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].stockBalance.create({
                data: {
                    itemId: line.itemId,
                    warehouseId: task.warehouseId,
                    storageBinId: binId,
                    binCode: targetBinCode,
                    onHandQty: qty,
                    reservedQty: 0,
                    availableQty: qty
                }
            });
        }
        // Raf doluluk oranını güncelle
        if (bin) {
            const newOccupancy = Math.min(100, Math.round(Number(bin.occupancyPercent || 0) + 15));
            await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].storageBin.update({
                where: {
                    id: bin.id
                },
                data: {
                    occupancyPercent: newOccupancy
                }
            }).catch(()=>null);
        }
        // Stok Hareketi Denetim İzi (StockMovement)
        await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].stockMovement.create({
            data: {
                itemId: line.itemId,
                warehouseId: task.warehouseId,
                storageBinId: binId,
                movementType: "IN",
                quantity: qty,
                documentType: "WMS_PUTAWAY",
                documentNo: task.taskNumber,
                lotNumber: line.lotNumber || "GENEL",
                notes: `Rafa Yerleştirme (Put-away): ${targetBinCode} hücresine teslim edildi.`
            }
        }).catch(()=>null);
    }
}
/**
 * Sipariş Toplama (Pick) Tamamlandığında Raf ve Depo Bakiyesinden Düşer
 */ async function applyPickToStockBalances(task) {
    for (const line of task.lines || []){
        const qty = Number(line.expectedQty || line.processedQty || 1);
        const sourceBinCode = line.suggestedFromBin || line.actualBin || "A-01-01";
        const bin = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].storageBin.findFirst({
            where: {
                code: sourceBinCode,
                warehouseId: task.warehouseId
            }
        }).catch(()=>null);
        const binId = bin?.id || null;
        const existingBalance = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].stockBalance.findFirst({
            where: {
                itemId: line.itemId,
                warehouseId: task.warehouseId,
                storageBinId: binId
            }
        }).catch(()=>null);
        if (existingBalance) {
            const currentQty = Number(existingBalance.onHandQty || 0);
            const deductedQty = Math.min(currentQty, qty);
            await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].stockBalance.update({
                where: {
                    id: existingBalance.id
                },
                data: {
                    onHandQty: {
                        decrement: deductedQty
                    },
                    availableQty: {
                        decrement: deductedQty
                    }
                }
            });
        }
        // Stok Hareketi Denetim İzi
        await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].stockMovement.create({
            data: {
                itemId: line.itemId,
                warehouseId: task.warehouseId,
                storageBinId: binId,
                movementType: "OUT",
                quantity: qty,
                documentType: "WMS_PICK",
                documentNo: task.taskNumber,
                lotNumber: line.lotNumber || "GENEL",
                notes: `Sipariş Toplama (Pick): ${sourceBinCode} hücresinden toplandı.`
            }
        }).catch(()=>null);
    }
}
async function submitCountLine(sessionId, lineId, countedQty, countedBy) {
    try {
        const line = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].inventoryCountLine.findUnique({
            where: {
                id: lineId
            }
        });
        if (!line) {
            throw new Error(`Sayım satırı bulunamadı: ${lineId}`);
        }
        const systemQty = Number(line.systemQty || 0);
        const varianceQty = countedQty - systemQty;
        const unitCost = Number(line.unitCost || 0);
        const varianceAmount = varianceQty * unitCost;
        const updatedLine = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].inventoryCountLine.update({
            where: {
                id: lineId
            },
            data: {
                countedQty,
                varianceQty,
                varianceAmount,
                countedBy: countedBy || "Saha Sayım Görevlisi",
                countedAt: new Date().toISOString()
            }
        });
        return {
            success: true,
            line: updatedLine
        };
    } catch (error) {
        return {
            success: false,
            error: error.message || "Sayım satırı kaydedilemedi"
        };
    }
}
async function reconcileCountSession(sessionId, reconciledBy = "Depo Müdürü") {
    try {
        const session = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].inventoryCountSession.findUnique({
            where: {
                id: sessionId
            },
            include: {
                lines: true,
                warehouse: true
            }
        });
        if (!session) {
            throw new Error(`Sayım oturumu bulunamadı: ${sessionId}`);
        }
        let totalVarianceValue = 0;
        let totalItems = 0;
        let matchedItems = 0;
        const journalNo = `MAH-${Date.now().toString().slice(-6)}`;
        for (const line of session.lines || []){
            totalItems++;
            const counted = line.countedQty !== null && line.countedQty !== undefined ? Number(line.countedQty) : Number(line.systemQty);
            const system = Number(line.systemQty || 0);
            const diff = counted - system;
            const unitCost = Number(line.unitCost || 0);
            const lineVarianceValue = diff * unitCost;
            totalVarianceValue += lineVarianceValue;
            if (diff === 0) {
                matchedItems++;
            } else {
                // İlgili hücreyi ve depoyu bul
                const bin = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].storageBin.findFirst({
                    where: {
                        code: line.binCode,
                        warehouseId: session.warehouseId
                    }
                }).catch(()=>null);
                const binId = bin?.id || null;
                // StockBalance bakiyesini doğrudan sayılan miktara (counted) eşitle
                const balance = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].stockBalance.findFirst({
                    where: {
                        itemId: line.itemId,
                        warehouseId: session.warehouseId,
                        storageBinId: binId
                    }
                }).catch(()=>null);
                if (balance) {
                    await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].stockBalance.update({
                        where: {
                            id: balance.id
                        },
                        data: {
                            onHandQty: counted,
                            availableQty: Math.max(0, counted - Number(balance.reservedQty || 0))
                        }
                    });
                } else {
                    await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].stockBalance.create({
                        data: {
                            itemId: line.itemId,
                            warehouseId: session.warehouseId,
                            storageBinId: binId,
                            binCode: line.binCode,
                            onHandQty: counted,
                            reservedQty: 0,
                            availableQty: counted
                        }
                    });
                }
                // Stok Hareketi (COUNT_ADJUSTMENT)
                await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].stockMovement.create({
                    data: {
                        itemId: line.itemId,
                        warehouseId: session.warehouseId,
                        storageBinId: binId,
                        movementType: diff > 0 ? "IN" : "OUT",
                        quantity: Math.abs(diff),
                        unitPrice: unitCost,
                        documentType: "COUNT_ADJUSTMENT",
                        documentNo: journalNo,
                        lotNumber: line.lotNumber || "GENEL",
                        notes: `Sayım Mahsuplaşması: Sistem ${system} -> Sayılan ${counted} (Fark: ${diff > 0 ? "+" + diff : diff})`
                    }
                }).catch(()=>null);
                // Sayım fazlası varsa yeni CostLayer oluştur, eksiği varsa mevcut katmandan düş
                if (diff > 0) {
                    await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].costLayer.create({
                        data: {
                            itemId: line.itemId,
                            warehouseId: session.warehouseId,
                            receiptDocNo: journalNo,
                            layerDate: new Date(),
                            lotNumber: line.lotNumber || "GENEL",
                            initialQty: diff,
                            remainingQty: diff,
                            unitCost: unitCost,
                            totalCost: diff * unitCost,
                            isExhausted: false
                        }
                    }).catch(()=>null);
                }
            }
            // Satırı mahsuplaştı olarak işaretle
            await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].inventoryCountLine.update({
                where: {
                    id: line.id
                },
                data: {
                    isReconciled: true,
                    adjustmentDocNo: journalNo
                }
            }).catch(()=>null);
        }
        const accuracy = totalItems > 0 ? Math.round(matchedItems / totalItems * 1000) / 10 : 100;
        // Oturumu güncelle
        const updatedSession = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].inventoryCountSession.update({
            where: {
                id: sessionId
            },
            data: {
                status: "RECONCILED",
                reconciledJournalNo: journalNo,
                reconciledAt: new Date().toISOString(),
                reconciledBy,
                accuracyPercent: accuracy,
                totalVarianceValue
            },
            include: {
                lines: true,
                warehouse: true
            }
        });
        return {
            success: true,
            session: updatedSession,
            reconciledJournalNo: journalNo,
            totalVarianceValue,
            accuracyPercent: accuracy,
            message: `${session.sessionNumber} başarıyla mahsuplaştırıldı. Stok bakiyeleri eşitlendi.`
        };
    } catch (error) {
        console.error("reconcileCountSession error:", error);
        return {
            success: false,
            error: error.message || "Mahsuplaşma yapılamadı"
        };
    }
}
async function createTransferOrder(data) {
    try {
        const item = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].inventoryItem.findUnique({
            where: {
                id: data.itemId
            }
        });
        if (!item) throw new Error("Transfer edilecek ürün bulunamadı.");
        const count = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].warehouseTransferOrder.count().catch(()=>0);
        const transferNumber = `TRF-2026-${String(count + 1).padStart(3, "0")}`;
        const transfer = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].warehouseTransferOrder.create({
            data: {
                transferNumber,
                fromWarehouseId: data.fromWarehouseId,
                toWarehouseId: data.toWarehouseId,
                status: "APPROVED",
                transferReason: data.transferReason || "Şube İkmal Transferi",
                carrierName: "Sunum Lojistik Filo",
                driverName: data.driverName || "Saha Şoförü",
                vehiclePlate: data.vehiclePlate || "34 SNR 001",
                lpnCode: `LPN-TRF-${Date.now().toString().slice(-4)}`
            }
        });
        await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].transferOrderLine.create({
            data: {
                transferOrderId: transfer.id,
                itemId: item.id,
                sku: item.sku,
                itemName: item.name,
                requestedQty: data.quantity,
                shippedQty: 0,
                receivedQty: 0,
                unit: item.baseUnit || "Adet"
            }
        });
        return {
            success: true,
            transferOrder: transfer
        };
    } catch (error) {
        return {
            success: false,
            error: error.message || "Transfer emri oluşturulamadı"
        };
    }
}
async function advanceTransferOrderStatus(transferOrderId, newStatus) {
    try {
        const order = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].warehouseTransferOrder.findUnique({
            where: {
                id: transferOrderId
            },
            include: {
                lines: true
            }
        });
        if (!order) throw new Error("Transfer emri bulunamadı.");
        if (newStatus === "IN_TRANSIT") {
            // Çıkış: Kaynak depodan stok düşülür
            for (const line of order.lines || []){
                const qty = Number(line.requestedQty || line.shippedQty || 0);
                const balance = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].stockBalance.findFirst({
                    where: {
                        itemId: line.itemId,
                        warehouseId: order.fromWarehouseId
                    }
                }).catch(()=>null);
                if (balance) {
                    await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].stockBalance.update({
                        where: {
                            id: balance.id
                        },
                        data: {
                            onHandQty: {
                                decrement: qty
                            },
                            availableQty: {
                                decrement: qty
                            }
                        }
                    });
                }
                await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].stockMovement.create({
                    data: {
                        itemId: line.itemId,
                        warehouseId: order.fromWarehouseId,
                        movementType: "OUT",
                        quantity: qty,
                        documentType: "TRANSFER_OUT",
                        documentNo: order.transferNumber,
                        notes: `Depolar Arası Sevk: ${order.transferNumber} ile yola çıktı.`
                    }
                }).catch(()=>null);
                await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].transferOrderLine.update({
                    where: {
                        id: line.id
                    },
                    data: {
                        shippedQty: qty
                    }
                }).catch(()=>null);
            }
            await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].warehouseTransferOrder.update({
                where: {
                    id: transferOrderId
                },
                data: {
                    status: "IN_TRANSIT",
                    shippedAt: new Date().toISOString()
                }
            });
        } else if (newStatus === "RECEIVED") {
            // Giriş: Hedef depoya stok eklenir
            for (const line of order.lines || []){
                const qty = Number(line.shippedQty || line.requestedQty || 0);
                const targetBalance = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].stockBalance.findFirst({
                    where: {
                        itemId: line.itemId,
                        warehouseId: order.toWarehouseId
                    }
                }).catch(()=>null);
                if (targetBalance) {
                    await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].stockBalance.update({
                        where: {
                            id: targetBalance.id
                        },
                        data: {
                            onHandQty: {
                                increment: qty
                            },
                            availableQty: {
                                increment: qty
                            }
                        }
                    });
                } else {
                    await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].stockBalance.create({
                        data: {
                            itemId: line.itemId,
                            warehouseId: order.toWarehouseId,
                            binCode: line.toBinCode || "M-01-01",
                            onHandQty: qty,
                            reservedQty: 0,
                            availableQty: qty
                        }
                    });
                }
                await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].stockMovement.create({
                    data: {
                        itemId: line.itemId,
                        warehouseId: order.toWarehouseId,
                        movementType: "IN",
                        quantity: qty,
                        documentType: "TRANSFER_IN",
                        documentNo: order.transferNumber,
                        notes: `Depolar Arası Kabul: ${order.transferNumber} hedef depoya teslim alındı.`
                    }
                }).catch(()=>null);
                await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].transferOrderLine.update({
                    where: {
                        id: line.id
                    },
                    data: {
                        receivedQty: qty
                    }
                }).catch(()=>null);
            }
            await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].warehouseTransferOrder.update({
                where: {
                    id: transferOrderId
                },
                data: {
                    status: "RECEIVED",
                    receivedAt: new Date().toISOString()
                }
            });
        }
        return {
            success: true,
            message: `Transfer durumu güncellendi: ${newStatus}`
        };
    } catch (error) {
        return {
            success: false,
            error: error.message || "Transfer durumu güncellenemedi"
        };
    }
}
async function processOfflineWmsOperations(operations) {
    const results = [];
    for (const op of operations){
        try {
            // 1. Log tablosuna kaydet
            await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].wmsOfflineSyncLog.create({
                data: {
                    deviceId: op.deviceId || "MOBIL-TERMINAL-01",
                    operatorName: op.operatorName || "Saha Personeli",
                    operationType: op.operationType || "BARCODE_SCAN",
                    payloadJson: JSON.stringify(op),
                    queuedAt: new Date(op.queuedAt || Date.now()),
                    status: "SYNCED"
                }
            }).catch(()=>null);
            // 2. Operasyon tipine göre gerçek stok/raf güncellemesi uygula
            const item = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].inventoryItem.findFirst({
                where: {
                    OR: [
                        {
                            sku: op.sku
                        },
                        {
                            barcode: op.codeScanned || op.barcode
                        }
                    ]
                }
            }).catch(()=>null);
            if (item && op.quantity) {
                const qty = Number(op.quantity);
                const whId = op.warehouseId || "wh-merkez-01";
                if (op.operationType === "PUTAWAY_CONFIRM" || op.operationType === "GOODS_RECEIPT") {
                    // Stoğa ve rafa ekle
                    const balance = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].stockBalance.findFirst({
                        where: {
                            itemId: item.id,
                            warehouseId: whId
                        }
                    }).catch(()=>null);
                    if (balance) {
                        await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].stockBalance.update({
                            where: {
                                id: balance.id
                            },
                            data: {
                                onHandQty: {
                                    increment: qty
                                },
                                availableQty: {
                                    increment: qty
                                }
                            }
                        });
                    }
                    await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].stockMovement.create({
                        data: {
                            itemId: item.id,
                            warehouseId: whId,
                            movementType: "IN",
                            quantity: qty,
                            documentType: "OFFLINE_PDA_PUTAWAY",
                            documentNo: `PDA-${Date.now().toString().slice(-6)}`,
                            notes: `Mobil Terminal Çevrimdışı Senkronizasyonu (${op.binCode || "Raf"})`
                        }
                    }).catch(()=>null);
                } else if (op.operationType === "PICK_CONFIRM") {
                    // Stoktan düş
                    const balance = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].stockBalance.findFirst({
                        where: {
                            itemId: item.id,
                            warehouseId: whId
                        }
                    }).catch(()=>null);
                    if (balance) {
                        await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].stockBalance.update({
                            where: {
                                id: balance.id
                            },
                            data: {
                                onHandQty: {
                                    decrement: qty
                                },
                                availableQty: {
                                    decrement: qty
                                }
                            }
                        });
                    }
                    await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].stockMovement.create({
                        data: {
                            itemId: item.id,
                            warehouseId: whId,
                            movementType: "OUT",
                            quantity: qty,
                            documentType: "OFFLINE_PDA_PICK",
                            documentNo: `PDA-${Date.now().toString().slice(-6)}`,
                            notes: `Mobil Terminal Çevrimdışı Toplama (${op.binCode || "Raf"})`
                        }
                    }).catch(()=>null);
                }
            }
            results.push({
                id: op.id,
                success: true
            });
        } catch (err) {
            results.push({
                id: op.id,
                success: false,
                error: err.message
            });
        }
    }
    return {
        success: true,
        processedCount: results.filter((r)=>r.success).length,
        totalCount: operations.length,
        results
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

//# sourceMappingURL=%5Broot-of-the-server%5D__0il62wh4bmqzy._.js.map