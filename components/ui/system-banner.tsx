'use client'

import React from 'react'
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import { systemNotificationService, ActiveBanner } from '@/lib/notifications/service'
import { cn } from '@/lib/utils'

export function SystemBanner() {
  const [banners, setBanners] = React.useState<ActiveBanner[]>([])

  React.useEffect(() => {
    setBanners(systemNotificationService.getBanners())
    const unsubscribe = systemNotificationService.subscribe(() => {
      setBanners([...systemNotificationService.getBanners()])
    })
    return () => {
      unsubscribe()
    }
  }, [])

  if (!banners.length) return null

  return (
    <div className="w-full flex flex-col gap-1 z-[90] sticky top-0 shadow-md transition-all">
      {banners.map((banner) => {
        const isSuccess = banner.category === 'SUCCESS'
        const isInfo = banner.category === 'INFO'
        const isWarning = banner.category === 'WARNING'
        const isError = banner.category === 'ERROR'

        return (
          <div
            key={banner.id}
            className={cn(
              'w-full px-4 py-3 flex items-center justify-between text-sm font-medium transition-colors border-b',
              isSuccess && 'bg-emerald-600 text-white border-emerald-700 dark:bg-emerald-700',
              isInfo && 'bg-blue-600 text-white border-blue-700 dark:bg-blue-700',
              isWarning && 'bg-amber-500 text-slate-950 border-amber-600 dark:bg-amber-600 dark:text-white',
              isError && 'bg-rose-600 text-white border-rose-700 dark:bg-rose-700'
            )}
          >
            <div className="flex items-center gap-3 max-w-7xl mx-auto w-full">
              {isSuccess && <CheckCircle2 className="h-5 w-5 shrink-0" />}
              {isInfo && <Info className="h-5 w-5 shrink-0" />}
              {isWarning && <AlertTriangle className="h-5 w-5 shrink-0" />}
              {isError && <AlertCircle className="h-5 w-5 shrink-0" />}

              <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                <span className="font-semibold">{banner.title}</span>
                <span className="opacity-95 font-normal">{banner.message}</span>
              </div>

              {banner.actionLabel && banner.onAction && (
                <button
                  onClick={banner.onAction}
                  className="px-3 py-1 text-xs font-semibold rounded bg-white/20 hover:bg-white/30 transition-colors shrink-0"
                >
                  {banner.actionLabel}
                </button>
              )}

              <button
                onClick={() => {
                  banner.onDismiss?.()
                  systemNotificationService.dismissBanner(banner.id)
                }}
                className="p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors shrink-0"
                aria-label="Kapat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
