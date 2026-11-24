"use client"

import * as React from "react"
import { safeText, safeCompactCurrency } from "@/lib/utils/safe-display"

export interface ChartCardProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
  footer?: React.ReactNode
}

/**
 * ChartCard (B6 & Faz 4):
 * Cam yüzey, yumuşak gölge, tek tip başlık ve eksen biçimlendirmeleri.
 * Grafik içi renkler:
 * - Birincil seri: --brand (#1267E6) ve yumuşak şeffaf gradyan dolgu
 * - İkincil seri: --sky (#2A93F3)
 * - Üçüncül seri: --navy (#07254A)
 * Hover'da cam tooltip (tooltip-glass).
 */
export function ChartCard({
  title,
  subtitle,
  action,
  children,
  className = "",
  footer
}: ChartCardProps) {
  return (
    <div
      className={`bg-white/80 backdrop-blur-xl border border-[--line] rounded-[20px] p-5 shadow-card space-y-4 ${className}`.trim()}
    >
      {/* BAŞLIK & AKSİYON */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="space-y-0.5">
          <h3 className="text-sm font-semibold tracking-tight text-[--text]">
            {safeText(title)}
          </h3>
          {subtitle && (
            <p className="text-xs text-[--text-muted]">
              {safeText(subtitle)}
            </p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>

      {/* GRAFİK GÖVDESİ */}
      <div className="w-full min-h-[220px]">
        {children}
      </div>

      {/* ALT BİLGİ */}
      {footer && (
        <div className="pt-2 border-t border-[--line-soft] text-xs text-[--text-muted]">
          {footer}
        </div>
      )}
    </div>
  )
}

/**
 * Recharts veya genel SVG grafikler için ortak cam tooltip bileşeni
 */
export function ChartGlassTooltip({
  active,
  payload,
  label,
  formatter = safeCompactCurrency
}: {
  active?: boolean
  payload?: any[]
  label?: string
  formatter?: (val: any) => string
}) {
  if (!active || !payload || payload.length === 0) return null

  return (
    <div className="bg-white/95 backdrop-blur-md border border-[--line] rounded-xl px-3 py-2 shadow-lg text-xs space-y-1">
      {label && <p className="font-medium text-[--text] border-b border-[--line-soft] pb-1">{label}</p>}
      {payload.map((item, idx) => (
        <div key={idx} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full shrink-0"
              style={{ backgroundColor: item.color || "var(--brand)" }}
            />
            <span className="text-[--text-muted]">{item.name}:</span>
          </div>
          <span className="font-semibold text-[--text] tabular-nums">
            {formatter(item.value)}
          </span>
        </div>
      ))}
    </div>
  )
}
