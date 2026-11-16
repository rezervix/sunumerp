/**
 * Lojistik Faz 3 (Tedarikçi Yönetimi, RFQ, Çok Kademeli PO, ASN/EDI, EOQ/ROP & Skor Kartı)
 * İdempotent & Tam Geri Alınabilir Demo Seed Modülü
 *
 * KURALLAR:
 * - Yalnızca DEMO ortamında çalışır (`assertLogisticsDemoSeedAllowed`).
 * - Pre-existing kayıtların bütünlüğünü korur; bilinen rol/alan iyileştirmelerini
 *   yalnızca `repairAnomalies(db)` içinde idempotent biçimde yapar.
 * - Eklenen her yeni kayıt `f3-*` önekli sabit ID taşır ve `rollback` ile tek komutta silinir.
 */

import bcrypt from "bcryptjs"
import type { LogisticsSeedModule } from "./framework"
import {
  computeEoqAndRopMetrics,
  DEFAULT_SCORECARD_WEIGHTS,
  generateGln13,
} from "../procurement/constantsAndHelpers"

const SEEDED_SUPPLIER_IDS = [
  "f3-sup-ant-05",
  "f3-sup-ecu-06",
  "f3-sup-ken-07",
  "f3-sup-koc-08",
  "f3-sup-kut-09",
  "f3-sup-izm-10",
  "f3-sup-ask-11",
  "f3-sup-ady-12",
  "f3-sup-blk-13",
] as const

const SEEDED_USER_IDS = ["f3-user-tedarikci-yalova"] as const
const SEEDED_UBR_IDS = ["f3-ubr-tedarikci-yalova"] as const

const SEEDED_LINK_IDS = [
  "f3-link-01",
  "f3-link-02",
  "f3-link-03",
  "f3-link-04",
  "f3-link-05",
  "f3-link-06",
  "f3-link-07",
  "f3-link-08",
  "f3-link-09",
] as const

const SEEDED_DOC_IDS = [
  "f3-doc-01",
  "f3-doc-02",
  "f3-doc-03",
  "f3-doc-04",
] as const

const SEEDED_RFQ_IDS = ["f3-rfq-01", "f3-rfq-02"] as const
const SEEDED_RFQ_ITEM_IDS = ["f3-rfqi-01", "f3-rfqi-02", "f3-rfqi-03"] as const
const SEEDED_RFQ_QUOTE_IDS = ["f3-rfqq-01", "f3-rfqq-02"] as const
const SEEDED_RFQ_QUOTE_LINE_IDS = [
  "f3-rfqql-01",
  "f3-rfqql-02",
  "f3-rfqql-03",
  "f3-rfqql-04",
] as const

const SEEDED_PO_IDS = [
  "f3-po-hist-01",
  "f3-po-hist-02",
  "f3-po-hist-03",
  "f3-po-hist-04",
  "f3-po-pend-t2",
  "f3-po-pend-t3",
  "f3-po-disp-royal",
  "f3-po-conf-yalova",
  "f3-po-redflag-01",
] as const

const SEEDED_PO_LINE_IDS = [
  "f3-pol-h01",
  "f3-pol-h02",
  "f3-pol-h03",
  "f3-pol-h04",
  "f3-pol-pt2",
  "f3-pol-pt3",
  "f3-pol-dr1",
  "f3-pol-cy1",
  "f3-pol-rf1",
] as const

const SEEDED_PO_APPROVAL_IDS = [
  "f3-poa-h01-1",
  "f3-poa-h02-1",
  "f3-poa-h03-1",
  "f3-poa-h04-1",
  "f3-poa-pt2-1",
  "f3-poa-pt2-2",
  "f3-poa-pt3-1",
  "f3-poa-pt3-2",
  "f3-poa-pt3-3",
  "f3-poa-dr1-1",
  "f3-poa-cy1-1",
  "f3-poa-rf1-1",
] as const

const SEEDED_ASN_IDS = ["f3-asn-01", "f3-asn-02", "f3-asn-03"] as const
const SEEDED_ASN_LINE_IDS = ["f3-asnl-01", "f3-asnl-02", "f3-asnl-03"] as const

const SEEDED_QC_IDS = ["f3-qc-rec-01", "f3-qc-rec-02", "f3-qc-rec-03"] as const
const SEEDED_ROP_IDS = ["f3-rop-gul", "f3-rop-lil", "f3-rop-vaz", "f3-rop-ork"] as const
const SEEDED_SCORE_CONFIG_IDS = ["f3-score-cfg-default"] as const

const HISTORY_PERIODS = [
  "2026-05",
  "2026-06",
  "2026-07",
  "2026-08",
  "2026-09",
  "2026-10",
] as const

const SEEDED_SCORE_SNAPSHOT_IDS = [
  "f3-score-live-hol",
  "f3-score-live-yal",
  "f3-score-live-pas",
  "f3-score-live-amb",
  "f3-score-live-ecu",
  ...HISTORY_PERIODS.flatMap((p) => [
    `f3-score-${p}-hol`,
    `f3-score-${p}-yal`,
    `f3-score-${p}-pas`,
  ]),
] as const

function pushIfMissing(arr: any[], record: any): number {
  if (arr.some((x) => x.id === record.id)) return 0
  arr.push(record)
  return 1
}

function removeByIds(arr: any[] | undefined, ids: ReadonlySet<string>): number {
  if (!Array.isArray(arr) || arr.length === 0) return 0
  const before = arr.length
  const kept = arr.filter((x) => !ids.has(x?.id))
  if (kept.length !== before) {
    arr.splice(0, arr.length, ...kept)
  }
  return before - kept.length
}

export const faz3ProcurementAndSupplierSeedModule: LogisticsSeedModule = {
  id: "faz3-tedarikci-ve-satinalma",
  description:
    "Faz 3 Tedarikçi Ana Kart, Belge Kasası, Tek-Kaynak Riski, RFQ, Çok Kademeli PO, ASN/EDI, EOQ/ROP ve Skor Kartı demo verileri",
  seededIds: {
    supplier: [...SEEDED_SUPPLIER_IDS],
    user: [...SEEDED_USER_IDS],
    userBranchRole: [...SEEDED_UBR_IDS],
    lojistikSupplierItemLink: [...SEEDED_LINK_IDS],
    lojistikSupplierDocument: [...SEEDED_DOC_IDS],
    lojistikRfq: [...SEEDED_RFQ_IDS],
    lojistikRfqItem: [...SEEDED_RFQ_ITEM_IDS],
    lojistikRfqQuote: [...SEEDED_RFQ_QUOTE_IDS],
    lojistikRfqQuoteLine: [...SEEDED_RFQ_QUOTE_LINE_IDS],
    lojistikPurchaseOrder: [...SEEDED_PO_IDS],
    lojistikPurchaseOrderLine: [...SEEDED_PO_LINE_IDS],
    lojistikPoApprovalStep: [...SEEDED_PO_APPROVAL_IDS],
    lojistikSupplierAsn: [...SEEDED_ASN_IDS],
    lojistikSupplierAsnLine: [...SEEDED_ASN_LINE_IDS],
    uretimQualityInspection: [...SEEDED_QC_IDS],
    reorderPolicy: [...SEEDED_ROP_IDS],
    lojistikSupplierScoreConfig: [...SEEDED_SCORE_CONFIG_IDS],
    lojistikSupplierScoreSnapshot: [...SEEDED_SCORE_SNAPSHOT_IDS],
  },

  repairAnomalies(db) {
    let repaired = 0

    // 1. "Tedarikçi" rolünün şirket içi ERP izinlerini güvenli portal kapsamına daralt
    const expectedSupplierPerms = JSON.stringify([
      { resource: "lojistik_tedarikci", actions: ["read", "create", "update"] },
      { resource: "tedarikci_portali", actions: ["read", "create", "update"] },
    ])
    const roles = db.role || []
    for (const role of roles) {
      if (role.name === "Tedarikçi" && role.permissions !== expectedSupplierPerms) {
        role.permissions = expectedSupplierPerms
        role.description =
          "Harici Tedarikçi Portalı — Yalnızca kendi tedarikçi kayıtları (PO/RFQ/ASN/Belge) ile sınırlı."
        repaired++
      }
    }

    // 2. Mevcut 4 pre-existing tedarikçiye eksik Faz 3 GLN-13 / kategori / kritiklik alanlarını eklemeli yaz
    const legacyPatch: Record<
      string,
      { glnNumber: string; category: string; criticalityLevel: string; approvalStatus: string; paymentTermsLabel: string }
    > = {
      "sup-holland-01": {
        glnNumber: generateGln13("871234500001"),
        category: "KESME_CICEK",
        criticalityLevel: "KRITIK",
        approvalStatus: "ONAYLI",
        paymentTermsLabel: "30 Gün Vadeli",
      },
      "sup-yalova-02": {
        glnNumber: generateGln13("869850100002"),
        category: "KESME_CICEK",
        criticalityLevel: "YUKSEK",
        approvalStatus: "ONAYLI",
        paymentTermsLabel: "21 Gün Vadeli",
      },
      "sup-pasabahce-03": {
        glnNumber: generateGln13("869850100003"),
        category: "CAM_SERAMIK",
        criticalityLevel: "ORTA",
        approvalStatus: "ONAYLI",
        paymentTermsLabel: "45 Gün Vadeli",
      },
      "sup-ambalaj-04": {
        glnNumber: generateGln13("869850100004"),
        category: "AMBALAJ_KOLI",
        criticalityLevel: "ORTA",
        approvalStatus: "ONAYLI",
        paymentTermsLabel: "30 Gün Vadeli",
      },
    }

    for (const sup of db.supplier || []) {
      const p = legacyPatch[sup.id]
      if (!p) continue
      let touched = false
      if (!sup.glnNumber) {
        sup.glnNumber = p.glnNumber
        touched = true
      }
      if (!sup.category) {
        sup.category = p.category
        touched = true
      }
      if (!sup.criticalityLevel) {
        sup.criticalityLevel = p.criticalityLevel
        touched = true
      }
      if (!sup.approvalStatus) {
        sup.approvalStatus = p.approvalStatus
        touched = true
      }
      if (!sup.paymentTermsLabel) {
        sup.paymentTermsLabel = p.paymentTermsLabel
        touched = true
      }
      if (sup.isAlternativeReady === undefined) {
        sup.isAlternativeReady = true
        touched = true
      }
      if (touched) repaired++
    }

    return repaired
  },

  async seed(db) {
    const inserted: Record<string, number> = {}
    const now = new Date("2026-11-14T11:00:00.000Z")
    const isoNow = now.toISOString()

    const ensureCol = (name: string) => {
      if (!Array.isArray(db[name])) db[name] = []
      return db[name]
    }

    const sups = ensureCol("supplier")
    const newSuppliers = [
      {
        id: "f3-sup-ant-05",
        code: "SUP-ANTALYA-05",
        name: "Antalya Akdeniz Orkide & Sera A.Ş.",
        contactPerson: "Mehmet Ali Demir",
        email: "satis@akdenizorkide.com.tr",
        phone: "+90 242 511 4020",
        taxNumber: "0740192831",
        address: "Altıntaş Mah. Sera Bulvarı No:42, Aksu / Antalya",
        leadTimeDays: 3,
        onTimeDeliveryRate: 96.5,
        qualityAcceptance: 98.0,
        paymentTermsDays: 30,
        paymentTermsLabel: "30 Gün Vadeli",
        supportsConsignment: false,
        supportsDropship: false,
        rating: 4.75,
        isActive: true,
        glnNumber: generateGln13("869850100005"),
        category: "SAKSI_BITKI",
        criticalityLevel: "YUKSEK",
        approvalStatus: "ONAYLI",
        blacklistedReason: null,
        scorecardScore: 93.4,
        scorecardTier: "A",
        isAlternativeReady: true,
        createdAt: isoNow,
        updatedAt: isoNow,
      },
      {
        id: "f3-sup-ecu-06",
        code: "SUP-ANDES-06",
        name: "Andes Tropikal Güller İthalat Ltd.",
        contactPerson: "Carlos Mendoza",
        email: "export@andesroses.ec",
        phone: "+593 2 248 9100",
        taxNumber: "1790884120",
        address: "Tabacundo Flora Zone, Quito / İthalat Kapısı İstanbul Havalimanı",
        leadTimeDays: 4,
        onTimeDeliveryRate: 95.0,
        qualityAcceptance: 97.5,
        paymentTermsDays: 15,
        paymentTermsLabel: "15 Gün Vadeli",
        supportsConsignment: false,
        supportsDropship: false,
        rating: 4.65,
        isActive: true,
        glnNumber: generateGln13("786100000006"),
        category: "KESME_CICEK",
        criticalityLevel: "KRITIK",
        approvalStatus: "ONAYLI",
        blacklistedReason: null,
        scorecardScore: 91.8,
        scorecardTier: "A",
        isAlternativeReady: true,
        createdAt: isoNow,
        updatedAt: isoNow,
      },
      {
        id: "f3-sup-ken-07",
        code: "SUP-NAIROBI-07",
        name: "Nairobi Premium Flora Export",
        contactPerson: "Grace Wanjiku",
        email: "orders@nairobiflora.ke",
        phone: "+254 20 558 1900",
        taxNumber: "P051449210",
        address: "Naivasha Flower Hub / Sabiha Gökçen Kargo Terminali",
        leadTimeDays: 6,
        onTimeDeliveryRate: 88.0,
        qualityAcceptance: 94.0,
        paymentTermsDays: 30,
        paymentTermsLabel: "30 Gün Vadeli",
        supportsConsignment: false,
        supportsDropship: false,
        rating: 4.2,
        isActive: true,
        glnNumber: generateGln13("616110000007"),
        category: "KESME_CICEK",
        criticalityLevel: "ORTA",
        approvalStatus: "ONAYLI",
        blacklistedReason: null,
        scorecardScore: 84.5,
        scorecardTier: "B",
        isAlternativeReady: true,
        createdAt: isoNow,
        updatedAt: isoNow,
      },
      {
        id: "f3-sup-koc-08",
        code: "SUP-IZMIT-08",
        name: "İzmit Frigo Soğuk Zincir & Sünger A.Ş.",
        contactPerson: "Sema Karahan",
        email: "siparis@izmitfrigo.com.tr",
        phone: "+90 262 341 7200",
        taxNumber: "4810293847",
        address: "GOSB İhsandede Cad. No:19, Gebze / Kocaeli",
        leadTimeDays: 2,
        onTimeDeliveryRate: 97.0,
        qualityAcceptance: 99.0,
        paymentTermsDays: 45,
        paymentTermsLabel: "45 Gün Vadeli",
        supportsConsignment: true,
        supportsDropship: false,
        rating: 4.85,
        isActive: true,
        glnNumber: generateGln13("869850100008"),
        category: "LOJISTIK_SARF",
        criticalityLevel: "YUKSEK",
        approvalStatus: "ONAYLI",
        blacklistedReason: null,
        scorecardScore: 95.2,
        scorecardTier: "A",
        isAlternativeReady: true,
        createdAt: isoNow,
        updatedAt: isoNow,
      },
      {
        id: "f3-sup-kut-09",
        code: "SUP-KUTAHYA-09",
        name: "Kütahya Seramik & El Yapımı Saksı Atölyesi",
        contactPerson: "Hasan Hüseyin Çini",
        email: "toptan@kutahyasaksi.com.tr",
        phone: "+90 274 225 6300",
        taxNumber: "6010482910",
        address: "Çiniciler OSB 2. Cad. No:8, Kütahya",
        leadTimeDays: 5,
        onTimeDeliveryRate: 92.0,
        qualityAcceptance: 96.5,
        paymentTermsDays: 30,
        paymentTermsLabel: "30 Gün Vadeli",
        supportsConsignment: true,
        supportsDropship: false,
        rating: 4.5,
        isActive: true,
        glnNumber: generateGln13("869850100009"),
        category: "CAM_SERAMIK",
        criticalityLevel: "ORTA",
        approvalStatus: "ONAYLI",
        blacklistedReason: null,
        scorecardScore: 88.6,
        scorecardTier: "B",
        isAlternativeReady: true,
        createdAt: isoNow,
        updatedAt: isoNow,
      },
      {
        id: "f3-sup-izm-10",
        code: "SUP-URLA-10",
        name: "İzmir Urla Mevsimlik Yeşillik Kooperatifi",
        contactPerson: "Zeynep Ege",
        email: "kooperatif@urlayesillik.org.tr",
        phone: "+90 232 754 1190",
        taxNumber: "8920312240",
        address: "İskele Mah. Çiçekçilik Halı No:5, Urla / İzmir",
        leadTimeDays: 2,
        onTimeDeliveryRate: 94.0,
        qualityAcceptance: 97.0,
        paymentTermsDays: 15,
        paymentTermsLabel: "15 Gün Vadeli",
        supportsConsignment: false,
        supportsDropship: true,
        rating: 4.6,
        isActive: true,
        glnNumber: generateGln13("869850100010"),
        category: "KESME_CICEK",
        criticalityLevel: "DUSUK",
        approvalStatus: "ONAYLI",
        blacklistedReason: null,
        scorecardScore: 90.1,
        scorecardTier: "A",
        isAlternativeReady: true,
        createdAt: isoNow,
        updatedAt: isoNow,
      },
      {
        id: "f3-sup-ask-11",
        code: "SUP-EGEAKS-11",
        name: "Ege İthal Kurdele & Aksesuar Ltd.",
        contactPerson: "Murat Aksoy",
        email: "satis@egekurdele.com",
        phone: "+90 232 441 8090",
        taxNumber: "3250192834",
        address: "Işıkkent Ayakkabıcılar Sitesi 3. Sk, İzmir",
        leadTimeDays: 7,
        onTimeDeliveryRate: 78.0,
        qualityAcceptance: 89.0,
        paymentTermsDays: 30,
        paymentTermsLabel: "30 Gün Vadeli",
        supportsConsignment: false,
        supportsDropship: false,
        rating: 3.4,
        isActive: false,
        glnNumber: generateGln13("869850100011"),
        category: "AMBALAJ_KOLI",
        criticalityLevel: "DUSUK",
        approvalStatus: "ASKIDA",
        blacklistedReason: null,
        notes: "Vergi levhası ve fiyat listesi yenilemesi bekleniyor.",
        scorecardScore: 72.0,
        scorecardTier: "C",
        isAlternativeReady: false,
        createdAt: isoNow,
        updatedAt: isoNow,
      },
      {
        id: "f3-sup-ady-12",
        code: "SUP-BURSA-12",
        name: "Bursa Doğal Yosun & Kurutulmuş Bitki",
        contactPerson: "Caner Ulu",
        email: "info@bursayosun.com.tr",
        phone: "+90 224 271 3340",
        taxNumber: "1910283745",
        address: "Yıldırım Botanik Çarşısı No:14, Bursa",
        leadTimeDays: 4,
        onTimeDeliveryRate: 90.0,
        qualityAcceptance: 95.0,
        paymentTermsDays: 30,
        paymentTermsLabel: "30 Gün Vadeli",
        supportsConsignment: false,
        supportsDropship: false,
        rating: 4.1,
        isActive: true,
        glnNumber: generateGln13("869850100012"),
        category: "GENEL",
        criticalityLevel: "ORTA",
        approvalStatus: "ADAY",
        blacklistedReason: null,
        notes: "İlk deneme sevkiyatı öncesi ISO kalite dosyası değerlendirmede.",
        scorecardScore: 81.0,
        scorecardTier: "B",
        isAlternativeReady: false,
        createdAt: isoNow,
        updatedAt: isoNow,
      },
      {
        id: "f3-sup-blk-13",
        code: "SUP-ATLAS-13",
        name: "Atlas Hızlı Kargo & Sarf Ticaret",
        contactPerson: "Serkan Vural",
        email: "operasyon@atlaskargosarf.com",
        phone: "+90 212 699 0011",
        taxNumber: "0980712345",
        address: "İkitelli OSB Depocular Sitesi B-Blok, İstanbul",
        leadTimeDays: 5,
        onTimeDeliveryRate: 52.0,
        qualityAcceptance: 76.0,
        paymentTermsDays: 15,
        paymentTermsLabel: "15 Gün Vadeli",
        supportsConsignment: false,
        supportsDropship: false,
        rating: 2.1,
        isActive: false,
        glnNumber: generateGln13("869850100013"),
        category: "LOJISTIK_SARF",
        criticalityLevel: "ORTA",
        approvalStatus: "KARALISTE",
        blacklistedReason:
          "Tekrarlayan soğuk zincir ihlali (%24 gecikme) ve son 3 teslimatta %18 hasar oranı.",
        scorecardScore: 54.5,
        scorecardTier: "D",
        isAlternativeReady: false,
        createdAt: isoNow,
        updatedAt: isoNow,
      },
    ]

    let count = 0
    for (const s of newSuppliers) count += pushIfMissing(sups, s)
    inserted.supplier = count

    // İkinci tedarikçi portal kullanıcısı (çapraz tedarikçi 403 izolasyonu doğrulaması için)
    const users = ensureCol("user")
    const ubrs = ensureCol("userBranchRole")
    const branchId = (db.branch || []).find((b: any) => b.isHeadquarters)?.id || db.branch?.[0]?.id || "local-debug-branch"
    const supplierRoleId = (db.role || []).find((r: any) => r.name === "Tedarikçi")?.id || "role-tedarikci"

    let userAdded = 0
    if (!users.some((u: any) => u.id === "f3-user-tedarikci-yalova")) {
      const hash = await bcrypt.hash("demo123", 10)
      userAdded += pushIfMissing(users, {
        id: "f3-user-tedarikci-yalova",
        username: "tedarikci.yalova",
        passwordHash: hash,
        fullName: "Yalova Çiçekçilik Kooperatifi Portalı",
        email: "portal@yalovakoop.org.tr",
        isActive: true,
        supplierId: "sup-yalova-02",
        createdAt: isoNow,
        updatedAt: isoNow,
      })
    }
    inserted.user = userAdded
    inserted.userBranchRole = pushIfMissing(ubrs, {
      id: "f3-ubr-tedarikci-yalova",
      userId: "f3-user-tedarikci-yalova",
      branchId,
      roleId: supplierRoleId,
      createdAt: isoNow,
    })

    // Ürün-Tedarikçi Katalog Bağlantıları (ORK-MOR-05 & SNG-OAS-04 bilerek TEK KAYNAK bırakılır)
    const links = ensureCol("lojistikSupplierItemLink")
    const linkRows = [
      {
        id: "f3-link-01",
        supplierId: "sup-holland-01",
        itemId: "item-gul-01",
        supplierSku: "RFH-EKV-RED60",
        unitCost: 235,
        currency: "TRY",
        moq: 100,
        leadTimeDays: 3,
        isPrimary: true,
        isActive: true,
        lastQuotedAt: isoNow,
        createdAt: isoNow,
        updatedAt: isoNow,
      },
      {
        id: "f3-link-02",
        supplierId: "f3-sup-ecu-06",
        itemId: "item-gul-01",
        supplierSku: "AND-GUL-EX60",
        unitCost: 242,
        currency: "TRY",
        moq: 120,
        leadTimeDays: 4,
        isPrimary: false,
        isActive: true,
        lastQuotedAt: isoNow,
        createdAt: isoNow,
        updatedAt: isoNow,
      },
      {
        id: "f3-link-03",
        supplierId: "f3-sup-ken-07",
        itemId: "item-gul-01",
        supplierSku: "NRB-RED-50",
        unitCost: 229,
        currency: "TRY",
        moq: 150,
        leadTimeDays: 6,
        isPrimary: false,
        isActive: true,
        lastQuotedAt: isoNow,
        createdAt: isoNow,
        updatedAt: isoNow,
      },
      {
        id: "f3-link-04",
        supplierId: "sup-yalova-02",
        itemId: "item-lil-02",
        supplierSku: "YLV-LIL-CAS",
        unitCost: 115,
        currency: "TRY",
        moq: 60,
        leadTimeDays: 2,
        isPrimary: true,
        isActive: true,
        lastQuotedAt: isoNow,
        createdAt: isoNow,
        updatedAt: isoNow,
      },
      {
        id: "f3-link-05",
        supplierId: "sup-holland-01",
        itemId: "item-lil-02",
        supplierSku: "RFH-LIL-WH",
        unitCost: 124,
        currency: "TRY",
        moq: 80,
        leadTimeDays: 3,
        isPrimary: false,
        isActive: true,
        lastQuotedAt: isoNow,
        createdAt: isoNow,
        updatedAt: isoNow,
      },
      {
        id: "f3-link-06",
        supplierId: "sup-pasabahce-03",
        itemId: "item-vaz-03",
        supplierSku: "PSB-ANT-28",
        unitCost: 175,
        currency: "TRY",
        moq: 30,
        leadTimeDays: 4,
        isPrimary: true,
        isActive: true,
        lastQuotedAt: isoNow,
        createdAt: isoNow,
        updatedAt: isoNow,
      },
      {
        id: "f3-link-07",
        supplierId: "f3-sup-kut-09",
        itemId: "item-vaz-03",
        supplierSku: "KUT-SRM-28",
        unitCost: 185,
        currency: "TRY",
        moq: 25,
        leadTimeDays: 5,
        isPrimary: false,
        isActive: true,
        lastQuotedAt: isoNow,
        createdAt: isoNow,
        updatedAt: isoNow,
      },
      // TEK KAYNAK 1: Orkide sadece sup-yalova-02'ye bağlı (alternatif: Antalya Akdeniz Orkide önerilecek!)
      {
        id: "f3-link-08",
        supplierId: "sup-yalova-02",
        itemId: "item-ork-05",
        supplierSku: "YLV-ORK-MOR",
        unitCost: 410,
        currency: "TRY",
        moq: 20,
        leadTimeDays: 3,
        isPrimary: true,
        isActive: true,
        lastQuotedAt: isoNow,
        createdAt: isoNow,
        updatedAt: isoNow,
      },
      // TEK KAYNAK 2: Oasis Sünger sadece sup-ambalaj-04'e bağlı (alternatif: İzmit Frigo önerilecek!)
      {
        id: "f3-link-09",
        supplierId: "sup-ambalaj-04",
        itemId: "item-sng-04",
        supplierSku: "AMB-OAS-20",
        unitCost: 335,
        currency: "TRY",
        moq: 20,
        leadTimeDays: 2,
        isPrimary: true,
        isActive: true,
        lastQuotedAt: isoNow,
        createdAt: isoNow,
        updatedAt: isoNow,
      },
    ]
    count = 0
    for (const l of linkRows) count += pushIfMissing(links, l)
    inserted.lojistikSupplierItemLink = count

    // Sözleşme & Sertifika Belge Kasası
    const docs = ensureCol("lojistikSupplierDocument")
    const docRows = [
      {
        id: "f3-doc-01",
        supplierId: "sup-holland-01",
        docType: "SOZLESME",
        title: "2026-2027 Soğuk Zincir Çerçeve Tedarik Sözleşmesi",
        fileName: "royal-flora-sozlesme-2026.pdf",
        fileUrl: "/uploads/supplier-docs/royal-flora-sozlesme-2026.pdf",
        mimeType: "application/pdf",
        fileSizeBytes: 482190,
        validFrom: "2026-01-01T00:00:00.000Z",
        expiresAt: "2027-12-31T00:00:00.000Z",
        status: "GECERLI",
        uploadedBy: "admin",
        uploadedVia: "ERP",
        createdAt: isoNow,
        updatedAt: isoNow,
      },
      {
        id: "f3-doc-02",
        supplierId: "sup-holland-01",
        docType: "GIDA_TARIM",
        title: "Bitki Sağlığı & Gümrük İthalat Fitosaniter Sertifikası",
        fileName: "fitosaniter-2026.pdf",
        fileUrl: "/uploads/supplier-docs/fitosaniter-2026.pdf",
        mimeType: "application/pdf",
        fileSizeBytes: 215040,
        validFrom: "2025-12-01T00:00:00.000Z",
        expiresAt: "2026-12-02T00:00:00.000Z", // 18 gün içinde dolacak -> YENILEME_YAKIN
        status: "YENILEME_YAKIN",
        uploadedBy: "tedarikci.royal",
        uploadedVia: "PORTAL",
        createdAt: isoNow,
        updatedAt: isoNow,
      },
      {
        id: "f3-doc-03",
        supplierId: "sup-yalova-02",
        docType: "ISO_KALITE",
        title: "GLOBALG.A.P. Üretim & Kalite Sertifikası",
        fileName: "yalova-globalgap-2025.pdf",
        fileUrl: "/uploads/supplier-docs/yalova-globalgap-2025.pdf",
        mimeType: "application/pdf",
        fileSizeBytes: 318000,
        validFrom: "2025-10-01T00:00:00.000Z",
        expiresAt: "2026-10-01T00:00:00.000Z", // Süresi dolmuş!
        status: "SURESI_DOLMUS",
        uploadedBy: "admin",
        uploadedVia: "ERP",
        createdAt: isoNow,
        updatedAt: isoNow,
      },
      {
        id: "f3-doc-04",
        supplierId: "f3-sup-ant-05",
        docType: "VERGI_LEVHA",
        title: "2026 Kurumsal Vergi Levhası & Oda Sicil Belgesi",
        fileName: "antalya-vergi-2026.pdf",
        fileUrl: "/uploads/supplier-docs/antalya-vergi-2026.pdf",
        mimeType: "application/pdf",
        fileSizeBytes: 142000,
        validFrom: "2026-05-01T00:00:00.000Z",
        expiresAt: "2027-05-01T00:00:00.000Z",
        status: "GECERLI",
        uploadedBy: "admin",
        uploadedVia: "ERP",
        createdAt: isoNow,
        updatedAt: isoNow,
      },
    ]
    count = 0
    for (const d of docRows) count += pushIfMissing(docs, d)
    inserted.lojistikSupplierDocument = count

    // RFQ & Teklif Karşılaştırma Verileri
    const rfqs = ensureCol("lojistikRfq")
    const rfqItems = ensureCol("lojistikRfqItem")
    const rfqQuotes = ensureCol("lojistikRfqQuote")
    const rfqQuoteLines = ensureCol("lojistikRfqQuoteLine")

    inserted.lojistikRfq =
      pushIfMissing(rfqs, {
        id: "f3-rfq-01",
        rfqNumber: "RFQ-2026-0101",
        title: "Aralık Dönemi Ekvador Gülü & Beyaz Lilyum Taze Alım İhalesi",
        warehouseId: "wh-merkez-01",
        status: "DEGERLENDIRMEDE",
        dueDate: "2026-11-20T18:00:00.000Z",
        currency: "TRY",
        invitedSuppliers: JSON.stringify(["sup-holland-01", "f3-sup-ecu-06", "f3-sup-ken-07"]),
        awardedSupplierId: null,
        awardedQuoteId: null,
        convertedPoNo: null,
        notes: "2-4°C soğuk zincir taahhütlü ihale.",
        createdBy: "admin",
        createdAt: isoNow,
        updatedAt: isoNow,
      }) +
      pushIfMissing(rfqs, {
        id: "f3-rfq-02",
        rfqNumber: "RFQ-2026-0102",
        title: "Kış Sezonu Oasis Sünger & Buket Kraft Koli İhalesi",
        warehouseId: "wh-merkez-01",
        status: "TEKLIFE_ACIK",
        dueDate: "2026-11-25T18:00:00.000Z",
        currency: "TRY",
        invitedSuppliers: JSON.stringify(["sup-holland-01", "sup-yalova-02", "sup-ambalaj-04", "f3-sup-koc-08"]),
        awardedSupplierId: null,
        awardedQuoteId: null,
        convertedPoNo: null,
        notes: "Portal üzerinden tedarikçilerden teklif bekleniyor.",
        createdBy: "admin",
        createdAt: isoNow,
        updatedAt: isoNow,
      })

    inserted.lojistikRfqItem =
      pushIfMissing(rfqItems, {
        id: "f3-rfqi-01",
        rfqId: "f3-rfq-01",
        itemId: "item-gul-01",
        sku: "GUL-EKV-01",
        itemName: "Ekvador Kırmızı Gül (70cm Demet)",
        requestedQty: 300,
        unit: "Demet",
        targetUnitPrice: 245,
      }) +
      pushIfMissing(rfqItems, {
        id: "f3-rfqi-02",
        rfqId: "f3-rfq-01",
        itemId: "item-lil-02",
        sku: "LIL-KAZ-02",
        itemName: "Casablanca Beyaz Lilyum",
        requestedQty: 200,
        unit: "Dal",
        targetUnitPrice: 120,
      }) +
      pushIfMissing(rfqItems, {
        id: "f3-rfqi-03",
        rfqId: "f3-rfq-02",
        itemId: "item-sng-04",
        sku: "SNG-OAS-04",
        itemName: "Oasis Islak Çiçek Süngeri (20li Koli)",
        requestedQty: 150,
        unit: "Koli",
        targetUnitPrice: 340,
      })

    inserted.lojistikRfqQuote =
      pushIfMissing(rfqQuotes, {
        id: "f3-rfqq-01",
        rfqId: "f3-rfq-01",
        supplierId: "sup-holland-01",
        quoteNumber: "TKL-2026-0201",
        status: "TEKLIF_VERILDI",
        leadTimeDays: 3,
        validityDate: "2026-11-30T00:00:00.000Z",
        paymentTerms: "30 Gün Vadeli",
        shippingCost: 1800,
        totalQuotedAmount: 93700,
        tcoTotal: 95500,
        submittedBy: "tedarikci.royal",
        submittedVia: "PORTAL",
        submittedAt: isoNow,
        createdAt: isoNow,
        updatedAt: isoNow,
      }) +
      pushIfMissing(rfqQuotes, {
        id: "f3-rfqq-02",
        rfqId: "f3-rfq-01",
        supplierId: "f3-sup-ecu-06",
        quoteNumber: "TKL-2026-0202",
        status: "TEKLIF_VERILDI",
        leadTimeDays: 5,
        validityDate: "2026-11-28T00:00:00.000Z",
        paymentTerms: "15 Gün Vadeli",
        shippingCost: 3400,
        totalQuotedAmount: 91800,
        tcoTotal: 95200,
        submittedBy: "admin",
        submittedVia: "ERP",
        submittedAt: isoNow,
        createdAt: isoNow,
        updatedAt: isoNow,
      })

    inserted.lojistikRfqQuoteLine =
      pushIfMissing(rfqQuoteLines, {
        id: "f3-rfqql-01",
        quoteId: "f3-rfqq-01",
        rfqItemId: "f3-rfqi-01",
        itemId: "item-gul-01",
        unitPrice: 235,
        offeredQty: 300,
        leadTimeDays: 3,
        lineTotal: 70500,
      }) +
      pushIfMissing(rfqQuoteLines, {
        id: "f3-rfqql-02",
        quoteId: "f3-rfqq-01",
        rfqItemId: "f3-rfqi-02",
        itemId: "item-lil-02",
        unitPrice: 116,
        offeredQty: 200,
        leadTimeDays: 3,
        lineTotal: 23200,
      }) +
      pushIfMissing(rfqQuoteLines, {
        id: "f3-rfqql-03",
        quoteId: "f3-rfqq-02",
        rfqItemId: "f3-rfqi-01",
        itemId: "item-gul-01",
        unitPrice: 228,
        offeredQty: 300,
        leadTimeDays: 5,
        lineTotal: 68400,
      }) +
      pushIfMissing(rfqQuoteLines, {
        id: "f3-rfqql-04",
        quoteId: "f3-rfqq-02",
        rfqItemId: "f3-rfqi-02",
        itemId: "item-lil-02",
        unitPrice: 117,
        offeredQty: 200,
        leadTimeDays: 5,
        lineTotal: 23400,
      })

    // Tarihsel + Canlı Çok Kademeli Satın Alma Emirleri (PO)
    const pos = ensureCol("lojistikPurchaseOrder")
    const poLines = ensureCol("lojistikPurchaseOrderLine")
    const poApprovals = ensureCol("lojistikPoApprovalStep")

    const poRecords = [
      // Teslim Edilmiş Tarihsel PO'lar (Skor kartı bunlardan gerçek matematikle beslenir!)
      {
        id: "f3-po-hist-01",
        poNumber: "PO-2026-0911",
        supplierId: "sup-holland-01",
        warehouseId: "wh-merkez-01",
        sourceType: "RFQ_AWARD",
        status: "TESLIM_ALINDI",
        priority: "NORMAL",
        currentApprovalStep: 2,
        requiredApprovalSteps: 2,
        agreedTotalAmount: 47000,
        baselineTotalAmount: 50000,
        currency: "TRY",
        paymentTerms: "30 Gün Vadeli",
        expectedDeliveryDate: "2026-10-18T12:00:00.000Z",
        actualDeliveryDate: "2026-10-17T10:30:00.000Z", // Zamanında (OTD +)
        dispatchedAt: "2026-10-14T09:00:00.000Z",
        dispatchedChannel: "EDI",
        supplierResponseStatus: "ONAYLANDI",
        totalOrderedQty: 200,
        totalReceivedQty: 196,
        totalRejectedQty: 4,
        createdBy: "admin",
        createdAt: "2026-10-14T08:00:00.000Z",
        updatedAt: "2026-10-17T10:30:00.000Z",
      },
      {
        id: "f3-po-hist-02",
        poNumber: "PO-2026-0984",
        supplierId: "sup-holland-01",
        warehouseId: "wh-merkez-01",
        sourceType: "AUTO_ROP",
        status: "TESLIM_ALINDI",
        priority: "HIGH",
        currentApprovalStep: 2,
        requiredApprovalSteps: 2,
        agreedTotalAmount: 36000,
        baselineTotalAmount: 37500,
        currency: "TRY",
        paymentTerms: "30 Gün Vadeli",
        expectedDeliveryDate: "2026-11-05T12:00:00.000Z",
        actualDeliveryDate: "2026-11-04T15:20:00.000Z", // Zamanında (OTD +)
        dispatchedAt: "2026-11-01T10:00:00.000Z",
        dispatchedChannel: "PORTAL",
        supplierResponseStatus: "ONAYLANDI",
        totalOrderedQty: 150,
        totalReceivedQty: 150,
        totalRejectedQty: 0,
        createdBy: "admin",
        createdAt: "2026-11-01T09:00:00.000Z",
        updatedAt: "2026-11-04T15:20:00.000Z",
      },
      {
        id: "f3-po-hist-03",
        poNumber: "PO-2026-0942",
        supplierId: "sup-yalova-02",
        warehouseId: "wh-merkez-01",
        sourceType: "MANUAL",
        status: "TESLIM_ALINDI",
        priority: "NORMAL",
        currentApprovalStep: 1,
        requiredApprovalSteps: 1,
        agreedTotalAmount: 23000,
        baselineTotalAmount: 24000,
        currency: "TRY",
        paymentTerms: "21 Gün Vadeli",
        expectedDeliveryDate: "2026-10-25T12:00:00.000Z",
        actualDeliveryDate: "2026-10-27T11:00:00.000Z", // 2 gün geç! (OTD -)
        dispatchedAt: "2026-10-22T09:00:00.000Z",
        dispatchedChannel: "PORTAL",
        supplierResponseStatus: "ONAYLANDI",
        totalOrderedQty: 200,
        totalReceivedQty: 185,
        totalRejectedQty: 5,
        createdBy: "admin",
        createdAt: "2026-10-22T08:00:00.000Z",
        updatedAt: "2026-10-27T11:00:00.000Z",
      },
      {
        id: "f3-po-hist-04",
        poNumber: "PO-2026-0955",
        supplierId: "sup-pasabahce-03",
        warehouseId: "wh-online-03",
        sourceType: "MANUAL",
        status: "TESLIM_ALINDI",
        priority: "NORMAL",
        currentApprovalStep: 1,
        requiredApprovalSteps: 1,
        agreedTotalAmount: 17500,
        baselineTotalAmount: 18000,
        currency: "TRY",
        paymentTerms: "45 Gün Vadeli",
        expectedDeliveryDate: "2026-11-02T12:00:00.000Z",
        actualDeliveryDate: "2026-11-01T16:45:00.000Z", // Zamanında
        dispatchedAt: "2026-10-28T09:00:00.000Z",
        dispatchedChannel: "EMAIL",
        supplierResponseStatus: "ONAYLANDI",
        totalOrderedQty: 100,
        totalReceivedQty: 98,
        totalRejectedQty: 2,
        createdBy: "admin",
        createdAt: "2026-10-28T08:00:00.000Z",
        updatedAt: "2026-11-01T16:45:00.000Z",
      },
      // Aktif Çok Kademeli Onay Bekleyen PO'lar (Tier 2 ve Tier 3)
      {
        id: "f3-po-pend-t2",
        poNumber: "PO-2026-1021",
        supplierId: "sup-holland-01",
        warehouseId: "wh-merkez-01",
        sourceType: "AUTO_ROP",
        status: "ONAY_BEKLIYOR",
        priority: "HIGH",
        currentApprovalStep: 2,
        requiredApprovalSteps: 2,
        agreedTotalAmount: 42300,
        baselineTotalAmount: 45000,
        currency: "TRY",
        paymentTerms: "30 Gün Vadeli",
        expectedDeliveryDate: "2026-11-18T12:00:00.000Z",
        supplierResponseStatus: "BEKLIYOR",
        totalOrderedQty: 180,
        totalReceivedQty: 0,
        totalRejectedQty: 0,
        createdBy: "admin",
        notes: "2. kademe Satın Alma Müdürü onayı bekliyor.",
        createdAt: isoNow,
        updatedAt: isoNow,
      },
      {
        id: "f3-po-pend-t3",
        poNumber: "PO-2026-1022",
        supplierId: "f3-sup-ecu-06",
        warehouseId: "wh-merkez-01",
        sourceType: "MANUAL",
        status: "ONAY_BEKLIYOR",
        priority: "CRITICAL",
        currentApprovalStep: 1,
        requiredApprovalSteps: 3,
        agreedTotalAmount: 91200,
        baselineTotalAmount: 96000,
        currency: "TRY",
        paymentTerms: "15 Gün Vadeli",
        expectedDeliveryDate: "2026-11-21T12:00:00.000Z",
        supplierResponseStatus: "BEKLIYOR",
        totalOrderedQty: 400,
        totalReceivedQty: 0,
        totalRejectedQty: 0,
        createdBy: "admin",
        notes: "75.000 TL üstü olduğu için 3 kademeli Genel Müdür onayı gerektirir.",
        createdAt: isoNow,
        updatedAt: isoNow,
      },
      // Portalda Tedarikçiye İletilmiş PO (tedarikci.royal onay/ASN verebilir!)
      {
        id: "f3-po-disp-royal",
        poNumber: "PO-2026-1023",
        supplierId: "sup-holland-01",
        warehouseId: "wh-merkez-01",
        sourceType: "RFQ_AWARD",
        status: "TEDARIKCIYE_ILETILDI",
        priority: "NORMAL",
        currentApprovalStep: 2,
        requiredApprovalSteps: 2,
        agreedTotalAmount: 35250,
        baselineTotalAmount: 37500,
        currency: "TRY",
        paymentTerms: "30 Gün Vadeli",
        expectedDeliveryDate: "2026-11-19T12:00:00.000Z",
        dispatchedAt: isoNow,
        dispatchedChannel: "PORTAL",
        supplierResponseStatus: "BEKLIYOR",
        totalOrderedQty: 150,
        totalReceivedQty: 0,
        totalRejectedQty: 0,
        createdBy: "admin",
        notes: "Tedarikçi portalından teyit ve ASN bekleniyor.",
        createdAt: isoNow,
        updatedAt: isoNow,
      },
      // Tedarikçi Onaylamış & ASN Yola Çıkmış PO
      {
        id: "f3-po-conf-yalova",
        poNumber: "PO-2026-1024",
        supplierId: "sup-yalova-02",
        warehouseId: "wh-merkez-01",
        sourceType: "MANUAL",
        status: "TEDARIKCI_ONAYLADI",
        priority: "NORMAL",
        currentApprovalStep: 1,
        requiredApprovalSteps: 1,
        agreedTotalAmount: 13800,
        baselineTotalAmount: 14400,
        currency: "TRY",
        paymentTerms: "21 Gün Vadeli",
        expectedDeliveryDate: "2026-11-16T12:00:00.000Z",
        promisedDeliveryDate: "2026-11-15T14:00:00.000Z",
        dispatchedAt: isoNow,
        dispatchedChannel: "PORTAL",
        supplierResponseStatus: "ONAYLANDI",
        supplierResponseNote: "ASN-2026-0502 ile yola çıkarıldı.",
        totalOrderedQty: 120,
        totalReceivedQty: 0,
        totalRejectedQty: 0,
        createdBy: "admin",
        createdAt: isoNow,
        updatedAt: isoNow,
      },
      // Kırmızı Bayrak Uyarılmış PO
      {
        id: "f3-po-redflag-01",
        poNumber: "PO-2026-1025",
        supplierId: "sup-holland-01",
        warehouseId: "wh-atolye-03",
        sourceType: "MANUAL",
        status: "RED_BAYRAK",
        priority: "CRITICAL",
        currentApprovalStep: 1,
        requiredApprovalSteps: 1,
        agreedTotalAmount: 11750,
        baselineTotalAmount: 12500,
        currency: "TRY",
        paymentTerms: "30 Gün Vadeli",
        expectedDeliveryDate: "2026-11-15T12:00:00.000Z",
        dispatchedAt: isoNow,
        dispatchedChannel: "PORTAL",
        supplierResponseStatus: "RED_BAYRAK",
        supplierResponseNote: "Schiphol kargo slotu fırtına nedeniyle 36 saat ötelendi.",
        redFlagReason: "Schiphol hava kargo slot gecikmesi (alternatif kaynak önerisi aktif).",
        totalOrderedQty: 50,
        totalReceivedQty: 0,
        totalRejectedQty: 0,
        createdBy: "admin",
        createdAt: isoNow,
        updatedAt: isoNow,
      },
    ]

    count = 0
    for (const p of poRecords) count += pushIfMissing(pos, p)
    inserted.lojistikPurchaseOrder = count

    const poLineRows = [
      { id: "f3-pol-h01", poId: "f3-po-hist-01", itemId: "item-gul-01", sku: "GUL-EKV-01", itemName: "Ekvador Kırmızı Gül (70cm Demet)", orderedQty: 200, receivedQty: 196, rejectedQty: 4, unit: "Demet", agreedUnitPrice: 235, baselineUnitCost: 250, lineTotal: 47000 },
      { id: "f3-pol-h02", poId: "f3-po-hist-02", itemId: "item-gul-01", sku: "GUL-EKV-01", itemName: "Ekvador Kırmızı Gül (70cm Demet)", orderedQty: 150, receivedQty: 150, rejectedQty: 0, unit: "Demet", agreedUnitPrice: 240, baselineUnitCost: 250, lineTotal: 36000 },
      { id: "f3-pol-h03", poId: "f3-po-hist-03", itemId: "item-lil-02", sku: "LIL-KAZ-02", itemName: "Casablanca Beyaz Lilyum", orderedQty: 200, receivedQty: 185, rejectedQty: 5, unit: "Dal", agreedUnitPrice: 115, baselineUnitCost: 120, lineTotal: 23000 },
      { id: "f3-pol-h04", poId: "f3-po-hist-04", itemId: "item-vaz-03", sku: "VAZ-ANT-03", itemName: "Antik Cam Vazo 28cm", orderedQty: 100, receivedQty: 98, rejectedQty: 2, unit: "Adet", agreedUnitPrice: 175, baselineUnitCost: 180, lineTotal: 17500 },
      { id: "f3-pol-pt2", poId: "f3-po-pend-t2", itemId: "item-gul-01", sku: "GUL-EKV-01", itemName: "Ekvador Kırmızı Gül (70cm Demet)", orderedQty: 180, receivedQty: 0, rejectedQty: 0, unit: "Demet", agreedUnitPrice: 235, baselineUnitCost: 250, lineTotal: 42300 },
      { id: "f3-pol-pt3", poId: "f3-po-pend-t3", itemId: "item-gul-01", sku: "GUL-EKV-01", itemName: "Ekvador Kırmızı Gül (70cm Demet)", orderedQty: 400, receivedQty: 0, rejectedQty: 0, unit: "Demet", agreedUnitPrice: 228, baselineUnitCost: 240, lineTotal: 91200 },
      { id: "f3-pol-dr1", poId: "f3-po-disp-royal", itemId: "item-gul-01", sku: "GUL-EKV-01", itemName: "Ekvador Kırmızı Gül (70cm Demet)", orderedQty: 150, receivedQty: 0, rejectedQty: 0, unit: "Demet", agreedUnitPrice: 235, baselineUnitCost: 250, lineTotal: 35250 },
      { id: "f3-pol-cy1", poId: "f3-po-conf-yalova", itemId: "item-lil-02", sku: "LIL-KAZ-02", itemName: "Casablanca Beyaz Lilyum", orderedQty: 120, receivedQty: 0, rejectedQty: 0, unit: "Dal", agreedUnitPrice: 115, baselineUnitCost: 120, lineTotal: 13800 },
      { id: "f3-pol-rf1", poId: "f3-po-redflag-01", itemId: "item-gul-01", sku: "GUL-EKV-01", itemName: "Ekvador Kırmızı Gül (70cm Demet)", orderedQty: 50, receivedQty: 0, rejectedQty: 0, unit: "Demet", agreedUnitPrice: 235, baselineUnitCost: 250, lineTotal: 11750 },
    ]
    count = 0
    for (const pl of poLineRows) count += pushIfMissing(poLines, pl)
    inserted.lojistikPurchaseOrderLine = count

    const approvalRows = [
      { id: "f3-poa-h01-1", poId: "f3-po-hist-01", stepOrder: 1, approverRole: "Satın Alma Uzmanı", thresholdMin: 0, status: "ONAYLANDI", approvedBy: "admin", decidedAt: isoNow, createdAt: isoNow },
      { id: "f3-poa-h02-1", poId: "f3-po-hist-02", stepOrder: 1, approverRole: "Satın Alma Uzmanı", thresholdMin: 0, status: "ONAYLANDI", approvedBy: "admin", decidedAt: isoNow, createdAt: isoNow },
      { id: "f3-poa-h03-1", poId: "f3-po-hist-03", stepOrder: 1, approverRole: "Satın Alma Uzmanı", thresholdMin: 0, status: "ONAYLANDI", approvedBy: "admin", decidedAt: isoNow, createdAt: isoNow },
      { id: "f3-poa-h04-1", poId: "f3-po-hist-04", stepOrder: 1, approverRole: "Satın Alma Uzmanı", thresholdMin: 0, status: "ONAYLANDI", approvedBy: "admin", decidedAt: isoNow, createdAt: isoNow },
      { id: "f3-poa-pt2-1", poId: "f3-po-pend-t2", stepOrder: 1, approverRole: "Satın Alma Uzmanı", thresholdMin: 0, status: "ONAYLANDI", approvedBy: "admin", decidedAt: isoNow, createdAt: isoNow },
      { id: "f3-poa-pt2-2", poId: "f3-po-pend-t2", stepOrder: 2, approverRole: "Satın Alma Müdürü", thresholdMin: 25000, status: "BEKLIYOR", approvedBy: null, decidedAt: null, createdAt: isoNow },
      { id: "f3-poa-pt3-1", poId: "f3-po-pend-t3", stepOrder: 1, approverRole: "Satın Alma Uzmanı", thresholdMin: 0, status: "BEKLIYOR", approvedBy: null, decidedAt: null, createdAt: isoNow },
      { id: "f3-poa-pt3-2", poId: "f3-po-pend-t3", stepOrder: 2, approverRole: "Satın Alma Müdürü", thresholdMin: 25000, status: "BEKLIYOR", approvedBy: null, decidedAt: null, createdAt: isoNow },
      { id: "f3-poa-pt3-3", poId: "f3-po-pend-t3", stepOrder: 3, approverRole: "Genel Müdür / Finans Onayı", thresholdMin: 75000, status: "BEKLIYOR", approvedBy: null, decidedAt: null, createdAt: isoNow },
      { id: "f3-poa-dr1-1", poId: "f3-po-disp-royal", stepOrder: 1, approverRole: "Satın Alma Uzmanı", thresholdMin: 0, status: "ONAYLANDI", approvedBy: "admin", decidedAt: isoNow, createdAt: isoNow },
      { id: "f3-poa-cy1-1", poId: "f3-po-conf-yalova", stepOrder: 1, approverRole: "Satın Alma Uzmanı", thresholdMin: 0, status: "ONAYLANDI", approvedBy: "admin", decidedAt: isoNow, createdAt: isoNow },
      { id: "f3-poa-rf1-1", poId: "f3-po-redflag-01", stepOrder: 1, approverRole: "Satın Alma Uzmanı", thresholdMin: 0, status: "ONAYLANDI", approvedBy: "admin", decidedAt: isoNow, createdAt: isoNow },
    ]
    count = 0
    for (const a of approvalRows) count += pushIfMissing(poApprovals, a)
    inserted.lojistikPoApprovalStep = count

    // ASN Ön Sevkiyat İhbarları (WMS Mal Kabul ön-doldurmaya hazır)
    const asns = ensureCol("lojistikSupplierAsn")
    const asnLines = ensureCol("lojistikSupplierAsnLine")

    inserted.lojistikSupplierAsn =
      pushIfMissing(asns, {
        id: "f3-asn-01",
        asnNumber: "ASN-2026-0501",
        poId: "f3-po-disp-royal",
        poNumber: "PO-2026-1023",
        supplierId: "sup-holland-01",
        warehouseId: "wh-merkez-01",
        waybillNo: "IRS-NL-88421",
        trackingNo: "DESADV-NL-261114",
        carrierName: "KLM Soğuk Kargo & İstanbul Frigo",
        vehiclePlate: "34 FRG 901",
        driverName: "Kemal Yıldız",
        ssccPalletCount: 2,
        expectedArrivalAt: "2026-11-16T08:30:00.000Z",
        actualArrivalAt: null,
        status: "KAPI_GIRIS",
        sourceChannel: "EDI_DESADV",
        ediExternalRef: "DESADV-NL-261114",
        wmsTaskNo: null,
        notes: "WMS PO Mal Kabul ekranında tek tıkla ön doldurulabilir.",
        createdBy: "EDI_ADAPTER",
        createdAt: isoNow,
        updatedAt: isoNow,
      }) +
      pushIfMissing(asns, {
        id: "f3-asn-02",
        asnNumber: "ASN-2026-0502",
        poId: "f3-po-conf-yalova",
        poNumber: "PO-2026-1024",
        supplierId: "sup-yalova-02",
        warehouseId: "wh-merkez-01",
        waybillNo: "IRS-YLV-3091",
        trackingNo: "PRT-YLV-0502",
        carrierName: "Yalova Kooperatif Frigo",
        vehiclePlate: "77 CKK 112",
        driverName: "Ahmet Akın",
        ssccPalletCount: 1,
        expectedArrivalAt: "2026-11-15T14:00:00.000Z",
        actualArrivalAt: null,
        status: "YOLDA",
        sourceChannel: "PORTAL",
        ediExternalRef: null,
        wmsTaskNo: null,
        notes: "Tedarikçi portalından gönderildi.",
        createdBy: "tedarikci.yalova",
        createdAt: isoNow,
        updatedAt: isoNow,
      }) +
      pushIfMissing(asns, {
        id: "f3-asn-03",
        asnNumber: "ASN-2026-0503",
        poId: "f3-po-hist-01",
        poNumber: "PO-2026-0911",
        supplierId: "sup-holland-01",
        warehouseId: "wh-merkez-01",
        waybillNo: "IRS-NL-84102",
        carrierName: "KLM Soğuk Kargo",
        vehiclePlate: "34 FRG 104",
        ssccPalletCount: 2,
        expectedArrivalAt: "2026-10-17T09:00:00.000Z",
        actualArrivalAt: "2026-10-17T10:30:00.000Z",
        status: "KABUL_TAMAM",
        sourceChannel: "EDI_DESADV",
        wmsTaskNo: "MK-2026-84102",
        createdBy: "EDI_ADAPTER",
        createdAt: "2026-10-16T08:00:00.000Z",
        updatedAt: "2026-10-17T10:30:00.000Z",
      })

    inserted.lojistikSupplierAsnLine =
      pushIfMissing(asnLines, {
        id: "f3-asnl-01",
        asnId: "f3-asn-01",
        poLineId: "f3-pol-dr1",
        itemId: "item-gul-01",
        sku: "GUL-EKV-01",
        itemName: "Ekvador Kırmızı Gül (70cm Demet)",
        shippedQty: 150,
        receivedQty: 0,
        damagedQty: 0,
        unit: "Demet",
        lotNumber: "LOT-GUL-261114",
        expiryDate: "2026-11-28T00:00:00.000Z",
        ssccCode: "008690001000501001",
      }) +
      pushIfMissing(asnLines, {
        id: "f3-asnl-02",
        asnId: "f3-asn-02",
        poLineId: "f3-pol-cy1",
        itemId: "item-lil-02",
        sku: "LIL-KAZ-02",
        itemName: "Casablanca Beyaz Lilyum",
        shippedQty: 120,
        receivedQty: 0,
        damagedQty: 0,
        unit: "Dal",
        lotNumber: "LOT-LIL-261115",
        expiryDate: "2026-11-26T00:00:00.000Z",
        ssccCode: "008690001000502001",
      }) +
      pushIfMissing(asnLines, {
        id: "f3-asnl-03",
        asnId: "f3-asn-03",
        poLineId: "f3-pol-h01",
        itemId: "item-gul-01",
        sku: "GUL-EKV-01",
        itemName: "Ekvador Kırmızı Gül (70cm Demet)",
        shippedQty: 200,
        receivedQty: 196,
        damagedQty: 4,
        unit: "Demet",
        lotNumber: "LOT-GUL-261017",
        expiryDate: "2026-10-29T00:00:00.000Z",
        ssccCode: "008690001000503001",
      })

    // Üretim Modülü Mal Kabul Kalite Muayeneleri (Skor kartına gerçek veri besler)
    const qcs = ensureCol("uretimQualityInspection")
    inserted.uretimQualityInspection =
      pushIfMissing(qcs, {
        id: "f3-qc-rec-01",
        inspectionNumber: "QC-REC-2026-001",
        inspectionType: "RECEIVING",
        itemId: "item-gul-01",
        supplierId: "sup-holland-01",
        supplierName: "Royal Flora Holland İthalat Konsorsiyumu",
        purchaseOrderId: "f3-po-hist-01",
        lotNumber: "LOT-GUL-261017",
        batchQuantity: 200,
        sampleQuantity: 20,
        status: "CONDITIONAL_PASSED",
        totalDefects: 4,
        isStockBlocked: false,
        inspectionDate: "2026-10-17T11:00:00.000Z",
        decisionNotes: "4 demette soğuk yanığı, karantinaya ayrıldı.",
        createdAt: "2026-10-17T11:00:00.000Z",
        updatedAt: "2026-10-17T11:00:00.000Z",
      }) +
      pushIfMissing(qcs, {
        id: "f3-qc-rec-02",
        inspectionNumber: "QC-REC-2026-002",
        inspectionType: "RECEIVING",
        itemId: "item-lil-02",
        supplierId: "sup-yalova-02",
        supplierName: "Yalova Çiçekçilik & Kesme Gül Üreticileri Kooperatifi",
        purchaseOrderId: "f3-po-hist-03",
        lotNumber: "LOT-LIL-261027",
        batchQuantity: 190,
        sampleQuantity: 15,
        status: "CONDITIONAL_PASSED",
        totalDefects: 5,
        isStockBlocked: false,
        inspectionDate: "2026-10-27T11:30:00.000Z",
        decisionNotes: "5 dal tomurcuk kırılması.",
        createdAt: "2026-10-27T11:30:00.000Z",
        updatedAt: "2026-10-27T11:30:00.000Z",
      }) +
      pushIfMissing(qcs, {
        id: "f3-qc-rec-03",
        inspectionNumber: "QC-REC-2026-003",
        inspectionType: "RECEIVING",
        itemId: "item-vaz-03",
        supplierId: "sup-pasabahce-03",
        supplierName: "Paşabahçe & Paşa Cam Sanayi A.Ş.",
        purchaseOrderId: "f3-po-hist-04",
        lotNumber: "LOT-VAZ-261101",
        batchQuantity: 100,
        sampleQuantity: 10,
        status: "PASSED",
        totalDefects: 2,
        isStockBlocked: false,
        inspectionDate: "2026-11-01T17:00:00.000Z",
        decisionNotes: "2 adet mikro çatlak iade.",
        createdAt: "2026-11-01T17:00:00.000Z",
        updatedAt: "2026-11-01T17:00:00.000Z",
      })

    // EOQ & ROP Politikaları (canlı stok açığını tetikler)
    const rops = ensureCol("reorderPolicy")
    const eoqSeeds = [
      {
        id: "f3-rop-gul",
        itemId: "item-gul-01",
        warehouseId: "wh-merkez-01",
        supplierId: "sup-holland-01",
        avgDailyDemand: 48,
        demandStdDev: 9,
        leadTimeDays: 3,
        seasonalityMultiplier: 1.25,
        annualDemand: 17500,
        orderingCostTry: 650,
        holdingCostTry: 48,
        unitCostTry: 235,
        minOrderQtyMoq: 100,
      },
      {
        id: "f3-rop-lil",
        itemId: "item-lil-02",
        warehouseId: "wh-merkez-01",
        supplierId: "sup-yalova-02",
        avgDailyDemand: 32,
        demandStdDev: 6,
        leadTimeDays: 2,
        seasonalityMultiplier: 1.15,
        annualDemand: 11680,
        orderingCostTry: 400,
        holdingCostTry: 26,
        unitCostTry: 115,
        minOrderQtyMoq: 60,
      },
      {
        id: "f3-rop-vaz",
        itemId: "item-vaz-03",
        warehouseId: "wh-merkez-01",
        supplierId: "sup-pasabahce-03",
        avgDailyDemand: 14,
        demandStdDev: 3,
        leadTimeDays: 4,
        seasonalityMultiplier: 1.0,
        annualDemand: 5110,
        orderingCostTry: 450,
        holdingCostTry: 35,
        unitCostTry: 175,
        minOrderQtyMoq: 30,
      },
      {
        id: "f3-rop-ork",
        itemId: "item-ork-05",
        warehouseId: "wh-merkez-01",
        supplierId: "sup-yalova-02",
        avgDailyDemand: 12,
        demandStdDev: 2.5,
        leadTimeDays: 3,
        seasonalityMultiplier: 1.1,
        annualDemand: 4380,
        orderingCostTry: 550,
        holdingCostTry: 85,
        unitCostTry: 410,
        minOrderQtyMoq: 20,
      },
    ]

    count = 0
    for (const r of eoqSeeds) {
      const m = computeEoqAndRopMetrics({
        annualDemand: r.annualDemand,
        orderingCostTry: r.orderingCostTry,
        holdingCostTry: r.holdingCostTry,
        avgDailyDemand: r.avgDailyDemand,
        demandStdDev: r.demandStdDev,
        leadTimeDays: r.leadTimeDays,
        serviceLevelPercent: 95,
        seasonalityMultiplier: r.seasonalityMultiplier,
        minOrderQtyMoq: r.minOrderQtyMoq,
      })
      count += pushIfMissing(rops, {
        ...r,
        serviceLevelZ: m.serviceLevelZ,
        calculatedSafetyStock: m.safetyStock,
        calculatedRop: m.rop,
        economicOrderQty: m.eoq,
        autoCreatePo: true,
        lastCalculatedAt: isoNow,
        updatedAt: isoNow,
      })
    }
    inserted.reorderPolicy = count

    // Skor Kartı Ağırlıkları & 6 Aylık Geçmiş + LIVE Snapshotlar
    const scoreCfg = ensureCol("lojistikSupplierScoreConfig")
    inserted.lojistikSupplierScoreConfig = pushIfMissing(scoreCfg, {
      id: "f3-score-cfg-default",
      configKey: "DEFAULT",
      otdWeight: DEFAULT_SCORECARD_WEIGHTS.otdWeight,
      qtyWeight: DEFAULT_SCORECARD_WEIGHTS.qtyWeight,
      qualityWeight: DEFAULT_SCORECARD_WEIGHTS.qualityWeight,
      priceWeight: DEFAULT_SCORECARD_WEIGHTS.priceWeight,
      updatedBy: "SYSTEM_SEED",
      updatedAt: isoNow,
    })

    const snapshots = ensureCol("lojistikSupplierScoreSnapshot")
    let snapCount = 0
    const liveSeeds = [
      { id: "f3-score-live-hol", supplierId: "sup-holland-01", otdRate: 100, qtyComplianceRate: 98.86, qualityAcceptanceRate: 98.86, priceVarianceScore: 100, avgPriceVariancePct: -5.14, compositeScore: 99.43, tier: "A", poCount: 2, onTimePoCount: 2, latePoCount: 0, totalOrderedQty: 350, totalReceivedQty: 350, totalRejectedQty: 4 },
      { id: "f3-score-live-yal", supplierId: "sup-yalova-02", otdRate: 0, qtyComplianceRate: 95, qualityAcceptanceRate: 97.37, priceVarianceScore: 100, avgPriceVariancePct: -4.17, compositeScore: 63.09, tier: "C", poCount: 1, onTimePoCount: 0, latePoCount: 1, totalOrderedQty: 200, totalReceivedQty: 190, totalRejectedQty: 5 },
      { id: "f3-score-live-pas", supplierId: "sup-pasabahce-03", otdRate: 100, qtyComplianceRate: 100, qualityAcceptanceRate: 98, priceVarianceScore: 100, avgPriceVariancePct: -2.78, compositeScore: 99.5, tier: "A", poCount: 1, onTimePoCount: 1, latePoCount: 0, totalOrderedQty: 100, totalReceivedQty: 100, totalRejectedQty: 2 },
      { id: "f3-score-live-amb", supplierId: "sup-ambalaj-04", otdRate: 100, qtyComplianceRate: 100, qualityAcceptanceRate: 100, priceVarianceScore: 100, avgPriceVariancePct: 0, compositeScore: 100, tier: "A", poCount: 0, onTimePoCount: 0, latePoCount: 0, totalOrderedQty: 0, totalReceivedQty: 0, totalRejectedQty: 0 },
      { id: "f3-score-live-ecu", supplierId: "f3-sup-ecu-06", otdRate: 100, qtyComplianceRate: 100, qualityAcceptanceRate: 100, priceVarianceScore: 100, avgPriceVariancePct: -5, compositeScore: 100, tier: "A", poCount: 0, onTimePoCount: 0, latePoCount: 0, totalOrderedQty: 0, totalReceivedQty: 0, totalRejectedQty: 0 },
    ]
    for (const s of liveSeeds) {
      snapCount += pushIfMissing(snapshots, {
        ...s,
        periodKey: "LIVE",
        calculatedAt: isoNow,
        notes: "Faz 3 başlangıç canlı performans anlık görüntüsü.",
      })
    }

    const monthlyProfile = [91.2, 92.5, 90.8, 93.4, 94.1, 95.3]
    HISTORY_PERIODS.forEach((pKey, idx) => {
      const base = monthlyProfile[idx]
      snapCount += pushIfMissing(snapshots, {
        id: `f3-score-${pKey}-hol`,
        supplierId: "sup-holland-01",
        periodKey: pKey,
        otdRate: Number((base + 3).toFixed(1)),
        qtyComplianceRate: 97.5,
        qualityAcceptanceRate: 98.2,
        priceVarianceScore: 100,
        avgPriceVariancePct: -3.5,
        compositeScore: Number((base + 3.2).toFixed(1)),
        tier: "A",
        poCount: 3,
        onTimePoCount: 3,
        latePoCount: 0,
        totalOrderedQty: 420,
        totalReceivedQty: 416,
        totalRejectedQty: 6,
        calculatedAt: isoNow,
      })
      snapCount += pushIfMissing(snapshots, {
        id: `f3-score-${pKey}-yal`,
        supplierId: "sup-yalova-02",
        periodKey: pKey,
        otdRate: Number((base - 8).toFixed(1)),
        qtyComplianceRate: 93.0,
        qualityAcceptanceRate: 95.5,
        priceVarianceScore: 98.0,
        avgPriceVariancePct: 1.0,
        compositeScore: Number((base - 4.5).toFixed(1)),
        tier: "B",
        poCount: 2,
        onTimePoCount: 2,
        latePoCount: 0,
        totalOrderedQty: 260,
        totalReceivedQty: 252,
        totalRejectedQty: 9,
        calculatedAt: isoNow,
      })
      snapCount += pushIfMissing(snapshots, {
        id: `f3-score-${pKey}-pas`,
        supplierId: "sup-pasabahce-03",
        periodKey: pKey,
        otdRate: 96.0,
        qtyComplianceRate: 98.0,
        qualityAcceptanceRate: 97.5,
        priceVarianceScore: 100,
        avgPriceVariancePct: -2.0,
        compositeScore: Number((base + 1.5).toFixed(1)),
        tier: "A",
        poCount: 2,
        onTimePoCount: 2,
        latePoCount: 0,
        totalOrderedQty: 180,
        totalReceivedQty: 178,
        totalRejectedQty: 3,
        calculatedAt: isoNow,
      })
    })
    inserted.lojistikSupplierScoreSnapshot = snapCount

    return {
      moduleId: "faz3-tedarikci-ve-satinalma",
      inserted,
      skippedExisting: {},
      notes: [
        "9 ek tedarikçi (+4 mevcut = 13 tedarikçi), ikincil portal kullanıcısı (tedarikci.yalova) ve GLN-13 kayıtları eklendi.",
        "Tek-kaynak riski için Orkide ve Oasis Sünger kalemleri bilerek tek onaylı tedarikçiyle bağlandı.",
        "Çok kademeli PO onayları, açık ASN'ler, 6 aylık + canlı skor kartı ve RFQ ihale matrisi hazırlandı.",
      ],
    }
  },

  rollback(db) {
    const removed: Record<string, number> = {}
    removed.lojistikSupplierScoreSnapshot = removeByIds(
      db.lojistikSupplierScoreSnapshot,
      new Set(SEEDED_SCORE_SNAPSHOT_IDS)
    )
    removed.lojistikSupplierScoreConfig = removeByIds(
      db.lojistikSupplierScoreConfig,
      new Set(SEEDED_SCORE_CONFIG_IDS)
    )
    removed.reorderPolicy = removeByIds(db.reorderPolicy, new Set(SEEDED_ROP_IDS))
    removed.uretimQualityInspection = removeByIds(db.uretimQualityInspection, new Set(SEEDED_QC_IDS))
    removed.lojistikSupplierAsnLine = removeByIds(db.lojistikSupplierAsnLine, new Set(SEEDED_ASN_LINE_IDS))
    removed.lojistikSupplierAsn = removeByIds(db.lojistikSupplierAsn, new Set(SEEDED_ASN_IDS))
    removed.lojistikPoApprovalStep = removeByIds(db.lojistikPoApprovalStep, new Set(SEEDED_PO_APPROVAL_IDS))
    removed.lojistikPurchaseOrderLine = removeByIds(db.lojistikPurchaseOrderLine, new Set(SEEDED_PO_LINE_IDS))
    removed.lojistikPurchaseOrder = removeByIds(db.lojistikPurchaseOrder, new Set(SEEDED_PO_IDS))
    removed.lojistikRfqQuoteLine = removeByIds(db.lojistikRfqQuoteLine, new Set(SEEDED_RFQ_QUOTE_LINE_IDS))
    removed.lojistikRfqQuote = removeByIds(db.lojistikRfqQuote, new Set(SEEDED_RFQ_QUOTE_IDS))
    removed.lojistikRfqItem = removeByIds(db.lojistikRfqItem, new Set(SEEDED_RFQ_ITEM_IDS))
    removed.lojistikRfq = removeByIds(db.lojistikRfq, new Set(SEEDED_RFQ_IDS))
    removed.lojistikSupplierDocument = removeByIds(db.lojistikSupplierDocument, new Set(SEEDED_DOC_IDS))
    removed.lojistikSupplierItemLink = removeByIds(db.lojistikSupplierItemLink, new Set(SEEDED_LINK_IDS))
    removed.userBranchRole = removeByIds(db.userBranchRole, new Set(SEEDED_UBR_IDS))
    removed.user = removeByIds(db.user, new Set(SEEDED_USER_IDS))
    removed.supplier = removeByIds(db.supplier, new Set(SEEDED_SUPPLIER_IDS))
    return removed
  },
}

