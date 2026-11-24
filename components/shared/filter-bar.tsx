"use client"

import * as React from "react"
import { IconSearch, IconSliders, IconX } from "@/components/ui/app-icons"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export interface FilterBarProps {
  searchValue: string
  onSearchChange: (val: string) => void
  searchPlaceholder?: string
  children?: React.ReactNode
  onCustomizeClick?: () => void
  customizeActive?: boolean
  className?: string
}

/**
 * FilterBar (FAZ 4 & B4 Kuralı):
 * Sol: Tek arama kutusu
 * Sağ: Filtre açılır menüleri / etiketleri + tek "Özelleştir" ikonu.
 * Tekrarlanan arama girişleri kaldırılır; tüm filtreleme tek satırda toplanır.
 */
export function FilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Ara...",
  children,
  onCustomizeClick,
  customizeActive = false,
  className = ""
}: FilterBarProps) {
  return (
    <div
      className={`flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-white/80 backdrop-blur-xl border border-[--line] rounded-[20px] p-3 sm:p-3.5 shadow-sm ${className}`.trim()}
    >
      {/* SOL: TEK ARAMA */}
      <div className="relative flex-1 min-w-[220px] max-w-md">
        <IconSearch
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[--text-muted] pointer-events-none"
        />
        <Input
          type="text"
          value={searchValue}
          onChange={e => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="pl-9 pr-8 text-xs h-9 bg-white border-[--line] focus:border-[--brand] text-[--text] placeholder:text-[--text-muted] rounded-xl"
        />
        {searchValue && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[--text-muted] hover:text-[--text] p-0.5 rounded-full cursor-pointer"
            aria-label="Aramayı Temizle"
          >
            <IconX size={13} />
          </button>
        )}
      </div>

      {/* SAĞ: FİLTRELER + TEK ÖZELLEŞTİR BUTONU */}
      <div className="flex items-center gap-2 flex-wrap">
        {children}

        {onCustomizeClick && (
          <Button
            type="button"
            variant={customizeActive ? "secondary" : "ghost"}
            size="sm"
            onClick={onCustomizeClick}
            className="h-9 px-3 gap-1.5 text-xs text-[--text-2] hover:text-[--text] border border-[--line] rounded-xl"
            title="Tablo Sütunlarını ve Görünümü Özelleştir"
          >
            <IconSliders size={14} />
            <span className="hidden sm:inline">Özelleştir</span>
          </Button>
        )}
      </div>
    </div>
  )
}
