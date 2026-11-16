/**
 * Lojistik Faz 4 (Tersine Lojistik, İade/RMA, El Terminali Kabul, Kalite/Karantina,
 * Kredi Notası, HMAC Webhook & İade Analitiği) — Kapsamlı Doğrulama Paketi
 *
 * Çalıştırma:
 *   npx cross-env SUNUM_DISABLE_CRON=1 npx tsx scripts/test-lojistik-faz4-iade.ts
 */

process.env.SUNUM_DISABLE_CRON = "1"

import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { prisma } from "@/lib/db"
import { validateAllLogisticsMigrations } from "@/lib/services/migrationStrategyService"
import { isDemoEnvironment } from "@/lib/config/production-feature-flags"
import { LogisticsDomainError, assertSupplierRecordAccess } from "@/lib/logistics/security"
import {
  canTransitionRmaStatus,
  evaluateReturnEligibility,
  isRmaEligibleForRefundTrigger,
  lookupOrderForRma,
  createRmaDocument,
  transitionRmaStatus,
  generateRmaLabelPayload,
  upsertReturnPolicy,
  decideRmaInspection,
  processCreditNoteAction,
  getConfiguredWebhookSecret,
  signReturnWebhookPayload,
  ingestSecureReturnWebhook,
  getReturnsAnalyticsReport,
} from "@/lib/logistics/returns"
import { processOfflineBatchWithConflictCheck } from "@/lib/logistics/wms/operationsEngine"
import {
  LogisticsSeedEnvironmentError,
  assertLogisticsDemoSeedAllowed,
} from "@/lib/logistics/seed/framework"
import {
  rollbackAllLogisticsDemoSeeds,
  runAllLogisticsDemoSeeds,
} from "@/lib/logistics/seed"

const DB_PATH = path.join(process.cwd(), "storage", "ajans-kutuphanesi", ".local-db.json")

async function expectDomainError(
  fn: () => Promise<any>,
  expectedCode: string,
  label: string
) {
  let caught: any = null
  try {
    await fn()
  } catch (err: any) {
    caught = err
  }
  assert.ok(caught, `${label}: hata fırlatılması beklendi.`)
  assert.equal(
    caught.code,
    expectedCode,
    `${label}: beklenen kod '${expectedCode}', gelen '${caught.code || caught.message}'`
  )
}

async function runSuite() {
  const snapshotRaw = fs.existsSync(DB_PATH) ? fs.readFileSync(DB_PATH) : null
  let passed = 0

  const check = async (name: string, fn: () => Promise<void> | void) => {
    await fn()
    passed++
    console.log(`✅ [${passed}] ${name}`)
  }

  try {
    // 1. Additive migration & rollback SQL
    await check("Faz 1–4 SQL Migration & Rollback bütünlüğü", () => {
      const results = validateAllLogisticsMigrations()
      assert.equal(results.length, 4, "Tam 4 lojistik migration bekleniyordu.")
      for (const r of results) {
        assert.equal(r.valid, true, `Migration '${r.migrationName}' geçersiz: ${r.errors.join("; ")}`)
      }
    })

    // 2. Saf yardımcılar: durum makinesi, 14 gün yasal süre ve mali sert blok
    await check("Saf yardımcılar: RMA durum geçişleri, 14 gün sayacı ve mali uygunluk kontrolü", () => {
      assert.equal(canTransitionRmaStatus("TALEP", "ONAYLANDI"), true)
      assert.equal(canTransitionRmaStatus("TALEP", "KAPANDI"), false)
      assert.equal(
        isRmaEligibleForRefundTrigger({ rmaStatus: "YOLDA", receivedAt: null, qualityDecision: null }),
        false
      )
      assert.equal(
        isRmaEligibleForRefundTrigger({
          rmaStatus: "KARARA_BAGLANDI",
          receivedAt: new Date().toISOString(),
          qualityDecision: "RESTOCK_TO_BIN",
        }),
        true
      )

      const now = new Date("2026-11-16T12:00:00.000Z")
      const expSoon = evaluateReturnEligibility({
        deliveredAt: new Date("2026-11-04T12:00:00.000Z"),
        policyReturnDays: 14,
        referenceNow: now,
      })
      assert.equal(expSoon.isWithinReturnWindow, true)
      assert.equal(expSoon.isExpiringSoon, true)
      assert.equal(expSoon.remainingDays, 2)
    })

    // 3. Politika kuralları (yasal asgari 14 gün altı reddedilir)
    await check("İade politikası <14 gün reddi ve >=14 gün kayıt doğrulaması", async () => {
      await expectDomainError(
        () =>
          upsertReturnPolicy({
            policyKey: "TEST_BAD_7",
            title: "Geçersiz 7 Gün Politikası",
            returnWindowDays: 7,
          }),
        "INVALID_RETURN_POLICY",
        "14 günden az politika reddedilmeli"
      )

      const saved = await upsertReturnPolicy({
        policyKey: "TEST_POLICY_21",
        title: "Test 21 Gün İade + 6 Ay Garanti",
        category: "TestKategori",
        returnWindowDays: 21,
        warrantyMonths: 6,
      })
      assert.equal(saved.returnWindowDays, 21)
      assert.equal(saved.warrantyMonths, 6)
    })

    // 4. Çift sipariş kaynağı + satılandan fazla iade engeli + süre istisna onayı
    let createdRmaId = ""
    let createdRmaNo = ""
    await check("Omnichannel & ERP sipariş sorgulama, satılandan fazla iade engeli & çok kalemli RMA", async () => {
      const omn = await lookupOrderForRma({ orderNumber: "OMN-2026-9041" })
      assert.equal(omn.found, true)
      assert.equal(omn.orderSourceType, "OMNICHANNEL")
      assert.ok((omn.lines?.length || 0) >= 2)

      const erp = await lookupOrderForRma({ orderNumber: "ORD-2026-0101" })
      assert.equal(erp.found, true)
      assert.equal(erp.orderSourceType, "ERP_ORDER")

      await expectDomainError(
        () =>
          createRmaDocument({
            orderNumber: "OMN-2026-9041",
            reasonCode: "CAYMA_HAKKI",
            lines: [{ sku: "VAZ-ANT-03", requestedQty: 999 }],
          }),
        "EXCEEDS_SOLD_QUANTITY",
        "Satılandan fazla iade engellenmeli"
      )

      // Süre dolmuş talep: istisna onaysız reddedilmeli
      await expectDomainError(
        () =>
          createRmaDocument({
            orderNumber: "OMN-2026-9041",
            reasonCode: "CAYMA_HAKKI",
            deliveredAt: new Date(Date.now() - 45 * 86_400_000).toISOString(),
            lines: [{ sku: "GUL-EKV-01", requestedQty: 1 }],
          }),
        "RETURN_WINDOW_EXPIRED",
        "Süresi dolan iade istisna onaysız reddedilmeli"
      )

      const res = await createRmaDocument(
        {
          orderNumber: "OMN-2026-9041",
          reasonCode: "HASARLI_KARGO",
          reasonNote: "Faz 4 E2E test iadesi",
          returnTrackingNo: "TRK-FAZ4-E2E-1",
          deliveredAt: new Date(Date.now() - 3 * 86_400_000).toISOString(),
          idempotencyKey: "faz4-test-create-1",
          lines: [
            { sku: "GUL-EKV-01", requestedQty: 2, lotNumber: "LOT-GUL-2611-EARLY" },
            { sku: "VAZ-ANT-03", requestedQty: 1 },
          ],
        },
        "test-admin",
        "Test Admin"
      )
      assert.equal(res.duplicate, false)
      assert.equal(res.rma.rmaStatus, "TALEP")
      assert.equal(res.rma.lines.length, 2)
      createdRmaId = res.rma.id
      createdRmaNo = res.rma.rmaNumber

      // Idempotency dedup
      const dup = await createRmaDocument({
        orderNumber: "OMN-2026-9041",
        reasonCode: "HASARLI_KARGO",
        idempotencyKey: "faz4-test-create-1",
        lines: [{ sku: "GUL-EKV-01", requestedQty: 2 }],
      })
      assert.equal(dup.duplicate, true)
      assert.equal(dup.rma.id, createdRmaId)
    })

    // 5. Durum geçişleri, etiket üretimi & mal kabul öncesi mali blok
    await check("Durum geçişleri, QR/Code-128 etiket üretimi ve mal kabul öncesi mali sert blok", async () => {
      await expectDomainError(
        () => processCreditNoteAction({ action: "REQUEST_DRAFT", rmaId: createdRmaId }),
        "REFUND_BLOCKED_BEFORE_RECEIPT_AND_DECISION",
        "Mal kabul ve kalite kararı olmadan kredi notası engellenmeli"
      )

      await expectDomainError(
        () => transitionRmaStatus({ rmaId: createdRmaId, toStatus: "KAPANDI" }),
        "INVALID_RMA_TRANSITION",
        "TALEP -> KAPANDI geçersiz geçiş engellenmeli"
      )

      await transitionRmaStatus({
        rmaId: createdRmaId,
        toStatus: "ONAYLANDI",
        actorUserId: "test-admin",
        actorName: "Test Admin",
      })
      await transitionRmaStatus({
        rmaId: createdRmaId,
        toStatus: "YOLDA",
        actorUserId: "test-admin",
        actorName: "Test Admin",
      })

      const label = await generateRmaLabelPayload(createdRmaId)
      assert.equal(label.rmaNumber, createdRmaNo)
      assert.ok(label.qrSvg.includes("<svg"))
      assert.ok(label.barcodeValue.startsWith("RMA|"))
    })

    // 6. El terminali RMA_RETURN_RECEIPT & Karantina Stok Defteri & Idempotency
    await check("El terminali RMA_RETURN_RECEIPT mal kabul, karantina stoku ve idempotency", async () => {
      const batch = await processOfflineBatchWithConflictCheck({
        deviceId: "ZEBRA-TEST-01",
        operatorName: "Saha Operatörü",
        queueItems: [
          {
            idempotencyKey: "faz4-handheld-rcpt-01",
            operationType: "RMA_RETURN_RECEIPT",
            queuedAt: new Date().toISOString(),
            payload: {
              rmaId: createdRmaId,
              codeScanned: `RMA|${createdRmaNo}`,
              binCode: "Q-01-01",
              scanMethod: "CAMERA",
            },
          },
          {
            idempotencyKey: "faz4-handheld-rcpt-01",
            operationType: "RMA_RETURN_RECEIPT",
            queuedAt: new Date().toISOString(),
            payload: {
              rmaId: createdRmaId,
              codeScanned: `RMA|${createdRmaNo}`,
              binCode: "Q-01-01",
              scanMethod: "CAMERA",
            },
          },
        ],
      })

      assert.equal(batch.syncedCount, 1)
      assert.equal(batch.duplicateCount, 1)
      assert.equal(batch.conflictCount, 0)

      const updated = await (prisma as any).returnRmaRecord.findUnique({
        where: { id: createdRmaId },
      })
      assert.equal(updated.rmaStatus, "TESLIM_ALINDI")
      assert.equal(updated.receivedBinCode, "Q-01-01")
    })

    // 7. Kalite kararı (FEFO/SKT reddi, RTV + NCR + Skor Kartı, RESTOCK) & Kredi Notası -> Finance + EDocument
    await check("Kalite kararı (RETURN_TO_VENDOR + NCR + Skor Kartı) ve Kredi Notası / E-Belge / Finans", async () => {
      // Süresi geçmiş lot RESTOCK engellenmeli
      const rmaExpiredLot = await createRmaDocument({
        orderNumber: "OMN-2026-9043",
        reasonCode: "SKT_SORUNU",
        deliveredAt: new Date().toISOString(),
        lines: [{ sku: "GUL-EKV-01", requestedQty: 1, lotNumber: "LOT-GUL-2026-A" }],
      })
      await processOfflineBatchWithConflictCheck({
        deviceId: "ZEBRA-TEST-02",
        operatorName: "Operatör",
        queueItems: [
          {
            idempotencyKey: "faz4-handheld-exp-02",
            operationType: "RMA_RETURN_RECEIPT",
            queuedAt: new Date().toISOString(),
            payload: { rmaId: rmaExpiredLot.rma.id, binCode: "Q-01-01" },
          },
        ],
      })
      // LOT-GUL-2026-A son kullanma tarihi 2026-11-10 -> bugünden eski -> RESTOCK engellenmeli
      await expectDomainError(
        () =>
          decideRmaInspection({
            rmaId: rmaExpiredLot.rma.id,
            decision: "RESTOCK_TO_BIN",
          }),
        "EXPIRED_LOT_CANNOT_RESTOCK",
        "SKT geçmiş lot yeniden satışa alınamamalı"
      )

      // RTV kararı -> QC + NCR + Tedarikçi Skor Kartı
      const decRes = await decideRmaInspection({
        rmaId: createdRmaId,
        decision: "RETURN_TO_VENDOR",
        supplierId: "sup-holland-01",
        severity: "MAJOR",
        inspectorNote: "Tedarikçiye iade testi",
        actorUserId: "test-qa",
        actorName: "Kalite Uzmanı",
      })
      assert.equal(decRes.rma.rmaStatus, "KARARA_BAGLANDI")
      assert.equal(decRes.rma.qualityDecision, "RETURN_TO_VENDOR")
      assert.ok(decRes.inspection?.id)
      assert.ok(decRes.ncr?.id)
      assert.ok(decRes.updatedScorecard)

      // Mali Kredi Notası: Taslak -> Onayla -> Öde & Kapat
      const draft = await processCreditNoteAction({
        action: "REQUEST_DRAFT",
        rmaId: createdRmaId,
        actorUserId: "test-fin",
        actorName: "Mali İşler",
      })
      assert.equal(draft.creditNote.status, "TASLAK_ONAY_BEKLIYOR")

      const paid = await processCreditNoteAction({
        action: "ISSUE_AND_PAY",
        creditNoteId: draft.creditNote.id,
        closeRma: true,
        actorUserId: "test-fin",
        actorName: "Mali İşler",
      })
      assert.equal(paid.creditNote.status, "IADE_ODENDI")
      assert.ok(paid.eDocument?.documentNo)
      assert.ok(paid.financeRecord?.id)
      assert.equal(paid.rma.rmaStatus, "KAPANDI")
    })

    // 8. HMAC Webhook imza doğrulama, sahteleme reddi & idempotency
    await check("E-Ticaret İade Webhook HMAC-SHA256 doğrulama, imza sahteleme reddi & idempotency", async () => {
      const payloadObj = {
        event: "RETURN_REQUEST",
        channelCode: "TRENDYOL",
        orderNumber: "OMN-2026-9042",
        customerName: "Borusan Lojistik Dağıtım A.Ş.",
        sku: "LIL-KAZ-02",
        quantity: 1,
        reasonCode: "HASARLI_KARGO",
        idempotencyKey: "wh-test-hmac-001",
      }
      const rawBody = JSON.stringify(payloadObj)
      const secret = getConfiguredWebhookSecret("TRENDYOL")
      const validSig = signReturnWebhookPayload(rawBody, secret)

      await expectDomainError(
        () =>
          ingestSecureReturnWebhook({
            channelCode: "TRENDYOL",
            rawBody,
            payload: payloadObj,
            signatureHeader: "sha256=deadbeefdeadbeef",
          }),
        "WEBHOOK_SIGNATURE_INVALID",
        "Sahte HMAC imza reddedilmeli"
      )

      const first = await ingestSecureReturnWebhook({
        channelCode: "TRENDYOL",
        rawBody,
        payload: payloadObj,
        signatureHeader: validSig,
      })
      assert.equal(first.accepted, true)
      assert.equal(first.duplicate, false)

      const second = await ingestSecureReturnWebhook({
        channelCode: "TRENDYOL",
        rawBody,
        payload: payloadObj,
        signatureHeader: validSig,
      })
      assert.equal(second.duplicate, true)
      assert.equal(second.rmaNumber, first.rmaNumber)
    })

    // 9. Canlı İade Analitiği & Güvenlik / Demo Mod Kilidi
    await check("Canlı İade Analitiği, Tedarikçi kapsam engeli (403) & Demo Mod Kilidi", async () => {
      const analytics = await getReturnsAnalyticsReport()
      assert.ok(analytics.totalRmas >= 1)
      assert.ok(Array.isArray(analytics.byReason))
      assert.ok(Array.isArray(analytics.byProduct))
      assert.ok(Array.isArray(analytics.bySupplier))

      assert.throws(
        () =>
          assertSupplierRecordAccess(
            {
              userId: "u-sup",
              username: "tedarikci.royal",
              supplierId: "sup-holland-01",
              isSupplierScoped: true,
              branchId: "local-debug-branch",
              roleNames: ["Tedarikçi"],
              isSuperAdmin: false,
              isPlatformDeveloper: false,
            },
            "sup-yalova-02"
          ),
        (err: any) => err instanceof LogisticsDomainError && err.status === 403
      )

      const prev = process.env.DISABLE_DEMO_MODE
      try {
        process.env.DISABLE_DEMO_MODE = "true"
        assert.equal(isDemoEnvironment(), false)
        assert.throws(() => assertLogisticsDemoSeedAllowed(), LogisticsSeedEnvironmentError)
      } finally {
        if (prev === undefined) delete process.env.DISABLE_DEMO_MODE
        else process.env.DISABLE_DEMO_MODE = prev
      }
    })

    // 10. Faz 4 Demo Seed idempotency & rollback doğrulaması
    await check("Faz 4 Demo Seed idempotency, bütünlük ve tek komutla geri alma (rollback)", async () => {
      const r1 = await runAllLogisticsDemoSeeds({ createBackup: false })
      assert.equal(r1.preExistingIntegrityIntact, true)
      const f4First = r1.modulesExecuted.find((m) => m.moduleKey === "faz4_iade_ve_rma")
      assert.ok(f4First, "faz4_iade_ve_rma seed modülü çalışmalı")

      const r2 = await runAllLogisticsDemoSeeds({ createBackup: false })
      const f4Second = r2.modulesExecuted.find((m) => m.moduleKey === "faz4_iade_ve_rma")
      assert.ok(f4Second)
      const insertedOnSecond = Object.values(f4Second!.inserted).reduce((a, b) => a + b, 0)
      assert.equal(insertedOnSecond, 0, "İkinci seed çalışmasında kopya kayıt eklenmemeli")

      const rb = rollbackAllLogisticsDemoSeeds({ createSafetyBackup: false })
      assert.equal(rb.preExistingIntegrityIntact, true)
      assert.ok((rb.removedByCollection.returnRmaRecord || 0) >= 11)
    })
  } finally {
    if (snapshotRaw !== null) {
      fs.writeFileSync(DB_PATH, snapshotRaw)
    }
  }

  console.log(`\n🎉 TÜM FAZ 4 DOĞRULAMA TESTLERİ BAŞARILI (${passed}/${passed})`)
}

runSuite()
  .catch((err) => {
    console.error("❌ FAZ 4 TEST HATASI:", err)
    process.exit(1)
  })
  .then(() => process.exit(0))
