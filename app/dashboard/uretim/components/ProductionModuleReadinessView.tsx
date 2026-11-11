"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  Factory,
  GitBranch,
  Cpu,
  Hammer,
  Gauge,
  ShieldCheck,
  Wrench,
  Boxes,
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  Lock,
  Layers,
  Warehouse,
} from "lucide-react"
import { useAuth } from "@/lib/auth/context"
import {
  PRODUCTION_PERMISSION_ACTIONS,
  PRODUCTION_PERMISSION_ACTION_LABELS,
} from "@/lib/auth/permissions"
import {
  PRODUCTION_MODULES_CATALOG,
  type ProductionFeatureFlagKey,
} from "@/lib/config/production-feature-flags"
import { AnimatedNumber } from "@/components/ui/motion-primitives"
import {
  ProductionMasterDataWorkspace,
  type MasterDataTabKey,
} from "./ProductionMasterDataWorkspace"
import { ProductionBomWorkspace } from "./ProductionBomWorkspace"
import { ProductionMrpWorkspace } from "./ProductionMrpWorkspace"
import { ProductionWorkOrderWorkspace } from "./ProductionWorkOrderWorkspace"

const MODULE_ICONS: Record<ProductionFeatureFlagKey, React.ElementType> = {
  uretim_bom_rota: GitBranch,
  uretim_mrp_mps: Cpu,
  uretim_is_emri: Hammer,
  uretim_kapasite: Gauge,
  uretim_kalite: ShieldCheck,
  uretim_bakim: Wrench,
}

interface InfrastructureSnapshot {
  success: boolean
  branchId: string | null
  anyFlagEnabled: boolean
  flags: Record<ProductionFeatureFlagKey, boolean>
  databaseReadiness: {
    bomHeaderCount: number
    bomComponentCount: number
    manufacturingWarehouseCount: number
    rawMaterialCount: number
    semiFinishedCount: number
    finishedGoodCount: number
    recentAuditCount: number
  }
}

export function ProductionModuleReadinessView({
  activeSlug,
}: {
  activeSlug?: string
}) {
  const router = useRouter()
  const { currentBranch, hasPermission, isSuperAdmin } = useAuth()
  const [snapshot, setSnapshot] = useState<InfrastructureSnapshot | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStatus = useCallback(async () => {
    setLoading(true)
    try {
      const branchQuery = currentBranch?.id
        ? `?branchId=${encodeURIComponent(currentBranch.id)}`
        : ""
      const res = await fetch(`/api/production/infrastructure${branchQuery}`)
      if (res.ok) {
        const data = await res.json()
        setSnapshot(data)
      }
    } catch (err) {
      console.error("Üretim altyapı durumu alınamadı:", err)
    } finally {
      setLoading(false)
    }
  }, [currentBranch?.id])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  const selectedModule = useMemo(() => {
    if (!activeSlug) return null
    return (
      PRODUCTION_MODULES_CATALOG.find(
        (m) => m.slug === activeSlug || m.key === activeSlug
      ) || null
    )
  }, [activeSlug])

  const enabledModulesCount = useMemo(() => {
    if (!snapshot?.flags) return 0
    return Object.values(snapshot.flags).filter(Boolean).length
  }, [snapshot])

  const totalProductionItems = useMemo(() => {
    if (!snapshot?.databaseReadiness) return 0
    const d = snapshot.databaseReadiness
    return d.rawMaterialCount + d.semiFinishedCount + d.finishedGoodCount
  }, [snapshot])

  return (
    <div className="min-h-screen bg-[#080A09] text-zinc-100 p-4 md:p-6 lg:p-8 space-y-6">
      {/* Üst Modül Navigasyon Şeridi */}
      <div className="w-full overflow-x-auto no-scrollbar">
        <div className="inline-flex items-center gap-1.5 p-1.5 rounded-2xl bg-[#111513]/90 border border-white/[0.06] backdrop-blur-xl min-w-max">
          <Link
            href="/dashboard/uretim"
            className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
              !selectedModule
                ? "text-zinc-950 font-semibold"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]"
            }`}
          >
            {!selectedModule && (
              <motion.div
                layoutId="productionModuleNavActive"
                className="absolute inset-0 rounded-xl bg-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.3)]"
                transition={{ type: "spring", bounce: 0.18, duration: 0.45 }}
              />
            )}
            <Factory className="w-3.5 h-3.5 relative z-10" />
            <span className="relative z-10">Üretim Altyapı & Yetki Matrisi</span>
          </Link>

          {PRODUCTION_MODULES_CATALOG.map((mod) => {
            const Icon = MODULE_ICONS[mod.key]
            const isActive = selectedModule?.key === mod.key
            const isEnabled = snapshot?.flags?.[mod.key] ?? false

            return (
              <Link
                key={mod.key}
                href={mod.href}
                className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? "text-zinc-950 font-semibold"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="productionModuleNavActive"
                    className="absolute inset-0 rounded-xl bg-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.3)]"
                    transition={{ type: "spring", bounce: 0.18, duration: 0.45 }}
                  />
                )}
                <Icon className="w-3.5 h-3.5 relative z-10" />
                <span className="relative z-10">{mod.menuLabel}</span>
                <span
                  className={`relative z-10 px-1.5 py-0.5 rounded text-[10px] font-mono ${
                    isActive
                      ? "bg-zinc-950/20 text-zinc-950"
                      : isEnabled
                      ? "bg-emerald-500/15 text-emerald-300"
                      : "bg-white/[0.05] text-zinc-500"
                  }`}
                >
                  {isEnabled ? "AÇIK" : "KAPALI"}
                </span>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Başlık ve Aksiyon Şeridi */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Factory className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-light tracking-tight text-white">
                {selectedModule ? selectedModule.label : "Üretim Modülleri Altyapı & Yetki Merkezi"}
              </h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                {selectedModule
                  ? selectedModule.description
                  : "Özellik bayrakları (feature flags), granüler RBAC izin kodları, denetim logu ve mevcut BOM/Envanter entegrasyon durumu."}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => router.push("/dashboard/stok")}
            className="rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.07] px-3.5 py-2 text-xs font-medium text-zinc-200 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-zinc-400" />
            Stok & Envantere Dön
          </button>
          <button
            type="button"
            onClick={fetchStatus}
            className="rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.07] px-3.5 py-2 text-xs font-medium text-zinc-200 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${loading ? "animate-spin" : ""}`} />
            Durumu Yenile
          </button>
        </div>
      </div>

      {/* 4'lü Çerçevesiz KPI Şeridi */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 rounded-2xl bg-[#111513]/60 border border-white/[0.05] p-3 backdrop-blur-md">
        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
          <div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              Etkin Özellik Bayrağı
            </span>
            <div className="text-2xl md:text-3xl font-light tracking-tight text-white tabular-nums mt-1">
              <AnimatedNumber value={enabledModulesCount} /> / {PRODUCTION_MODULES_CATALOG.length}
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">
              Varsayılan tüm bayraklar kapalıdır
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <Lock className="w-4 h-4 text-emerald-400" />
          </div>
        </div>

        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
          <div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              Mevcut Ürün Reçetesi (BOM)
            </span>
            <div className="text-2xl md:text-3xl font-light tracking-tight text-emerald-400 tabular-nums mt-1">
              <AnimatedNumber value={snapshot?.databaseReadiness?.bomHeaderCount ?? 0} />
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">
              {snapshot?.databaseReadiness?.bomComponentCount ?? 0} reçete bileşen satırı
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <GitBranch className="w-4 h-4 text-emerald-400" />
          </div>
        </div>

        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
          <div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              Üretim Atölyesi & Depo
            </span>
            <div className="text-2xl md:text-3xl font-light tracking-tight text-cyan-300 tabular-nums mt-1">
              <AnimatedNumber
                value={snapshot?.databaseReadiness?.manufacturingWarehouseCount ?? 0}
              />
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">
              MANUFACTURING tipi aktif lokasyon
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
            <Warehouse className="w-4 h-4 text-cyan-300" />
          </div>
        </div>

        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
          <div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              Hammadde / Yarı Mamul / Mamul
            </span>
            <div className="text-2xl md:text-3xl font-light tracking-tight text-white tabular-nums mt-1">
              <AnimatedNumber value={totalProductionItems} />
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">
              {snapshot?.databaseReadiness?.rawMaterialCount ?? 0} Hammadde ·{" "}
              {snapshot?.databaseReadiness?.finishedGoodCount ?? 0} Mamul
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
            <Layers className="w-4 h-4 text-violet-300" />
          </div>
        </div>
      </div>

      {/* Seçili Modül Özellik Bayrağı Durum Kartı */}
      {selectedModule && (
        <div className="glass-panel rounded-2xl p-5 border border-white/[0.06] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs px-2.5 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.08] text-emerald-300">
                {selectedModule.key}
              </span>
              <span
                className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full ${
                  snapshot?.flags?.[selectedModule.key]
                    ? "badge-positive"
                    : "badge-pending"
                }`}
              >
                {snapshot?.flags?.[selectedModule.key]
                  ? "Özellik Bayrağı Açık (Aktif)"
                  : "Özellik Bayrağı Kapalı (Pasif)"}
              </span>
            </div>
            <h2 className="text-base font-medium text-white">
              {selectedModule.label} — Altyapı, Rota ve Yetki Kaydı Hazır
            </h2>
            <p className="text-xs text-zinc-400">
              Denetim Kaynağı:{" "}
              <code className="font-mono text-zinc-200">{selectedModule.auditResource}</code> ·
              Rota: <code className="font-mono text-zinc-200">{selectedModule.href}</code>
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/dashboard/stok"
              className="btn-primary-emerald rounded-xl px-4 py-2 text-xs font-semibold flex items-center gap-1.5"
            >
              <Boxes className="w-3.5 h-3.5" />
              Mevcut Stok & Reçete (BOM) Kartları
            </Link>
          </div>
        </div>
      )}

      {/* BOM & Rota, MRP/MPS ve İş Emirleri Özellik Bayrağı Açık Olduğunda İlgili Özel Çalışma Alanı */}
      {snapshot?.flags?.uretim_bom_rota &&
      (activeSlug === "bom-rota" || activeSlug === "uretim_bom_rota") ? (
        <ProductionBomWorkspace />
      ) : snapshot?.flags?.uretim_mrp_mps &&
        (activeSlug === "mrp-mps" || activeSlug === "uretim_mrp_mps") ? (
        <ProductionMrpWorkspace />
      ) : snapshot?.flags?.uretim_is_emri &&
        (activeSlug === "is-emirleri" || activeSlug === "uretim_is_emri") ? (
        <ProductionWorkOrderWorkspace />
      ) : snapshot?.anyFlagEnabled ? (
        <ProductionMasterDataWorkspace
          defaultTab={
            (activeSlug === "bakim" || activeSlug === "uretim_bakim"
              ? "machines"
              : activeSlug === "bom-rota" || activeSlug === "uretim_bom_rota"
              ? "item-profiles"
              : activeSlug === "mrp-mps" || activeSlug === "uretim_mrp_mps"
              ? "parameters"
              : "work-centers") as MasterDataTabKey
          }
        />
      ) : null}

      {/* Üretim Modülleri Özellik Bayrağı ve RBAC İzin Matrisi Tablosu */}
      <div className="glass-table-container overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-medium text-white">
              Üretim Modülleri Özellik Bayrağı & İzin Kodları Matrisi
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Her üretim modülü için tanımlanan özellik bayrağı anahtarı ve 5 granüler yetki kodu (Görüntüle, Oluştur, Düzenle, Sil, Onayla).
            </p>
          </div>
          <span className="text-[11px] font-mono text-zinc-400">
            Aktif Şube: {currentBranch?.name || "Tüm Şubeler"}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.01]">
                <th className="py-3 pl-5 pr-3 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                  Modül & Açıklama
                </th>
                <th className="py-3 px-3 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                  Bayrak / İzin Kodu
                </th>
                <th className="py-3 px-3 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                  Menü Rotası
                </th>
                <th className="py-3 px-3 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                  Bayrak Durumu
                </th>
                <th className="py-3 px-3 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                  Tanımlı İzin Kodları (RBAC)
                </th>
                <th className="py-3 pl-3 pr-5 text-right text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                  Bağlantı
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {PRODUCTION_MODULES_CATALOG.map((mod) => {
                const Icon = MODULE_ICONS[mod.key]
                const isFlagOn = snapshot?.flags?.[mod.key] ?? false
                const isRowSelected = selectedModule?.key === mod.key

                return (
                  <tr
                    key={mod.key}
                    className={`transition-colors hover:bg-white/[0.025] ${
                      isRowSelected ? "bg-emerald-500/[0.04]" : ""
                    }`}
                  >
                    <td className="relative py-3.5 pl-5 pr-3">
                      <span
                        className={`absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-r-full ${
                          isFlagOn ? "bg-emerald-500" : "bg-amber-400/70"
                        }`}
                      />
                      <div className="flex items-start gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0 mt-0.5">
                          <Icon className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div>
                          <div className="text-xs font-medium text-white">{mod.label}</div>
                          <div className="text-[11px] text-zinc-400 line-clamp-1 max-w-md mt-0.5">
                            {mod.description}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-3">
                      <span className="font-mono text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                        {mod.key}
                      </span>
                    </td>

                    <td className="py-3.5 px-3">
                      <span className="font-mono text-xs text-zinc-300">{mod.href}</span>
                    </td>

                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full font-medium ${
                          isFlagOn ? "badge-positive" : "badge-pending"
                        }`}
                      >
                        {isFlagOn ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" /> Açık
                          </>
                        ) : (
                          <>
                            <Lock className="w-3 h-3" /> Kapalı (Varsayılan)
                          </>
                        )}
                      </span>
                    </td>

                    <td className="py-3.5 px-3">
                      <div className="flex flex-wrap gap-1">
                        {PRODUCTION_PERMISSION_ACTIONS.map((action) => {
                          const allowed =
                            isSuperAdmin || hasPermission(mod.key, action)
                          return (
                            <span
                              key={action}
                              className={`text-[10px] font-medium px-2 py-0.5 rounded-md border ${
                                allowed
                                  ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                                  : "bg-white/[0.03] text-zinc-500 border-white/[0.06]"
                              }`}
                              title={`${mod.key}:${action}`}
                            >
                              {PRODUCTION_PERMISSION_ACTION_LABELS[action]} ({action})
                            </span>
                          )
                        })}
                      </div>
                    </td>

                    <td className="py-3.5 pl-3 pr-5 text-right">
                      <Link
                        href={mod.href}
                        className="inline-flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] px-2.5 py-1 text-xs font-medium text-zinc-200 transition-colors"
                      >
                        İncele
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
