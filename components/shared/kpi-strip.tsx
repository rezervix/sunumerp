"use client"

import * as React from "react"
import { AnimatedNumber } from "@/components/ui/motion-primitives"
import { Badge, type BadgeProps } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { safeText } from "@/lib/utils/safe-display"

export interface KpiItemDef {
  id: string
  label: string
  value: number
  prefix?: string
  suffix?: string
  decimals?: number
  badgeText?: string
  badgeVariant?: BadgeProps["variant"]
  description?: string
  icon?: React.ReactNode
  isCritical?: boolean
}

export interface KpiStripProps {
  items: KpiItemDef[]
  loading?: boolean
  className?: string
}

/**
 * KpiStrip (B4 Kuralı):
 * Kutusuz 4'lü ızgara (grid-cols-2 md:grid-cols-4 gap-8).
 * Üstte küçük etiket (text-[11px] uppercase tracking-[0.12em] text-[--text-muted] font-medium),
 * Altta büyük rakam (text-3xl font-light tracking-tight tabular-nums text-[--text]),
 * Yanında hap rozet (Badge).
 * Hiçbir zaman kart içine hapsedilmez, kalın çerçeve kullanılmaz ("Kutu içinde kutu yok").
 */
export function KpiStrip({ items, loading = false, className = "" }: KpiStripProps) {
  return (
    <div
      className={`grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 py-3 ${className}`.trim()}
      role="region"
      aria-label="Önemli Göstergeler (KPI)"
    >
      {items.map(item => {
        const isBad = item.isCritical || item.badgeVariant === "bad"

        return (
          <div key={item.id} className="space-y-1.5 min-w-0">
            {/* ETİKET & OPSİYONEL İKON */}
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] text-[--text-muted] font-medium truncate">
              {item.icon && <span className="shrink-0 text-[--text-muted]">{item.icon}</span>}
              <span className="truncate">{safeText(item.label, "Gösterge")}</span>
            </div>

            {/* BÜYÜK RAKAM + HAP ROZET */}
            <div className="flex items-baseline gap-2.5 flex-wrap">
              {loading ? (
                <Skeleton className="h-9 w-24 rounded-lg bg-[--muted-bg]" />
              ) : (
                <div
                  className={`text-3xl md:text-4xl font-light tracking-tight tabular-nums ${
                    isBad ? "text-[--bad]" : "text-[--text]"
                  }`}
                >
                  <AnimatedNumber
                    value={item.value}
                    prefix={item.prefix}
                    suffix={item.suffix}
                    decimals={item.decimals}
                  />
                </div>
              )}

              {item.badgeText && !loading && (
                <Badge
                  variant={item.badgeVariant || (isBad ? "bad" : "neutral")}
                  size="sm"
                  className="shrink-0 self-center"
                >
                  {item.badgeText}
                </Badge>
              )}
            </div>

            {/* AÇIKLAMA METNİ */}
            {item.description && (
              <p className="text-xs text-[--text-muted] truncate leading-normal">
                {safeText(item.description)}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
