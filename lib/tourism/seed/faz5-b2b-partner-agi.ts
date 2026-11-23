/**
 * Turizm Faz 5 Seed Modülü — B2B Partner Ağı (turizm_b2b)
 *
 * KURALLAR:
 * - Yalnızca DEMO ortamında çalışır (framework demo-kilidi).
 * - Mevcut Faz 1–4 kayıtlarına (trzm-comp-*, trzm-ps-*) DOKUNMAZ; tüm yeni kayıtlar `trzm-b2b-*` ön ekli.
 * - İdempotenttir: ikinci çalıştırmada 0 ekleme yapar. `rollback` tüm `trzm-b2b-*` kayıtlarını siler.
 * - Karşılıklı cari: her `pairKey` için A firması alacağı (RECEIVABLE) === B firması borcu (PAYABLE).
 */

import type { LogisticsSeedModule } from "@/lib/logistics/seed/framework"

const MAIN = "trzm-comp-main"
const EGE = "trzm-comp-rentacar-01"
const ANADOLU = "trzm-comp-tur-02"
const KIYI = "trzm-comp-otel-03"
const MARMARA = "trzm-comp-transfer-04"

function pushIfMissing(db: Record<string, any[]>, col: string, rec: any): number {
  if (!Array.isArray(db[col])) db[col] = []
  if (db[col].some((r) => String(r?.id) === String(rec.id))) return 0
  db[col].push(rec)
  return 1
}

function iso(dayOffset: number, hour = 9): string {
  const base = Date.UTC(2026, 10, 23, hour, 0, 0)
  return new Date(base + dayOffset * 86400000).toISOString()
}

function fin(rate: number, days: number, pct: number, qty = 1) {
  const gross = Math.round(rate * days * qty * 100) / 100
  const commission = Math.round(((gross * pct) / 100) * 100) / 100
  return { gross, commission, net: Math.round((gross - commission) * 100) / 100 }
}

const RESOURCES = [
  { id: "trzm-b2b-res-01", owner: EGE, type: "VEHICLE", title: "VIP Mercedes Vito Tourer 8+1", category: "VIP Minibüs", city: "İzmir", cap: 8, rate: 4200, pct: 12, min: 1, vis: "ALL_APPROVED_PARTNERS", allowed: null, mode: "MANUAL", hide: true, meta: { plate: "35 ORN 801", vin: "WDF44770313ORNEK1", contactPhone: "+90 232 555 01 19" } },
  { id: "trzm-b2b-res-02", owner: EGE, type: "VEHICLE", title: "Renault Clio Otomatik (Ekonomik)", category: "C Segment", city: "İzmir", cap: 5, rate: 1350, pct: 12, min: 2, vis: "SELECTED_PARTNERS", allowed: [ANADOLU, MAIN], mode: "AUTO", hide: false, meta: { plate: "35 ORN 112" } },
  { id: "trzm-b2b-res-03", owner: MARMARA, type: "TRANSFER_SLOT", title: "İstanbul Havalimanı ↔ Şehir VIP Transfer", category: "Havalimanı Transferi", city: "İstanbul", cap: 6, rate: 2800, pct: 10, min: 1, vis: "ALL_APPROVED_PARTNERS", allowed: null, mode: "AUTO", hide: true, meta: { plate: "34 ORN 404", contactPhone: "+90 216 555 04 49" } },
  { id: "trzm-b2b-res-04", owner: MARMARA, type: "DRIVER", title: "Profesyonel Şoför (SRC + Psikoteknik)", category: "Şoför Hizmeti", city: "İstanbul", cap: 1, rate: 2200, pct: 10, min: 1, vis: "ALL_APPROVED_PARTNERS", allowed: null, mode: "MANUAL", hide: true, meta: { contactPhone: "+90 216 555 04 50" } },
  { id: "trzm-b2b-res-05", owner: KIYI, type: "ROOM_ALLOTMENT", title: "Deniz Manzaralı Deluxe Oda Kontenjanı (5 oda)", category: "Deluxe", city: "Muğla", cap: 5, rate: 3900, pct: 10, min: 2, vis: "ALL_APPROVED_PARTNERS", allowed: null, mode: "MANUAL", hide: false, meta: { internalCode: "KNT-DLX-05" } },
  { id: "trzm-b2b-res-06", owner: KIYI, type: "ROOM_ALLOTMENT", title: "Standart Oda Kontenjanı (Bahçe Cephe)", category: "Standart", city: "Muğla", cap: 8, rate: 2600, pct: 10, min: 1, vis: "SELECTED_PARTNERS", allowed: [ANADOLU], mode: "AUTO", hide: false, meta: null },
  { id: "trzm-b2b-res-07", owner: ANADOLU, type: "GUIDE", title: "Kokartlı Rehber (İngilizce / Almanca)", category: "Profesyonel Rehber", city: "İstanbul", cap: 1, rate: 3200, pct: 15, min: 1, vis: "ALL_APPROVED_PARTNERS", allowed: null, mode: "MANUAL", hide: true, meta: { contactPhone: "+90 212 555 02 29" } },
  { id: "trzm-b2b-res-08", owner: ANADOLU, type: "TRANSFER_SLOT", title: "Kapadokya Günübirlik Tur Koltuk Bloğu", category: "Tur Koltuğu", city: "Nevşehir", cap: 12, rate: 1850, pct: 15, min: 1, vis: "ALL_APPROVED_PARTNERS", allowed: null, mode: "AUTO", hide: false, meta: null },
  { id: "trzm-b2b-res-09", owner: MAIN, type: "VEHICLE", title: "Merkez Filo — Ford Tourneo Custom", category: "Minibüs", city: "İstanbul", cap: 8, rate: 3600, pct: 10, min: 1, vis: "ALL_APPROVED_PARTNERS", allowed: null, mode: "MANUAL", hide: true, meta: { plate: "34 ORN 909", vin: "WF0EXXTTGEORNEK9" } },
  { id: "trzm-b2b-res-10", owner: MARMARA, type: "VEHICLE", title: "Mercedes Sprinter 16+1 (Grup Transferi)", category: "Midibüs", city: "İstanbul", cap: 16, rate: 5200, pct: 10, min: 1, vis: "PRIVATE", allowed: null, mode: "MANUAL", hide: true, meta: { plate: "34 ORN 016" }, status: "PAUSED" },
] as const

type CrossDef = {
  id: string
  no: string
  res: (typeof RESOURCES)[number]["id"]
  booker: string
  ps: string
  start: number
  days: number
  status: string
  guest: string
  qty?: number
  settlementId?: string
  reason?: string
  edoc?: string
}

const CROSS: CrossDef[] = [
  // Vitrin senaryosu: Ege Rota VIP aracını paylaşır → Anadolu Keşif white-label rezerve eder
  { id: "trzm-b2b-crz-01", no: "CRZ-2026-B2B001", res: "trzm-b2b-res-01", booker: ANADOLU, ps: "trzm-ps-04", start: 4, days: 3, status: "CONFIRMED", guest: "Örnek Kültür Turu Grubu (8 kişi)" },
  { id: "trzm-b2b-crz-02", no: "CRZ-2026-B2B002", res: "trzm-b2b-res-03", booker: MAIN, ps: "trzm-b2b-ps-main-marmara", start: -20, days: 1, status: "COMPLETED", guest: "Kurumsal Misafir Transferi", settlementId: "trzm-b2b-stl-01", edoc: "FTR2026B2B0001" },
  { id: "trzm-b2b-crz-03", no: "CRZ-2026-B2B003", res: "trzm-b2b-res-05", booker: MAIN, ps: "trzm-ps-03", start: 10, days: 4, status: "PENDING_APPROVAL", guest: "Örnek Bayi Toplantısı Konaklaması", qty: 2 },
  { id: "trzm-b2b-crz-04", no: "CRZ-2026-B2B004", res: "trzm-b2b-res-07", booker: MAIN, ps: "trzm-ps-02", start: -15, days: 2, status: "COMPLETED", guest: "Tarihi Yarımada Rehberli Tur", settlementId: "trzm-b2b-stl-02" },
  { id: "trzm-b2b-crz-05", no: "CRZ-2026-B2B005", res: "trzm-b2b-res-09", booker: EGE, ps: "trzm-ps-01", start: 6, days: 2, status: "REJECTED", guest: "Havalimanı Grup Karşılama", reason: "Seçilen tarihte merkez filo bakım planı nedeniyle kaynak ayrılamadı." },
  { id: "trzm-b2b-crz-06", no: "CRZ-2026-B2B006", res: "trzm-b2b-res-06", booker: ANADOLU, ps: "trzm-b2b-ps-anadolu-kiyi", start: -10, days: 3, status: "COMPLETED", guest: "Ege Kıyıları Tur Paketi Konaklaması", qty: 3, settlementId: "trzm-b2b-stl-03" },
  { id: "trzm-b2b-crz-07", no: "CRZ-2026-B2B007", res: "trzm-b2b-res-02", booker: MAIN, ps: "trzm-ps-01", start: -5, days: 2, status: "CANCELLED", guest: "Saha Ekibi Araç İhtiyacı", reason: "Müşteri talebi ile iptal edildi; çakışma yoktur." },
  { id: "trzm-b2b-crz-08", no: "CRZ-2026-B2B008", res: "trzm-b2b-res-08", booker: KIYI, ps: "trzm-b2b-ps-anadolu-kiyi", start: 8, days: 1, status: "CONFIRMED", guest: "Otel Misafirleri Kapadokya Turu", qty: 4 },
]

export const SEED_B2B_IDS = {
  turizmPartnership: ["trzm-b2b-ps-07", "trzm-b2b-ps-main-marmara", "trzm-b2b-ps-anadolu-kiyi"],
  turizmSharedResource: RESOURCES.map((r) => r.id),
  turizmCrossReservation: CROSS.map((c) => c.id),
  turizmPartnershipHistoryLog: [
    "trzm-b2b-ph-01", "trzm-b2b-ph-02", "trzm-b2b-ph-03", "trzm-b2b-ph-04",
    "trzm-b2b-ph-05", "trzm-b2b-ph-06", "trzm-b2b-ph-07", "trzm-b2b-ph-08",
  ],
  turizmPartnerSettlement: ["trzm-b2b-stl-01", "trzm-b2b-stl-02", "trzm-b2b-stl-03"],
  turizmPartnerLedgerEntry: CROSS.filter((c) => ["CONFIRMED", "COMPLETED"].includes(c.status)).flatMap((c) => [
    `trzm-b2b-ldg-${c.id.slice(-2)}-r`,
    `trzm-b2b-ldg-${c.id.slice(-2)}-p`,
  ]),
  turizmPartnerMessage: ["trzm-b2b-msg-01", "trzm-b2b-msg-02", "trzm-b2b-msg-03", "trzm-b2b-msg-04", "trzm-b2b-msg-05", "trzm-b2b-msg-06"],
  turizmPartnerConflictLog: ["trzm-b2b-cnf-01", "trzm-b2b-cnf-02", "trzm-b2b-cnf-03"],
} as const

export const faz5B2bPartnerNetworkSeedModule: LogisticsSeedModule = {
  moduleKey: "turizm_faz5_b2b_partner_agi",
  phase: 5,
  seededIdsByCollection: SEED_B2B_IDS,
  seed(db) {
    const now = "2026-11-23T09:00:00.000Z"
    const inserted: Record<string, number> = {}
    let skippedExisting = 0
    const add = (col: string, rec: any) => {
      const n = pushIfMissing(db, col, rec)
      if (n > 0) inserted[col] = (inserted[col] || 0) + n
      else skippedExisting++
    }

    // 1. Ek partnerlikler (SUSPENDED örneği + çapraz senaryolar için APPROVED ikililer)
    const partnerships = [
      { id: "trzm-b2b-ps-07", code: "PRT-BAG-007", requesterCompanyId: EGE, targetCompanyId: KIYI, status: "SUSPENDED", commissionRatePct: 11, settlementTermDays: 15, notes: "Geciken mutabakat ödemeleri nedeniyle geçici olarak askıya alındı.", requestedAt: iso(-40), respondedAt: iso(-12) },
      { id: "trzm-b2b-ps-main-marmara", code: "PRT-BAG-008", requesterCompanyId: MAIN, targetCompanyId: MARMARA, status: "APPROVED", commissionRatePct: 10, settlementTermDays: 15, notes: "Ana firma ile Marmara VIP Transfer arasında onaylı transfer slot paylaşımı.", requestedAt: iso(-45), respondedAt: iso(-44) },
      { id: "trzm-b2b-ps-anadolu-kiyi", code: "PRT-BAG-009", requesterCompanyId: ANADOLU, targetCompanyId: KIYI, status: "APPROVED", commissionRatePct: 10, settlementTermDays: 30, notes: "Tur paketleri için konaklama kontenjanı ve tur koltuğu karşılıklı paylaşımı.", requestedAt: iso(-38), respondedAt: iso(-37) },
    ]
    for (const p of partnerships) {
      add("turizmPartnership", { ...p, allowWhiteLabel: true, createdAt: p.requestedAt, updatedAt: now })
    }

    const history = [
      ["trzm-b2b-ph-01", "trzm-b2b-ps-07", null, "PENDING", EGE, "Deniz Kaya", "Kontenjan paylaşımı için davet gönderildi.", iso(-40)],
      ["trzm-b2b-ph-02", "trzm-b2b-ps-07", "PENDING", "APPROVED", KIYI, "Kerem Demir", "Davet kabul edildi.", iso(-39)],
      ["trzm-b2b-ph-03", "trzm-b2b-ps-07", "APPROVED", "SUSPENDED", KIYI, "Kerem Demir", "Geciken mutabakat ödemeleri nedeniyle geçici askıya alma.", iso(-12)],
      ["trzm-b2b-ph-04", "trzm-b2b-ps-main-marmara", null, "PENDING", MAIN, "Operasyon Yönetimi", "Transfer slot paylaşımı daveti.", iso(-45)],
      ["trzm-b2b-ph-05", "trzm-b2b-ps-main-marmara", "PENDING", "APPROVED", MARMARA, "Elif Şahin", "Firma yetkilisi onayı ile kabul edildi.", iso(-44)],
      ["trzm-b2b-ph-06", "trzm-b2b-ps-anadolu-kiyi", null, "PENDING", ANADOLU, "Selin Arslan", "Tur paketi konaklama iş birliği daveti.", iso(-38)],
      ["trzm-b2b-ph-07", "trzm-b2b-ps-anadolu-kiyi", "PENDING", "APPROVED", KIYI, "Kerem Demir", "Karşılıklı onay tamamlandı.", iso(-37)],
      ["trzm-b2b-ph-08", "trzm-ps-04", "PENDING", "APPROVED", EGE, "Deniz Kaya", "Faz 1 partnerliği için geçmiş onay kaydı.", iso(-30)],
    ] as const
    for (const h of history) {
      add("turizmPartnershipHistoryLog", {
        id: h[0], partnershipId: h[1], fromStatus: h[2], toStatus: h[3], actorCompanyId: h[4],
        actorUserId: null, actorName: h[5], reason: h[6], createdAt: h[7],
      })
    }

    // 2. Ortak kaynak havuzu
    for (const r of RESOURCES) {
      add("turizmSharedResource", {
        id: r.id, ownerCompanyId: r.owner, resourceType: r.type, externalRefId: null, title: r.title,
        category: r.category, city: r.city, capacity: r.cap, netPartnerRateTry: r.rate, currency: "TRY",
        visibilityScope: r.vis, status: (r as any).status ?? "ACTIVE",
        notes: "Kurgusal demo paylaşım kaynağı.",
        availableFrom: iso(-60), availableTo: iso(120), minDurationDays: r.min, commissionRatePct: r.pct,
        approvalMode: r.mode, allowedPartnerIdsJson: r.allowed ? JSON.stringify(r.allowed) : null,
        hideSensitiveFields: r.hide, sensitiveMetaJson: r.meta ? JSON.stringify(r.meta) : null,
        withdrawalRuleNote: "Paylaşımdan çekildiğinde yalnızca yeni talepler kapanır; mevcut onaylı çapraz rezervasyonlar korunur.",
        createdAt: iso(-50), updatedAt: now,
      })
    }

    // 3. Çapraz rezervasyonlar + karşılıklı cari çiftleri
    const resMap = new Map<string, (typeof RESOURCES)[number]>(RESOURCES.map((r) => [r.id, r]))
    for (const c of CROSS) {
      const r = resMap.get(c.res)!
      const f = fin(r.rate, c.days, r.pct, c.qty ?? 1)
      const startAt = iso(c.start)
      const endAt = iso(c.start + c.days)
      const moduleType = r.type === "VEHICLE" ? "RENTACAR" : r.type === "ROOM_ALLOTMENT" ? "HOTEL" : r.type === "GUIDE" ? "TOUR" : "TRANSFER"
      const confirmedLike = ["CONFIRMED", "COMPLETED"].includes(c.status)
      add("turizmCrossReservation", {
        id: c.id, reservationNo: c.no, ownerCompanyId: r.owner, bookingCompanyId: c.booker, partnershipId: c.ps,
        sharedResourceId: r.id, resourceType: r.type, startAt, endAt, status: c.status, isWhiteLabel: true,
        netAmountTry: f.net, commissionAmountTry: f.commission, currency: "TRY", lockExpiresAt: null,
        notes: null, quantity: c.qty ?? 1, guestOrCustomerLabel: c.guest, commissionRatePct: r.pct,
        ownerNetAmountTry: f.net, grossAmountTry: f.gross, underlyingModuleType: moduleType, underlyingRecordId: null,
        approvedByUserId: confirmedLike ? "seed-owner-approval" : null, approvedAt: confirmedLike ? iso(c.start - 3) : null,
        rejectedReason: c.reason ?? null, settlementId: c.settlementId ?? null,
        eDocumentRefNo: c.edoc ?? null, eDocumentIssuedAt: c.edoc ? iso(c.start + c.days) : null,
        createdAt: iso(c.start - 5), updatedAt: now,
      })

      if (confirmedLike) {
        const suffix = c.id.slice(-2)
        const pairKey = `pair-${c.id}`
        const settled = c.settlementId === "trzm-b2b-stl-01"
        const common = {
          pairKey, crossReservationId: c.id, settlementId: c.settlementId ?? null, amountTry: f.net,
          currency: "TRY", status: settled ? "SETTLED" : "OPEN", dueDate: iso(c.start + 15),
          financeId: null, eDocumentRefNo: c.edoc ?? null, createdAt: iso(c.start - 3),
        }
        add("turizmPartnerLedgerEntry", {
          ...common, id: `trzm-b2b-ldg-${suffix}-r`, entryNo: `LDG-R-B2B${suffix}`, companyId: r.owner,
          counterpartyCompanyId: c.booker, entryType: "RECEIVABLE", direction: "DEBIT",
          description: `${c.no} — ${r.title} partner paylaşım alacağı (Net, %${r.pct} komisyon düşülmüş)`,
        })
        add("turizmPartnerLedgerEntry", {
          ...common, id: `trzm-b2b-ldg-${suffix}-p`, entryNo: `LDG-P-B2B${suffix}`, companyId: c.booker,
          counterpartyCompanyId: r.owner, entryType: "PAYABLE", direction: "CREDIT",
          description: `${c.no} — ${r.title} white-label kullanım borcu`,
        })
      }
    }

    // 4. Mutabakat dönemleri (Tamamlanan, Karşı onay bekleyen, İtirazlı)
    const settlementDefs = [
      { id: "trzm-b2b-stl-01", no: "MTB-2026-B2B01", label: "Ekim–Kasım 2026 / 1. Dönem", crz: "trzm-b2b-crz-02", status: "SETTLED", ownerOk: true, bookerOk: true, dispute: null, edoc: "FTR2026B2B0002" },
      { id: "trzm-b2b-stl-02", no: "MTB-2026-B2B02", label: "Kasım 2026 / 1. Dönem", crz: "trzm-b2b-crz-04", status: "PENDING_COUNTERPARTY", ownerOk: true, bookerOk: false, dispute: null, edoc: null },
      { id: "trzm-b2b-stl-03", no: "MTB-2026-B2B03", label: "Kasım 2026 / 2. Dönem", crz: "trzm-b2b-crz-06", status: "DISPUTED", ownerOk: true, bookerOk: false, dispute: "1 oda gecesi erken çıkış nedeniyle faturalanmamalı; düzeltme talep ediyoruz.", edoc: null },
    ]
    for (const s of settlementDefs) {
      const c = CROSS.find((x) => x.id === s.crz)!
      const r = resMap.get(c.res)!
      const f = fin(r.rate, c.days, r.pct, c.qty ?? 1)
      add("turizmPartnerSettlement", {
        id: s.id, settlementNo: s.no, periodLabel: s.label, periodStart: iso(c.start - 7), periodEnd: iso(c.start + c.days + 7),
        ownerCompanyId: r.owner, bookingCompanyId: c.booker, reservationCount: 1, grossVolumeTry: f.gross,
        commissionTotalTry: f.commission, ownerNetPayableTry: f.net, adjustmentAmountTry: 0, adjustmentReason: null,
        status: s.status, ownerApprovedAt: s.ownerOk ? iso(c.start + c.days + 1) : null, ownerApprovedBy: s.ownerOk ? "Kaynak Sahibi Yetkilisi" : null,
        bookerApprovedAt: s.bookerOk ? iso(c.start + c.days + 2) : null, bookerApprovedBy: s.bookerOk ? "Rezerve Eden Firma Yetkilisi" : null,
        disputeNote: s.dispute, eDocumentRefNo: s.edoc, notes: "Kurgusal demo mutabakat dönemi.",
        createdAt: iso(c.start + c.days + 1), updatedAt: now,
      })
    }

    // 5. Rezervasyon bazlı mesajlar
    const messages = [
      ["trzm-b2b-msg-01", "trzm-b2b-crz-01", ANADOLU, "Selin Arslan (Örnek Anadolu Keşif)", "APPROVAL_REQUEST", "8 kişilik kültür turu grubu için VIP aracı 3 günlüğüne talep ediyoruz.", iso(-1, 10)],
      ["trzm-b2b-msg-02", "trzm-b2b-crz-01", EGE, "Deniz Kaya (Örnek Ege Rota)", "NOTE", "Talep onaylandı. Araç Alsancak ofisten saat 08:30'da teslim edilecektir.", iso(-1, 14)],
      ["trzm-b2b-msg-03", "trzm-b2b-crz-01", ANADOLU, "Selin Arslan (Örnek Anadolu Keşif)", "CHANGE_REQUEST", "Teslim saatini 08:00'e çekmek mümkün mü?", iso(0, 9)],
      ["trzm-b2b-msg-04", "trzm-b2b-crz-03", MAIN, "Operasyon Yönetimi (Merkez)", "APPROVAL_REQUEST", "Bayi toplantısı için 2 deluxe oda, 4 gece kontenjan talebimizi onayınıza sunuyoruz.", iso(-2, 11)],
      ["trzm-b2b-msg-05", "trzm-b2b-crz-05", MAIN, "Operasyon Yönetimi (Merkez)", "SYSTEM", "Talep reddedildi: Seçilen tarihte merkez filo bakım planı mevcut.", iso(-3, 16)],
      ["trzm-b2b-msg-06", "trzm-b2b-crz-06", ANADOLU, "Selin Arslan (Örnek Anadolu Keşif)", "NOTE", "Mutabakatta erken çıkış yapan 1 oda gecesi için düzeltme bekliyoruz.", iso(-4, 12)],
    ] as const
    for (const m of messages) {
      add("turizmPartnerMessage", {
        id: m[0], crossReservationId: m[1], senderCompanyId: m[2], senderUserId: null, senderName: m[3],
        messageType: m[4], body: m[5], createdAt: m[6],
      })
    }

    // 6. Çakışma kayıtları (çakışma kilidi ile reddedilmiş ve alternatif önerilmiş denemeler)
    const conflicts = [
      ["trzm-b2b-cnf-01", "trzm-b2b-res-01", "VIP Mercedes Vito Tourer 8+1", EGE, MAIN, 5, 2, "CRZ-2026-B2B001", 1],
      ["trzm-b2b-cnf-02", "trzm-b2b-res-08", "Kapadokya Günübirlik Tur Koltuk Bloğu", ANADOLU, MAIN, 8, 1, "CRZ-2026-B2B008", 0],
      ["trzm-b2b-cnf-03", "trzm-b2b-res-03", "İstanbul Havalimanı ↔ Şehir VIP Transfer", MARMARA, MAIN, -20, 1, "CRZ-2026-B2B002", 2],
    ] as const
    for (const c of conflicts) {
      add("turizmPartnerConflictLog", {
        id: c[0], sharedResourceId: c[1], resourceTitle: c[2], ownerCompanyId: c[3], bookingCompanyId: c[4],
        attemptedStartAt: iso(c[5]), attemptedEndAt: iso(c[5] + c[6]), conflictReservationNo: c[7],
        rejectionCode: "RESOURCE_TIME_CONFLICT", rejectionMessage: `Kaynak ${c[7]} numaralı rezervasyonla çakışıyor.`,
        alternativesSuggestedCount: c[8], actorUserId: null, attemptedAt: iso(c[5] - 2, 15),
      })
    }

    return {
      moduleKey: "turizm_faz5_b2b_partner_agi",
      inserted,
      skippedExisting,
      notes: ["Faz 5 B2B Partner Ağı demo verisi (trzm-b2b-*) hazırlandı; karşılıklı cari A alacağı = B borcu."],
    }
  },
  rollback(db) {
    const removed: Record<string, number> = {}
    for (const [col, ids] of Object.entries(SEED_B2B_IDS)) {
      if (!Array.isArray(db[col])) continue
      const idSet = new Set<string>(ids as readonly string[])
      const before = db[col].length
      db[col] = db[col].filter((r: any) => !idSet.has(String(r?.id)))
      removed[col] = before - db[col].length
    }
    return removed
  },
}
