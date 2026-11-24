"use client"

import React, { useState, useEffect } from "react"
import { toast } from "sonner"
import { IconLoader } from "@/components/ui/app-icons"
import { AiSummaryBar, type AiSummaryBadge } from "@/components/shared/ai-summary-bar"
import type { ExecutiveAiBannerSummary } from "@/lib/services/inventoryAiEngine"
import { mockDatabase } from "@/lib/data/mockDatabase"
import { safeRateX, safeNumber } from "@/lib/utils/safe-display"

interface ExecutiveAiBannerProps {
  onQuickStockEntry?: (itemId?: string) => void
  refreshTrigger?: number
}

/**
 * ExecutiveAiBanner (FAZ 4 & B4 Kuralı):
 * Tek satır, ince, --brand-soft degrade zeminli, tek cümle + aksiyon.
 * AI ikonu tekilleştirilmiş ve B1 renk token'larına bağlanmıştır.
 */
export function ExecutiveAiBanner({ onQuickStockEntry, refreshTrigger }: ExecutiveAiBannerProps) {
  const [banner, setBanner] = useState<any>(() =>
    mockDatabase.getExecutiveBanner()
  )
  const [loading, setLoading] = useState(false)
  const [creatingPr, setCreatingPr] = useState(false)

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
      const recQty = top.recommendedOrderQty || 80
      const itemId = top.id || top.itemId
      const res = await fetch("/api/inventory-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_ai_requisition",
          itemId: itemId,
          sku: top.sku,
          itemName: top.name,
          recommendedQty: recQty,
          unit: top.unit,
          reason: `Ana Stok Ekranı AI Yönetici Özeti Bandından Tek Tıkla Oluşturuldu (${top.sku})`
        })
      })
      const json = await res.json()
      if (json.success) {
        const prNo = json.requisition?.requisitionNo || "PR-AI"
        toast.success(`Tek Tıkla Satın Alma Talebi: ${prNo}`, {
          description: `${top.name} için +${recQty} ${top.unit} siparişi onaylandı.`
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
      <div className="bg-white/80 backdrop-blur-xl border border-[--line] rounded-2xl p-3 flex items-center gap-3">
        <IconLoader size={16} className="text-[--brand] shrink-0" />
        <span className="text-xs text-[--text-muted]">
          Yapay Zekâ envanter hareketlerini, devir hızını ve kritik ROP seviyelerini analiz ediyor...
        </span>
      </div>
    )
  }

  if (!banner) return null

  const badges: AiSummaryBadge[] = [
    {
      label: `Devir Hızı: ${safeRateX(banner.avgTurnoverRate)}`,
      variant: "brand"
    }
  ]

  const criticalCount = safeNumber(banner.criticalSkuCount, 0)
  if (criticalCount > 0) {
    badges.push({
      label: `${criticalCount} Kritik Stok`,
      variant: "bad"
    })
  }

  const expiringCount = safeNumber(banner.expiringLotCount, 0)
  if (expiringCount > 0) {
    badges.push({
      label: `${expiringCount} SKT Uyarısı`,
      variant: "warn"
    })
  }

  const actionLabel = creatingPr
    ? "Oluşturuluyor..."
    : banner.criticalTopItem
    ? `Hızlı Talep: ${banner.criticalTopItem.name.slice(0, 18)}... →`
    : "AI Analiz Raporu →"

  return (
    <AiSummaryBar
      summary={banner.sentence1 || banner.headline || "Tüm envanter dengesi izleniyor."}
      highlight={banner.sentence2 || banner.description}
      badges={badges}
      actionLabel={actionLabel}
      onActionClick={handleOneClickAction}
      actionLoading={creatingPr}
    />
  )
}
