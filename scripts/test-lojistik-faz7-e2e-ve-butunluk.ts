/**
 * Lojistik Faz 7 — Uçtan Uca Entegrasyon, Yönetim Özeti, 6 Bildirim Kuralı,
 * Rapor/Excel/PDF Dışa Aktarma ve Tam Demo Veri Bütünlüğü Doğrulama Paketi
 *
 * Çalıştırma:
 *   npx cross-env SUNUM_DISABLE_CRON=1 npx tsx scripts/test-lojistik-faz7-e2e-ve-butunluk.ts
 */

process.env.SUNUM_DISABLE_CRON = "1"

import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import * as XLSX from "xlsx"
import { prisma } from "@/lib/db"
import { getSystemConfig, saveSystemConfig } from "@/lib/system-config"
import { validateAllLogisticsMigrations } from "@/lib/services/migrationStrategyService"
import {
  createDispatchTrip,
  approveTripAndTriggerEWaybill,
  driverUpdateTripOrStopExecution,
  submitStopDeliveryProof,
  issueOneClickSalesEInvoiceForStop,
  runMultiVehicleAutoPlanAndPersist,
} from "@/lib/logistics/dispatch/dispatchService"
import { receiveAsnIntoWms, createSupplierAsn } from "@/lib/logistics/procurement/asnAndReceivingService"
import {
  lookupOrderForRma,
  createRmaDocument,
  receiveRmaIntoQuarantine,
  decideRmaInspection,
} from "@/lib/logistics/returns/rmaService"
import { processCreditNoteAction } from "@/lib/logistics/returns/financeAndWebhookService"
import {
  createFleetFaultAndOptionalWorkOrder,
  updateFleetWorkOrderStatus,
} from "@/lib/logistics/fleet/fleetOpsAndFinanceService"
import { getLogisticsExecutiveSummaryForUser } from "@/lib/logistics/dashboard"
import {
  evaluateAndDispatchLogisticsAlerts,
  mergeUserLogisticsNotificationPrefs,
  parseUserLogisticsNotificationPrefs,
  ALL_LOGISTICS_ALERT_RULE_KEYS,
} from "@/lib/logistics/notifications"
import {
  assertReportModuleAccess,
  exportLogisticsReportToExcelBuffer,
  exportLogisticsReportToPdfBuffer,
  generateLogisticsReport,
  LOGISTICS_REPORT_MODULE_DEFS,
} from "@/lib/logistics/reports"
import {
  rollbackAllLogisticsDemoSeeds,
  runAllLogisticsDemoSeeds,
} from "@/lib/logistics/seed"

const DB_PATH = path.join(process.cwd(), "storage", "ajans-kutuphanesi", ".local-db.json")
const SYS_CFG_PATH = path.join(process.cwd(), "storage", "system_config.json")
const TEST_POD_IMG_BASE64 =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAEElEQVR42mP8z8AARwzEcQAAAP//AwwDAf0AAAAASUVORK5CYII="

function getSignedQty(m: any): number {
  const q = Number(m?.quantity || 0)
  const t = String(m?.movementType || "").toUpperCase()
  if (
    [
      "OPENING_BALANCE",
      "RECEIPT",
      "IN",
      "TRANSFER_IN",
      "PRODUCTION_OUTPUT",
      "PRODUCE",
      "RETURN",
      "RMA_RETURN",
      "ADJUST_IN",
    ].includes(t)
  ) {
    return Math.abs(q)
  }
  if (
    [
      "ISSUE",
      "OUT",
      "TRANSFER_OUT",
      "PRODUCTION_CONSUME",
      "CONSUME",
      "CONSIGNMENT_CONSUME",
      "SCRAP",
      "ADJUST_OUT",
    ].includes(t)
  ) {
    return -Math.abs(q)
  }
  return q
}

async function runSuite() {
  const snapshotRaw = fs.existsSync(DB_PATH) ? fs.readFileSync(DB_PATH) : null
  const sysCfgRaw = fs.existsSync(SYS_CFG_PATH) ? fs.readFileSync(SYS_CFG_PATH) : null
  const savedEnv = {
    FEATURE_LOJISTIK_FILO: process.env.FEATURE_LOJISTIK_FILO,
    FEATURE_LOJISTIK_ALL: process.env.FEATURE_LOJISTIK_ALL,
    DISABLE_DEMO_MODE: process.env.DISABLE_DEMO_MODE,
    LOJISTIK_EFATURA_TIMING_MODE: process.env.LOJISTIK_EFATURA_TIMING_MODE,
  }

  let passed = 0
  const step = async (label: string, fn: () => Promise<void> | void) => {
    await fn()
    passed++
    console.log(`✅ [FAZ7 #${passed}] ${label}`)
  }

  try {
    // 0. 7 Additive Migration + Rollback SQL
    await step("Faz 1–7 SQL Migration & Rollback bütünlüğü (7/7 valid)", () => {
      const results = validateAllLogisticsMigrations()
      assert.equal(results.length, 7, "Tam 7 lojistik migration klasörü bekleniyordu.")
      for (const r of results) {
        assert.equal(r.valid, true, `${r.migrationName} geçersiz: ${r.errors.join("; ")}`)
      }
      const faz7 = results.find((r) => r.migrationName.includes("20261117100000_lojistik_faz7_final"))
      assert.ok(faz7, "Faz 7 migration klasörü bulunamadı.")
    })

    // 1. Demo Veri Bütünlüğü Denetimi (Bakiyeler, Hareket Eşitliği, FK, Tarih, Alacak Dekontu)
    await step("Demo DB: 100% StockMovement == StockBalance eşitliği, wh-merkez & karantina onarımı, 0 orphan FK, Kasım 2026 tarih & dekont uyumu", () => {
      const db = JSON.parse(fs.readFileSync(DB_PATH, "utf8"))

      // Legacy wh-merkez kalmamış olmalı
      const legacyWhMovs = (db.stockMovement || []).filter((m: any) => m.warehouseId === "wh-merkez")
      assert.equal(legacyWhMovs.length, 0, "Eski 'wh-merkez' depo hareketleri onarılmış olmalı.")

      // Karantina miktarı f2-bal-gul-quar-q1 = 12
      const quarBal = (db.stockBalance || []).find((b: any) => b.id === "f2-bal-gul-quar-q1")
      assert.ok(quarBal, "f2-bal-gul-quar-q1 bulunmalı.")
      assert.equal(quarBal.quarantineQty, 12, "f2-bal-gul-quar-q1.quarantineQty = 12 olmalı.")

      // SUM(stockMovement) === SUM(stockBalance.onHandQty)
      const balByPair = new Map<string, number>()
      for (const b of db.stockBalance || []) {
        const k = `${b.itemId}::${b.warehouseId}`
        balByPair.set(k, (balByPair.get(k) || 0) + Number(b.onHandQty || 0))
      }
      const movByPair = new Map<string, number>()
      for (const m of db.stockMovement || []) {
        const k = `${m.itemId}::${m.warehouseId}`
        movByPair.set(k, (movByPair.get(k) || 0) + getSignedQty(m))
      }
      const pairs = new Set([...balByPair.keys(), ...movByPair.keys()])
      for (const k of pairs) {
        const bSum = Math.round((balByPair.get(k) || 0) * 100) / 100
        const mSum = Math.round((movByPair.get(k) || 0) * 100) / 100
        assert.equal(bSum, mSum, `${k} çiftinde bakiye (${bSum}) !== hareket toplamı (${mSum})`)
      }

      // Orphan FK kontrolleri
      const itemIds = new Set((db.inventoryItem || []).map((i: any) => i.id))
      const whIds = new Set((db.warehouse || []).map((w: any) => w.id))
      const supIds = new Set((db.supplier || []).map((s: any) => s.id))
      const vehIds = new Set((db.lojistikVehicle || []).map((v: any) => v.id))
      const tripIds = new Set((db.lojistikShipmentTrip || []).map((t: any) => t.id))
      const rmaIds = new Set((db.returnRmaRecord || []).map((r: any) => r.id))
      const finById = new Map<string, any>((db.finance || []).map((f: any) => [f.id, f]))

      assert.equal((db.stockBalance || []).filter((b: any) => !itemIds.has(b.itemId) || !whIds.has(b.warehouseId)).length, 0)
      assert.equal((db.stockMovement || []).filter((m: any) => !itemIds.has(m.itemId) || !whIds.has(m.warehouseId)).length, 0)
      assert.equal((db.lojistikShipmentStop || []).filter((s: any) => !tripIds.has(s.tripId)).length, 0)
      assert.equal((db.lojistikFuelLog || []).filter((f: any) => !vehIds.has(f.vehicleId)).length, 0)
      assert.equal((db.lojistikPurchaseOrder || []).filter((p: any) => !supIds.has(p.supplierId) || !whIds.has(p.warehouseId)).length, 0)
      assert.equal((db.lojistikRmaCreditNote || []).filter((c: any) => !rmaIds.has(c.rmaId)).length, 0)

      // Alacak Dekontu -> Finans tutar mutabakatı
      for (const cn of db.lojistikRmaCreditNote || []) {
        if (["ONAYLANDI", "IADE_ODENDI"].includes(cn.status)) {
          const fin = finById.get(cn.financeId)
          assert.ok(fin, `${cn.id} onaylı alacak dekontu finans kaydına bağlı olmalı.`)
          assert.equal(Number(fin.amount), Number(cn.grossAmount), `${cn.id} finans tutarı eşleşmeli.`)
        }
      }

      // Kasım 2026 üst tarih sınırı (gelecek sahte tarih olmamalı)
      const maxAllowed = new Date("2026-11-30T23:59:59.999Z").getTime()
      for (const col of ["lojistikShipmentTrip", "lojistikPurchaseOrder", "returnRmaRecord", "stockMovement", "eDocumentRecord"]) {
        for (const r of db[col] || []) {
          const dt = new Date(r.createdAt || r.plannedDepartureAt || r.dispatchDate || "2026-11-01")
          assert.ok(!Number.isNaN(dt.getTime()), `${col}:${r.id} geçersiz tarih`)
          assert.ok(dt.getTime() <= maxAllowed, `${col}:${r.id} Kasım 2026 üst sınırını aşıyor`)
        }
      }
    })

    // 2. Rollback -> Double Idempotent Seed -> Pre/Post StockBalance Eşitliği
    await step("Seed rollback + 2x idempotent çalıştırma & StockBalance öncesi/sonrası özdeşliği", async () => {
      const beforeBalances = await prisma.stockBalance.findMany({ orderBy: { id: "asc" } })
      const beforeSum = beforeBalances.reduce((s, b) => s + Number(b.onHandQty || 0), 0)

      const rb = rollbackAllLogisticsDemoSeeds({ createSafetyBackup: false })
      assert.equal(rb.preExistingIntegrityIntact, true)

      const s1 = await runAllLogisticsDemoSeeds({ createBackup: false })
      assert.equal(s1.preExistingIntegrityIntact, true)
      const s2 = await runAllLogisticsDemoSeeds({ createBackup: false })
      assert.equal(s2.preExistingIntegrityIntact, true)

      const f7Second = s2.modulesExecuted.find((m) => m.moduleKey === "faz7_final_ve_denetim")
      assert.ok(f7Second)
      const secondTotal = Object.values(f7Second.inserted).reduce((a, b) => a + b, 0)
      assert.equal(secondTotal, 0, "Faz 7 seed ikinci çalıştırmada 0 kayıt eklemeli.")

      const afterBalances = await prisma.stockBalance.findMany({ orderBy: { id: "asc" } })
      const afterSum = afterBalances.reduce((s, b) => s + Number(b.onHandQty || 0), 0)
      assert.equal(afterBalances.length, beforeBalances.length, "StockBalance satır sayısı özdeş kalmalı.")
      assert.equal(afterSum, beforeSum, "StockBalance toplam onHandQty değişmemeli.")
    })

    // 3. E2E Zincir 1a — e-POD -> Taslak E-Fatura (Kısmi / 0-teslimat / Tam) -> Tek Tıkla Kesim + Ayar Modları
    await step("E2E Zincir 1a: Kısmi teslimat -> Taslak E-Fatura -> Tek Tıkla Kesim (idempotent) + TESLIM_EDILEMEDI fatura yok + Timing Ayarı", async () => {
      const tripRes = await createDispatchTrip(
        {
          title: "Faz 7 E2E Fatura Zincir Seferi",
          originWarehouseId: "wh-merkez-01",
          vehicleId: "f5-veh-01",
          driverId: "f5-drv-01",
          plannedDepartureAt: "2026-11-17T08:00:00.000Z",
          stops: [
            {
              sourceType: "ERP_ORDER",
              sourceRefNo: "ORD-FAZ7-001",
              customerName: "Marmara Botanik Ltd.",
              addressText: "Nişantaşı Valikonağı Cad. No: 12 Şişli",
              cityDistrict: "Şişli",
              lat: 41.0522,
              lng: 28.9935,
              weightKg: 35,
              volumeM3: 0.4,
              palletCount: 1,
            },
            {
              sourceType: "MANUAL",
              sourceRefNo: "SVK-FAZ7-002",
              customerName: "Kapalı Adres Test",
              addressText: "Bebek Cevdetpaşa Cad. No: 99 Beşiktaş",
              cityDistrict: "Beşiktaş",
              lat: 41.0766,
              lng: 29.0434,
              weightKg: 20,
              volumeM3: 0.2,
              palletCount: 1,
            },
          ],
        },
        { userId: "user-admin", branchId: "local-debug-branch", username: "admin" }
      )

      const tripId = tripRes.trip.id
      const partialStop = tripRes.stops[0]
      const failStop = tripRes.stops[1]

      const approved = await approveTripAndTriggerEWaybill(tripId, { userId: "user-admin", username: "admin" })
      assert.ok(approved.eWaybillNo && approved.eWaybillNo.startsWith("IRS"), "Sefer onayında E-İrsaliye üretilmeli.")

      // Kısmi teslimat e-POD
      const podPartial = await submitStopDeliveryProof(
        {
          stopId: partialStop.id,
          captureMethod: "IMZA_CIZIM",
          recipientName: "Selin Yılmaz",
          deliveryStatus: "KISMI_TESLIM",
          deliveredItems: [{ sku: "GUL-EKV-01", itemName: "Ekvador Gülü", deliveredQty: 10, unitPrice: 120 }],
          signatureUrlOrDataUrl: TEST_POD_IMG_BASE64,
        },
        { userId: "user-admin", username: "admin" }
      )
      assert.ok(podPartial.draftInvoice?.id, "Kısmi teslimatta Taslak E-Fatura üretilmeli.")
      assert.equal(podPartial.draftInvoice.documentStatus, "TASLAK")
      assert.equal(podPartial.draftInvoice.totalNetAmount, 1200, "Yalnızca teslim edilen 10x120=1200 faturalanmalı.")

      // Kısmi teslimatta tekrar aynı durak -> yeni fatura üretilmemeli (idempotency)
      const podPartial2 = await submitStopDeliveryProof(
        {
          stopId: partialStop.id,
          captureMethod: "PIN_ONAY",
          recipientName: "Selin Yılmaz",
          deliveryStatus: "KISMI_TESLIM",
          deliveredItems: [{ sku: "GUL-EKV-01", itemName: "Ekvador Gülü", deliveredQty: 10, unitPrice: 120 }],
        },
        { userId: "user-admin", username: "admin" }
      )
      assert.equal(podPartial2.draftInvoice?.id, podPartial.draftInvoice.id, "İkinci e-POD aynı taslak faturayı korumalı.")

      // Tek Tıkla E-Fatura Kes + ikinci çağrı idempotent
      const issued1 = await issueOneClickSalesEInvoiceForStop(partialStop.id, { userId: "user-admin", username: "admin" })
      assert.equal(issued1.alreadyIssued, false)
      assert.equal(issued1.eDocument.documentStatus, "KESILDI")
      assert.equal(issued1.eDocument.gibStatusCode, "1300")

      const issued2 = await issueOneClickSalesEInvoiceForStop(partialStop.id, { userId: "user-admin", username: "admin" })
      assert.equal(issued2.alreadyIssued, true, "Tekrar tek tıkla kesim mükerrer fatura üretmemeli.")
      assert.equal(issued2.eDocument.id, issued1.eDocument.id)

      // İkinci durak TESLIM_EDILEMEDI -> 0 fatura
      await driverUpdateTripOrStopExecution(
        {
          stopId: failStop.id,
          status: "TESLIM_EDILEMEDI",
          failureReasonCode: "ALICI_ADRESTE_YOK",
        },
        { userId: "user-admin", username: "admin" }
      )
      const failStopAfter = await (prisma as any).lojistikShipmentStop.findUnique({ where: { id: failStop.id } })
      assert.equal(failStopAfter.eInvoiceId ?? null, null, "TESLIM_EDILEMEDI durakta E-Fatura kesilmemeli.")

      // Yapılandırılabilir E-Fatura zamanlama modu (MANUAL_ONLY -> otomatik taslak üretilmemeli)
      const prevCfg = getSystemConfig()
      saveSystemConfig({
        logisticsInvoiceTiming: {
          mode: "MANUAL_ONLY",
          allowPartialDeliveryDraft: true,
          defaultVatRate: 20,
        },
      })
      const manualTripRes = await createDispatchTrip(
        {
          title: "Faz 7 Manual Mod Seferi",
          originWarehouseId: "wh-merkez-01",
          vehicleId: "f5-veh-06",
          driverId: "f5-drv-06",
          plannedDepartureAt: "2026-11-17T09:00:00.000Z",
          stops: [
            {
              sourceType: "MANUAL",
              sourceRefNo: "SVK-MANUAL-01",
              customerName: "Manual Test Alıcısı",
              addressText: "Kadıköy Moda Cad. No: 5",
              lat: 40.985,
              lng: 29.029,
              weightKg: 10,
              volumeM3: 0.1,
              palletCount: 1,
            },
          ],
        },
        { userId: "user-admin", branchId: "local-debug-branch", username: "admin" }
      )
      const manualPod = await submitStopDeliveryProof(
        {
          stopId: manualTripRes.stops[0].id,
          captureMethod: "PIN_ONAY",
          recipientName: "Moda Alıcı",
          deliveryStatus: "TESLIM_EDILDI",
        },
        { userId: "user-admin", username: "admin" }
      )
      assert.equal(manualPod.draftInvoice, null, "MANUAL_ONLY modunda otomatik E-Fatura taslağı oluşmamalı.")
      saveSystemConfig(prevCfg)
    })

    // 4. E2E Zincir 1b — Satınalma PO -> ASN -> Mal Kabul -> Otomatik Kalite -> Skor Kartı
    await step("E2E Zincir 1b: Satınalma (PO) -> ASN -> WMS Mal Kabul -> Otomatik RECEIVING Kalite & Skor Kartı", async () => {
      const openPos: any[] = await (prisma as any).lojistikPurchaseOrder.findMany({ include: { lines: true } })
      const targetPo = openPos.find(
        (p) => !["TESLIM_ALINDI", "TAMAMLANDI", "IPTAL"].includes(p.status) && Array.isArray(p.lines) && p.lines.length > 0
      )
      assert.ok(targetPo, "Test için açık bir PO bulunmalı.")
      const line = targetPo.lines[0]
      const acceptQty = Math.min(5, Math.max(1, Number(line.orderedQty || 5) - Number(line.receivedQty || 0)))

      const asnRes = await createSupplierAsn(
        {
          poId: targetPo.id,
          supplierId: targetPo.supplierId,
          warehouseId: targetPo.warehouseId,
          expectedArrivalAt: "2026-11-17T10:00:00.000Z",
          lines: [{ poLineId: line.id, itemId: line.itemId, shippedQty: acceptQty }],
        },
        "admin"
      )
      assert.ok(asnRes?.id, "ASN kaydı oluşturulmalı.")

      const qcBefore = await prisma.uretimQualityInspection.findMany({ where: { purchaseOrderId: targetPo.id } })
      await receiveAsnIntoWms({
        asnId: asnRes.id,
        performedBy: "admin",
        linesOverride: [{ itemId: line.itemId, receivedGoodQty: acceptQty, damagedQty: 0 }],
      })
      const asnAfter = await (prisma as any).lojistikSupplierAsn.findUnique({ where: { id: asnRes.id } })
      assert.equal(asnAfter?.status, "KABUL_TAMAM", "Mal kabul sonrası ASN KABUL_TAMAM olmalı.")

      const qcAfter = await prisma.uretimQualityInspection.findMany({ where: { purchaseOrderId: targetPo.id } })
      assert.ok(
        qcAfter.length >= qcBefore.length && qcAfter.some((q: any) => q.inspectionType === "RECEIVING"),
        "Mal kabul sonrası RECEIVING kalite kontrol kaydı oluşmalı."
      )

      const snap = await (prisma as any).lojistikSupplierScoreSnapshot.findFirst({
        where: { supplierId: targetPo.supplierId },
      })
      assert.ok(snap && typeof snap.compositeScore === "number", "Tedarikçi skor snapshot güncellenmiş olmalı.")
    })

    // 5. E2E Zincir 1c — Sipariş/RMA Lookup -> Sevkiyat Eşleşmesi -> Karantina -> KK Kararı -> Alacak Dekontu
    await step("E2E Zincir 1c: Sipariş -> RMA (sevkiyat eşleşmeli) -> Karantina -> KK Kararı & Finans", async () => {
      const lookup: any = await lookupOrderForRma({ orderNumber: "OMN-2026-9041", orderSourceType: "OMNICHANNEL" })
      assert.ok(lookup.found, "OMN-2026-9041 bulunmalı.")
      assert.ok(lookup.shipmentTripId, "Omnichannel sipariş lookup'ında shipmentTripId dönmeli.")

      const rma = await createRmaDocument(
        {
          orderNumber: "OMN-2026-9041",
          orderSourceType: "OMNICHANNEL",
          reasonCode: "HASARLI_KARGO",
          reasonNote: "Faz 7 E2E karantina test talebi",
          deliveredAt: "2026-11-15T10:00:00.000Z",
          lines: [{ sku: "GUL-EKV-01", itemName: "Ekvador Gülü", requestedQty: 2, unitPrice: 120 }],
        },
        "user-admin",
        "admin"
      )
      assert.ok(rma.rma?.id)

      await receiveRmaIntoQuarantine({ rmaId: rma.rma.id, warehouseId: "wh-merkez-01", actorName: "admin" })
      const decided = await decideRmaInspection({
        rmaId: rma.rma.id,
        decision: "REPAIR_REFURBISH",
        warehouseId: "wh-merkez-01",
        targetBinCode: "Q-01-01",
        inspectorNote: "Faz 7 kalite karantina/onarım testi",
        actorUserId: "user-admin",
        actorName: "admin",
      })
      assert.equal(decided.rma.qualityDecision, "REPAIR_REFURBISH")

      const cnDraft = await processCreditNoteAction({
        action: "REQUEST_DRAFT",
        rmaId: rma.rma.id,
        actorUserId: "user-admin",
        actorName: "admin",
      })
      assert.ok(cnDraft.creditNote?.id, "Alacak dekontu taslağı oluşmalı.")
      const cnApproved = await processCreditNoteAction({
        action: "APPROVE",
        creditNoteId: cnDraft.creditNote.id,
        actorUserId: "user-admin",
        actorName: "admin",
      })
      assert.equal(cnApproved.creditNote?.status, "ONAYLANDI")
      assert.ok(cnApproved.creditNote?.financeId, "Onaylı alacak dekontu finans kaydı üretmeli.")
    })

    // 6. E2E Zincir 1d — Kritik Araç Arızası/Bakım -> Açık Seferi Silmeden Uyarı + Planlama Engeli
    await step("E2E Zincir 1d: Araç kritik arıza/bakım -> açık seferi koruyarak uyarı işareti & yeni planlamadan dışlama", async () => {
      // f5-veh-02 -> f6-trip-02 (ONAYLANDI) üzerinde açık sefer var
      const tripBefore = await (prisma as any).lojistikShipmentTrip.findUnique({ where: { id: "f6-trip-02" } })
      const stopsBefore = await (prisma as any).lojistikShipmentStop.findMany({ where: { tripId: "f6-trip-02" } })
      assert.equal(tripBefore.vehicleId, "f5-veh-02")

      const faultRes = await createFleetFaultAndOptionalWorkOrder(
        {
          vehicleId: "f5-veh-02",
          severity: "CRITICAL",
          category: "FRIGO",
          title: "Soğutucu Ünite Kompresör Basınç Uyarısı (E2E)",
          createWorkOrder: true,
        },
        { userId: "user-admin" }
      )
      assert.ok(faultRes.workOrder?.id)

      const tripDuring = await (prisma as any).lojistikShipmentTrip.findUnique({ where: { id: "f6-trip-02" } })
      const stopsDuring = await (prisma as any).lojistikShipmentStop.findMany({ where: { tripId: "f6-trip-02" } })
      assert.equal(stopsDuring.length, stopsBefore.length, "Açık sefer durakları ASLA silinmemeli.")
      assert.ok(tripDuring.maintenanceImpactWarning, "Açık sefere maintenanceImpactWarning eklenmeli.")

      // Yeni manuel sefer açmaya çalışınca engellenmeli
      let blockedErr: any = null
      try {
        await createDispatchTrip(
          {
            title: "Arızalı Araç Engel Testi",
            originWarehouseId: "wh-merkez-01",
            vehicleId: "f5-veh-02",
            driverId: "f5-drv-02",
            plannedDepartureAt: "2026-11-17T10:00:00.000Z",
            stops: [{ customerName: "Test", addressText: "İstanbul", lat: 41.01, lng: 28.98, weightKg: 10 }],
          },
          { userId: "user-admin", branchId: "local-debug-branch", username: "admin" }
        )
      } catch (e) {
        blockedErr = e
      }
      assert.ok(blockedErr && blockedErr.code === "DRIVER_VEHICLE_INCOMPATIBLE", "Arızalı araç yeni sefere atanmamalı.")

      // Otomatik çoklu araç planlama arızalı f5-veh-02'yi kullanmamalı
      const autoRes = await runMultiVehicleAutoPlanAndPersist(
        {
          originWarehouseId: "wh-merkez-01",
          stopItems: [{ customerName: "Auto Test", addressText: "Kadıköy", lat: 40.98, lng: 29.03, weightKg: 15, volumeM3: 0.2, palletCount: 1 }],
          vehicleIds: ["f5-veh-02", "f5-veh-01"],
          persistTrips: false,
        },
        { userId: "user-admin", branchId: "local-debug-branch" }
      )
      assert.ok(autoRes.plan.trips.length >= 1, "Uygun sağlıklı araçla otomatik plan oluşturulmalı.")
      assert.ok(autoRes.plan.trips.every((t: any) => t.vehicleId !== "f5-veh-02"), "Oto planlayıcı arızalı aracı dışlamalı.")

      // İş emri önce IN_PROGRESS sonra COMPLETED -> uyarı kalkmalı
      await updateFleetWorkOrderStatus({
        workOrderId: faultRes.workOrder.id,
        nextStatus: "IN_PROGRESS",
        actorUserId: "user-admin",
      })
      await updateFleetWorkOrderStatus({
        workOrderId: faultRes.workOrder.id,
        nextStatus: "COMPLETED",
        downtimeMinutes: 45,
        actorUserId: "user-admin",
      })
      const tripResolved = await (prisma as any).lojistikShipmentTrip.findUnique({ where: { id: "f6-trip-02" } })
      assert.equal(tripResolved.maintenanceImpactWarning ?? null, null, "İş emri bitince maintenanceImpactWarning temizlenmeli.")
    })

    // 7. Rol Bazlı Yönetim Özeti
    await step("Görev 2: Rol bazlı /dashboard Lojistik Yönetim Özeti doğruluğu ve yetki izolasyonu", async () => {
      const adminSummary = await getLogisticsExecutiveSummaryForUser({
        userId: "user-admin",
        username: "admin",
      })
      assert.deepEqual(
        adminSummary.permittedModules.sort(),
        ["filo", "iade", "satinalma", "sevkiyat", "wms"],
        "Super Admin tüm 5 modülü görmeli."
      )
      assert.ok((adminSummary.modules.wms?.totalOnHandQty || 0) > 0)
      assert.ok((adminSummary.modules.filo?.totalVehicles || 0) >= 15)

      // Yetkisiz iç kullanıcı (kreatif) -> 0 modül
      const noPermSummary = await getLogisticsExecutiveSummaryForUser({
        userId: "user-copywriter",
        username: "cem.aslan",
      })
      assert.equal(noPermSummary.permittedModules.length, 0)
      assert.deepEqual(noPermSummary.modules, {})

      // Tedarikçi kapsamlı kullanıcı -> 403
      let supErr: any = null
      try {
        await getLogisticsExecutiveSummaryForUser({
          userId: "user-tedarikci-flora",
          username: "tedarikci.royal",
        })
      } catch (e) {
        supErr = e
      }
      assert.ok(supErr && supErr.status === 403)
    })

    // 8. Bildirim Kuralları (6/6 Kural + İdempotency + Kullanıcı Tercihleri)
    await step("Görev 3: 6 Akıllı Bildirim Kuralı tetikleme, 24s idempotency ve kullanıcı tercihleri", async () => {
      // Tüm kurallar için aktif koşul sağlamak adına geçici kritik stok düşük seviye öğesi ekle
      const lowItem = await prisma.inventoryItem.findUnique({ where: { id: "item-arj-07" } })
      await prisma.inventoryItem.update({
        where: { id: "item-arj-07" },
        data: { minStockLevel: 500 },
      })

      // Mevcut demo bildirimlerini temizleyip temiz değerlendirme test edelim
      await prisma.notification.deleteMany({ where: { moduleType: "lojistik" } })

      // Kullanıcı tercihini varsayılana (NULL = 6/6 aktif) çek
      await (prisma as any).user.update({
        where: { id: "user-admin" },
        data: { logisticsNotificationPrefsJson: null },
      })
      const defaultPrefs = parseUserLogisticsNotificationPrefs(null)
      assert.equal(ALL_LOGISTICS_ALERT_RULE_KEYS.every((k) => defaultPrefs.rules[k] === true), true)

      const eval1 = await evaluateAndDispatchLogisticsAlerts({
        now: new Date("2026-11-17T12:00:00.000Z"),
        recipientUserIds: ["user-admin"],
      })
      for (const k of ALL_LOGISTICS_ALERT_RULE_KEYS) {
        assert.ok(eval1.byRule[k].detected >= 1, `${k} kuralı en az 1 canlı uyarı saptamalı.`)
      }
      assert.ok(eval1.dispatchesCreated >= 6, "6/6 kuraldan en az 6 bildirim gönderilmiş olmalı.")

      // Aynı 24 saat içinde 2. çalışma -> 0 yeni bildirim (idempotency)
      const eval2 = await evaluateAndDispatchLogisticsAlerts({
        now: new Date("2026-11-17T13:00:00.000Z"),
        recipientUserIds: ["user-admin"],
      })
      assert.equal(eval2.dispatchesCreated, 0, "24 saat içinde tekrar çalıştırmada mükerrer bildirim atılmamalı.")
      assert.ok(eval2.skippedByDedup >= 6)

      // 1 kuralı kapatıp bildirimleri silerek yalnızca o kuralın atlandığını doğrula
      const updatedPrefs = mergeUserLogisticsNotificationPrefs(null, {
        rules: { ANOMALOUS_FUEL_CONSUMPTION: false },
      })
      await (prisma as any).user.update({
        where: { id: "user-admin" },
        data: { logisticsNotificationPrefsJson: JSON.stringify(updatedPrefs) },
      })
      await prisma.notification.deleteMany({ where: { moduleType: "lojistik" } })
      const eval3 = await evaluateAndDispatchLogisticsAlerts({
        now: new Date("2026-11-17T14:00:00.000Z"),
        recipientUserIds: ["user-admin"],
      })
      assert.equal(eval3.byRule.ANOMALOUS_FUEL_CONSUMPTION.dispatched, 0, "Kapalı kural bildirim göndermemeli.")
      assert.ok(eval3.byRule.DELAYED_SHIPMENT.dispatched >= 1, "Açık kurallar bildirim göndermeye devam etmeli.")

      if (lowItem) {
        await prisma.inventoryItem.update({
          where: { id: "item-arj-07" },
          data: { minStockLevel: lowItem.minStockLevel },
        })
      }
    })

    // 9. Raporlar + Excel (.xlsx) & PDF (.pdf) + Bayrak/RBAC Kapıları
    await step("Görev 4: 5 Modül Raporu + gerçek XLSX/PDF buffer üretimi ve özellik bayrağı/RBAC 403 doğrulaması", async () => {
      for (const def of LOGISTICS_REPORT_MODULE_DEFS) {
        const report = await generateLogisticsReport(def.key)
        assert.ok(report.rows.length > 0, `${def.key} raporunda en az 1 satır dönmeli.`)
        assert.ok(report.summaryCards.length === 4, `${def.key} özet kartları eksik.`)

        const xlsxBuf = exportLogisticsReportToExcelBuffer(report)
        assert.equal(xlsxBuf.subarray(0, 2).toString("utf8"), "PK", `${def.key} geçerli XLSX ZIP başlığı taşımalı.`)
        const parsedWb = XLSX.read(xlsxBuf, { type: "buffer" })
        assert.ok(parsedWb.SheetNames.includes("Yönetici Özeti"))
        assert.ok(parsedWb.SheetNames.includes("Detay Tablosu"))

        const pdfBuf = exportLogisticsReportToPdfBuffer(report)
        assert.equal(pdfBuf.subarray(0, 5).toString("utf8"), "%PDF-", `${def.key} geçerli PDF %PDF- başlığı taşımalı.`)
        assert.ok(pdfBuf.length > 900, `${def.key} PDF boyutu anlamlı olmalı.`)
      }

      // Yetkisiz kullanıcı 403
      let unauthErr: any = null
      try {
        await assertReportModuleAccess({ userId: "user-copywriter", username: "cem.aslan" }, "filo")
      } catch (e) {
        unauthErr = e
      }
      assert.ok(unauthErr && unauthErr.status === 403)

      // Bayrak kapalıyken 403 FEATURE_DISABLED
      process.env.DISABLE_DEMO_MODE = "true"
      process.env.FEATURE_LOJISTIK_FILO = "false"
      let flagErr: any = null
      try {
        await assertReportModuleAccess({ userId: "user-admin", username: "admin" }, "filo")
      } catch (e) {
        flagErr = e
      }
      assert.ok(flagErr && flagErr.status === 403 && flagErr.code === "FEATURE_DISABLED")
    })
  } finally {
    const podDir = path.join(process.cwd(), "storage", "logistics-pods")
    if (fs.existsSync(podDir)) {
      for (const file of fs.readdirSync(podDir)) {
        if (file.startsWith("pods-")) fs.rmSync(path.join(podDir, file), { force: true })
      }
    }
    if (savedEnv.FEATURE_LOJISTIK_FILO === undefined) delete process.env.FEATURE_LOJISTIK_FILO
    else process.env.FEATURE_LOJISTIK_FILO = savedEnv.FEATURE_LOJISTIK_FILO
    if (savedEnv.FEATURE_LOJISTIK_ALL === undefined) delete process.env.FEATURE_LOJISTIK_ALL
    else process.env.FEATURE_LOJISTIK_ALL = savedEnv.FEATURE_LOJISTIK_ALL
    if (savedEnv.DISABLE_DEMO_MODE === undefined) delete process.env.DISABLE_DEMO_MODE
    else process.env.DISABLE_DEMO_MODE = savedEnv.DISABLE_DEMO_MODE
    if (savedEnv.LOJISTIK_EFATURA_TIMING_MODE === undefined) delete process.env.LOJISTIK_EFATURA_TIMING_MODE
    else process.env.LOJISTIK_EFATURA_TIMING_MODE = savedEnv.LOJISTIK_EFATURA_TIMING_MODE

    if (snapshotRaw !== null) fs.writeFileSync(DB_PATH, snapshotRaw)
    if (sysCfgRaw !== null) fs.writeFileSync(SYS_CFG_PATH, sysCfgRaw)
  }

  console.log(`\n🎉 FAZ 7 UÇTAN UCA ENTEGRASYON & VERİ BÜTÜNLÜĞÜ PAKETİ BAŞARILI (${passed}/${passed})`)
}

runSuite()
  .catch((err) => {
    console.error("❌ FAZ 7 TEST HATASI:", err)
    process.exit(1)
  })
  .then(() => process.exit(0))
