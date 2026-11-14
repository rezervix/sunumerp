/**
 * Lojistik & Depo Yönetimi — Saf Sabitler ve Türkçe Durum Etiketleri
 * İstemci ("use client") ve sunucu dosyalarında güvenle kullanılabilir.
 */

import type {
  AsnStatus,
  GeoCoordinate,
  PodCaptureMethod,
  RfqStatus,
  ShipmentStopStatus,
  ShipmentWaveStatus,
  VehicleStatus,
} from "./types"

export const LOJISTIK_JSON_KEY_PREFIX = "lojistik"
export const LOJISTIK_TABLE_PREFIX = "Lojistik"
export const LOJISTIK_SEED_MARKER_PREFIX = "LOJISTIK-DEMO-"
export const TEDARIKCI_ROLE_NAME = "Tedarikçi"

/**
 * Mevcut demo depolarına karşılık gelen gerçekçi İstanbul/Marmara koordinatları.
 * Harita ve rota optimizasyon motoru tek doğruluk kaynağı olarak buradan beslenir.
 */
export const DEMO_WAREHOUSE_COORDINATES: Record<string, GeoCoordinate & { code: string }> = {
  "wh-merkez-01": {
    code: "DEP-MRK-01",
    label: "Merkez Soğuk Hava & Lojistik Deposu (+4°C) — Tuzla",
    lat: 40.8245,
    lng: 29.3189,
  },
  "wh-kadikoy-02": {
    code: "DEP-KDK-02",
    label: "Kadıköy Butik Mağaza & Showroom",
    lat: 40.9901,
    lng: 29.0291,
  },
  "wh-atolye-03": {
    code: "DEP-ATL-03",
    label: "E-Ticaret & Hızlı Dağıtım Hub — Ataşehir",
    lat: 40.9833,
    lng: 29.1277,
  },
  "wh-online-03": {
    code: "DEP-ATL-03",
    label: "E-Ticaret & Hızlı Dağıtım Hub — Ataşehir",
    lat: 40.9833,
    lng: 29.1277,
  },
}

export const VEHICLE_STATUS_LABELS: Record<VehicleStatus, string> = {
  MUSAYIT: "Müsait",
  SEVK_HALINDE: "Sevkiyatta",
  BAKIMDA: "Bakımda",
  PASIF: "Kullanım Dışı",
}

export const SHIPMENT_WAVE_STATUS_LABELS: Record<ShipmentWaveStatus, string> = {
  PLANLANDI: "Planlandı",
  YUKLENIYOR: "Yükleniyor",
  YOLDA: "Yolda",
  TESLIMAT_SURUYOR: "Teslimat Sürüyor",
  TAMAMLANDI: "Tamamlandı",
  IPTAL: "İptal",
}

export const SHIPMENT_STOP_STATUS_LABELS: Record<ShipmentStopStatus, string> = {
  BEKLIYOR: "Bekliyor",
  YOLDA: "Yolda",
  VARIS: "Varışta",
  TESLIM_EDILDI: "Teslim Edildi",
  KISMI_TESLIM: "Kısmi Teslim",
  TESLIM_EDILEMEDI: "Teslim Edilemedi",
}

export const POD_METHOD_LABELS: Record<PodCaptureMethod, string> = {
  IMZA_CIZIM: "Dijital İmza",
  FOTOGRAF: "Teslimat Fotoğrafı",
  QR_KOD: "QR Kod Doğrulama",
  PIN_ONAY: "Teslimat PIN Kodu",
}

export const RFQ_STATUS_LABELS: Record<RfqStatus, string> = {
  TASLAK: "Taslak",
  TEKLIFE_ACIK: "Teklife Açık",
  DEGERLENDIRMEDE: "Değerlendirmede",
  SONUCLANDI: "Sonuçlandı",
  IPTAL: "İptal",
}

export const ASN_STATUS_LABELS: Record<AsnStatus, string> = {
  ON_IHBAR: "Ön İhbar Alındı",
  YOLDA: "Sevkiyat Yolda",
  KAPI_GIRIS: "Rampada / Kapı Girişi",
  KABUL_TAMAM: "Kabul Tamamlandı",
  IPTAL: "İptal",
}

/**
 * Türkçe para birimi formatlayıcı (mevcut ERP standardıyla birebir uyumlu)
 */
export function formatTryCurrency(value: number, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits,
  }).format(Number.isFinite(value) ? value : 0)
}
