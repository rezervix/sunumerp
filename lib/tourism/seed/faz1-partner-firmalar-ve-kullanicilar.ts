/**
 * Turizm Faz 1 Seed Modülü — Kısıtlı "Partner" Rolü, 4 Kurgusal Partner Firma,
 * Partner Kullanıcıları ve Partnerlik İlişkisi İskeletleri
 *
 * KURALLAR:
 * - Yalnızca DEMO ortamında çalışır (`isDemoEnvironment()`).
 * - Mevcut hiçbir kayda dokunmaz; tüm Faz 1 turizm kayıtları `trzm-*` / `role-partner` sabit ID taşır.
 * - Gerçek kişi/firma adı kullanılmaz; tüm firmalar ve iletişim bilgileri kurgusal örnektir.
 * - Demo partner kullanıcıları kısıtlı "Partner" rolü ile açılır, asla Süper Yönetici olmaz.
 */

import bcrypt from "bcryptjs"
import { DEFAULT_ROLES } from "@/lib/auth/permissions"
import type { LogisticsSeedModule } from "@/lib/logistics/seed/framework"
import { MAIN_COMPANY_ID, PARTNER_ROLE_NAME } from "../constants"

export const SEED_PARTNER_ROLE_ID = "role-partner"

export const SEED_TOURISM_COMPANY_IDS = [
  MAIN_COMPANY_ID,
  "trzm-comp-rentacar-01",
  "trzm-comp-tur-02",
  "trzm-comp-otel-03",
  "trzm-comp-transfer-04",
] as const

export const SEED_TOURISM_USER_IDS = [
  "trzm-user-egerota",
  "trzm-user-anadolukesif",
  "trzm-user-kiyiotel",
  "trzm-user-marmaratransfer",
] as const

export const SEED_TOURISM_UBR_IDS = [
  "trzm-ubr-egerota",
  "trzm-ubr-anadolukesif",
  "trzm-ubr-kiyiotel",
  "trzm-ubr-marmaratransfer",
] as const

export const SEED_TOURISM_PARTNERSHIP_IDS = [
  "trzm-ps-01",
  "trzm-ps-02",
  "trzm-ps-03",
  "trzm-ps-04",
  "trzm-ps-05",
  "trzm-ps-06",
] as const

function pushIfMissing(db: Record<string, any[]>, col: string, rec: any): number {
  if (!Array.isArray(db[col])) db[col] = []
  if (db[col].some((r) => String(r?.id) === String(rec.id))) return 0
  db[col].push(rec)
  return 1
}

export const faz1TourismPartnerFoundationSeedModule: LogisticsSeedModule = {
  moduleKey: "turizm_faz1_partner_firmalar_ve_kullanicilar",
  phase: 1,
  seededIdsByCollection: {
    role: [SEED_PARTNER_ROLE_ID],
    user: SEED_TOURISM_USER_IDS,
    userBranchRole: SEED_TOURISM_UBR_IDS,
    turizmPartnerCompany: SEED_TOURISM_COMPANY_IDS,
    turizmPartnership: SEED_TOURISM_PARTNERSHIP_IDS,
  },
  seed(db) {
    const now = "2026-11-20T09:00:00.000Z"
    const inserted: Record<string, number> = {}
    let skippedExisting = 0
    const notes: string[] = []

    const add = (col: string, rec: any) => {
      const count = pushIfMissing(db, col, rec)
      if (count > 0) {
        inserted[col] = (inserted[col] || 0) + count
      } else {
        skippedExisting++
      }
    }

    if (!Array.isArray(db.role)) db.role = []
    if (!Array.isArray(db.user)) db.user = []
    if (!Array.isArray(db.userBranchRole)) db.userBranchRole = []

    // 1. Kısıtlı "Partner" rolü
    const hasPartnerRole = db.role.some(
      (r) => r.id === SEED_PARTNER_ROLE_ID || r.name === PARTNER_ROLE_NAME
    )
    if (!hasPartnerRole) {
      db.role.push({
        id: SEED_PARTNER_ROLE_ID,
        name: PARTNER_ROLE_NAME,
        description:
          "Harici B2B Partner rolü — yalnızca kendi firmasına ait kaynak havuzu ve onaylı partnerlik kayıtlarına erişir.",
        permissions: JSON.stringify(DEFAULT_ROLES[PARTNER_ROLE_NAME]),
      })
      inserted.role = (inserted.role || 0) + 1
      notes.push("Kısıtlı Partner rolü eklendi (role-partner).")
    } else {
      skippedExisting++
    }

    // 2. Ana Operatör referansı + 4 Kurgusal Partner Firma (Rent-a-Car, Tur Operatörü, Otel, Transfer)
    const companies = [
      {
        id: MAIN_COMPANY_ID,
        code: "ANA-000",
        name: "Sunum ERP Merkez Operasyon (Örnek Ana Firma)",
        companyType: "MAIN_OPERATOR",
        taxNumber: "9100000000",
        taxOffice: "Levent V.D.",
        city: "İstanbul",
        district: "Beşiktaş",
        address: "Örnek İş Merkezi K:14, Levent / İstanbul",
        contactPerson: "Operasyon Yönetimi",
        email: "merkez@ornek-sunumerp.example",
        phone: "+90 212 555 00 00",
        status: "ACTIVE",
        isMainCompany: true,
        defaultCommissionRate: 0,
        notes: "Ana ERP kurulumunun B2B Partner Ağı içindeki kendi firma kaydı.",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "trzm-comp-rentacar-01",
        code: "PRT-RNT-01",
        name: "Örnek Ege Rota Araç Kiralama A.Ş.",
        companyType: "RENTACAR",
        taxNumber: "9100001001",
        taxOffice: "Konak V.D.",
        city: "İzmir",
        district: "Alsancak",
        address: "Örnek Kordon Bulvarı No:24, Alsancak / İzmir",
        contactPerson: "Deniz Kaya",
        email: "operasyon@ornek-egerota.example",
        phone: "+90 232 555 01 11",
        status: "ACTIVE",
        isMainCompany: false,
        defaultCommissionRate: 12,
        notes: "Binek ve VIP minibüs kiralama filosu (kurgusal demo partneri).",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "trzm-comp-tur-02",
        code: "PRT-TUR-02",
        name: "Örnek Anadolu Keşif Turizm Ltd.",
        companyType: "TOUR_OPERATOR",
        taxNumber: "9100002002",
        taxOffice: "Beyoğlu V.D.",
        city: "İstanbul",
        district: "Şişli",
        address: "Örnek Cumhuriyet Cad. No:88, Şişli / İstanbul",
        contactPerson: "Selin Arslan",
        email: "operasyon@ornek-anadolukesif.example",
        phone: "+90 212 555 02 22",
        status: "ACTIVE",
        isMainCompany: false,
        defaultCommissionRate: 15,
        notes: "Günübirlik ve kültür turları operatörü (kurgusal demo partneri).",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "trzm-comp-otel-03",
        code: "PRT-OTL-03",
        name: "Örnek Kıyı Konaklama & Butik Otel A.Ş.",
        companyType: "HOTEL",
        taxNumber: "9100003003",
        taxOffice: "Bodrum V.D.",
        city: "Muğla",
        district: "Bodrum",
        address: "Örnek Sahil Yolu No:12, Bodrum / Muğla",
        contactPerson: "Kerem Demir",
        email: "rezervasyon@ornek-kiyiotel.example",
        phone: "+90 252 555 03 33",
        status: "ACTIVE",
        isMainCompany: false,
        defaultCommissionRate: 10,
        notes: "Kıyı butik otel ve acenta kontenjan sağlayıcısı (kurgusal demo partneri).",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "trzm-comp-transfer-04",
        code: "PRT-TRF-04",
        name: "Örnek Marmara VIP Transfer & Ortak Filo Ltd.",
        companyType: "TRANSFER",
        taxNumber: "9100004004",
        taxOffice: "Kadıköy V.D.",
        city: "İstanbul",
        district: "Ataşehir",
        address: "Örnek Havalimanı Yolu No:41, Ataşehir / İstanbul",
        contactPerson: "Elif Şahin",
        email: "filo@ornek-marmaratransfer.example",
        phone: "+90 216 555 04 44",
        status: "ACTIVE",
        isMainCompany: false,
        defaultCommissionRate: 10,
        notes: "Havalimanı transferi ve ortak şoförlü araç havuzu (kurgusal demo partneri).",
        createdAt: now,
        updatedAt: now,
      },
    ]

    for (const comp of companies) {
      add("turizmPartnerCompany", comp)
    }

    // 3. Her Partner Firma için Kısıtlı Demo Kullanıcısı ve Şube-Rol Ataması (şifre: demo123)
    const defaultBranchId =
      Array.isArray(db.branch) && db.branch.some((b) => b.id === "local-debug-branch")
        ? "local-debug-branch"
        : db.branch?.[0]?.id ?? "local-debug-branch"

    const hashedDemoPassword = bcrypt.hashSync("demo123", 10)

    const partnerUsers = [
      {
        id: "trzm-user-egerota",
        ubrId: "trzm-ubr-egerota",
        username: "partner.egerota",
        fullName: "Deniz Kaya (Örnek Ege Rota)",
        email: "operasyon@ornek-egerota.example",
        phone: "+90 232 555 01 11",
        position: "Filo & Partner Operasyon Sorumlusu",
        partnerCompanyId: "trzm-comp-rentacar-01",
      },
      {
        id: "trzm-user-anadolukesif",
        ubrId: "trzm-ubr-anadolukesif",
        username: "partner.anadolukesif",
        fullName: "Selin Arslan (Örnek Anadolu Keşif)",
        email: "operasyon@ornek-anadolukesif.example",
        phone: "+90 212 555 02 22",
        position: "Tur Operasyon Yöneticisi",
        partnerCompanyId: "trzm-comp-tur-02",
      },
      {
        id: "trzm-user-kiyiotel",
        ubrId: "trzm-ubr-kiyiotel",
        username: "partner.kiyiotel",
        fullName: "Kerem Demir (Örnek Kıyı Otel)",
        email: "rezervasyon@ornek-kiyiotel.example",
        phone: "+90 252 555 03 33",
        position: "Ön Büro & Acenta Sorumlusu",
        partnerCompanyId: "trzm-comp-otel-03",
      },
      {
        id: "trzm-user-marmaratransfer",
        ubrId: "trzm-ubr-marmaratransfer",
        username: "partner.marmaratransfer",
        fullName: "Elif Şahin (Örnek Marmara Transfer)",
        email: "filo@ornek-marmaratransfer.example",
        phone: "+90 216 555 04 44",
        position: "Transfer Planlama Uzmanı",
        partnerCompanyId: "trzm-comp-transfer-04",
      },
    ]

    for (const pu of partnerUsers) {
      const hasUser = db.user.some(
        (u) => u.id === pu.id || u.username === pu.username
      )
      if (!hasUser) {
        db.user.push({
          id: pu.id,
          username: pu.username,
          email: pu.email,
          password: hashedDemoPassword,
          fullName: pu.fullName,
          phone: pu.phone,
          avatarUrl: null,
          department: "Dış Partner Portalı",
          position: pu.position,
          supplierId: null,
          partnerCompanyId: pu.partnerCompanyId,
          isActive: true,
          mustChangePassword: false,
          createdAt: now,
          updatedAt: now,
        })
        inserted.user = (inserted.user || 0) + 1
      } else {
        skippedExisting++
      }

      const hasUbr = db.userBranchRole.some(
        (ubr) =>
          ubr.id === pu.ubrId ||
          (ubr.userId === pu.id && ubr.branchId === defaultBranchId)
      )
      if (!hasUbr) {
        db.userBranchRole.push({
          id: pu.ubrId,
          userId: pu.id,
          branchId: defaultBranchId,
          roleId: SEED_PARTNER_ROLE_ID,
          assignedAt: now,
          assignedBy: "turizm-faz1-seed",
        })
        inserted.userBranchRole = (inserted.userBranchRole || 0) + 1
      } else {
        skippedExisting++
      }
    }

    // 4. Partnerlik İlişkisi İskeletleri (Onaylı, Bekleyen, Reddedilmiş — iş akışı Faz 5'te dolacak)
    const partnerships = [
      {
        id: "trzm-ps-01",
        code: "PRT-BAG-001",
        requesterCompanyId: MAIN_COMPANY_ID,
        targetCompanyId: "trzm-comp-rentacar-01",
        status: "APPROVED",
        commissionRatePct: 12,
        settlementTermDays: 15,
        allowWhiteLabel: true,
        notes: "Ana firma ile Örnek Ege Rota arasında onaylı araç paylaşım anlaşması.",
        requestedAt: "2026-11-10T10:00:00.000Z",
        respondedAt: "2026-11-11T14:30:00.000Z",
        createdAt: "2026-11-10T10:00:00.000Z",
        updatedAt: now,
      },
      {
        id: "trzm-ps-02",
        code: "PRT-BAG-002",
        requesterCompanyId: MAIN_COMPANY_ID,
        targetCompanyId: "trzm-comp-tur-02",
        status: "APPROVED",
        commissionRatePct: 15,
        settlementTermDays: 15,
        allowWhiteLabel: true,
        notes: "Ana firma ile Örnek Anadolu Keşif arasında onaylı tur & transfer iş birliği.",
        requestedAt: "2026-11-11T09:15:00.000Z",
        respondedAt: "2026-11-12T11:00:00.000Z",
        createdAt: "2026-11-11T09:15:00.000Z",
        updatedAt: now,
      },
      {
        id: "trzm-ps-03",
        code: "PRT-BAG-003",
        requesterCompanyId: MAIN_COMPANY_ID,
        targetCompanyId: "trzm-comp-otel-03",
        status: "APPROVED",
        commissionRatePct: 10,
        settlementTermDays: 30,
        allowWhiteLabel: true,
        notes: "Ana firma ile Örnek Kıyı Otel arasında onaylı konaklama kontenjan partnerliği.",
        requestedAt: "2026-11-12T13:00:00.000Z",
        respondedAt: "2026-11-13T16:20:00.000Z",
        createdAt: "2026-11-12T13:00:00.000Z",
        updatedAt: now,
      },
      {
        id: "trzm-ps-04",
        code: "PRT-BAG-004",
        requesterCompanyId: "trzm-comp-tur-02",
        targetCompanyId: "trzm-comp-transfer-04",
        status: "APPROVED",
        commissionRatePct: 10,
        settlementTermDays: 15,
        allowWhiteLabel: true,
        notes: "Örnek Anadolu Keşif ve Örnek Marmara Transfer arasında onaylı havalimanı transfer partnerliği.",
        requestedAt: "2026-11-14T08:45:00.000Z",
        respondedAt: "2026-11-14T17:10:00.000Z",
        createdAt: "2026-11-14T08:45:00.000Z",
        updatedAt: now,
      },
      {
        id: "trzm-ps-05",
        code: "PRT-BAG-005",
        requesterCompanyId: "trzm-comp-rentacar-01",
        targetCompanyId: "trzm-comp-otel-03",
        status: "PENDING",
        commissionRatePct: 11,
        settlementTermDays: 15,
        allowWhiteLabel: true,
        notes: "Örnek Ege Rota tarafından Örnek Kıyı Otel misafirlerine araç teslimi için iletilen bekleyen davet.",
        requestedAt: "2026-11-19T11:30:00.000Z",
        respondedAt: null,
        createdAt: "2026-11-19T11:30:00.000Z",
        updatedAt: now,
      },
      {
        id: "trzm-ps-06",
        code: "PRT-BAG-006",
        requesterCompanyId: "trzm-comp-transfer-04",
        targetCompanyId: "trzm-comp-rentacar-01",
        status: "REJECTED",
        commissionRatePct: 18,
        settlementTermDays: 45,
        allowWhiteLabel: false,
        notes: "Sezon komisyon ve vade koşullarında mutabakat sağlanamadığı için reddedilen örnek talep.",
        requestedAt: "2026-11-15T15:00:00.000Z",
        respondedAt: "2026-11-16T10:00:00.000Z",
        createdAt: "2026-11-15T15:00:00.000Z",
        updatedAt: now,
      },
    ]

    for (const ps of partnerships) {
      add("turizmPartnership", ps)
    }

    notes.push(
      `Turizm Faz 1 kurgusal demo partner zemini işlendi (5 firma kaydı, 4 kısıtlı partner kullanıcısı, 6 partnerlik ilişkisi).`
    )

    return {
      moduleKey: "turizm_faz1_partner_firmalar_ve_kullanicilar",
      inserted,
      skippedExisting,
      notes,
    }
  },
}
