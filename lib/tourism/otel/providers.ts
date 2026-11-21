/**
 * Sunum ERP — Turizm Faz 3: Otel Yönetimi (Mini PMS) — KBS Hazırlık ve Dışa Aktarma Adaptörü
 *
 * KURAL 5 (Resmî Entegrasyonlar — Faz 0 Bölüm 6.2):
 * - EGM KBS (`https://kbs.egm.gov.tr/`, EGMSEC 2FA/OTP + sabit IP) ve Jandarma KBS Tesis 2
 *   (`jandarma.gov.tr` / `turkiye.gov.tr/jandarma-kimlik-bildirim-sistemi`, portal içi yetkili
 *   tesis web servis tokenı + sabit IP) için kamuya açık genel REST/SOAP şeması erişimi
 *   olmadığından (erişim tarihi: 2026-11-20) sahte protokol veya gerçek bağlantı YAZILMAZ.
 * - Bu adaptör check-in/check-out verilerinden KBS bildirim alanlarını doğrular, eksik
 *   alanları raporlar, kurum dışa aktarma şablonunu (XML şablonu, CSV, JSON) üretir ve
 *   toplu/yeniden gönderim hazırlık zemini sunar.
 */

export interface KbsPreparedPayload {
  kbsRefNo: string
  notificationType: "MISAFIR_GIRIS" | "MISAFIR_CIKIS" | "ODA_DEGISIKLIGI" | string
  roomNumber: string
  guestFullName: string
  guestNationality: string
  guestTcknMasked: string | null
  guestPassportMasked: string | null
  guestBirthYear: number | null
  checkInAt: string
  expectedCheckOutAt: string
  actualCheckOutAt: string | null
}

export interface KbsValidationResult {
  isComplete: boolean
  missingFields: string[]
  preparationStatus: "HAZIRLANDI" | "EKSIK_VERI"
  adapterNote: string
}

export interface IKbsPreparationAdapter {
  readonly adapterId: string
  readonly displayName: string
  readonly mode: "preparation-export"
  readonly officialPortalRefs: readonly string[]
  readonly docsAccessDate: string
  validateAndPrepare(input: {
    roomNumber?: string | null
    guestFullName?: string | null
    guestNationality?: string | null
    guestTckn?: string | null
    guestPassportNo?: string | null
    guestBirthDate?: string | Date | null
    checkInAt?: string | Date | null
  }): KbsValidationResult
  formatCsvExport(records: KbsPreparedPayload[]): string
  formatXmlTemplateExport(records: KbsPreparedPayload[]): string
}

function escapeXml(val: unknown): string {
  return String(val ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

export class LocalKbsPreparationAdapter implements IKbsPreparationAdapter {
  readonly adapterId = "turizm-kbs-preparation-export"
  readonly displayName =
    "KBS Kimlik Bildirim Hazırlık & Dışa Aktarma Adaptörü (Resmî Erişim/EGMSEC/Sabit IP Gerektirir)"
  readonly mode = "preparation-export" as const
  readonly officialPortalRefs = [
    "https://kbs.egm.gov.tr/",
    "https://www.turkiye.gov.tr/jandarma-kimlik-bildirim-sistemi",
  ] as const
  readonly docsAccessDate = "2026-11-20"

  validateAndPrepare(input: {
    roomNumber?: string | null
    guestFullName?: string | null
    guestNationality?: string | null
    guestTckn?: string | null
    guestPassportNo?: string | null
    guestBirthDate?: string | Date | null
    checkInAt?: string | Date | null
  }): KbsValidationResult {
    const missingFields: string[] = []
    if (!input.roomNumber || !String(input.roomNumber).trim()) missingFields.push("Oda Numarası")
    if (!input.guestFullName || !String(input.guestFullName).trim()) {
      missingFields.push("Misafir Ad Soyad")
    }
    const hasIdentity =
      (input.guestTckn && String(input.guestTckn).trim().length >= 7) ||
      (input.guestPassportNo && String(input.guestPassportNo).trim().length >= 5)
    if (!hasIdentity) missingFields.push("TCKN veya Pasaport Numarası")
    if (!input.guestNationality || !String(input.guestNationality).trim()) {
      missingFields.push("Uyruk Kodu")
    }
    if (!input.guestBirthDate) missingFields.push("Doğum Tarihi")
    if (!input.checkInAt) missingFields.push("Giriş (Check-In) Tarihi/Saati")

    const isComplete = missingFields.length === 0
    return {
      isComplete,
      missingFields,
      preparationStatus: isComplete ? "HAZIRLANDI" : "EKSIK_VERI",
      adapterNote:
        "Resmî erişim, EGMSEC/web servis yetkisi ve sabit IP gerektiğinden kayıt kurum formatında dışa aktarma paketi olarak hazırlandı (gerçek dış bağlantı kurulmaz).",
    }
  }

  formatCsvExport(records: KbsPreparedPayload[]): string {
    const header = [
      "KBS_REF_NO",
      "BILDIRIM_TIPI",
      "ODA_NO",
      "MISAFIR_AD_SOYAD",
      "UYRUK",
      "TCKN_MASKELI",
      "PASAPORT_MASKELI",
      "DOGUM_YILI",
      "GIRIS_ZAMANI",
      "PLANLANAN_CIKIS",
      "FIILI_CIKIS",
    ].join(";")

    const lines = records.map((r) =>
      [
        r.kbsRefNo,
        r.notificationType,
        r.roomNumber,
        r.guestFullName,
        r.guestNationality,
        r.guestTcknMasked || "",
        r.guestPassportMasked || "",
        r.guestBirthYear ?? "",
        r.checkInAt,
        r.expectedCheckOutAt,
        r.actualCheckOutAt || "",
      ]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(";")
    )

    return [header, ...lines].join("\n")
  }

  formatXmlTemplateExport(records: KbsPreparedPayload[]): string {
    const rowsXml = records
      .map(
        (r) => `  <BildirimKaydi ref="${escapeXml(r.kbsRefNo)}">
    <BildirimTipi>${escapeXml(r.notificationType)}</BildirimTipi>
    <OdaNo>${escapeXml(r.roomNumber)}</OdaNo>
    <MisafirAdSoyad>${escapeXml(r.guestFullName)}</MisafirAdSoyad>
    <Uyruk>${escapeXml(r.guestNationality)}</Uyruk>
    <KimlikMaskeli>${escapeXml(r.guestTcknMasked || r.guestPassportMasked || "")}</KimlikMaskeli>
    <DogumYili>${escapeXml(r.guestBirthYear ?? "")}</DogumYili>
    <GirisZamani>${escapeXml(r.checkInAt)}</GirisZamani>
    <PlanlananCikis>${escapeXml(r.expectedCheckOutAt)}</PlanlananCikis>
    <FiiliCikis>${escapeXml(r.actualCheckOutAt || "")}</FiiliCikis>
  </BildirimKaydi>`
      )
      .join("\n")

    return `<?xml version="1.0" encoding="UTF-8"?>
<!-- Sunum ERP KBS Hazırlık Şablonu (Resmî Kurum Erişimi / Tesis Portalı Dışa Aktarma Paketi) -->
<KbsHazirlikPaketi kayitSayisi="${records.length}">
${rowsXml}
</KbsHazirlikPaketi>`
  }
}

export function createHotelAdapters() {
  return {
    kbs: new LocalKbsPreparationAdapter(),
  }
}
