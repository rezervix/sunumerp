/**
 * Lojistik Faz 3 (Tedarikçi Yönetimi, RFQ, Çok Kademeli PO, ASN/EDI, EOQ/ROP & Skor Kartı)
 * Kapsamlı Otomatik Doğrulama Paketi
 *
 * Kapsam:
 * 1) 3 Faz Lojistik Migration + Rollback SQL doğrulaması
 * 2) Matematiksel Formül Testleri: GLN-13 Mod-10, EOQ/SafetyStock/ROP, Skor Kartı ağırlık toplamı & bileşik puan, PO Kademeli Onay matrisi
 * 3) Domain İş Kuralları: geçersiz GLN reddi, sebepsiz KARALISTE reddi, kara liste RFQ davet/PO açma bloğu
 * 4) Uçtan Uca Satın Alma -> Portal -> ASN/EDI -> Faz 2 WMS Kabul -> Skor Kartı Otomatik Yeniden Hesaplama Akışı:
 *    - Çok kalemli RFQ -> 2 tedarikçi teklifi -> kıyaslama matrisi -> ihaleden 1-tık PO üretme
 *    - Kademeli PO onay -> sevkiyat iletimi -> portal onayı & kırmızı bayrak senaryosu
 *    - Portal ASN oluşturma & EDI DESADV adaptöründen ASN içe aktarma -> Faz 2 WMS `receiveAsnIntoWms`
 *    - ASN kapanışı + PO miktar/tarih güncellemesi + canlı Skor Kartı puanı doğrulaması
 * 5) Tek-Kaynak Riski tespiti ve 1-tık alternatif tedarikçi bağlantısı ile riskten düşürme
 * 6) EOQ/ROP canlı yeniden hesaplama ve 1-tık PO dönüştürme
 * 7) Güvenlik & Portal İzolasyonu:
 *    - İmzalı davet token doğrulama, imza sahteleme reddi, süre aşımı, kara liste & iptal reddi
 *    - Demo ortam kilidi (`isDemoEnvironment`), admin return token doğrulama
 *    - İdempotent portal kullanıcı çözümlemesi & tedarikçi kapsam assertion (`403 FORBIDDEN_SUPPLIER_SCOPE`)
 */

import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { prisma } from "@/lib/db"
import { validateAllLogisticsMigrations } from "@/lib/services/migrationStrategyService"
import { isDemoEnvironment } from "@/lib/config/production-feature-flags"
import { assertSupplierRecordAccess, LogisticsDomainError } from "@/lib/logistics/security"
import {
  generateGln13,
  validateGln13,
  computeEoqAndRopMetrics,
  computeCompositeScorecard,
  resolvePoApprovalPlan,
  upsertSupplierRecord,
  upsertSupplierItemLink,
  getSingleSourceRiskReport,
  recalculateEoqPoliciesAndSuggestions,
  updateScorecardWeights,
  recalculateSupplierScorecard,
  createRfq,
  submitRfqQuote,
  getRfqComparisonMatrix,
  awardRfqAndConvertToPo,
  createLojistikPurchaseOrder,
  processPoApprovalStep,
  dispatchPoToSupplier,
  recordSupplierPoResponse,
  convertReorderPolicyToPo,
  createSupplierAsn,
  ingestExternalEdiAsn,
  receiveAsnIntoWms,
  createSupplierPortalInvite,
  verifySupplierPortalInviteToken,
  revokeSupplierPortalInvite,
  exchangeInviteTokenForPortalSession,
  verifyAdminReturnToken,
} from "@/lib/logistics/procurement"

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
  assert.ok(caught, `${label}: hata fırlatılması beklendi ama başarılı oldu.`)
  assert.equal(
    caught.code,
    expectedCode,
    `${label}: beklenen hata kodu '${expectedCode}', gelen '${caught.code || caught.message}'`
  )
}

async function runSuite() {
  const snapshotRaw = fs.existsSync(DB_PATH) ? fs.readFileSync(DB_PATH, "utf8") : null
  let passed = 0

  const check = async (name: string, fn: () => Promise<void> | void) => {
    await fn()
    passed++
    console.log(`✅ [${passed}] ${name}`)
  }

  try {
    // 1. Migrations
    await check("Faz 1 + Faz 2 + Faz 3 SQL Migration & Rollback bütünlüğü", () => {
      const results = validateAllLogisticsMigrations()
      assert.equal(results.length, 3, "Tam 3 lojistik migration bekleniyordu.")
      for (const r of results) {
        assert.equal(r.valid, true, `Migration '${r.migrationName}' geçersiz: ${r.errors.join("; ")}`)
        assert.equal(r.errors.length, 0, `Migration '${r.migrationName}' hata içeriyor.`)
      }
    })

    // 2. Matematiksel Formüller
    await check("GS1 GLN-13 Mod-10 check-digit üretimi ve sahte/hatalı kod tespiti", () => {
      const validGln = generateGln13("869123400001")
      assert.equal(validGln.length, 13)
      assert.equal(validateGln13(validGln).valid, true)

      const tampered = validGln.slice(0, 12) + String((Number(validGln[12]) + 1) % 10)
      assert.equal(validateGln13(tampered).valid, false)
      assert.equal(validateGln13("12345").valid, false)
    })

    await check("EOQ, Güvenlik Stoğu ve ROP matematiksel formül doğrulaması", () => {
      // EOQ = sqrt(2 * 3650 * 500 / 25) = sqrt(146000) ≈ 382.099 -> 382
      // SS = ceil(1.65 * 4 * sqrt(4)) = ceil(13.2) = 14
      // ROP = ceil(10 * 1.0 * 4) + 14 = 54
      const calc = computeEoqAndRopMetrics({
        annualDemand: 3650,
        orderingCostTry: 500,
        holdingCostTry: 25,
        avgDailyDemand: 10,
        demandStdDev: 4,
        leadTimeDays: 4,
        serviceLevelPercent: 95,
        seasonalityMultiplier: 1,
        currentAvailableQty: 20,
        onOrderQty: 10,
        minOrderQtyMoq: 50,
      })
      assert.equal(calc.eoq, 382)
      assert.equal(calc.safetyStock, 14)
      assert.equal(calc.rop, 54)
      assert.equal(calc.netPosition, 30)
      assert.equal(calc.needsReorder, true)
      assert.equal(calc.suggestedOrderQty, 382)
    })

    await check("Skor Kartı formülü & ağırlık toplamı = 100 doğrulaması", () => {
      // %35 OTD(80) + %25 Miktar(95) + %25 Kalite(90) + %15 Fiyat(100 -> -2% tasarruf)
      // = 28 + 23.75 + 22.5 + 15 = 89.25 -> Tier B
      const score = computeCompositeScorecard({
        onTimeCount: 4,
        deliveredCount: 5,
        totalOrderedQty: 200,
        totalAbsQtyVariance: 10,
        totalReceivedPhysicalQty: 200,
        totalRejectedQty: 20,
        baselineTotalCost: 10000,
        agreedTotalCost: 9800,
        weights: {
          otdWeight: 35,
          qtyWeight: 25,
          qualityWeight: 25,
          priceWeight: 15,
        },
      })
      assert.equal(score.otdRate, 80)
      assert.equal(score.qtyComplianceRate, 95)
      assert.equal(score.qualityAcceptanceRate, 90)
      assert.equal(score.priceVarianceScore, 100)
      assert.equal(score.compositeScore, 89.25)
      assert.equal(score.tier, "B")

      assert.throws(() =>
        computeCompositeScorecard({
          onTimeCount: 1,
          deliveredCount: 1,
          totalOrderedQty: 10,
          totalAbsQtyVariance: 0,
          totalReceivedPhysicalQty: 10,
          totalRejectedQty: 0,
          baselineTotalCost: 100,
          agreedTotalCost: 100,
          weights: { otdWeight: 40, qtyWeight: 30, qualityWeight: 20, priceWeight: 20 },
        })
      )
    })

    await check("Çok Kademeli PO Onay matrisi sınırları (Tier 1 / Tier 2 / Tier 3 / CRITICAL)", () => {
      assert.equal(resolvePoApprovalPlan(12000, "NORMAL").length, 1)
      assert.equal(resolvePoApprovalPlan(16000, "CRITICAL").length, 2)
      assert.equal(resolvePoApprovalPlan(30000, "NORMAL").length, 2)
      assert.equal(resolvePoApprovalPlan(85000, "NORMAL").length, 3)
    })

    // 3. Domain Validations & Blacklist Blocks
    await check("Geçersiz GLN-13, sebepsiz KARALISTE ve kara liste RFQ/PO engelleri", async () => {
      await expectDomainError(
        () =>
          upsertSupplierRecord(
            {
              name: "Hatalı GLN Test A.Ş.",
              glnNumber: "8691234000010", // yanlış check digit olasılığı kontrolü
            },
            "test-runner"
          ).then(async (res) => {
            // Eğer tesadüfen 0 geçerliyse başka rakamla hata fırlattır
            const bad = "8691234000019"
            if (res) {
              return upsertSupplierRecord({ name: "Hatalı GLN 2", glnNumber: bad }, "test-runner")
            }
            return res
          }),
        "INVALID_GLN_13",
        "Geçersiz GLN-13 reddi"
      )

      await expectDomainError(
        () =>
          upsertSupplierRecord(
            {
              name: "Sebepsiz Kara Liste A.Ş.",
              approvalStatus: "KARALISTE",
            },
            "test-runner"
          ),
        "BLACKLIST_REASON_REQUIRED",
        "Sebepsiz KARALISTE reddi"
      )

      // Seeded kara liste tedarikçisi (f3-sup-blk-13) için RFQ daveti ve PO oluşturma engellenmeli
      await expectDomainError(
        () =>
          createRfq(
            {
              title: "Yasaklı Davet Testi",
              warehouseId: "wh-merkez-01",
              dueDate: new Date(Date.now() + 86_400_000).toISOString(),
              invitedSuppliers: ["f3-sup-blk-13"],
              items: [{ itemId: "item-gul-01", requestedQty: 10 }],
            },
            "test-runner"
          ),
        "BLOCKED_SUPPLIER_INVITE",
        "Kara liste tedarikçisi RFQ davetine kapalı olmalı"
      )

      await expectDomainError(
        () =>
          createLojistikPurchaseOrder(
            {
              supplierId: "f3-sup-blk-13",
              warehouseId: "wh-merkez-01",
              lines: [{ itemId: "item-gul-01", orderedQty: 10, agreedUnitPrice: 200 }],
            },
            "test-runner"
          ),
        "SUPPLIER_BLOCKED",
        "Kara liste tedarikçisine PO açılamamalı"
      )
    })

    // 4. E2E RFQ -> Quote Matrix -> Award PO -> Multi-tier Approval -> Dispatch -> ASN/EDI -> WMS Receipt -> Scorecard
    let createdSupplierId = ""
    await check("Uçtan Uca RFQ -> Kıyaslama -> İhaleden PO -> 3 Kademeli Onay -> Portal -> ASN -> WMS Kabul -> Skor Kartı", async () => {
      const validGln = generateGln13("869777700088")
      const newSup = await upsertSupplierRecord(
        {
          code: "SUP-TEST-E2E",
          name: "E2E Doğrulama Flora A.Ş.",
          glnNumber: validGln,
          category: "KESME_CICEK",
          criticalityLevel: "YUKSEK",
          approvalStatus: "ONAYLI",
          leadTimeDays: 3,
          paymentTermsDays: 30,
          paymentTermsLabel: "30 Gün Vadeli",
        },
        "test-runner"
      )
      createdSupplierId = newSup.id
      assert.equal(newSup.glnNumber, validGln)

      const rfq: any = await createRfq(
        {
          title: "E2E Test Kırmızı Gül & Vazo İhalesi",
          warehouseId: "wh-merkez-01",
          dueDate: new Date(Date.now() + 5 * 86_400_000).toISOString(),
          invitedSuppliers: ["sup-holland-01", createdSupplierId],
          items: [{ itemId: "item-gul-01", requestedQty: 400, targetUnitPrice: 250 }],
        },
        "test-runner"
      )
      const rfqItem = rfq.items[0]

      // 2 teklif gönder: biri pahalı/yavaş, diğeri daha ucuz/hızlı (TCO >= 80.000 TL -> Tier 3)
      const qExpensive: any = await submitRfqQuote(
        {
          rfqId: rfq.id,
          supplierId: "sup-holland-01",
          leadTimeDays: 6,
          shippingCost: 4000,
          lines: [{ rfqItemId: rfqItem.id, unitPrice: 260, offeredQty: 400 }],
        },
        "test-runner",
        "ERP"
      )
      const qWinner: any = await submitRfqQuote(
        {
          rfqId: rfq.id,
          supplierId: createdSupplierId,
          leadTimeDays: 2,
          shippingCost: 1500,
          lines: [{ rfqItemId: rfqItem.id, unitPrice: 220, offeredQty: 400 }],
        },
        "test-runner",
        "PORTAL"
      )

      const matrix: any = await getRfqComparisonMatrix(rfq.id)
      assert.equal(matrix.quotes.length, 2)
      assert.equal(matrix.highlights.cheapestQuoteId, qWinner.id)
      assert.equal(matrix.highlights.fastestQuoteId, qWinner.id)
      assert.notEqual(matrix.highlights.cheapestQuoteId, qExpensive.id)

      // İhaleyi kazanan teklifi 1 tıkla PO'ya çevir (400 * 220 = 88.000 TL -> 3 kademeli onay!)
      const awardRes: any = await awardRfqAndConvertToPo(
        { rfqId: rfq.id, quoteId: qWinner.id, priority: "HIGH" },
        "test-runner"
      )
      const po: any = awardRes.purchaseOrder
      assert.equal(po.approvals.length, 3, "88.000 TL tutarındaki PO 3 onay adımı oluşturmalı")
      assert.equal(po.status, "ONAY_BEKLIYOR")

      // Kademeli onay: 1 -> 2 -> 3
      const s1 = await processPoApprovalStep({ poId: po.id, decision: "ONAYLA" }, "uzman.ali")
      assert.equal(s1.status, "ONAY_BEKLIYOR")
      const s2 = await processPoApprovalStep({ poId: po.id, decision: "ONAYLA" }, "mudur.ayse")
      assert.equal(s2.status, "ONAY_BEKLIYOR")
      const s3 = await processPoApprovalStep(
        { poId: po.id, decision: "ONAYLA", autoDispatchOnFinal: true, dispatchChannel: "PORTAL" },
        "genel.mudur"
      )
      assert.equal(s3.status, "TEDARIKCIYE_ILETILDI")

      // Portal üzerinden tedarikçi onayı
      const confirmed = await recordSupplierPoResponse(
        { poId: po.id, decision: "ONAYLANDI", note: "400 demet sevkiyata hazır." },
        "portal-user"
      )
      assert.equal(confirmed.status, "TEDARIKCI_ONAYLADI")

      // ASN Oluşturma (200 adet portaldan + 200 adet EDI DESADV adaptöründen)
      const portalAsn: any = await createSupplierAsn(
        {
          poId: po.id,
          waybillNo: "IRS-E2E-001",
          carrierName: "E2E Lojistik",
          expectedArrivalAt: new Date(Date.now() + 86_400_000).toISOString(),
          lines: [{ itemId: "item-gul-01", shippedQty: 200, lotNumber: "LOT-E2E-01" }],
        },
        "portal-user",
        "PORTAL"
      )
      assert.equal(portalAsn.status, "ON_IHBAR")

      const ediRes: any = await ingestExternalEdiAsn(
        {
          externalRef: "DESADV-TEST-9991",
          supplierGln: validGln,
          poNumber: po.poNumber,
          waybillNo: "IRS-EDI-002",
          carrierName: "EDI Soğuk Zincir",
          expectedArrivalAt: new Date(Date.now() + 86_400_000).toISOString(),
          lines: [{ sku: "GUL-EKV-01", shippedQty: 200, lotNumber: "LOT-EDI-02" }],
        },
        "EDI_TEST"
      )
      const ediAsn = ediRes.asn
      assert.equal(ediAsn.sourceChannel, "EDI_DESADV")

      // Faz 2 WMS Mal Kabul köprüsü: ilk ASN (200) + ikinci ASN (190 sağlam, 10 hasarlı)
      const rec1 = await receiveAsnIntoWms({ asnId: portalAsn.id, performedBy: "wms-op" })
      assert.ok(rec1.task?.taskNumber)
      const asn1After: any = await prisma.lojistikSupplierAsn.findUnique({ where: { id: portalAsn.id } })
      assert.equal(asn1After.status, "KABUL_TAMAM")

      const poMid: any = await prisma.lojistikPurchaseOrder.findUnique({ where: { id: po.id }, include: { lines: true } })
      assert.equal(poMid.status, "KISMI_TESLIM")
      assert.equal(Number(poMid.lines[0].receivedQty), 200)

      await receiveAsnIntoWms({
        asnId: ediAsn.id,
        performedBy: "wms-op",
        linesOverride: [{ itemId: "item-gul-01", receivedGoodQty: 190, damagedQty: 10 }],
      })

      const poAfter: any = await prisma.lojistikPurchaseOrder.findUnique({
        where: { id: po.id },
        include: { lines: true },
      })
      assert.equal(poAfter.status, "TESLIM_ALINDI")
      assert.equal(Number(poAfter.lines[0].receivedQty), 390)
      assert.equal(Number(poAfter.lines[0].rejectedQty), 10)

      // Skor Kartı otomatik yeniden hesaplanmış olmalı (400 fiziksel kabul, 10 red -> %97.5 kalite; 400/400 miktar -> %100; zamanında -> %100)
      const liveScore: any = await recalculateSupplierScorecard(createdSupplierId, "LIVE")
      assert.equal(liveScore.otdRate, 100)
      assert.equal(liveScore.qtyComplianceRate, 100)
      assert.equal(liveScore.qualityAcceptanceRate, 97.5)
      assert.ok(liveScore.compositeScore > 90 && liveScore.tier === "A")
    })

    await check("PO Kırmızı Bayrak (RED_BAYRAK) bildirimi ve Skor Kartı ağırlık güncelleme kuralı", async () => {
      await expectDomainError(
        () =>
          recordSupplierPoResponse(
            { poId: "f3-po-disp-royal", decision: "RED_BAYRAK" },
            "portal-user"
          ),
        "RED_FLAG_REASON_REQUIRED",
        "Açıklamasız kırmızı bayrak reddedilmeli"
      )

      const flagged = await recordSupplierPoResponse(
        {
          poId: "f3-po-disp-royal",
          decision: "RED_BAYRAK",
          redFlagReason: "Sera sıcaklık dalgalanması nedeniyle 3 gün gecikme riski.",
        },
        "tedarikci.royal"
      )
      assert.equal(flagged.status, "RED_BAYRAK")

      await expectDomainError(
        () =>
          updateScorecardWeights(
            { otdWeight: 40, qtyWeight: 40, qualityWeight: 20, priceWeight: 10 },
            "test-admin"
          ),
        "WEIGHT_SUM_NOT_100",
        "Toplamı != 100 olan ağırlık seti reddedilmeli"
      )

      const updatedWeights = await updateScorecardWeights(
        { otdWeight: 40, qtyWeight: 20, qualityWeight: 30, priceWeight: 10 },
        "test-admin"
      )
      assert.equal(updatedWeights.config.otdWeight, 40)
      assert.ok(updatedWeights.recalculatedCount >= 5)
    })

    // 5. Tek-Kaynak Riski & Alternatif Tedarikçi
    await check("Tek-Kaynak Riski tespiti ve alternatif tedarikçi bağlantısı ile risk giderme", async () => {
      const before = await getSingleSourceRiskReport()
      assert.ok(
        before.singleSourceRiskCount + before.noApprovedSupplierCount >= 1,
        "Seed edilen tek-kaynak SKU'lar tespit edilmeli"
      )
      const orkRisk = before.riskItems.find((x: any) => x.sku === "ORK-MOR-05")
      assert.ok(orkRisk, "ORK-MOR-05 tek kaynak risk listesinde görünmeli")

      // Alternatif onaylı tedarikçi bağla -> riskten çıkmalı
      await upsertSupplierItemLink({
        supplierId: "f3-sup-ant-05",
        itemId: orkRisk.itemId,
        unitCost: 192,
        moq: 25,
        leadTimeDays: 3,
        isPrimary: false,
      })

      const after = await getSingleSourceRiskReport()
      const stillRisky = after.riskItems.find((x: any) => x.sku === "ORK-MOR-05")
      assert.equal(stillRisky, undefined, "İkinci onaylı tedarikçi bağlanınca ORK-MOR-05 risk listesinden düşmeli")
    })

    // 6. EOQ/ROP Yeniden Hesaplama & PO Dönüşümü
    await check("EOQ/ROP canlı yeniden hesaplama ve öneriden 1-tık PO oluşturma", async () => {
      const suggestions = await recalculateEoqPoliciesAndSuggestions("ALL")
      assert.ok(suggestions.length >= 4)
      const needsOrder = suggestions.find((s: any) => s.needsReorder)
      assert.ok(needsOrder, "Yeniden sipariş gerektiren en az 1 EOQ politikası olmalı")

      const po: any = await convertReorderPolicyToPo(
        { policyId: needsOrder.id, priority: "HIGH" },
        "eoq-auto"
      )
      assert.equal(po.sourceType, "AUTO_ROP")
      assert.ok(Number(po.lines[0].orderedQty) > 0)
    })

    // 7. Güvenlik & Portal İzolasyonu
    await check("İmzalı Davet Tokenı, Revoke/Tamper/Kara Liste Kontrolleri ve En Az Yetki Oturumu", async () => {
      // Kara listedeki tedarikçiye davet verilemez
      await expectDomainError(
        () =>
          createSupplierPortalInvite({
            supplierId: "f3-sup-blk-13",
            invitedBy: "admin",
          }),
        "SUPPLIER_BLOCKED",
        "Kara liste tedarikçisine davet üretimi engellenmeli"
      )

      const created = await createSupplierPortalInvite({
        supplierId: "sup-yalova-02",
        invitedBy: "admin",
        purpose: "PO_CONFIRM",
        relatedRef: "PO-TEST-001",
      })
      assert.ok(created.token.includes("."))

      const verified = await verifySupplierPortalInviteToken(created.token)
      assert.equal(verified.supplier.id, "sup-yalova-02")

      // İmza manipülasyonu reddedilmeli
      const [p, sig] = created.token.split(".")
      const tampered = `${p}.${sig.slice(0, -2)}XX`
      await expectDomainError(
        () => verifySupplierPortalInviteToken(tampered),
        "INVALID_INVITE_SIGNATURE",
        "Bozulmuş/sahte token imzası reddedilmeli"
      )

      // Token exchange -> sadece tedarikçi kapsamlı session üretmeli
      const exchanged = await exchangeInviteTokenForPortalSession(created.token)
      assert.equal(exchanged.supplier.id, "sup-yalova-02")
      assert.equal(exchanged.user.supplierId, "sup-yalova-02")

      // İptal (revoke) sonrası token geçersiz olmalı
      await revokeSupplierPortalInvite(created.invite.id)
      await expectDomainError(
        () => verifySupplierPortalInviteToken(created.token),
        "INVITE_REVOKED",
        "İptal edilmiş davet tokenı reddedilmeli"
      )
    })

    await check("Tedarikçi Kapsam Assert (403 FORBIDDEN_SUPPLIER_SCOPE) & Demo Mod Kilidi", async () => {
      assert.throws(
        () =>
          assertSupplierRecordAccess(
            {
              userId: "u-hol",
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
        (err: any) => err instanceof LogisticsDomainError && err.status === 403 && err.code === "FORBIDDEN_SUPPLIER_SCOPE"
      )

      // Demo mode env toggle doğrulaması
      const prevDisable = process.env.DISABLE_DEMO_MODE
      try {
        process.env.DISABLE_DEMO_MODE = "true"
        assert.equal(isDemoEnvironment(), false, "DISABLE_DEMO_MODE=true iken demo modu kapanmalı")
        assert.equal(verifyAdminReturnToken("tampered.token"), null)
      } finally {
        if (prevDisable === undefined) delete process.env.DISABLE_DEMO_MODE
        else process.env.DISABLE_DEMO_MODE = prevDisable
      }
    })
  } finally {
    if (snapshotRaw !== null) {
      fs.writeFileSync(DB_PATH, snapshotRaw, "utf8")
    }
  }

  console.log(`\n🎉 TÜM FAZ 3 DOĞRULAMA TESTLERİ BAŞARILI (${passed}/${passed})`)
}

runSuite()
  .catch((err) => {
    console.error("❌ TEST HATASI:", err)
    process.exit(1)
  })
  .then(() => process.exit(0))
