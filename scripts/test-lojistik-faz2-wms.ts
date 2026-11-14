/**
 * Lojistik Faz 2 (Depo & WMS Derinleştirmesi) — Uçtan Uca Otomatik Doğrulama Paketi
 *
 * Kapsam:
 * 1) Additive migration doğrulaması (Faz 1 + Faz 2 rollback SQL)
 * 2) GS1 SSCC-18 Mod-10 check-digit hesaplama & sahteleme tespiti
 * 3) Faz 2 demo seed bütünlüğü ve onarılmış kayıt doğrulaması + 4-seviyeli hiyerarşi
 * 4) E2E Depo Akışı: PO Mal Kabul (sağlam+hasarlı+varyans) -> Put-Away önerisi ->
 *    Rezervasyon -> FEFO/FIFO sıralama (karantina/SKT geçmiş hariç) -> Wave Pick ->
 *    Transfer IN_TRANSIT & DISCREPANCY -> Döngüsel sayım tolerans onayı & mahsuplaşma ->
 *    Stok defteri mutabakatı
 * 5) Çift okutma idempotencyKey tekilleştirmesi
 * 6) Cross-Docking ve Kitting (Assemble/Disassemble) muhasebesi
 * 7) Çevrimdışı kuyruk senkronizasyonu CONFLICT & DUPLICATE_IGNORED tespiti
 * 8) Üretim `reservedQty` çakışmasız çalışma kanıtı
 * 9) RFID EPC ingestion & eşleştirme (+ opsiyonel canlı HTTP yetki testleri 401/403/200)
 */

import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { validateAllLogisticsMigrations } from "@/lib/services/migrationStrategyService"
import {
  generateSscc18Code,
  validateSscc18Code,
  resolveNormalizedBinRole,
  getWarehouseHierarchyTree,
  createLicensePlateWithSscc,
  generatePrintableLabelPayload,
  suggestPutawayBins,
  processGoodsReceiptWithVariance,
  createStockReservation,
  releaseStockReservation,
  suggestPickAllocation,
  listReservationsWithBreakdown,
  createWavePickTask,
  completeWmsTaskExecution,
  createMultiLineTransferOrder,
  advanceTransferOrderWithTransit,
  createCycleCountSession,
  reconcileCycleCountSession,
  createCrossDockOrder,
  advanceCrossDockOrder,
  createKitOrder,
  executeKitOrder,
  processOfflineBatchWithConflictCheck,
  ingestRfidTagReads,
  recordStockLedgerEntry,
  queryStockLedger,
  getWarehouseKpiSnapshot,
} from "@/lib/logistics/wms"
import { prisma } from "@/lib/db"

const DB_PATH = path.join(process.cwd(), "storage", "ajans-kutuphanesi", ".local-db.json")

async function runSuite() {
  let passed = 0
  const check = async (label: string, fn: () => Promise<void> | void) => {
    await fn()
    passed++
    console.log(`  ✅ [${passed}] ${label}`)
  }

  console.log("=== Lojistik Faz 2 WMS Doğrulama Paketi Başlıyor ===")

  // 1. Additive migrations
  await check("Faz 1 + Faz 2 additive migration & rollback SQL geçerliliği", async () => {
    const results = validateAllLogisticsMigrations()
    assert.ok(results.length >= 2, `En az 2 lojistik migration bekleniyordu, bulunan: ${results.length}`)
    for (const r of results) {
      assert.equal(r.valid, true, `Migration '${r.migrationName}' hataları: ${JSON.stringify(r.errors)}`)
    }
  })

  // 2. SSCC-18 GS1 check digit
  await check("GS1 SSCC-18 Mod-10 check-digit doğrulama & tek hane bozma reddi", () => {
    const gen = generateSscc18Code({
      companyPrefix: "8691234",
      serialNumber: "000099112",
      extensionDigit: "3",
    })
    assert.equal(gen.sscc18.length, 18)
    const valid = validateSscc18Code(gen.sscc18)
    assert.equal(valid.valid, true)

    const tamperedDigit = gen.sscc18[17] === "9" ? "8" : "9"
    const tampered = gen.sscc18.slice(0, 17) + tamperedDigit
    assert.equal(validateSscc18Code(tampered).valid, false)
  })

  // Snapshot JSON DB before mutational tests
  const snapshotRaw = fs.readFileSync(DB_PATH, "utf8")

  try {
    // 3. Demo seed repair & hierarchy
    await check("Faz 0 bozuk kayıt onarımı + 4-seviye hiyerarşi & 7 lokasyon rolü", async () => {
      const broken = await prisma.stockBalance.findUnique({
        where: { id: "local-1793780602236-aktcss4ef7" },
      })
      assert.equal(typeof broken?.onHandQty, "number")
      assert.equal(typeof broken?.availableQty, "number")

      const gulBin = await prisma.storageBin.findUnique({ where: { id: "bin-mrk-gul" } })
      assert.equal(gulBin?.zoneId, "zone-cold-01")

      const tree = await getWarehouseHierarchyTree("wh-merkez-01")
      assert.equal(tree.length, 1)
      const allBins = tree[0].zones.flatMap((z: any) => z.aisles.flatMap((a: any) => a.bins))
      const roles = new Set(allBins.map((b: any) => resolveNormalizedBinRole(b)))
      for (const expectedRole of [
        "COLD_STORAGE",
        "FAST_PICK",
        "QUARANTINE",
        "RETURN_RMA",
        "SHIPPING",
        "CROSS_DOCK",
        "NORMAL",
      ]) {
        assert.ok(roles.has(expectedRole), `Eksik lokasyon rolü: ${expectedRole}`)
      }
    })

    // 4. Isolated E2E Flow on fresh item + test bins
    await check("E2E Depo Akışı: PO Mal Kabul (sağlam+hasarlı) -> Put-Away -> Rezervasyon -> FEFO -> Wave Pick -> Transfer -> Sayım -> Defter", async () => {
      const suffix = Date.now().toString().slice(-6)
      const testItem = await prisma.inventoryItem.create({
        data: {
          sku: `TST-F2-${suffix}`,
          name: `Test Orkide FEFO ${suffix}`,
          barcode: `86999${suffix}`,
          category: "Kesme Çiçek",
          baseUnit: "Demet",
          valuationMethod: "FIFO",
          pickPolicy: "FEFO",
          trackLot: true,
          trackExpiry: true,
          trackSerial: false,
          rfidEpcPrefix: `E280TST${suffix}`,
          standardCost: 100,
          salesPrice: 220,
        },
      })

      // Ensure 2 putaway deliveries with distinct SKT dates (L1 later, L2 sooner -> FEFO must pick L2 first)
      const grLater = await processGoodsReceiptWithVariance({
        warehouseId: "wh-merkez-01",
        relatedPoNo: `PO-TEST-${suffix}-A`,
        partnerName: "Test Tedarik A.Ş.",
        performedBy: "Test Operatör",
        idempotencyKey: `IDEM-GR-A-${suffix}`,
        lines: [
          {
            itemId: testItem.id,
            expectedQty: 25,
            receivedGoodQty: 20,
            damagedQty: 2,
            lotNumber: `LOT-LATE-${suffix}`,
            expiryDate: "2026-12-20",
            targetBinId: "f2-bin-mrk-fast-f1",
            unitCost: 100,
          },
        ],
      })
      assert.equal(grLater.movements.length, 2) // 20 good + 2 quarantine

      const putawaySug = await suggestPutawayBins({
        warehouseId: "wh-merkez-01",
        itemId: testItem.id,
        quantity: 10,
      })
      assert.ok(putawaySug.candidates.length > 0)

      await processGoodsReceiptWithVariance({
        warehouseId: "wh-merkez-01",
        relatedPoNo: `PO-TEST-${suffix}-B`,
        partnerName: "Test Tedarik B.Ş.",
        performedBy: "Test Operatör",
        idempotencyKey: `IDEM-GR-B-${suffix}`,
        lines: [
          {
            itemId: testItem.id,
            expectedQty: 15,
            receivedGoodQty: 15,
            damagedQty: 0,
            lotNumber: `LOT-SOON-${suffix}`,
            expiryDate: "2026-11-22",
            targetBinId: "f2-bin-mrk-cold-a2",
            unitCost: 110,
          },
        ],
      })

      // Check FEFO order: LOT-SOON must come before LOT-LATE and QUARANTINE lot (2 qty) must be excluded!
      const fefo = await suggestPickAllocation({
        itemId: testItem.id,
        warehouseId: "wh-merkez-01",
        requiredQty: 25,
      })
      assert.equal(fefo.policyUsed, "FEFO")
      assert.equal(fefo.suggestions[0].lotNumber, `LOT-SOON-${suffix}`)
      assert.ok(
        !fefo.suggestions.some((s) => s.binCode === "Q-01-01"),
        "Karantina rafı toplama önerisine giremez"
      )

      // Reserve 5 units cleanly -> create & release
      const rsv = await createStockReservation({
        itemId: testItem.id,
        warehouseId: "wh-merkez-01",
        storageBinId: "f2-bin-mrk-cold-a2",
        quantity: 5,
        sourceType: "ORDER",
        sourceId: `SIP-TST-${suffix}`,
        sourceRefNo: `SIP-TST-${suffix}`,
        createdBy: "Test Planlama",
      })
      assert.equal(rsv.reservedQty, 5)
      await releaseStockReservation({ reservationId: rsv.id, performedBy: "Test Planlama" })

      // Wave Pick & Execute
      const wave = await createWavePickTask({
        warehouseId: "wh-merkez-01",
        assignedOperator: "Test Toplayıcı",
        lines: [{ itemId: testItem.id, quantity: 10 }],
      })
      assert.equal(wave.workflowStage, "WAVE_PICK")
      await completeWmsTaskExecution({
        taskId: wave.id,
        performedBy: "Test Toplayıcı",
        pickedQtyByLineId: { [wave.lines[0].id]: 8 },
        shortPickReasonByLineId: { [wave.lines[0].id]: "2 adet solmuş" },
      })

      // Inter-warehouse Transfer with IN_TRANSIT -> DISCREPANCY
      const trf = await createMultiLineTransferOrder({
        fromWarehouseId: "wh-merkez-01",
        toWarehouseId: "wh-kadikoy-02",
        requestedBy: "Test Şube",
        lines: [{ itemId: testItem.id, quantity: 6 }],
      })
      await advanceTransferOrderWithTransit({
        transferOrderId: trf.id,
        newStatus: "IN_TRANSIT",
        performedBy: "Test Sevkiyat",
      })
      const midLine = await prisma.transferOrderLine.findFirst({ where: { transferOrderId: trf.id } })
      assert.equal(midLine?.inTransitQty, 6)

      const discTrf = await advanceTransferOrderWithTransit({
        transferOrderId: trf.id,
        newStatus: "RECEIVED",
        receivedQtyByLineId: { [midLine!.id]: 4 },
        discrepancyNotes: "2 demet nakliyede eksik",
        performedBy: "Test Kadıköy",
      })
      assert.equal(discTrf.status, "DISCREPANCY")

      // Cycle Count Tolerance Threshold & Manager Approve
      const sess = await createCycleCountSession(
        {
          warehouseId: "wh-merkez-01",
          tolerancePercent: 1,
          countType: "BLIND_COUNT",
          itemIds: [testItem.id],
        },
        "Test Sayım"
      )
      assert.ok((sess.lines?.length || 0) > 0)
      const cLine = sess.lines![0]
      await prisma.inventoryCountLine.update({
        where: { id: cLine.id },
        data: { countedQty: Math.max(0, Number(cLine.systemQty) - 3) },
      })
      const pendingSess = await reconcileCycleCountSession({
        sessionId: sess.id,
        performedBy: "Test Sayım",
        forceApproveBeyondTolerance: false,
      })
      assert.equal(pendingSess.status, "PENDING_APPROVAL")
      const reconciled = await reconcileCycleCountSession({
        sessionId: sess.id,
        performedBy: "Depo Müdürü",
        forceApproveBeyondTolerance: true,
      })
      assert.equal(reconciled.status, "RECONCILED")

      // Ledger query & reconciliation check
      const ledger = await queryStockLedger({ itemId: testItem.id, pageSize: 50 })
      assert.ok(ledger.pagination.total >= 4)
      assert.ok(ledger.entries.some((e: any) => e.movementType === "COUNT_ADJUSTMENT"))

      // Printable label + SSCC LPN check
      const lpn = await createLicensePlateWithSscc({
        warehouseId: "wh-merkez-01",
        currentBinCode: "A-02-01",
        containerType: "PALLET_EUR",
        contents: [{ itemId: testItem.id, quantity: 10, unit: "Demet" }],
      })
      assert.equal(validateSscc18Code(lpn.lpnCode).valid, true)
      const label = await generatePrintableLabelPayload({ entityType: "LPN", id: lpn.id })
      assert.ok(label.qrSvg.includes("<svg"))
    })

    // 5. IdempotencyKey deduplication
    await check("Çift okutma (idempotencyKey) mükerrer stok hareketini engeller", async () => {
      const beforeMovements = await prisma.stockMovement.count({
        where: { itemId: "item-gul-01", warehouseId: "wh-merkez-01" },
      })
      const key = `IDEM-DOUBLE-${Date.now()}`
      const first = await recordStockLedgerEntry({
        itemId: "item-gul-01",
        warehouseId: "wh-merkez-01",
        movementType: "RECEIPT",
        quantityDelta: 3,
        storageBinId: "f2-bin-mrk-fast-f1",
        performedBy: "Test Çift",
        idempotencyKey: key,
      })
      const second = await recordStockLedgerEntry({
        itemId: "item-gul-01",
        warehouseId: "wh-merkez-01",
        movementType: "RECEIPT",
        quantityDelta: 3,
        storageBinId: "f2-bin-mrk-fast-f1",
        performedBy: "Test Çift",
        idempotencyKey: key,
      })
      assert.equal(first.duplicate, false)
      assert.equal(second.duplicate, true)
      const afterMovements = await prisma.stockMovement.count({
        where: { itemId: "item-gul-01", warehouseId: "wh-merkez-01" },
      })
      assert.equal(afterMovements, beforeMovements + 1)
    })

    // 6. Cross-Docking & Kitting
    await check("Cross-Docking ve Kitting (Assemble & Disassemble) stok muhasebesi", async () => {
      const xd = await createCrossDockOrder({
        warehouseId: "wh-merkez-01",
        inboundPoNo: "PO-XD-TST",
        inboundReceivingBinId: "f2-bin-mrk-xd-x1",
        outboundOrderRef: "SIP-XD-TST",
        outboundRampBinId: "f2-bin-mrk-ship-s1",
        itemId: "item-lil-02",
        plannedQty: 5,
      })
      await advanceCrossDockOrder({
        crossDockId: xd.id,
        nextStatus: "RECEIVING_DOCK",
        quantity: 5,
        performedBy: "Test XD",
      })
      const xdShipped = await advanceCrossDockOrder({
        crossDockId: xd.id,
        nextStatus: "DISPATCHED",
        quantity: 5,
        performedBy: "Test XD",
      })
      assert.equal(xdShipped.status, "DISPATCHED")

      // Kitting assemble 1 VIP aranjman from seeded items
      const balBeforeGul = await prisma.stockBalance.findFirst({
        where: { itemId: "item-gul-01", warehouseId: "wh-merkez-01", storageBinId: "f2-bin-mrk-cold-a2" },
      })
      const kit = await createKitOrder({
        operationType: "ASSEMBLE",
        warehouseId: "wh-merkez-01",
        kitItemId: "item-arj-07",
        targetBinId: "f2-bin-mrk-fast-f1",
        plannedQty: 1,
        components: [{ componentItemId: "item-gul-01", requiredPerKit: 2, sourceBinId: "f2-bin-mrk-cold-a2" }],
      })
      const execKit = await executeKitOrder({ kitOrderId: kit.id, performedBy: "Test Kit" })
      assert.equal(execKit.status, "COMPLETED")
      const balAfterGul = await prisma.stockBalance.findFirst({
        where: { itemId: "item-gul-01", warehouseId: "wh-merkez-01", storageBinId: "f2-bin-mrk-cold-a2" },
      })
      assert.equal(Number(balAfterGul?.onHandQty), Number(balBeforeGul?.onHandQty) - 2)
    })

    // 7. Offline queue sync conflict & duplicate check
    await check("Çevrimdışı kuyruk senkronizasyonu CONFLICT ve DUPLICATE_IGNORED tespiti", async () => {
      const doneTask = await prisma.wmsTask.findUnique({ where: { id: "f2-task-done-04" } })
      assert.equal(doneTask?.status, "COMPLETED")
      const batch1 = await processOfflineBatchWithConflictCheck({
        deviceId: "TST-ZEBRA-01",
        operatorName: "Test Saha",
        queueItems: [
          {
            idempotencyKey: `OFF-CONFLICT-${Date.now()}`,
            operationType: "WAVE_PICK",
            payload: { taskId: "f2-task-done-04" },
            queuedAt: new Date().toISOString(),
          },
          {
            idempotencyKey: `OFF-DUP-KEY-001-${Date.now()}`,
            operationType: "PUTAWAY",
            payload: { itemId: "item-lil-02", warehouseId: "wh-merkez-01", binCode: "A-02-01", quantity: 2 },
            queuedAt: new Date().toISOString(),
          },
        ],
      })
      assert.equal(batch1.conflictCount, 1)
      assert.equal(batch1.syncedCount, 1)

      const dupKey = `OFF-REPLAY-${Date.now()}`
      const pay = [
        {
          idempotencyKey: dupKey,
          operationType: "PUTAWAY" as const,
          payload: { itemId: "item-lil-02", warehouseId: "wh-merkez-01", binCode: "A-02-01", quantity: 1 },
          queuedAt: new Date().toISOString(),
        },
      ]
      const r1 = await processOfflineBatchWithConflictCheck({ deviceId: "TST", operatorName: "T", queueItems: pay })
      const r2 = await processOfflineBatchWithConflictCheck({ deviceId: "TST", operatorName: "T", queueItems: pay })
      assert.equal(r1.syncedCount, 1)
      assert.equal(r2.duplicateCount, 1)
    })

    // 8. Production reservedQty non-interference
    await check("Üretim `reservedQty` alanı ile WMS rezervasyonunun çakışmasız çalışması", async () => {
      const prodBal = await prisma.stockBalance.findFirst({
        where: { id: "f2-bal-gul-fast-f1" },
      })
      const initReserved = Number(prodBal?.reservedQty || 0)
      // Simulate production module reserving 6 units directly on StockBalance
      await prisma.stockBalance.update({
        where: { id: prodBal!.id },
        data: {
          reservedQty: initReserved + 6,
          availableQty: Math.max(0, Number(prodBal!.onHandQty) - (initReserved + 6)),
        },
      })

      // WMS reserves 4 units via LojistikStockReservation
      const wmsRes = await createStockReservation({
        itemId: "item-gul-01",
        warehouseId: "wh-merkez-01",
        storageBinId: prodBal!.id ? prodBal!.storageBinId : undefined,
        quantity: 4,
        sourceType: "ORDER",
        sourceId: "SIP-PROD-COEXIST",
        sourceRefNo: "SIP-PROD-COEXIST",
        createdBy: "Test WMS",
      })

      const duringBal = await prisma.stockBalance.findUnique({ where: { id: prodBal!.id } })
      assert.equal(Number(duringBal?.reservedQty), initReserved + 6 + 4)

      await releaseStockReservation({ reservationId: wmsRes.id, performedBy: "Test WMS" })
      const afterBal = await prisma.stockBalance.findUnique({ where: { id: prodBal!.id } })
      // Production's 6-unit reservation stays untouched!
      assert.equal(Number(afterBal?.reservedQty), initReserved + 6)
    })

    // 9. RFID ingestion + KPI snapshot (+ optional Live HTTP Auth tests if TEST_BASE_URL set)
    await check("RFID EPC otomatik eşleştirme & Gerçek DB Depo KPI hesaplaması", async () => {
      const rfidRes = await ingestRfidTagReads({
        readerId: "TEST-PORTAL-01",
        warehouseId: "wh-merkez-01",
        countSessionId: "f2-cnt-open-01",
        reads: [
          { epcCode: "E280117000000201GUL0001", rssi: -44, idempotencyKey: `TST-EPC-${Date.now()}` },
          { epcCode: "UNKNOWN-EPC-999999", rssi: -71, idempotencyKey: `TST-UNK-${Date.now()}` },
        ],
      })
      assert.equal(rfidRes.receivedCount, 2)
      assert.equal(rfidRes.matchedCount, 1)

      const kpi = await getWarehouseKpiSnapshot("wh-merkez-01")
      assert.equal(typeof kpi.stockAccuracyPercent, "number")
      assert.ok(kpi.totalActiveBins > 0)
      assert.ok(kpi.overdueTasksCount >= 0)
    })

    const baseUrl = process.env.TEST_BASE_URL
    if (baseUrl) {
      await check(`Canlı HTTP Yetki Testleri (${baseUrl}/api/wms ve /api/wms/rfid): 401 / 403 / 200`, async () => {
        // 1) Unauthenticated -> 401
        const unauthRes = await fetch(`${baseUrl}/api/wms?section=kpi`)
        assert.equal(unauthRes.status, 401)
        const unauthRfid = await fetch(`${baseUrl}/api/wms/rfid`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ readerId: "R1", reads: [{ epcCode: "E280117000000201GUL0001" }] }),
        })
        assert.equal(unauthRfid.status, 401)

        // 2) Wrong key rejected (401), registered InventoryApiKey accepted (200)
        const badKeyRes = await fetch(`${baseUrl}/api/wms/rfid`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-wms-rfid-key": "invalid-rfid-key-000",
          },
          body: JSON.stringify({ readerId: "R1", reads: [{ epcCode: "E280117000000201GUL0001" }] }),
        })
        assert.equal(badKeyRes.status, 401)

        const validHwKey = process.env.WMS_RFID_API_KEY || "tst-wms-rfid-hardware-key-2026"
        await prisma.inventoryApiKey.create({
          data: {
            name: "Test RFID Gate Key",
            keyPrefix: validHwKey.slice(0, 12),
            maskedKey: `${validHwKey.slice(0, 8)}****`,
            scopes: "wms:rfid",
            iotDeviceType: "UHF_RFID_PORTAL",
            isActive: true,
          },
        })
        const hwKeyRes = await fetch(`${baseUrl}/api/wms/rfid`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-wms-rfid-key": validHwKey,
          },
          body: JSON.stringify({
            readerId: "HTTP-HW-PORTAL",
            warehouseId: "wh-merkez-01",
            reads: [{ epcCode: "E280117000000201GUL0001", idempotencyKey: `HW-HTTP-${Date.now()}` }],
          }),
        })
        assert.equal(hwKeyRes.status, 200)

        // 3) Supplier user ("user-tedarikci-flora" -> role-tedarikci in DB) -> 403
        const { SignJWT } = await import("jose")
        const jwtSecret = new TextEncoder().encode(
          process.env.JWT_SECRET || "super-secret-key-change-this"
        )
        const supJwt = await new SignJWT({
          userId: "user-tedarikci-flora",
          username: "tedarikci.royal",
          roleName: "Tedarikçi",
        })
          .setProtectedHeader({ alg: "HS256" })
          .setExpirationTime("1h")
          .sign(jwtSecret)
        const supWmsRes = await fetch(`${baseUrl}/api/wms?section=kpi`, {
          headers: { Cookie: `auth-token=${supJwt}` },
        })
        assert.equal(supWmsRes.status, 403)

        // 4) Admin demo login -> 200 across all extended WMS & Inventory API endpoints
        const loginAdm = await fetch(`${baseUrl}/api/auth/demo`, { method: "POST" })
        const admCookie = loginAdm.headers.get("set-cookie")?.split(";")[0] || ""
        assert.ok(admCookie, "Admin demo auth cookie alınamadı")
        const headers = { Cookie: admCookie }

        const admKpiRes = await fetch(`${baseUrl}/api/wms?section=kpi`, { headers })
        assert.equal(admKpiRes.status, 200)
        const kpiJson = await admKpiRes.json()
        assert.equal(kpiJson.success, true)
        assert.ok(kpiJson.kpi.totalActiveBins > 0)

        const [
          overviewRes,
          hierarchyRes,
          directivesRes,
          reservationsRes,
          lpnsRes,
          labelRes,
          xdRes,
          kitRes,
          ledgerRes,
          rfidRes,
          offlineRes,
          invRes,
        ] = await Promise.all([
          fetch(`${baseUrl}/api/wms`, { headers }),
          fetch(`${baseUrl}/api/wms?section=hierarchy`, { headers }),
          fetch(`${baseUrl}/api/wms?section=directives`, { headers }),
          fetch(`${baseUrl}/api/wms?section=reservations`, { headers }),
          fetch(`${baseUrl}/api/wms?section=lpns`, { headers }),
          fetch(`${baseUrl}/api/wms?section=label&entityType=LPN&id=f2-lpn-palet-01`, { headers }),
          fetch(`${baseUrl}/api/wms?section=cross_dock`, { headers }),
          fetch(`${baseUrl}/api/wms?section=kitting`, { headers }),
          fetch(`${baseUrl}/api/wms?section=ledger`, { headers }),
          fetch(`${baseUrl}/api/wms?section=rfid`, { headers }),
          fetch(`${baseUrl}/api/wms?section=offline_logs`, { headers }),
          fetch(`${baseUrl}/api/inventory`, { headers }),
        ])

        for (const [name, r] of [
          ["overview", overviewRes],
          ["hierarchy", hierarchyRes],
          ["directives", directivesRes],
          ["reservations", reservationsRes],
          ["lpns", lpnsRes],
          ["label", labelRes],
          ["cross_dock", xdRes],
          ["kitting", kitRes],
          ["ledger", ledgerRes],
          ["rfid", rfidRes],
          ["offline_logs", offlineRes],
          ["inventory", invRes],
        ] as const) {
          assert.equal(r.status, 200, `/api endpoint '${name}' status ${r.status} döndürdü`)
        }

        const labelJson = await labelRes.json()
        assert.equal(labelJson.success, true)
        assert.ok(String(labelJson.label?.qrSvg || "").includes("<svg"))
        assert.equal(labelJson.label?.ssccValid, true)

        const overviewJson = await overviewRes.json()
        assert.ok(Array.isArray(overviewJson.warehouses) && overviewJson.warehouses.length > 0)
        const xdJson = await xdRes.json()
        assert.ok(Array.isArray(xdJson.crossDockOrders) && xdJson.crossDockOrders.length >= 2)
        const kitJson = await kitRes.json()
        assert.ok(Array.isArray(kitJson.kitOrders) && kitJson.kitOrders.length >= 2)
        const invJson = await invRes.json()
        assert.ok(Array.isArray(invJson.items) && invJson.items.length > 0)
        assert.ok(invJson.items.some((it: any) => it.pickPolicy === "FEFO" || it.pickPolicy === "FIFO"))
      })
    }
  } finally {
    // Restore clean demo JSON DB snapshot so tests leave 0 pollution
    fs.writeFileSync(DB_PATH, snapshotRaw, "utf8")
  }

  console.log(`\n🎉 TÜM DOĞRULAMA TESTLERİ GEÇTİ (${passed}/${passed} başarılı)`)
}

runSuite()
  .catch((err) => {
    console.error("❌ TEST HATASI:", err)
    process.exit(1)
  })
  .then(() => process.exit(0))

