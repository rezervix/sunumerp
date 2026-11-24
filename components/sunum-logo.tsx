import React from "react"

interface SunumLogoProps {
  className?: string
  showText?: boolean
  textClassName?: string
  badgeText?: string
}

export function SunumLogo({
  className = "size-8",
  showText = false,
  textClassName = "",
  badgeText = "",
}: SunumLogoProps) {
  return (
    <div className="flex items-center gap-2.5 select-none">
      <div
        className={`relative flex items-center justify-center rounded-xl bg-gradient-to-br from-[var(--navy)] via-[var(--brand)] to-[var(--blue)] shadow-[var(--shadow-brand)] shrink-0 p-1 text-white ${className}`}
      >
        <svg
          viewBox="0 0 120 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          <defs>
            <linearGradient id="plateTopReact" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.96" />
              <stop offset="100%" stopColor="#DCEAFE" stopOpacity="0.88" />
            </linearGradient>
          </defs>
          <g transform="translate(24, 25)">
            <path d="M8 44 L36 58 L64 44 L64 49 L36 63 L8 49 Z" fill="#FFFFFF" fillOpacity="0.45" />
            <path d="M8 29 L36 43 L64 29 L64 34 L36 48 L8 34 Z" fill="#FFFFFF" fillOpacity="0.78" />
            <path d="M36 5 L64 19 L36 33 L8 19 Z" fill="url(#plateTopReact)" />
            <path d="M8 19 L36 33 L36 36 L8 22 Z" fill="#EEF5FF" fillOpacity="0.9" />
            <path d="M64 19 L36 33 L36 36 L64 22 Z" fill="#BBD7FD" fillOpacity="0.9" />
            <circle cx="36" cy="19" r="4.5" fill="#1267E6" />
            <circle cx="36" cy="19" r="2.5" fill="#FFFFFF" />
          </g>
        </svg>
      </div>

      {showText && (
        <div className={`flex flex-col leading-none overflow-hidden ${textClassName}`}>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-sm tracking-tight text-[var(--navy)] truncate">
              Sunum ERP
            </span>
            {badgeText && (
              <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded-full bg-[var(--brand-soft)] text-[var(--brand)] border border-[var(--brand-line)] uppercase tracking-wider">
                {badgeText}
              </span>
            )}
          </div>
          <span className="text-[11px] font-normal text-[var(--text-muted)] mt-0.5 truncate">
            Kurumsal Yönetim Sistemi
          </span>
        </div>
      )}
    </div>
  )
}
