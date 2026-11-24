"use client"

import React, { useState, useEffect } from "react"
import { useLanguage } from "@/lib/context/LanguageContext"
import { TrashTable } from "@/components/trash/trash-table"
import { Badge } from "@/components/ui/badge"
import { Trash2, ShieldCheck, Clock, HardDrive, AlertCircle } from "lucide-react"
import { AnimatedNumber } from "@/components/ui/motion-primitives"

export default function TrashPage() {
  const { t, tText } = useLanguage()
  const [stats, setStats] = useState({
    totalTrash: 0,
    expiringSoon: 0,
    quarantineSizeMb: 0,
  })

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await fetch("/api/trash?take=1")
        if (res.ok) {
          const json = await res.json()
          setStats((prev) => ({
            ...prev,
            totalTrash: json.total || 0,
          }))
        }
      } catch (err) {
        console.error("Stats loading error:", err)
      }
    }
    loadStats()
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[--text] flex items-center gap-2.5">
            <Trash2 className="w-5 h-5 text-red-400" />
            Geri Dönüşüm Kutusu
            <Badge variant="outline" className="text-xs border-[--brand-line] text-[--brand] bg-[--brand-soft]">
              %0 Veri Kaybı Koruması
            </Badge>
          </h1>
          <p className="text-sm text-[--text-muted]">
            Silinen müşteri, proje, sipariş, finans ve kütüphane verilerini güvenle geri yükleyin veya kalıcı olarak temizleyin.
          </p>
        </div>
      </div>

      {/* Borderless KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 py-4 border-b border-[--line]">
        <div>
          <div className="flex items-center gap-2 text-[--text-muted] mb-1">
            <Trash2 className="size-4 text-zinc-500" />
            <span className="text-[11px] font-medium uppercase tracking-wider">ÇÖPTEKİ TOPLAM ÖGE</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-light text-[--text] tracking-tight">
              <AnimatedNumber value={stats.totalTrash} />
            </span>
            <span className="text-[10px] text-[--text-muted] font-medium px-2 py-0.5 rounded-full bg-white/[0.05]">
              Adet
            </span>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 text-[--text-muted] mb-1">
            <Clock className="size-4 text-amber-400" />
            <span className="text-[11px] font-medium uppercase tracking-wider">OTOMATİK TEMİZLEME</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-light text-amber-400 tracking-tight">
              30 Gün
            </span>
            <span className="text-[10px] text-amber-400 font-medium px-2 py-0.5 rounded-full bg-amber-500/10">
              Saklama
            </span>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 text-[--text-muted] mb-1">
            <ShieldCheck className="size-4 text-[--brand]" />
            <span className="text-[11px] font-medium uppercase tracking-wider">GÜVENLİK & KARANTİNA</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-light text-[--brand] tracking-tight">
              Aktif
            </span>
            <span className="text-[10px] text-[--brand] font-medium px-2 py-0.5 rounded-full bg-[--brand-soft]">
              JSON Snapshot
            </span>
          </div>
        </div>
      </div>

      {/* Bilgilendirme Kutusu */}
      <div className="bg-white/80 backdrop-blur-xl border border-[--line] rounded-[20px] p-4 text-xs text-[--text-2] flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-[--brand] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-[--text]">Sistem Bilgisi: İlişkisel Veri ve Dosya Karantinası Güvencesi</p>
          <p className="text-[--text-muted] leading-relaxed">
            Sistemde silinen herhangi bir kayıt (müşteri, görev, fatura veya medya) veritabanından hemen silinmez. Orijinal veri nesnesi tüm alt ilişkileriyle birlikte JSON snapshot olarak saklanır ve fiziksel dosyaları karantinaya alınır. 30 gün boyunca istediğiniz an &quot;Geri Yükle&quot; butonuyla ilişkileri bozulmadan sistemdeki orijinal yerine döndürebilirsiniz.
          </p>
        </div>
      </div>

      {/* Ana Tablo Bileşeni */}
      <TrashTable />
    </div>
  )
}
