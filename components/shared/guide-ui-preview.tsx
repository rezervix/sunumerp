"use client"

import React from "react"
import { 
  LayoutDashboard, 
  FolderKanban, 
  Users, 
  LifeBuoy, 
  ShieldCheck, 
  Settings, 
  FolderGit2, 
  Terminal,
  Search,
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building2,
  TrendingUp,
  FileText,
  Activity,
  Layers
} from "lucide-react"

interface GuideUIPreviewProps {
  guideId: string
  stepId: string
  title: string
}

export function GuideUIPreview({ guideId, stepId, title }: GuideUIPreviewProps) {
  // Render specific UI vector mockups based on guideId & stepId
  switch (guideId) {
    case "welcome-overview":
      return (
        <div className="w-full h-full bg-[var(--bg)] text-[var(--text)] p-4 rounded-xl flex flex-col justify-between border border-[var(--line)] shadow-inner select-none font-sans">
          <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
            <div className="flex items-center gap-2">
              <div className="size-6 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-xs">Ç</div>
              <span className="text-xs font-bold tracking-tight text-[var(--text)]">Çiçekana ERP 2026</span>
            </div>
            <div className="flex items-center gap-1.5 bg-[var(--muted-bg)] px-2.5 py-1 rounded-md text-[11px] text-[var(--text-2)]">
              <Building2 size={12} className="text-blue-400" />
              <span>Merkez Şube</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 my-auto">
            <div className="bg-[var(--muted-bg)] p-3 rounded-lg border border-[var(--line-soft)] space-y-1">
              <p className="text-[10px] text-[var(--text-muted)] font-medium">Aktif Müşteriler</p>
              <p className="text-base font-extrabold text-blue-400">142 Kayıt</p>
              <div className="flex items-center text-[9px] text-[--brand] gap-0.5">
                <TrendingUp size={10} /> +12% bu ay
              </div>
            </div>
            <div className="bg-[var(--muted-bg)] p-3 rounded-lg border border-[var(--line-soft)] space-y-1">
              <p className="text-[10px] text-[var(--text-muted)] font-medium">Açık Görevler</p>
              <p className="text-base font-extrabold text-[var(--warn)]">28 İş</p>
              <div className="flex items-center text-[9px] text-[var(--text-muted)] gap-0.5">
                <Clock size={10} /> 4 Acil Teslim
              </div>
            </div>
            <div className="bg-[var(--muted-bg)] p-3 rounded-lg border border-[var(--line-soft)] space-y-1">
              <p className="text-[10px] text-[var(--text-muted)] font-medium">Destek SLA</p>
              <p className="text-base font-extrabold text-[--brand]">%99.4</p>
              <div className="flex items-center text-[9px] text-[--brand] gap-0.5">
                <CheckCircle2 size={10} /> Çözüldü
              </div>
            </div>
          </div>

          <div className="bg-blue-950/40 border border-blue-800/40 p-2.5 rounded-lg flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="size-2 rounded-full bg-blue-500 animate-ping" />
              <span className="text-[11px] text-blue-200 font-medium">Kurumsal Sistem Hazır</span>
            </div>
            <span className="text-[10px] text-[var(--text-muted)]">v2.4.0-Production</span>
          </div>
        </div>
      )

    case "dashboard-guide":
      return (
        <div className="w-full h-full bg-[var(--bg)] text-[var(--text)] p-4 rounded-xl flex flex-col justify-between border border-[var(--line)] shadow-inner select-none font-sans">
          <div className="flex items-center justify-between border-b border-[var(--line)] pb-2.5">
            <div className="flex items-center gap-2">
              <LayoutDashboard size={16} className="text-blue-400" />
              <span className="text-xs font-bold text-[var(--text-2)]">Genel Durum & Metrikler</span>
            </div>
            <div className="flex gap-1">
              <span className="size-2 rounded-full bg-red-500" />
              <span className="size-2 rounded-full bg-amber-500" />
              <span className="size-2 rounded-full bg-[--brand]" />
            </div>
          </div>

          <div className="space-y-2 my-auto">
            <div className="bg-[var(--muted-bg)] p-2.5 rounded-lg border border-[var(--line)]/40 flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-[10px] text-[var(--text-muted)]">Gün Sonu Operasyon Raporu</p>
                <p className="text-xs font-semibold text-[var(--text)]">8 Personel Tamamlandı</p>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[--brand]/20 text-[--brand] font-bold">%100 Uyum</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-[var(--muted-bg)] p-2 rounded-lg border border-[var(--line)]/30 flex items-center gap-2">
                <Activity size={16} className="text-[var(--brand)] shrink-0" />
                <div className="truncate">
                  <p className="text-[9px] text-[var(--text-muted)]">Haftalık Yoğunluk</p>
                  <p className="text-xs font-bold text-[var(--text-2)]">%78 Kapasite</p>
                </div>
              </div>
              <div className="bg-[var(--muted-bg)] p-2 rounded-lg border border-[var(--line)]/30 flex items-center gap-2">
                <FileText size={16} className="text-[var(--brand)] shrink-0" />
                <div className="truncate">
                  <p className="text-[9px] text-[var(--text-muted)]">Bekleyen Teklifler</p>
                  <p className="text-xs font-bold text-[var(--text-2)]">12 Fiyat Revizesi</p>
                </div>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-[var(--text-muted)] flex justify-between items-center pt-1 border-t border-[var(--line)]">
            <span>Örnek Veri Modeli</span>
            <span className="text-blue-400 font-medium">Live Snapshot</span>
          </div>
        </div>
      )

    case "tasks-guide":
      return (
        <div className="w-full h-full bg-[var(--bg)] text-[var(--text)] p-4 rounded-xl flex flex-col justify-between border border-[var(--line)] shadow-inner select-none font-sans">
          <div className="flex items-center justify-between border-b border-[var(--line)] pb-2.5">
            <div className="flex items-center gap-2">
              <FolderKanban size={16} className="text-[--brand]" />
              <span className="text-xs font-bold text-[var(--text-2)]">Görev Tahtası (Kanban)</span>
            </div>
            <span className="text-[10px] bg-[--brand-soft] text-[--brand] border border-[--brand-line] px-2 py-0.5 rounded-full font-bold">24 Görev</span>
          </div>

          <div className="grid grid-cols-3 gap-2 my-auto">
            <div className="bg-[var(--muted-bg)] p-2 rounded-lg border border-[var(--line)]/40 space-y-1.5">
              <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase">Yapılacak</p>
              <div className="bg-[var(--bg)] p-2 rounded border border-[var(--line-soft)] text-[10px] font-medium space-y-1">
                <p className="text-[var(--text-2)]">Afiş Revizesi</p>
                <span className="text-[8px] bg-blue-500/20 text-blue-300 px-1 py-0.5 rounded font-bold">Atlas Medya</span>
              </div>
            </div>
            <div className="bg-[var(--muted-bg)] p-2 rounded-lg border border-[var(--line)]/40 space-y-1.5">
              <p className="text-[9px] font-bold text-[var(--warn)] uppercase">İşlemde</p>
              <div className="bg-[var(--bg)] p-2 rounded border border-[var(--warn-line)] text-[10px] font-medium space-y-1">
                <p className="text-[var(--text-2)]">Katalog Tasarımı</p>
                <span className="text-[8px] bg-[var(--warn-soft)] text-[var(--warn)] px-1 py-0.5 rounded font-bold">Örnek Teknoloji</span>
              </div>
            </div>
            <div className="bg-[var(--muted-bg)] p-2 rounded-lg border border-[var(--line)]/40 space-y-1.5">
              <p className="text-[9px] font-bold text-[--brand] uppercase">Tamamlandı</p>
              <div className="bg-[var(--bg)] p-2 rounded border border-[--brand-line] text-[10px] font-medium space-y-1">
                <p className="text-[var(--text-2)]">Sosyal Medya Kiti</p>
                <span className="text-[8px] bg-[--brand]/20 text-[--brand] px-1 py-0.5 rounded font-bold">B2B Kurumsal</span>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-[var(--text-muted)] flex justify-between items-center pt-1 border-t border-[var(--line)]">
            <span>Sürükle &amp; Bırak Aktif</span>
            <span className="text-[--brand] font-medium">Kanban Board</span>
          </div>
        </div>
      )

    case "customers-guide":
      return (
        <div className="w-full h-full bg-[var(--bg)] text-[var(--text)] p-4 rounded-xl flex flex-col justify-between border border-[var(--line)] shadow-inner select-none font-sans">
          <div className="flex items-center justify-between border-b border-[var(--line)] pb-2.5">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-[var(--brand)]" />
              <span className="text-xs font-bold text-[var(--text-2)]">Müşteri Portföyü</span>
            </div>
            <div className="flex items-center gap-1 bg-[var(--muted-bg)] px-2 py-0.5 rounded text-[10px] text-[var(--text-2)]">
              <Search size={10} />
              <span>Arama...</span>
            </div>
          </div>

          <div className="space-y-1.5 my-auto">
            <div className="bg-[var(--muted-bg)] p-2 rounded-lg border border-[var(--line)]/40 flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-[var(--text-2)] text-[11px]">Atlas Medya A.Ş.</p>
                <p className="text-[9px] text-[var(--text-muted)]">ornek@firma.com • İstanbul HQ</p>
              </div>
              <span className="text-[9px] bg-[var(--brand-soft)] text-[var(--brand)] px-2 py-0.5 rounded font-bold">Aktif Müşteri</span>
            </div>
            <div className="bg-[var(--muted-bg)] p-2 rounded-lg border border-[var(--line)]/40 flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-[var(--text-2)] text-[11px]">Örnek Teknoloji ve Pazarlama</p>
                <p className="text-[9px] text-[var(--text-muted)]">destek@firma.com • Ankara Şube</p>
              </div>
              <span className="text-[9px] bg-[var(--brand-soft)] text-[var(--brand)] px-2 py-0.5 rounded font-bold">Aktif Müşteri</span>
            </div>
          </div>

          <div className="text-[10px] text-[var(--text-muted)] flex justify-between items-center pt-1 border-t border-[var(--line)]">
            <span>Kurumsal CRM Kayıtları</span>
            <span className="text-[var(--brand)] font-medium">Müşteri Kartları</span>
          </div>
        </div>
      )

    case "support-guide":
      return (
        <div className="w-full h-full bg-[var(--bg)] text-[var(--text)] p-4 rounded-xl flex flex-col justify-between border border-[var(--line)] shadow-inner select-none font-sans">
          <div className="flex items-center justify-between border-b border-[var(--line)] pb-2.5">
            <div className="flex items-center gap-2">
              <LifeBuoy size={16} className="text-[var(--brand)]" />
              <span className="text-xs font-bold text-[var(--text-2)]">Destek Biletleri</span>
            </div>
            <span className="text-[10px] bg-[var(--brand-soft)] text-[var(--brand)] border border-[var(--brand-line)] px-2 py-0.5 rounded-full font-bold">SLA Aktif</span>
          </div>

          <div className="space-y-1.5 my-auto">
            <div className="bg-[var(--muted-bg)] p-2 rounded-lg border border-[var(--line)]/40 flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-[var(--text-2)] text-[11px]">#BİLET-2026-042 — Fatura Şablon Düzenlemesi</p>
                <p className="text-[9px] text-[var(--text-muted)]">Departman: Muhasebe • İletim: 10 dk önce</p>
              </div>
              <span className="text-[9px] bg-[var(--warn-soft)] text-[var(--warn)] px-2 py-0.5 rounded font-bold">İşlemde</span>
            </div>
            <div className="bg-[var(--muted-bg)] p-2 rounded-lg border border-[var(--line)]/40 flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-[var(--text-2)] text-[11px]">#BİLET-2026-039 — E-posta Entegrasyon Kontrolü</p>
                <p className="text-[9px] text-[var(--text-muted)]">Departman: IT Destek • Çözüm sağlandı</p>
              </div>
              <span className="text-[9px] bg-[--brand]/20 text-[--brand] px-2 py-0.5 rounded font-bold">Çözüldü</span>
            </div>
          </div>

          <div className="text-[10px] text-[var(--text-muted)] flex justify-between items-center pt-1 border-t border-[var(--line)]">
            <span>Sistem Bilet Akışı</span>
            <span className="text-[var(--brand)] font-medium">Destek Ekibi</span>
          </div>
        </div>
      )

    case "users-guide":
      return (
        <div className="w-full h-full bg-[var(--bg)] text-[var(--text)] p-4 rounded-xl flex flex-col justify-between border border-[var(--line)] shadow-inner select-none font-sans">
          <div className="flex items-center justify-between border-b border-[var(--line)] pb-2.5">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-[var(--brand)]" />
              <span className="text-xs font-bold text-[var(--text-2)]">Kullanıcılar &amp; Rol Yönetimi</span>
            </div>
            <span className="text-[10px] bg-[var(--brand-soft)] text-[var(--brand)] border border-[var(--brand-line)] px-2 py-0.5 rounded-full font-bold">RBAC Yetkili</span>
          </div>

          <div className="space-y-1.5 my-auto">
            <div className="bg-[var(--muted-bg)] p-2 rounded-lg border border-[var(--line)]/40 flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-[var(--text-2)] text-[11px]">kullanici.adi (Ahmet Kurt)</p>
                <p className="text-[9px] text-[var(--text-muted)]">Rol: Departman Yöneticisi • Şube: Merkez HQ</p>
              </div>
              <span className="text-[9px] bg-[var(--brand-soft)] text-[var(--brand)] px-2 py-0.5 rounded font-bold">Tam Yetki</span>
            </div>
            <div className="bg-[var(--muted-bg)] p-2 rounded-lg border border-[var(--line)]/40 flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-[var(--text-2)] text-[11px]">ornek.personel (Zeynep Demir)</p>
                <p className="text-[9px] text-[var(--text-muted)]">Rol: Destek Uzmanı • Şube: Ankara</p>
              </div>
              <span className="text-[9px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded font-bold">Sınırlı Yetki</span>
            </div>
          </div>

          <div className="text-[10px] text-[var(--text-muted)] flex justify-between items-center pt-1 border-t border-[var(--line)]">
            <span>En Az Yetki Prensibi</span>
            <span className="text-[var(--brand)] font-medium">Güvenlik Matrisi</span>
          </div>
        </div>
      )

    case "settings-guide":
      return (
        <div className="w-full h-full bg-[var(--bg)] text-[var(--text)] p-4 rounded-xl flex flex-col justify-between border border-[var(--line)] shadow-inner select-none font-sans">
          <div className="flex items-center justify-between border-b border-[var(--line)] pb-2.5">
            <div className="flex items-center gap-2">
              <Settings size={16} className="text-[var(--warn)]" />
              <span className="text-xs font-bold text-[var(--text-2)]">Şirket &amp; Sistem Konfigürasyonu</span>
            </div>
            <span className="text-[10px] bg-amber-950 text-[var(--warn)] border border-amber-800 px-2 py-0.5 rounded-full font-bold">Sistem Ayarları</span>
          </div>

          <div className="space-y-2 my-auto">
            <div className="bg-[var(--muted-bg)] p-2.5 rounded-lg border border-[var(--line)]/40 space-y-1">
              <p className="text-[10px] text-[var(--text-muted)] font-semibold">Resmi Şirket Unvanı</p>
              <p className="text-xs font-bold text-[var(--text)]">Örnek Teknoloji ve Pazarlama A.Ş.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="bg-[var(--muted-bg)] p-2 rounded-lg border border-[var(--line)]/30">
                <p className="text-[var(--text-muted)]">Vergi Dairesi</p>
                <p className="font-bold text-[var(--text-2)]">Maslak VD</p>
              </div>
              <div className="bg-[var(--muted-bg)] p-2 rounded-lg border border-[var(--line)]/30">
                <p className="text-[var(--text-muted)]">E-posta</p>
                <p className="font-bold text-[var(--text-2)]">info@firma.com</p>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-[var(--text-muted)] flex justify-between items-center pt-1 border-t border-[var(--line)]">
            <span>Fatura &amp; Marka Parametreleri</span>
            <span className="text-[var(--warn)] font-medium">Merkezi Konfigürasyon</span>
          </div>
        </div>
      )

    default:
      return (
        <div className="w-full h-full bg-[var(--bg)] text-[var(--text)] p-4 rounded-xl flex flex-col justify-between border border-[var(--line)] shadow-inner select-none font-sans">
          <div className="flex items-center justify-between border-b border-[var(--line)] pb-2">
            <div className="flex items-center gap-2">
              <Layers size={16} className="text-blue-400" />
              <span className="text-xs font-bold text-[var(--text-2)]">{title}</span>
            </div>
            <span className="text-[10px] bg-blue-950 text-blue-300 border border-blue-800 px-2 py-0.5 rounded-full font-bold">Çiçekana ERP</span>
          </div>
          <div className="my-auto text-center space-y-1 p-2">
            <p className="text-xs font-bold text-[var(--text)]">{title}</p>
            <p className="text-[10px] text-[var(--text-muted)]">Modül görsel ve operasyon rehberi</p>
          </div>
          <div className="text-[10px] text-[var(--text-muted)] flex justify-between items-center pt-1 border-t border-[var(--line)]">
            <span>Uygulama Ekranı</span>
            <span className="text-blue-400 font-medium">Canlı Önizleme</span>
          </div>
        </div>
      )
  }
}
