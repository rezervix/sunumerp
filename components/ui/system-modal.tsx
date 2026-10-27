'use client'

import React from 'react'
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import { systemNotificationService, ActiveModal } from '@/lib/notifications/service'
import { cn } from '@/lib/utils'

export function SystemModal() {
  const [activeModal, setActiveModal] = React.useState<ActiveModal | null>(null)

  React.useEffect(() => {
    setActiveModal(systemNotificationService.getActiveModal())
    const unsubscribe = systemNotificationService.subscribe(() => {
      setActiveModal(systemNotificationService.getActiveModal())
    })
    return () => {
      unsubscribe()
    }
  }, [])

  if (!activeModal) return null

  const isSuccess = activeModal.category === 'SUCCESS'
  const isInfo = activeModal.category === 'INFO'
  const isWarning = activeModal.category === 'WARNING'
  const isError = activeModal.category === 'ERROR'

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-xl bg-background border border-border p-6 shadow-2xl transition-all">
        {/* Header Icon */}
        <div className="flex items-start gap-4">
          <div
            className={cn(
              'p-3 rounded-full shrink-0',
              isSuccess && 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
              isInfo && 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
              isWarning && 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
              isError && 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
            )}
          >
            {isSuccess && <CheckCircle2 className="h-7 w-7" />}
            {isInfo && <Info className="h-7 w-7" />}
            {isWarning && <AlertTriangle className="h-7 w-7" />}
            {isError && <AlertCircle className="h-7 w-7" />}
          </div>

          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground">{activeModal.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{activeModal.message}</p>
          </div>

          <button
            onClick={() => {
              activeModal.onCancel?.()
              systemNotificationService.closeModal()
            }}
            className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors"
            aria-label="Kapat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-end gap-3">
          {activeModal.cancelText && (
            <button
              onClick={() => {
                activeModal.onCancel?.()
                systemNotificationService.closeModal()
              }}
              className="px-4 py-2 text-sm font-medium rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              {activeModal.cancelText}
            </button>
          )}

          <button
            onClick={() => {
              activeModal.onConfirm?.()
              systemNotificationService.closeModal()
            }}
            className={cn(
              'px-4 py-2 text-sm font-semibold rounded-md text-white shadow-sm transition-colors',
              isSuccess && 'bg-emerald-600 hover:bg-emerald-700',
              isInfo && 'bg-blue-600 hover:bg-blue-700',
              isWarning && 'bg-amber-600 hover:bg-amber-700',
              isError && 'bg-rose-600 hover:bg-rose-700'
            )}
          >
            {activeModal.confirmText || 'Tamam'}
          </button>
        </div>
      </div>
    </div>
  )
}
