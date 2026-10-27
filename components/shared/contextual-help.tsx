"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { HelpCircle, Info, BookOpen } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useLanguage } from "@/lib/context/LanguageContext"
import helpData from "@/lib/config/help-tooltips.json"
import { cn } from "@/lib/utils"

interface HelpItem {
  title: string
  description: string
}

interface HelpDataMap {
  [key: string]: {
    tr: HelpItem
    en: HelpItem
    [locale: string]: HelpItem
  }
}

interface ContextualHelpProps {
  tooltipKey?: string
  title?: string
  description?: string
  className?: string
  size?: number
}

const typedHelpData = helpData as HelpDataMap

export function ContextualHelp({
  tooltipKey,
  title,
  description,
  className,
  size = 18
}: ContextualHelpProps) {
  const pathname = usePathname()
  const { locale } = useLanguage()

  // Determine active key: use explicit tooltipKey or fall back to current pathname
  const activeKey = tooltipKey || pathname

  // Find info from config
  const configItem = typedHelpData[activeKey]
  const currentLocale = locale || "tr"
  
  const displayTitle = title || (configItem ? (configItem[currentLocale]?.title || configItem["tr"]?.title) : "")
  const displayDescription = description || (configItem ? (configItem[currentLocale]?.description || configItem["tr"]?.description) : "")

  // If no help text found for this route and no explicit overrides were provided, do not render
  if (!displayTitle && !displayDescription) {
    return null
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center justify-center rounded-full text-muted-foreground/70 hover:text-primary transition-all hover:scale-110 active:scale-95 cursor-pointer shrink-0 ml-1.5 focus:outline-hidden ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2",
            className
          )}
          aria-label={`${displayTitle} bilgi popover`}
        >
          <HelpCircle size={size} className="animate-pulse duration-3000" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={6}
        className="w-80 p-4 border border-border bg-card/95 backdrop-blur-xs rounded-xl shadow-lg animate-in fade-in-50 zoom-in-95 z-50"
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-primary font-semibold text-sm border-b border-border pb-2">
            <Info size={15} />
            <h4 className="font-bold tracking-tight text-foreground">{displayTitle}</h4>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {displayDescription}
          </p>
          <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[10px] text-muted-foreground font-medium">
            <span className="flex items-center gap-1">
              <BookOpen size={12} className="text-primary" />
              Modül Rehberi
            </span>
            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(new CustomEvent("relaunch-onboarding", { detail: { route: pathname } }))
              }}
              className="text-xs text-primary font-bold hover:underline cursor-pointer flex items-center gap-1 bg-primary/10 hover:bg-primary/20 px-2 py-1 rounded transition-colors"
            >
              Rehberi Başlat
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
