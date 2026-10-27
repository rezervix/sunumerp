/**
 * Çiçekana ERP — Unified Notification Service & Helper Hooks
 */

import { NOTIFICATION_CATALOG, NotificationCategory, NotificationDefinition, NotificationType } from './catalog'
import { sanitizeNotificationMessage } from './sanitizer'

export interface ActiveBanner {
  id: string
  category: NotificationCategory
  title: string
  message: string
  actionLabel?: string
  onAction?: () => void
  onDismiss?: () => void
}

export interface ActiveModal {
  id: string
  category: NotificationCategory
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm?: () => void
  onCancel?: () => void
}

export interface ToastPayload {
  id?: string
  category: NotificationCategory
  title: string
  message: string
  autoCloseMs?: number
  audioAlert?: boolean
}

type NotificationListener = () => void

class NotificationService {
  private activeBanners: ActiveBanner[] = []
  private activeModal: ActiveModal | null = null
  private listeners: Set<NotificationListener> = new Set()

  public subscribe(listener: NotificationListener) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify() {
    this.listeners.forEach((l) => l())
  }

  // --- Banner API ---
  public showBanner(banner: Omit<ActiveBanner, 'id'> & { id?: string }) {
    const id = banner.id || `banner_${Date.now()}`
    this.activeBanners = this.activeBanners.filter((b) => b.id !== id)
    this.activeBanners.unshift({ ...banner, id })
    this.notify()
    return id
  }

  public dismissBanner(id: string) {
    this.activeBanners = this.activeBanners.filter((b) => b.id !== id)
    this.notify()
  }

  public getBanners(): ActiveBanner[] {
    return this.activeBanners
  }

  // --- Modal API ---
  public showModal(modal: Omit<ActiveModal, 'id'> & { id?: string }) {
    const id = modal.id || `modal_${Date.now()}`
    this.activeModal = { ...modal, id }
    this.notify()
    return id
  }

  public closeModal() {
    this.activeModal = null
    this.notify()
  }

  public getActiveModal(): ActiveModal | null {
    return this.activeModal
  }

  // --- Audio Feedback ---
  public playAudioAlert() {
    if (typeof window === 'undefined') return
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime) // D5 note
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime)
      osc.connect(gain)
      gain.connect(audioCtx.destination)
      osc.start()
      osc.stop(audioCtx.currentTime + 0.25)
    } catch {
      // Audio context might be restricted before user interaction
    }
  }

  // --- Catalog Trigger Helper ---
  public triggerCatalogItem(definition: NotificationDefinition) {
    if (definition.audioAlert) {
      this.playAudioAlert()
    }

    if (definition.type === 'BANNER') {
      return this.showBanner({
        id: definition.id,
        category: definition.category,
        title: definition.title,
        message: definition.message,
      })
    }

    if (definition.type === 'MODAL') {
      return this.showModal({
        id: definition.id,
        category: definition.category,
        title: definition.title,
        message: definition.message,
      })
    }

    // Default TOAST return payload
    return {
      id: definition.id,
      category: definition.category,
      title: definition.title,
      message: definition.message,
      autoCloseMs: definition.autoCloseMs || 5000,
    }
  }
}

export const systemNotificationService = new NotificationService()
export { NOTIFICATION_CATALOG, sanitizeNotificationMessage }
