import React from "react"
import {
  FileText, Camera, Upload, AlertCircle, RefreshCw, CheckCircle2,
  Clock, XCircle, Instagram, Video, Youtube, Facebook, Linkedin, X, Globe
} from "lucide-react"

// ─── TİP TANIMLARI ────────────────────────────────────────────────────

export interface ContentItem {
  id: string
  branchId: string
  title: string
  caption?: string | null
  description?: string | null
  platforms: string[]
  contentType: string
  scheduledDate: string
  scheduledTime?: string | null
  status: string
  shooterId?: string | null
  editorId?: string | null
  managerId?: string | null
  designerId?: string | null
  iptalOncesiDurum?: string | null
  shootId?: string | null
  clientApprovalRequired: boolean
  clientApprovalStatus?: string | null
  publishedUrl?: string | null
  createdById: string
  createdAt: string
  updatedAt: string
  branch: { id: string; name: string; themeColor: string; logoUrl?: string | null }
  shoot?: { id: string; shootDate: string; shootTime?: string | null; location?: string | null; status: string } | null
  media: { id: string; fileUrl: string; fileType: string; thumbnailUrl?: string | null }[]
  _count: { media: number; chatLinks: number }
}

export interface ProductionShoot {
  id: string
  branchId: string
  shootDate: string
  shootTime?: string | null
  location?: string | null
  videographerIds: string[]
  status: string
  equipmentNotes?: string | null
  createdAt: string
  branch: { id: string; name: string; themeColor: string }
  contentItems: { id: string; title: string; status: string; platforms: string[]; contentType: string }[]
  _count: { contentItems: number }
}

// ─── SABİTLER ─────────────────────────────────────────────────────────

export const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  taslak:                 { label: "Taslak",                  color: "text-slate-600",   bg: "bg-slate-100 dark:bg-slate-800",     icon: <FileText size={12} /> },
  cekim_tasarim_bekliyor: { label: "Çekim/Tasarım Bekliyor",  color: "text-amber-600",   bg: "bg-amber-100 dark:bg-amber-900/40",  icon: <Camera size={12} /> },
  yuklendi:               { label: "Yüklendi",                color: "text-blue-600",    bg: "bg-blue-100 dark:bg-blue-900/40",    icon: <Upload size={12} /> },
  revize_istendi:         { label: "Revize İstendi",          color: "text-orange-600",  bg: "bg-orange-100 dark:bg-orange-900/40",icon: <AlertCircle size={12} /> },
  revize_edildi:          { label: "Revize Edildi",           color: "text-purple-600",  bg: "bg-purple-100 dark:bg-purple-900/40",icon: <RefreshCw size={12} /> },
  onaylandi:              { label: "Onaylandı",               color: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-900/40",icon: <CheckCircle2 size={12} /> },
  planlandi:              { label: "Planlandı",               color: "text-sky-600",     bg: "bg-sky-100 dark:bg-sky-900/40",      icon: <Clock size={12} /> },
  yayinlandi:             { label: "Yayınlandı",              color: "text-indigo-600",  bg: "bg-indigo-100 dark:bg-indigo-900/40",icon: <CheckCircle2 size={12} /> },
  iptal_edildi:           { label: "İptal Edildi",            color: "text-red-650 line-through opacity-70", bg: "bg-red-50 dark:bg-red-95/40", icon: <XCircle size={12} /> },
}

export const PLATFORM_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  instagram: { label: "Instagram", color: "#E1306C", icon: <Instagram size={12} /> },
  tiktok:    { label: "TikTok",    color: "#000000", icon: <Video size={12} /> },
  youtube:   { label: "YouTube",   color: "#FF0000", icon: <Youtube size={12} /> },
  facebook:  { label: "Facebook",  color: "#1877F2", icon: <Facebook size={12} /> },
  linkedin:  { label: "LinkedIn",  color: "#0A66C2", icon: <Linkedin size={12} /> },
  x:         { label: "X",         color: "#000000", icon: <X size={12} /> },
  other:     { label: "Diğer",     color: "#6B7280", icon: <Globe size={12} /> },
}

export const CONTENT_TYPE_LABELS: Record<string, string> = {
  reels:       "Reels Videosu",
  motion:      "Motion Video",
  akis:        "Akış Gönderisi",
  story:       "Story Tasarımı",
}
