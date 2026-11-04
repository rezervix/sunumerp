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
      <div className="rounded-2xl border border-indigo-200/80 bg-gradient-to-r from-indigo-50/90 via-purple-50/50 to-white p-4 shadow-xs flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-indigo-600 shrink-0" />
        <span className="text-xs text-slate-600 font-medium">
          Yapay Zekâ veritabanı stok hareketlerini, devir hızını ve SKT risklerini analiz ediyor...
        </span>
      </div>
    )
  }

  if (!banner) return null

  return (
    <div className="rounded-2xl border border-indigo-200/90 bg-gradient-to-r from-indigo-50/90 via-purple-50/50 to-white p-4 sm:p-5 shadow-xs">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                Akıllı Yönetici Özeti ve Öneri
              </span>
              <Badge variant="outline" className="border-indigo-200 bg-white text-indigo-700 text-[11px]">
                Canlı Veritabanı Analizi • Devir Hızı: {banner.avgTurnoverRate}x
              </Badge>
              {banner.criticalSkuCount > 0 && (
                <Badge className="bg-rose-600 text-white text-[11px]">
                  {banner.criticalSkuCount} Kritik Stok
                </Badge>
              )}
              {banner.expiringLotCount > 0 && (
                <Badge className="bg-amber-500 text-white text-[11px]">
                  {banner.expiringLotCount} Yaklaşan SKT
                </Badge>
              )}
            </div>

            {/* 2 Cümlelik Sade Yönetici Özeti */}
            <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
              {banner.sentence1}{" "}
              <span className="text-indigo-950 font-semibold">{banner.sentence2}</span>
            </p>
          </div>
        </div>

        {/* Tek Tıkla Aksiyon Al Butonları */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {createdPrNo ? (
            <Link href="/dashboard/satinalma">
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 gap-1.5 shadow-xs"
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
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9 gap-1.5 shadow-xs font-semibold"
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
              className="border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50 text-xs h-9 gap-1"
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              Hızlı Stok Gir
            </Button>
          )}

          <Link href="/dashboard/stok-ai">
            <Button
              size="sm"
              variant="ghost"
              className="text-slate-600 hover:text-indigo-700 text-xs h-9 gap-1"
            >
              AI Analiz & Sor <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

