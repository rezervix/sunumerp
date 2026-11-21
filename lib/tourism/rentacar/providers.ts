/**
 * Sunum ERP — Turizm Faz 2: Araç Kiralama (Rent-a-Car) Sağlayıcı Adaptörleri
 *
 * KURAL 5 (Resmî Entegrasyonlar):
 * - KABİS (arackiralama.egm.gov.tr), HGS/OGS (PTT/KGM/Banka) ve Trafik Cezası (EGM/GİB)
 *   için kamuya açık genel bir kamu REST/SOAP API dokümanı bulunmadığından (Faz 0 Raporu
 *   Bölüm 6, erişim tarihi: 2026-11-20) hiçbir sahte protokol/endpoint UYDURULMAMIŞTIR
 *   ve hiçbir resmî kuruma gerçek bağlantı DENENMEZ.
 * - Bu adaptörler "Hazırlık / Dışa Aktarma + CSV/JSON İçe Aktarma + Demo Veritabanı"
 *   modunda çalışır; kurumsal sabit IP / banka API sözleşmesi alındığında sadece
 *   yapılandırma ile bağlanacak temiz arayüz sağlar.
 */

export interface KabisPreparedNotificationPayload {
  kabisRefNo: string
  notificationType: "KIRALAMA_ACILIS" | "KIRALAMA_KAPANIS" | "EK_SURUCU_BILDIRIMI" | string
  plate: string
  vehicleVin: string | null
  renterFullName: string
  renterNationality: string
  renterTcknMasked: string | null
  renterPassportMasked: string | null
  renterLicenseNoMasked: string | null
  additionalDriverFullName: string | null
  pickupAt: string
  expectedReturnAt: string
  actualReturnAt: string | null
}

export interface KabisValidationResult {
  isComplete: boolean
  missingFields: string[]
  preparationStatus: "HAZIRLANDI" | "EKSIK_VERI"
  adapterNote: string
}

export interface IKabisPreparationAdapter {
  readonly adapterId: string
  readonly displayName: string
  readonly mode: "preparation-export"
  readonly officialPortalRef: string
  readonly docsAccessDate: string
  validateAndPrepare(input: {
    plate?: string | null
    vehicleVin?: string | null
    renterFullName?: string | null
    renterNationality?: string | null
    renterTckn?: string | null
    renterPassportNo?: string | null
    renterLicenseNo?: string | null
    pickupAt?: string | Date | null
    expectedReturnAt?: string | Date | null
  }): KabisValidationResult
  formatCsvExport(records: KabisPreparedNotificationPayload[]): string
}

export class LocalKabisPreparationAdapter implements IKabisPreparationAdapter {
  readonly adapterId = "turizm-kabis-preparation-export"
  readonly displayName = "KABİS Bildirim Hazırlık ve Dışa Aktarma Adaptörü (Resmî Erişim/Sabit IP Gerektirir)"
  readonly mode = "preparation-export" as const
  readonly officialPortalRef = "https://arackiralama.egm.gov.tr/"
  readonly docsAccessDate = "2026-11-20"

  validateAndPrepare(input: {
    plate?: string | null
    vehicleVin?: string | null
    renterFullName?: string | null
    renterNationality?: string | null
    renterTckn?: string | null
    renterPassportNo?: string | null
    renterLicenseNo?: string | null
    pickupAt?: string | Date | null
    expectedReturnAt?: string | Date | null
  }): KabisValidationResult {
    const missingFields: string[] = []
    if (!input.plate || !String(input.plate).trim()) missingFields.push("Araç Plakası")
    if (!input.vehicleVin || !String(input.vehicleVin).trim()) missingFields.push("Araç Şasi No (VIN)")
    if (!input.renterFullName || !String(input.renterFullName).trim()) missingFields.push("Kiracı Ad Soyad / Unvan")
    const hasIdentity =
      (input.renterTckn && String(input.renterTckn).trim().length >= 7) ||
      (input.renterPassportNo && String(input.renterPassportNo).trim().length >= 5)
    if (!hasIdentity) missingFields.push("TCKN veya Pasaport No")
    if (!input.renterLicenseNo || !String(input.renterLicenseNo).trim()) {
      missingFields.push("Sürücü Belgesi (Ehliyet) No")
    }
    if (!input.pickupAt) missingFields.push("Teslim (Alış) Tarihi/Saati")
    if (!input.expectedReturnAt) missingFields.push("Planlanan İade Tarihi/Saati")

    const isComplete = missingFields.length === 0
    return {
      isComplete,
      missingFields,
      preparationStatus: isComplete ? "HAZIRLANDI" : "EKSIK_VERI",
      adapterNote:
        "Resmî erişim/doküman ve Emniyet sabit IP yetkilendirmesi gerektiğinden bildirim verisi kurum dışa aktarma paketi olarak hazırlandı (gerçek dış bağlantı kurulmaz).",
    }
  }

  formatCsvExport(records: KabisPreparedNotificationPayload[]): string {
    const header = [
      "KABIS_REF_NO",
      "BILDIRIM_TIPI",
      "PLAKA",
      "SASI_NO",
      "KIRACI_AD_SOYAD",
      "UYRUK",
      "TCKN_MASKELI",
      "PASAPORT_MASKELI",
      "EHLIYET_NO_MASKELI",
      "EK_SURUCU",
      "TESLIM_ZAMANI",
      "PLANLANAN_IADE",
      "FIILI_IADE",
    ].join(";")

    const lines = records.map((r) =>
      [
        r.kabisRefNo,
        r.notificationType,
        r.plate,
        r.vehicleVin || "",
        r.renterFullName,
        r.renterNationality,
        r.renterTcknMasked || "",
        r.renterPassportMasked || "",
        r.renterLicenseNoMasked || "",
        r.additionalDriverFullName || "",
        r.pickupAt,
        r.expectedReturnAt,
        r.actualReturnAt || "",
      ]
        .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
        .join(";")
    )

    return [header, ...lines].join("\n")
  }
}

export interface ParsedTollPassImportRow {
  plate: string
  passDateTime: string
  highwayOrBridgeName: string
  entryPoint: string | null
  exitPoint: string | null
  amountTry: number
}

export interface IHgsTollImportAdapter {
  readonly adapterId: string
  readonly displayName: string
  readonly mode: "demo-db-and-csv-import"
  parseCsvRows(csvContent: string): ParsedTollPassImportRow[]
}

export class LocalHgsTollImportAdapter implements IHgsTollImportAdapter {
  readonly adapterId = "turizm-hgs-csv-import"
  readonly displayName = "HGS / Otoyol Geçiş CSV/Dosya İçe Aktarma ve Demo Adaptörü"
  readonly mode = "demo-db-and-csv-import" as const

  parseCsvRows(csvContent: string): ParsedTollPassImportRow[] {
    const lines = String(csvContent || "")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
    const rows: ParsedTollPassImportRow[] = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (i === 0 && /plaka|plate/i.test(line)) continue
      const cols = line.split(/[;,]/).map((c) => c.replace(/^"|"$/g, "").trim())
      if (cols.length < 4) continue
      const [plate, dtRaw, highway, amountRaw, entryPoint, exitPoint] = cols
      const amount = Number(String(amountRaw || "0").replace(",", "."))
      const dt = new Date(dtRaw)
      if (!plate || Number.isNaN(dt.getTime()) || Number.isNaN(amount)) continue
      rows.push({
        plate: plate.toUpperCase(),
        passDateTime: dt.toISOString(),
        highwayOrBridgeName: highway || "Otoyol / Köprü Geçişi",
        entryPoint: entryPoint || null,
        exitPoint: exitPoint || null,
        amountTry: Math.max(0, Number(amount.toFixed(2))),
      })
    }

    return rows
  }
}

export function createRentACarAdapters() {
  return {
    kabis: new LocalKabisPreparationAdapter(),
    hgsToll: new LocalHgsTollImportAdapter(),
  }
}
