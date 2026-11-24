"use client"

import * as React from "react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export interface LedStockBarProps {
  total: number
  minLevel?: number
  segments?: number
  availableText?: string
  isCritical?: boolean
  className?: string
}

/**
 * LedStockBar (B6 Kuralı):
 * LED / segmentli stok çubuğu:
 * Dolu segment: --brand (veya kritikte --bad-fill)
 * Boş segment: --muted-bg
 * Yeşil/kehribar dekoratif olarak kullanılmaz.
 */
export function LedStockBar({
  total,
  minLevel = 10,
  segments = 5,
  availableText,
  isCritical: explicitCritical,
  className = ""
}: LedStockBarProps) {
  const isCritical = explicitCritical !== undefined ? explicitCritical : total <= minLevel

  // Segment hesaplama
  const ratio = minLevel > 0 ? total / (minLevel * 2) : total > 0 ? 1 : 0
  const activeCount = Math.min(segments, Math.max(total > 0 ? 1 : 0, Math.round(ratio * segments)))

  const segmentArray = Array.from({ length: segments }, (_, i) => i)

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`inline-flex items-center gap-1.5 cursor-default ${className}`.trim()}>
            {/* LED SEGMENTLER */}
            <div className="flex items-center gap-1" aria-label={`Stok Seviyesi: ${activeCount}/${segments}`}>
              {segmentArray.map(idx => {
                const isActive = idx < activeCount

                let bgClass = "bg-[--muted-bg]"
                if (isActive) {
                  bgClass = isCritical ? "bg-[--bad-fill]" : "bg-[--brand]"
                }

                return (
                  <div
                    key={idx}
                    className={`h-1.5 w-3.5 rounded-full transition-colors ${bgClass}`}
                  />
                )
              })}
            </div>

            {availableText && (
              <span className="text-[11px] text-[--text-muted] tabular-nums font-medium">
                {availableText}
              </span>
            )}
          </div>
        </TooltipTrigger>

        <TooltipContent side="top" className="text-xs">
          {isCritical ? (
            <span className="text-[--bad-fill] font-semibold">
              Kritik Stok: {total} / Min: {minLevel}
            </span>
          ) : (
            <span>
              Envanter Durumu: {total} (Min: {minLevel})
            </span>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
