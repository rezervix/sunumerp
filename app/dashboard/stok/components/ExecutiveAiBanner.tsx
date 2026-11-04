"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  Sparkles,
  Zap,
  ShoppingCart,
  ArrowRight,
  Loader2,
  CheckCircle2
} from "lucide-react"
import type { ExecutiveAiBannerSummary } from "@/lib/services/inventoryAiEngine"

interface ExecutiveAiBannerProps {
  onQuickStockEntry?: (itemId?: string) => void
  refreshTrigger?: number
}

export function ExecutiveAiBanner({ onQuickStockEntry, refreshTrigger }: ExecutiveAiBannerProps) {
  const [banner, setBanner] = useState<ExecutiveAiBannerSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [creatingPr, setCreatingPr] = useState(false)
  const [createdPrNo, setCreatedPrNo] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function loadBanner() {
      try {
        const res = await fetch("/api/inventory-ai")
        const data = await res.json()
        if (mounted && data.success && data.executiveBanner) {
          setBanner(data.executiveBanner)
        }
      } catch {
        // Sessizce geç
      } finally {
        if (mounted) setLoading(false)
      }
    }
    loadBanner()
    return () => {
      mounted = false
    }
  }, [refreshTrigger])

  const handleOneClickAction = async () => {
    if (!banner?.criticalTopItem) {
      if (onQuickStockEntry) onQuickStockEntry()
      return
    }

    setCreatingPr(true)
    try {
      const top = banner.criticalTopItem
      const res = await fetch("/api/inventory-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_ai_requisition",
          itemId: top.id,
          sku: top.sku,
          itemName: top.name,
          recommendedQty: top.recommendedOrderQty,
          unit: top.unit,
          reason: `Ana Stok Ekranı AI Yönetici Özeti Bandından Tek Tıkla Oluşturuldu (${top.sku})`
        })
      })
      const json = await res.json()
      if (json.success) {
        const prNo = json.requisition?.requisitionNo || "PR-AI"
        setCreatedPrNo(prNo)
        toast.success(`Tek Tıkla Aksiyon Alındı: ${prNo}`, {
          description: `${top.name} için +${top.recommendedOrderQty} ${top.unit} satın alma talebi veritabanına kaydedildi.`
        })
      } else {
        toast.error(json.error || "Aksiyon oluşturulamadı.")
      }
    } catch {
      toast.error("Sunucu ile bağlantı kurulamadı.")
    } finally {
      setCreatingPr(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-emerald-500/10 via-slate-900/60 to-indigo-500/10 backdrop-blur-xl border border-white/15 rounded-2xl p-4 shadow-xl flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-emerald-400 shrink-0" />
        <span className="text-xs text-white/75 font-medium">
          Yapay Zekâ veritabanı stok hareketlerini, devir hızını ve SKT risklerini analiz ediyor...
        </span>
      </div>
    )
  }

  if (!banner) return null

  return (
    <div className="bg-gradient-to-r from-emerald-500/10 via-slate-900/60 to-indigo-500/10 backdrop-blur-xl border border-white/15 rounded-2xl p-4 sm:p-5 shadow-xl">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/30 to-indigo-500/30 border border-emerald-400/30 text-emerald-300 shadow-sm">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                Akıllı Yönetici Özeti ve Öneri
              </span>
              <span className="bg-indigo-500/15 text-indigo-300 border border-indigo-400/30 rounded-full px-3 py-0.5 text-[11px] font-medium">
                Canlı Veritabanı Analizi • Devir Hızı: {banner.avgTurnoverRate}x
              </span>
              {banner.criticalSkuCount > 0 && (
                <span className="bg-rose-500/15 text-rose-300 border border-rose-500/30 rounded-full px-3 py-0.5 text-[11px] font-semibold">
                  {banner.criticalSkuCount} Kritik Stok
                </span>
              )}
              {banner.expiringLotCount > 0 && (
                <span className="bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded-full px-3 py-0.5 text-[11px] font-semibold">
                  {banner.expiringLotCount} Yaklaşan SKT
                </span>
              )}
            </div>

            {/* 2 Cümlelik Sade Yönetici Özeti */}
            <p className="text-xs sm:text-sm text-white/85 leading-relaxed font-medium">
              {banner.sentence1}{" "}
              <span className="text-emerald-300 font-semibold">{banner.sentence2}</span>
            </p>
          </div>
        </div>

        {/* Tek Tıkla Aksiyon Al Butonları */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {createdPrNo ? (
            <Link href="/dashboard/satinalma">
              <Button
                size="sm"
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold text-xs h-9 gap-1.5 shadow-sm rounded-xl cursor-pointer"
              >
                <CheckCircle2 className="h-4 w-4" />
                Talep Açıldı ({createdPrNo}) → Satın Almaya Git
              </Button>
            </Link>
          ) : (
            <Button
              size="sm"
              onClick={handleOneClickAction}
              disabled={creatingPr}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs h-9 gap-1.5 shadow-sm font-semibold rounded-xl cursor-pointer"
            >
              {creatingPr ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Zap className="h-3.5 w-3.5" />
              )}
              Tek Tıkla Aksiyon Al
              {banner.criticalTopItem
                ? ` (+${banner.criticalTopItem.recommendedOrderQty} ${banner.criticalTopItem.unit} Sipariş Aç)`
                : ""}
            </Button>
          )}

          {banner.criticalTopItem && onQuickStockEntry && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onQuickStockEntry(banner.criticalTopItem?.id)}
              className="glass-input hover:bg-white/10 text-white border-white/15 text-xs h-9 gap-1.5 cursor-pointer"
            >
              <ShoppingCart className="h-3.5 w-3.5 text-emerald-400" />
              Hızlı Stok Gir
            </Button>
          )}

          <Link href="/dashboard/stok-ai">
            <Button
              size="sm"
              variant="ghost"
              className="text-white/75 hover:text-emerald-300 hover:bg-white/10 text-xs h-9 gap-1 rounded-xl cursor-pointer"
            >
              AI Analiz & Sor <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

