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
        <div className="w-full h-full bg-slate-900 text-white p-4 rounded-xl flex flex-col justify-between border border-slate-800 shadow-inner select-none font-sans">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="size-6 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-xs">Ç</div>
              <span className="text-xs font-bold tracking-tight text-slate-100">Çiçekana ERP 2026</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-800 px-2.5 py-1 rounded-md text-[11px] text-slate-300">
              <Building2 size={12} className="text-blue-400" />
              <span>Merkez Şube</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 my-auto">
            <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700/50 space-y-1">
              <p className="text-[10px] text-slate-400 font-medium">Aktif Müşteriler</p>
              <p className="text-base font-extrabold text-blue-400">142 Kayıt</p>
              <div className="flex items-center text-[9px] text-emerald-400 gap-0.5">
                <TrendingUp size={10} /> +12% bu ay
              </div>
            </div>
            <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700/50 space-y-1">
              <p className="text-[10px] text-slate-400 font-medium">Açık Görevler</p>
              <p className="text-base font-extrabold text-amber-400">28 İş</p>
              <div className="flex items-center text-[9px] text-slate-400 gap-0.5">
                <Clock size={10} /> 4 Acil Teslim
              </div>
            </div>
            <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700/50 space-y-1">
              <p className="text-[10px] text-slate-400 font-medium">Destek SLA</p>
              <p className="text-base font-extrabold text-emerald-400">%99.4</p>
              <div className="flex items-center text-[9px] text-emerald-400 gap-0.5">
                <CheckCircle2 size={10} /> Çözüldü
              </div>
            </div>
          </div>

          <div className="bg-blue-950/40 border border-blue-800/40 p-2.5 rounded-lg flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="size-2 rounded-full bg-blue-500 animate-ping" />
              <span className="text-[11px] text-blue-200 font-medium">Kurumsal Sistem Hazır</span>
            </div>
            <span className="text-[10px] text-slate-400">v2.4.0-Production</span>
          </div>
        </div>
      )

    case "dashboard-guide":
      return (
        <div className="w-full h-full bg-slate-900 text-white p-4 rounded-xl flex flex-col justify-between border border-slate-800 shadow-inner select-none font-sans">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <LayoutDashboard size={16} className="text-blue-400" />
              <span className="text-xs font-bold text-slate-200">Genel Durum & Metrikler</span>
            </div>
            <div className="flex gap-1">
              <span className="size-2 rounded-full bg-red-500" />
              <span className="size-2 rounded-full bg-amber-500" />
              <span className="size-2 rounded-full bg-emerald-500" />
            </div>
          </div>

          <div className="space-y-2 my-auto">
            <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/40 flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-[10px] text-slate-400">Gün Sonu Operasyon Raporu</p>
                <p className="text-xs font-semibold text-slate-100">8 Personel Tamamlandı</p>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">%100 Uyum</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-800/40 p-2 rounded-lg border border-slate-700/30 flex items-center gap-2">
                <Activity size={16} className="text-indigo-400 shrink-0" />
                <div className="truncate">
                  <p className="text-[9px] text-slate-400">Haftalık Yoğunluk</p>
                  <p className="text-xs font-bold text-slate-200">%78 Kapasite</p>
                </div>
              </div>
              <div className="bg-slate-800/40 p-2 rounded-lg border border-slate-700/30 flex items-center gap-2">
                <FileText size={16} className="text-pink-400 shrink-0" />
                <div className="truncate">
                  <p className="text-[9px] text-slate-400">Bekleyen Teklifler</p>
                  <p className="text-xs font-bold text-slate-200">12 Fiyat Revizesi</p>
                </div>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 flex justify-between items-center pt-1 border-t border-slate-800">
            <span>Örnek Veri Modeli</span>
            <span className="text-blue-400 font-medium">Live Snapshot</span>
          </div>
        </div>
      )

    case "tasks-guide":
      return (
        <div className="w-full h-full bg-slate-900 text-white p-4 rounded-xl flex flex-col justify-between border border-slate-800 shadow-inner select-none font-sans">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <FolderKanban size={16} className="text-emerald-400" />
              <span className="text-xs font-bold text-slate-200">Görev Tahtası (Kanban)</span>
            </div>
            <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded-full font-bold">24 Görev</span>
          </div>

          <div className="grid grid-cols-3 gap-2 my-auto">
            <div className="bg-slate-800/60 p-2 rounded-lg border border-slate-700/40 space-y-1.5">
              <p className="text-[9px] font-bold text-slate-400 uppercase">Yapılacak</p>
              <div className="bg-slate-900/80 p-2 rounded border border-slate-700/60 text-[10px] font-medium space-y-1">
                <p className="text-slate-200">Afiş Revizesi</p>
                <span className="text-[8px] bg-blue-500/20 text-blue-300 px-1 py-0.5 rounded font-bold">Atlas Medya</span>
              </div>
            </div>
            <div className="bg-slate-800/60 p-2 rounded-lg border border-slate-700/40 space-y-1.5">
              <p className="text-[9px] font-bold text-amber-400 uppercase">İşlemde</p>
              <div className="bg-slate-900/80 p-2 rounded border border-amber-500/40 text-[10px] font-medium space-y-1">
                <p className="text-slate-200">Katalog Tasarımı</p>
                <span className="text-[8px] bg-amber-500/20 text-amber-300 px-1 py-0.5 rounded font-bold">Örnek Teknoloji</span>
              </div>
            </div>
            <div className="bg-slate-800/60 p-2 rounded-lg border border-slate-700/40 space-y-1.5">
              <p className="text-[9px] font-bold text-emerald-400 uppercase">Tamamlandı</p>
              <div className="bg-slate-900/80 p-2 rounded border border-emerald-500/40 text-[10px] font-medium space-y-1">
                <p className="text-slate-200">Sosyal Medya Kiti</p>
                <span className="text-[8px] bg-emerald-500/20 text-emerald-300 px-1 py-0.5 rounded font-bold">B2B Kurumsal</span>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 flex justify-between items-center pt-1 border-t border-slate-800">
            <span>Sürükle &amp; Bırak Aktif</span>
            <span className="text-emerald-400 font-medium">Kanban Board</span>
          </div>
        </div>
      )

    case "customers-guide":
      return (
        <div className="w-full h-full bg-slate-900 text-white p-4 rounded-xl flex flex-col justify-between border border-slate-800 shadow-inner select-none font-sans">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-teal-400" />
              <span className="text-xs font-bold text-slate-200">Müşteri Portföyü</span>
            </div>
            <div className="flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded text-[10px] text-slate-300">
              <Search size={10} />
              <span>Arama...</span>
            </div>
          </div>

          <div className="space-y-1.5 my-auto">
            <div className="bg-slate-800/60 p-2 rounded-lg border border-slate-700/40 flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-slate-200 text-[11px]">Atlas Medya A.Ş.</p>
                <p className="text-[9px] text-slate-400">ornek@firma.com • İstanbul HQ</p>
              </div>
              <span className="text-[9px] bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded font-bold">Aktif Müşteri</span>
            </div>
            <div className="bg-slate-800/60 p-2 rounded-lg border border-slate-700/40 flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-slate-200 text-[11px]">Örnek Teknoloji ve Pazarlama</p>
                <p className="text-[9px] text-slate-400">destek@firma.com • Ankara Şube</p>
              </div>
              <span className="text-[9px] bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded font-bold">Aktif Müşteri</span>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 flex justify-between items-center pt-1 border-t border-slate-800">
            <span>Kurumsal CRM Kayıtları</span>
            <span className="text-teal-400 font-medium">Müşteri Kartları</span>
          </div>
        </div>
      )

    case "support-guide":
      return (
        <div className="w-full h-full bg-slate-900 text-white p-4 rounded-xl flex flex-col justify-between border border-slate-800 shadow-inner select-none font-sans">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <LifeBuoy size={16} className="text-pink-400" />
              <span className="text-xs font-bold text-slate-200">Destek Biletleri</span>
            </div>
            <span className="text-[10px] bg-pink-950 text-pink-300 border border-pink-800 px-2 py-0.5 rounded-full font-bold">SLA Aktif</span>
          </div>

          <div className="space-y-1.5 my-auto">
            <div className="bg-slate-800/60 p-2 rounded-lg border border-slate-700/40 flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-slate-200 text-[11px]">#BİLET-2026-042 — Fatura Şablon Düzenlemesi</p>
                <p className="text-[9px] text-slate-400">Departman: Muhasebe • İletim: 10 dk önce</p>
              </div>
              <span className="text-[9px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-bold">İşlemde</span>
            </div>
            <div className="bg-slate-800/60 p-2 rounded-lg border border-slate-700/40 flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-slate-200 text-[11px]">#BİLET-2026-039 — E-posta Entegrasyon Kontrolü</p>
                <p className="text-[9px] text-slate-400">Departman: IT Destek • Çözüm sağlandı</p>
              </div>
              <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold">Çözüldü</span>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 flex justify-between items-center pt-1 border-t border-slate-800">
            <span>Sistem Bilet Akışı</span>
            <span className="text-pink-400 font-medium">Destek Ekibi</span>
          </div>
        </div>
      )

    case "users-guide":
      return (
        <div className="w-full h-full bg-slate-900 text-white p-4 rounded-xl flex flex-col justify-between border border-slate-800 shadow-inner select-none font-sans">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-purple-400" />
              <span className="text-xs font-bold text-slate-200">Kullanıcılar &amp; Rol Yönetimi</span>
            </div>
            <span className="text-[10px] bg-purple-950 text-purple-300 border border-purple-800 px-2 py-0.5 rounded-full font-bold">RBAC Yetkili</span>
          </div>

          <div className="space-y-1.5 my-auto">
            <div className="bg-slate-800/60 p-2 rounded-lg border border-slate-700/40 flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-slate-200 text-[11px]">kullanici.adi (Ahmet Kurt)</p>
                <p className="text-[9px] text-slate-400">Rol: Departman Yöneticisi • Şube: Merkez HQ</p>
              </div>
              <span className="text-[9px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded font-bold">Tam Yetki</span>
            </div>
            <div className="bg-slate-800/60 p-2 rounded-lg border border-slate-700/40 flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-slate-200 text-[11px]">ornek.personel (Zeynep Demir)</p>
                <p className="text-[9px] text-slate-400">Rol: Destek Uzmanı • Şube: Ankara</p>
              </div>
              <span className="text-[9px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded font-bold">Sınırlı Yetki</span>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 flex justify-between items-center pt-1 border-t border-slate-800">
            <span>En Az Yetki Prensibi</span>
            <span className="text-purple-400 font-medium">Güvenlik Matrisi</span>
          </div>
        </div>
      )

    case "settings-guide":
      return (
        <div className="w-full h-full bg-slate-900 text-white p-4 rounded-xl flex flex-col justify-between border border-slate-800 shadow-inner select-none font-sans">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Settings size={16} className="text-amber-400" />
              <span className="text-xs font-bold text-slate-200">Şirket &amp; Sistem Konfigürasyonu</span>
            </div>
            <span className="text-[10px] bg-amber-950 text-amber-300 border border-amber-800 px-2 py-0.5 rounded-full font-bold">Sistem Ayarları</span>
          </div>

          <div className="space-y-2 my-auto">
            <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/40 space-y-1">
              <p className="text-[10px] text-slate-400 font-semibold">Resmi Şirket Unvanı</p>
              <p className="text-xs font-bold text-slate-100">Örnek Teknoloji ve Pazarlama A.Ş.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="bg-slate-800/40 p-2 rounded-lg border border-slate-700/30">
                <p className="text-slate-400">Vergi Dairesi</p>
                <p className="font-bold text-slate-200">Maslak VD</p>
              </div>
              <div className="bg-slate-800/40 p-2 rounded-lg border border-slate-700/30">
                <p className="text-slate-400">E-posta</p>
                <p className="font-bold text-slate-200">info@firma.com</p>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 flex justify-between items-center pt-1 border-t border-slate-800">
            <span>Fatura &amp; Marka Parametreleri</span>
            <span className="text-amber-400 font-medium">Merkezi Konfigürasyon</span>
          </div>
        </div>
      )

    default:
      return (
        <div className="w-full h-full bg-slate-900 text-white p-4 rounded-xl flex flex-col justify-between border border-slate-800 shadow-inner select-none font-sans">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Layers size={16} className="text-blue-400" />
              <span className="text-xs font-bold text-slate-200">{title}</span>
            </div>
            <span className="text-[10px] bg-blue-950 text-blue-300 border border-blue-800 px-2 py-0.5 rounded-full font-bold">Çiçekana ERP</span>
          </div>
          <div className="my-auto text-center space-y-1 p-2">
            <p className="text-xs font-bold text-slate-100">{title}</p>
            <p className="text-[10px] text-slate-400">Modül görsel ve operasyon rehberi</p>
          </div>
          <div className="text-[10px] text-slate-400 flex justify-between items-center pt-1 border-t border-slate-800">
            <span>Uygulama Ekranı</span>
            <span className="text-blue-400 font-medium">Canlı Önizleme</span>
          </div>
        </div>
      )
  }
}
