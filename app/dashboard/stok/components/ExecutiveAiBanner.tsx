"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
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
import { mockDatabase } from "@/lib/data/mockDatabase"

interface ExecutiveAiBannerProps {
  onQuickStockEntry?: (itemId?: string) => void
  refreshTrigger?: number
}

export function ExecutiveAiBanner({ onQuickStockEntry, refreshTrigger }: ExecutiveAiBannerProps) {
  const [banner, setBanner] = useState<ExecutiveAiBannerSummary | null>(() => mockDatabase.getExecutiveBanner())
  const [loading, setLoading] = useState(false)
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
        } else if (mounted) {
          setBanner(mockDatabase.getExecutiveBanner())
        }
      } catch {
        if (mounted) setBanner(mockDatabase.getExecutiveBanner())
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
      <div className="bg-[#111513]/90 backdrop-blur-xl border border-white/[0.06] rounded-[20px] p-4.5 shadow-2xl flex items-center gap-3">
        <Loader2 className="h-4 w-4 animate-spin text-emerald-400 shrink-0" />
        <span className="text-xs text-zinc-400 font-medium">
          Yapay Zekâ veritabanı stok hareketlerini, devir hızını ve SKT risklerini analiz ediyor...
        </span>
      </div>
    )
  }

  if (!banner) return null

  return (
    <div className="bg-[#111513]/90 backdrop-blur-xl border border-white/[0.06] rounded-[20px] p-5 shadow-2xl relative overflow-hidden">
      {/* Ambient glow accent in top-right */}
      <div className="absolute -top-16 -right-16 w-56 h-56 bg-emerald-500/[0.04] rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
        <div className="flex items-start gap-4">
          {/* Breathing / Pulsing Emerald Orb Icon */}
          <motion.div
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-[#34D399] shadow-[0_0_20px_rgba(52,211,153,0.15)]"
          >
            <Sparkles className="h-5 w-5" />
          </motion.div>

          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#34D399]">
                AI Yönetici Özeti
              </span>
              <span className="bg-white/[0.05] text-zinc-400 border border-white/[0.08] rounded-full px-2.5 py-0.5 text-[11px] font-mono">
                Devir Hızı: {banner.avgTurnoverRate}x
              </span>
              {banner.criticalSkuCount > 0 && (
                <span className="bg-rose-500/10 text-rose-300 border border-rose-500/20 rounded-full px-2.5 py-0.5 text-[11px] font-medium">
                  {banner.criticalSkuCount} Kritik Stok
                </span>
              )}
              {banner.expiringLotCount > 0 && (
                <span className="bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded-full px-2.5 py-0.5 text-[11px] font-medium">
                  {banner.expiringLotCount} Yaklaşan SKT
                </span>
              )}
            </div>

            {/* 2 Cümlelik Sade Yönetici Özeti */}
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-normal">
              {banner.sentence1}{" "}
              <span className="text-white font-medium">{banner.sentence2}</span>
            </p>
          </div>
        </div>

        {/* Tek Tıkla Aksiyon Al Butonları */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {createdPrNo ? (
            <Link href="/dashboard/satinalma">
              <Button
                size="sm"
                className="bg-[#34D399] hover:bg-[#34D399]/90 text-[#061811] font-semibold text-xs h-9 px-4 gap-1.5 rounded-full shadow-lg shadow-emerald-500/20 cursor-pointer"
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
              className="bg-[#34D399] hover:bg-[#34D399]/90 text-[#061811] font-semibold text-xs h-9 px-4 gap-1.5 rounded-full shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              {creatingPr ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Zap className="h-3.5 w-3.5" />
              )}
              Tek Tıkla Aksiyon Al
              {banner.criticalTopItem
                ? ` (+${banner.criticalTopItem.recommendedOrderQty} ${banner.criticalTopItem.unit} Sipariş)`
                : ""}
            </Button>
          )}

          {banner.criticalTopItem && onQuickStockEntry && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onQuickStockEntry(banner.criticalTopItem?.id)}
              className="bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white border-white/[0.08] text-xs h-9 px-3.5 rounded-full cursor-pointer"
            >
              <ShoppingCart className="h-3.5 w-3.5 text-emerald-400" />
              Hızlı Stok Gir
            </Button>
          )}

          <Link href="/dashboard/stok-ai">
            <Button
              size="sm"
              variant="ghost"
              className="text-zinc-400 hover:text-white hover:bg-white/[0.05] text-xs h-9 px-3 rounded-full cursor-pointer"
            >
              AI Analiz <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
