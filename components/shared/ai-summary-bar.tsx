"use client"

import * as React from "react"
import Link from "next/link"
import { IconSparkles, IconArrowRight } from "@/components/ui/app-icons"
import { Badge } from "@/components/ui/badge"
import { safeText } from "@/lib/utils/safe-display"

export interface AiSummaryBadge {
  label: string
  variant?: "ok" | "warn" | "bad" | "neutral" | "brand"
}

export interface AiSummaryBarProps {
  summary: string
  highlight?: string
  badges?: AiSummaryBadge[]
  actionLabel?: string
  actionHref?: string
  onActionClick?: () => void
  actionLoading?: boolean
  className?: string
}

/**
 * AiSummaryBar (FAZ 4 & B4 Kuralı):
 * Tek satır, ince, --brand-soft degrade, tek cümle + "AI Analiz Raporu →"
 * Minimalist, temiz, tek bir AI ikonu ve eylem tetikleyicisi.
 */
export function AiSummaryBar({
  summary,
  highlight,
  badges = [],
  actionLabel = "AI Analiz Raporu",
  actionHref,
  onActionClick,
  actionLoading = false,
  className = ""
}: AiSummaryBarProps) {
  const content = (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-r from-[--brand-soft] via-[--brand-soft] to-[--brand-soft-2] border border-[--brand-line] px-4 py-2.5 sm:px-5 sm:py-3 transition-shadow shadow-[0_2px_8px_rgba(18,103,230,0.06)] ${className}`.trim()}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 relative z-10">
        {/* SOL: AI İKONU + CÜMLE + ROZETLER */}
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-[--brand] shadow-sm border border-[--brand-line]"
            aria-hidden="true"
          >
            <IconSparkles size={16} />
          </div>

          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-[--brand]">
              AI Özet
            </span>

            {badges.map((b, i) => (
              <Badge key={i} variant={b.variant || "brand"} size="sm">
                {b.label}
              </Badge>
            ))}

            <p className="text-xs sm:text-sm text-[--text] leading-relaxed truncate md:max-w-2xl">
              {safeText(summary)}
              {highlight && (
                <span className="font-semibold text-[--navy] ml-1">
                  {safeText(highlight)}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* SAĞ: AKSİYON VEYA DETAY BAĞLANTISI */}
        <div className="shrink-0 flex items-center gap-2 pl-11 md:pl-0">
          {actionHref ? (
            <Link
              href={actionHref}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[--brand] hover:text-[--brand-hover] hover:underline transition-colors"
            >
              <span>{actionLabel}</span>
              <IconArrowRight size={14} />
            </Link>
          ) : onActionClick ? (
            <button
              type="button"
              onClick={onActionClick}
              disabled={actionLoading}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[--brand] hover:text-[--brand-hover] disabled:opacity-50 transition-colors cursor-pointer"
            >
              <span>{actionLabel}</span>
              <IconArrowRight size={14} />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )

  return content
}
