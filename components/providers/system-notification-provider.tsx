'use client'

import React from 'react'
import { NOTIFICATION_CATALOG } from '@/lib/notifications/catalog'
import { sanitizeNotificationMessage } from '@/lib/notifications/sanitizer'
import { systemNotificationService } from '@/lib/notifications/service'
import { SystemBanner } from '@/components/ui/system-banner'
import { SystemModal } from '@/components/ui/system-modal'
import { toast } from 'sonner'

interface NetworkInformation extends EventTarget {
  effectiveType?: 'slow-2g' | '2g' | '3g' | '4g'
  saveData?: boolean
  addEventListener(type: string, listener: EventListenerOrEventListenerObject): void
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void
}

export function SystemNotificationProvider({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    if (typeof window === 'undefined') return

    let offlineBannerId: string | null = null

    const handleOffline = () => {
      offlineBannerId = systemNotificationService.showBanner({
        id: NOTIFICATION_CATALOG.SYSTEM.INTERNET_DISCONNECTED.id,
        category: NOTIFICATION_CATALOG.SYSTEM.INTERNET_DISCONNECTED.category,
        title: NOTIFICATION_CATALOG.SYSTEM.INTERNET_DISCONNECTED.title,
        message: NOTIFICATION_CATALOG.SYSTEM.INTERNET_DISCONNECTED.message,
      })
    }

    const handleOnline = () => {
      if (offlineBannerId) {
        systemNotificationService.dismissBanner(offlineBannerId)
        offlineBannerId = null
      }
      const restoredDef = NOTIFICATION_CATALOG.SYSTEM.INTERNET_RESTORED
      toast.success(restoredDef.message, {
        description: restoredDef.title,
        duration: restoredDef.autoCloseMs,
      })
    }

    // Network connection speed listener
    const checkConnectionQuality = () => {
      const conn = (navigator as unknown as { connection?: NetworkInformation }).connection
      if (conn && (conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g')) {
        const slowDef = NOTIFICATION_CATALOG.SYSTEM.SLOW_CONNECTION
        toast.warning(slowDef.message, {
          description: slowDef.title,
          duration: slowDef.autoCloseMs,
        })
      }
    }

    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)

    if (!navigator.onLine) {
      handleOffline()
    } else {
      checkConnectionQuality()
    }

    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  return (
    <>
      <SystemBanner />
      {children}
      <SystemModal />
    </>
  )
}

/**
 * Custom hook to dispatch system notifications, toasts, modals, and banners from any component.
 */
export function useSystemNotification() {
  const notifySuccess = (title: string, message?: string) => {
    const sanitized = sanitizeNotificationMessage(title, message)
    toast.success(sanitized.message, { description: sanitized.title, duration: 5000 })
  }

  const notifyInfo = (title: string, message?: string) => {
    const sanitized = sanitizeNotificationMessage(title, message)
    toast.info(sanitized.message, { description: sanitized.title, duration: 5000 })
  }

  const notifyWarning = (title: string, message?: string) => {
    const sanitized = sanitizeNotificationMessage(title, message)
    toast.warning(sanitized.message, { description: sanitized.title, duration: 5000 })
  }

  const notifyError = (title: string, rawError?: unknown) => {
    const sanitized = sanitizeNotificationMessage(title, rawError)
    toast.error(sanitized.message, { description: sanitized.title, duration: 5000 })
  }

  return {
    catalog: NOTIFICATION_CATALOG,
    notifySuccess,
    notifyInfo,
    notifyWarning,
    notifyError,
    showModal: systemNotificationService.showModal.bind(systemNotificationService),
    showBanner: systemNotificationService.showBanner.bind(systemNotificationService),
    closeModal: systemNotificationService.closeModal.bind(systemNotificationService),
    dismissBanner: systemNotificationService.dismissBanner.bind(systemNotificationService),
    triggerCatalogItem: systemNotificationService.triggerCatalogItem.bind(systemNotificationService),
  }
}
