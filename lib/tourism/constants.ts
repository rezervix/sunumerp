/**
 * Turizm, Araç Kiralama, Konaklama ve B2B Partner Ekosistemi — Saf Sabitler ve Etiketler
 * İstemci ("use client") ve sunucu dosyalarında güvenle kullanılabilir; fs/db/audit import etmez.
 */

import type {
  CrossReservationStatus,
  PartnerCompanyStatus,
  PartnerCompanyType,
  PartnershipStatus,
  SharedResourceStatus,
  SharedResourceType,
  SharedResourceVisibility,
} from "./types"

export const TURIZM_TABLE_PREFIX = "Turizm"
export const TURIZM_JSON_KEY_PREFIX = "turizm"
export const TURIZM_SEED_MARKER_PREFIX = "trzm-"
export const PARTNER_ROLE_NAME = "Partner"
export const HOUSEKEEPING_ROLE_NAME = "Temizlik Personeli"
export const MAIN_COMPANY_ID = "trzm-comp-main"

export const PARTNER_COMPANY_TYPE_LABELS: Record<PartnerCompanyType, string> = {
  MAIN_OPERATOR: "Ana Operatör",
  RENTACAR: "Araç Kiralama (Rent-a-Car)",
  TOUR_OPERATOR: "Tur Operatörü",
  HOTEL: "Otel & Konaklama",
  TRANSFER: "Transfer & Ortak Filo",
}

export const PARTNER_COMPANY_STATUS_LABELS: Record<PartnerCompanyStatus, string> = {
  ACTIVE: "Aktif",
  SUSPENDED: "Askıda",
  INACTIVE: "Pasif",
}

export const PARTNERSHIP_STATUS_LABELS: Record<PartnershipStatus, string> = {
  PENDING: "Onay Bekliyor",
  APPROVED: "Onaylı Partner",
  REJECTED: "Reddedildi",
  SUSPENDED: "Askıya Alındı",
}

export const SHARED_RESOURCE_TYPE_LABELS: Record<SharedResourceType, string> = {
  VEHICLE: "Araç",
  DRIVER: "Şoför",
  GUIDE: "Tur Rehberi",
  ROOM_ALLOTMENT: "Oda Kontenjanı",
  TRANSFER_SLOT: "Transfer Aracı / Slotu",
}

export const SHARED_RESOURCE_VISIBILITY_LABELS: Record<SharedResourceVisibility, string> = {
  ALL_APPROVED_PARTNERS: "Tüm Onaylı Partnerler",
  SELECTED_PARTNERS: "Seçili Partnerler",
  PRIVATE: "Sadece Firma İçi",
}

export const SHARED_RESOURCE_STATUS_LABELS: Record<SharedResourceStatus, string> = {
  ACTIVE: "Havuzda Aktif",
  PAUSED: "Duraklatıldı",
  ARCHIVED: "Arşivlendi",
}

export const CROSS_RESERVATION_STATUS_LABELS: Record<CrossReservationStatus, string> = {
  HOLD: "Ön Kilit",
  PENDING_APPROVAL: "Partner Onayı Bekliyor",
  CONFIRMED: "Onaylandı",
  REJECTED: "Reddedildi",
  CANCELLED: "İptal Edildi",
  COMPLETED: "Tamamlandı",
}
