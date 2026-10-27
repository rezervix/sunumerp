"use client"

import React, { useState, useEffect } from "react"
import { useLanguage } from "@/lib/context/LanguageContext"
import { TrashTable } from "@/components/trash/trash-table"
import { Badge } from "@/components/ui/badge"
import { Trash2, ShieldCheck, Clock, HardDrive, AlertCircle } from "lucide-react"

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
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-red-500/10 text-red-600 dark:text-red-400 rounded-2xl border border-red-500/20 shadow-xs">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                Geri Dönüşüm Kutusu
                <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5">
                  %0 Veri Kaybı Koruması
                </Badge>
              </h1>
              <p className="text-xs text-muted-foreground">
                Çiçekana ERP — Silinen müşteri, proje, sipariş, finans ve kütüphane verilerini güvenle geri yükleyin veya kalıcı olarak temizleyin.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Özet Kartlar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card p-4 rounded-2xl border shadow-xs flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600 border border-blue-500/20">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Çöpteki Toplam Öge</p>
            <p className="text-xl font-bold text-foreground">{stats.totalTrash}</p>
          </div>
        </div>

        <div className="bg-card p-4 rounded-2xl border shadow-xs flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Otomatik Temizleme Süresi</p>
            <p className="text-xl font-bold text-foreground">30 Gün Saklama</p>
          </div>
        </div>

        <div className="bg-card p-4 rounded-2xl border shadow-xs flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Güvenlik & Karantina</p>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">Aktif (JSON Snapshot)</p>
          </div>
        </div>
      </div>

      {/* Bilgilendirme Kutusu */}
      <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-4 text-xs text-blue-700 dark:text-blue-300 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold">Sistem Bilgisi: İlişkisel Veri ve Dosya Karantinası Güvencesi</p>
          <p className="text-muted-foreground leading-relaxed">
            Çiçekana ERP'de silinen herhangi bir kayıt (müşteri, görev, fatura veya medya) veritabanından hemen silinmez. Orijinal veri nesnesi tüm alt ilişkileriyle birlikte JSON snapshot olarak saklanır ve fiziksel dosyaları karantinaya alınır. 30 gün boyunca istediğiniz an "Geri Yükle" butonuyla ilişkileri bozulmadan sistemdeki orijinal yerine döndürebilirsiniz.
          </p>
        </div>
      </div>

      {/* Ana Tablo Bileşeni */}
      <TrashTable />
    </div>
  )
}
