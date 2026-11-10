"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import {
  Factory,
  Save,
  RotateCcw,
  Loader2,
  GitBranch,
  Gauge,
  Clock,
  ShieldAlert,
  CheckCircle2,
} from "lucide-react"
import {
  LOT_SIZING_RULE_LABELS,
  PRODUCTION_ITEM_TYPE_LABELS,
  PRODUCTION_METHOD_LABELS,
  type LotSizingRule,
  type ProductionItemType,
  type ProductionMethod,
} from "@/lib/services/productionMasterDataEngine"

interface ItemProductionProfileTabProps {
  itemId: string
  itemName?: string
  baseUnit?: string
}

export function ItemProductionProfileTab({
  itemId,
  baseUnit = "Adet",
}: ItemProductionProfileTabProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isConfiguredInDb, setIsConfiguredInDb] = useState(false)

  const [productionItemType, setProductionItemType] =
    useState<ProductionItemType>("MAMUL")
  const [productionMethod, setProductionMethod] =
    useState<ProductionMethod>("MAKE_TO_STOCK")
  const [leadTimeDays, setLeadTimeDays] = useState("3")
  const [productionLeadTimeHours, setProductionLeadTimeHours] = useState("4")
  const [minStockLevel, setMinStockLevel] = useState("10")
  const [safetyStockQty, setSafetyStockQty] = useState("5")
  const [lotSizingRule, setLotSizingRule] = useState<LotSizingRule>("L4L")
  const [standardLotSize, setStandardLotSize] = useState("1")
  const [minOrderQty, setMinOrderQty] = useState("1")
  const [orderMultiple, setOrderMultiple] = useState("1")
  const [defaultBomId, setDefaultBomId] = useState("none")
  const [defaultWorkCenterId, setDefaultWorkCenterId] = useState("none")
  const [scrapTolerancePercent, setScrapTolerancePercent] = useState("2")
  const [backflushEnabled, setBackflushEnabled] = useState(true)
  const [qualityCheckRequired, setQualityCheckRequired] = useState(false)
  const [notes, setNotes] = useState("")

  const [availableBoms, setAvailableBoms] = useState<any[]>([])
  const [availableWorkCenters, setAvailableWorkCenters] = useState<any[]>([])

  const loadProfile = useCallback(async () => {
    if (!itemId) return
    setLoading(true)
    try {
      const res = await fetch(
        `/api/production/master-data?section=item_profile&itemId=${encodeURIComponent(itemId)}`
      )
      const data = await res.json()
      if (data.success && data.profile) {
        const p = data.profile
        setIsConfiguredInDb(Boolean(p.isConfiguredInDb))
        setProductionItemType(p.productionItemType || "MAMUL")
        setProductionMethod(p.productionMethod || "MAKE_TO_STOCK")
        setLeadTimeDays(String(p.leadTimeDays ?? 3))
        setProductionLeadTimeHours(String(p.productionLeadTimeHours ?? 4))
        setMinStockLevel(String(p.minStockLevel ?? 10))
        setSafetyStockQty(String(p.safetyStockQty ?? 5))
        setLotSizingRule(p.lotSizingRule || "L4L")
        setStandardLotSize(String(p.standardLotSize ?? 1))
        setMinOrderQty(String(p.minOrderQty ?? 1))
        setOrderMultiple(String(p.orderMultiple ?? 1))
        setDefaultBomId(p.defaultBomId || "none")
        setDefaultWorkCenterId(p.defaultWorkCenterId || "none")
        setScrapTolerancePercent(String(p.scrapTolerancePercent ?? 2))
        setBackflushEnabled(
          p.backflushEnabled !== undefined ? Boolean(p.backflushEnabled) : true
        )
        setQualityCheckRequired(Boolean(p.qualityCheckRequired))
        setNotes(p.notes || "")
        setAvailableBoms(data.availableBoms || [])
        setAvailableWorkCenters(data.availableWorkCenters || [])
      }
    } catch (err) {
      console.error("Ürün üretim profili yüklenemedi:", err)
    } finally {
      setLoading(false)
    }
  }, [itemId])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/production/master-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upsert_item_profile",
          payload: {
            itemId,
            productionItemType,
            productionMethod,
            leadTimeDays: Number(leadTimeDays || 0),
            productionLeadTimeHours: Number(productionLeadTimeHours || 0),
            minStockLevel: Number(minStockLevel || 0),
            safetyStockQty: Number(safetyStockQty || 0),
            lotSizingRule,
            standardLotSize: Number(standardLotSize || 1),
            minOrderQty: Number(minOrderQty || 1),
            orderMultiple: Number(orderMultiple || 1),
            defaultBomId: defaultBomId === "none" ? null : defaultBomId,
            defaultWorkCenterId:
              defaultWorkCenterId === "none" ? null : defaultWorkCenterId,
            scrapTolerancePercent: Number(scrapTolerancePercent || 0),
            backflushEnabled,
            qualityCheckRequired,
            notes,
          },
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Üretim profili kaydedilemedi.")
      }
      toast.success("Üretim Profili Kaydedildi", {
        description: data.message,
      })
      await loadProfile()
    } catch (err: any) {
      toast.error(err.message || "Kaydetme sırasında bir hata oluştu.")
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    if (!isConfiguredInDb) return
    setSaving(true)
    try {
      const res = await fetch("/api/production/master-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_item_profile",
          payload: { itemId },
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Profil sıfırlanamadı.")
      }
      toast.success("Varsayılanlara Sıfırlandı", {
        description: "Özel 1-1 üretim profili kaldırıldı.",
      })
      await loadProfile()
    } catch (err: any) {
      toast.error(err.message || "Sıfırlama sırasında hata oluştu.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="py-8 flex flex-col items-center justify-center gap-2 text-zinc-400">
        <Loader2 className="h-5 w-5 animate-spin text-[#34D399]" />
        <span className="text-xs">1-1 Üretim profili yükleniyor...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Üst Bilgi ve Durum Rozeti */}
      <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[#34D399]">
            <Factory className="h-4 w-4" />
          </div>
          <div>
            <span className="text-xs font-semibold text-white block">
              1-1 Üretim & MRP Parametre Kartı
            </span>
            <span className="text-[11px] text-zinc-400">
              Mevcut stok kartını bozmadan ek tabloda (`UretimItemProfile`) tutulur
            </span>
          </div>
        </div>
        <span
          className={`text-[10px] font-medium px-2.5 py-0.5 rounded-full border ${
            isConfiguredInDb
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              : "bg-white/[0.04] text-zinc-400 border-white/[0.08]"
          }`}
        >
          {isConfiguredInDb ? (
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Özelleştirilmiş
            </span>
          ) : (
            "Varsayılan Profil"
          )}
        </span>
      </div>

      {/* 1. ÜRÜN TİPİ VE ÜRETİM YÖNTEMİ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-[11px] font-medium text-zinc-300">
            Üretim Ürün Tipi
          </Label>
          <Select
            value={productionItemType}
            onValueChange={(v) => setProductionItemType(v as ProductionItemType)}
          >
            <SelectTrigger className="text-xs bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="backdrop-blur-xl bg-[#111513] border border-white/[0.08] text-white">
              {(Object.entries(PRODUCTION_ITEM_TYPE_LABELS) as [ProductionItemType, string][]).map(
                ([code, label]) => (
                  <SelectItem key={code} value={code} className="text-xs">
                    {label}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] font-medium text-zinc-300">
            Üretim / İkmal Yöntemi
          </Label>
          <Select
            value={productionMethod}
            onValueChange={(v) => setProductionMethod(v as ProductionMethod)}
          >
            <SelectTrigger className="text-xs bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="backdrop-blur-xl bg-[#111513] border border-white/[0.08] text-white">
              {(Object.entries(PRODUCTION_METHOD_LABELS) as [ProductionMethod, string][]).map(
                ([code, label]) => (
                  <SelectItem key={code} value={code} className="text-xs">
                    {label}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 2. TEDARİK SÜRESİ, MİN/EMNİYET STOK VE GÜVENLİK STOĞU */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="space-y-1">
          <Label className="text-[11px] font-medium text-zinc-400 flex items-center gap-1">
            <Clock className="h-3 w-3 text-zinc-500" />
            Tedarik (Gün)
          </Label>
          <Input
            type="number"
            min="0"
            value={leadTimeDays}
            onChange={(e) => setLeadTimeDays(e.target.value)}
            className="text-xs bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-8.5 font-mono"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-[11px] font-medium text-zinc-400">
            Üretim (Saat)
          </Label>
          <Input
            type="number"
            min="0"
            step="0.5"
            value={productionLeadTimeHours}
            onChange={(e) => setProductionLeadTimeHours(e.target.value)}
            className="text-xs bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-8.5 font-mono"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-[11px] font-medium text-zinc-400">
            Min/Emniyet ({baseUnit})
          </Label>
          <Input
            type="number"
            min="0"
            step="any"
            value={minStockLevel}
            onChange={(e) => setMinStockLevel(e.target.value)}
            className="text-xs bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-8.5 font-mono"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-[11px] font-medium text-zinc-400 flex items-center gap-1">
            <ShieldAlert className="h-3 w-3 text-amber-400" />
            Güvenlik Stoğu
          </Label>
          <Input
            type="number"
            min="0"
            step="any"
            value={safetyStockQty}
            onChange={(e) => setSafetyStockQty(e.target.value)}
            className="text-xs bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-8.5 font-mono"
          />
        </div>
      </div>

      {/* 3. LOT KURALI VE LOT BÜYÜKLÜĞÜ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="col-span-2 space-y-1">
          <Label className="text-[11px] font-medium text-zinc-400">
            Lot Büyüklüğü Kuralı
          </Label>
          <Select
            value={lotSizingRule}
            onValueChange={(v) => setLotSizingRule(v as LotSizingRule)}
          >
            <SelectTrigger className="text-xs bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-8.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="backdrop-blur-xl bg-[#111513] border border-white/[0.08] text-white">
              {(Object.entries(LOT_SIZING_RULE_LABELS) as [LotSizingRule, string][]).map(
                ([code, label]) => (
                  <SelectItem key={code} value={code} className="text-xs">
                    {label}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-[11px] font-medium text-zinc-400">
            Lot Büyüklüğü
          </Label>
          <Input
            type="number"
            min="0.01"
            step="any"
            value={standardLotSize}
            onChange={(e) => setStandardLotSize(e.target.value)}
            className="text-xs bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-8.5 font-mono"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-[11px] font-medium text-zinc-400">
            Fire Toleransı (%)
          </Label>
          <Input
            type="number"
            min="0"
            max="100"
            step="0.5"
            value={scrapTolerancePercent}
            onChange={(e) => setScrapTolerancePercent(e.target.value)}
            className="text-xs bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-8.5 font-mono"
          />
        </div>
      </div>

      {/* 4. VARSAYILAN REÇETE (BOM) VE İŞ MERKEZİ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-[11px] font-medium text-zinc-300 flex items-center gap-1">
            <GitBranch className="h-3 w-3 text-[#34D399]" />
            Varsayılan Ürün Reçetesi (BOM)
          </Label>
          <Select value={defaultBomId} onValueChange={setDefaultBomId}>
            <SelectTrigger className="text-xs bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-9">
              <SelectValue placeholder="Reçete seçin..." />
            </SelectTrigger>
            <SelectContent className="backdrop-blur-xl bg-[#111513] border border-white/[0.08] text-white">
              <SelectItem value="none" className="text-xs text-zinc-400">
                Reçete Bağlı Değil
              </SelectItem>
              {availableBoms.map((b: any) => (
                <SelectItem key={b.id} value={b.id} className="text-xs">
                  {b.code} — {b.name} ({b.version || "v1.0"})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] font-medium text-zinc-300 flex items-center gap-1">
            <Gauge className="h-3 w-3 text-cyan-400" />
            Varsayılan İş Merkezi / İstasyon
          </Label>
          <Select
            value={defaultWorkCenterId}
            onValueChange={setDefaultWorkCenterId}
          >
            <SelectTrigger className="text-xs bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-9">
              <SelectValue placeholder="İş merkezi seçin..." />
            </SelectTrigger>
            <SelectContent className="backdrop-blur-xl bg-[#111513] border border-white/[0.08] text-white">
              <SelectItem value="none" className="text-xs text-zinc-400">
                İstasyon Seçilmedi
              </SelectItem>
              {availableWorkCenters.map((wc: any) => (
                <SelectItem key={wc.id} value={wc.id} className="text-xs">
                  {wc.code} — {wc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 5. OTOMATİK SARFİYAT (BACKFLUSH) & KALİTE KONTROL */}
      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="drawer-backflush"
            checked={backflushEnabled}
            onCheckedChange={(c) => setBackflushEnabled(Boolean(c))}
          />
          <Label
            htmlFor="drawer-backflush"
            className="text-xs text-zinc-300 cursor-pointer"
          >
            Otomatik Hammadde Sarfiyatı (Backflush)
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="drawer-qc"
            checked={qualityCheckRequired}
            onCheckedChange={(c) => setQualityCheckRequired(Boolean(c))}
          />
          <Label
            htmlFor="drawer-qc"
            className="text-xs text-zinc-300 cursor-pointer"
          >
            Üretim Sonu Kalite Kontrol Zorunlu
          </Label>
        </div>
      </div>

      {/* 6. AKSİYON BUTONLARI */}
      <div className="flex items-center justify-end gap-2 pt-1">
        {isConfiguredInDb && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={saving}
            onClick={handleReset}
            className="text-xs h-8.5 bg-white/[0.03] border-white/[0.08] text-zinc-300 hover:text-white rounded-xl cursor-pointer gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Sıfırla
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          disabled={saving}
          onClick={handleSave}
          className="text-xs h-8.5 bg-[#34D399] hover:bg-[#34D399]/90 text-[#061811] font-semibold rounded-xl cursor-pointer gap-1.5 shadow-lg shadow-emerald-500/20"
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          Üretim Profilini Kaydet
        </Button>
      </div>
    </div>
  )
}
