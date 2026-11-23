/**
 * Sunum ERP — Turizm Faz 4: Rehber / Şoför Mobil Çevrimdışı (Offline-First) Senkronizasyon Motoru
 *
 * Faz 3 (`housekeepingOfflineSync.ts`) ve WMS (`offlineSyncEngine.ts`) çevrimdışı kalıbını
 * birebir yeniden kullanır:
 * - IndexedDB (`sunum_tur_guide_offline_db`) + LocalStorage yedekli çevrimdışı işlem kuyruğu
 * - Yolculuk sırasında mobil internet koptuğunda yolcu yoklama/biniş, acil saha notu ve
 *   saha ödeme tahsilatını yerel kuyruğa alır; bağlantı geldiğinde `offlineIdempotencyKey`
 *   ile `POST /api/tur` (`action: "sync_offline_guide_batch"`) ucuna mükerrer işlem riski
 *   olmadan senkronize eder.
 */

export interface OfflineGuideOperation {
  id: string
  offlineIdempotencyKey: string
  tourId: string
  operationType: "BOARDING_CHECKIN" | "EMERGENCY_NOTE" | "FIELD_COLLECTION"
  passengerId?: string
  passengerName?: string
  boardingStatus?: "BOARDED" | "NO_SHOW" | "WAITING"
  bookingId?: string
  amountTry?: number
  paymentMethod?: string
  note?: string
  queuedAt: string
  syncedAt?: string
  syncStatus: "QUEUED_OFFLINE" | "SYNCED" | "DUPLICATE_IGNORED" | "ERROR"
  errorMessage?: string
}

const DB_NAME = "sunum_tur_guide_offline_db"
const STORE_NAME = "guide_offline_ops"
const LS_FALLBACK_KEY = "sunum_tur_guide_offline_queue_v1"

function openGuideIndexedDb(): Promise<IDBDatabase | null> {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    return Promise.resolve(null)
  }
  return new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(DB_NAME, 1)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id" })
        }
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

async function persistQueue(items: OfflineGuideOperation[]): Promise<void> {
  if (typeof window === "undefined") return
  window.localStorage.setItem(LS_FALLBACK_KEY, JSON.stringify(items))
  const db = await openGuideIndexedDb()
  if (!db) return
  try {
    const tx = db.transaction(STORE_NAME, "readwrite")
    const store = tx.objectStore(STORE_NAME)
    store.clear()
    for (const item of items) store.put(item)
  } catch {
    // LocalStorage yedekli devam
  }
}

export async function getOfflineGuideQueue(): Promise<OfflineGuideOperation[]> {
  if (typeof window === "undefined") return []
  const rawLs = window.localStorage.getItem(LS_FALLBACK_KEY)
  let items: OfflineGuideOperation[] = []
  try {
    items = rawLs ? JSON.parse(rawLs) : []
  } catch {
    items = []
  }
  const db = await openGuideIndexedDb()
  if (db) {
    try {
      const tx = db.transaction(STORE_NAME, "readonly")
      const store = tx.objectStore(STORE_NAME)
      const idbItems: OfflineGuideOperation[] = await new Promise((res) => {
        const req = store.getAll()
        req.onsuccess = () => res(req.result || [])
        req.onerror = () => res([])
      })
      if (idbItems.length > 0) {
        items = idbItems.sort((a, b) => (a.queuedAt < b.queuedAt ? 1 : -1))
      }
    } catch {
      // LocalStorage yedek
    }
  }
  return items
}

export async function enqueueOfflineGuideOperation(
  op: Omit<OfflineGuideOperation, "id" | "offlineIdempotencyKey" | "queuedAt" | "syncStatus">
): Promise<OfflineGuideOperation[]> {
  const existing = await getOfflineGuideQueue()
  const now = new Date().toISOString()
  const entry: OfflineGuideOperation = {
    ...op,
    id: `tur-off-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    offlineIdempotencyKey: `tur-idem-${op.tourId}-${op.operationType}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    queuedAt: now,
    syncStatus: "QUEUED_OFFLINE",
  }
  const updated = [entry, ...existing]
  await persistQueue(updated)
  return updated
}

export async function syncAllOfflineGuideOperations(): Promise<{
  syncedCount: number
  duplicateIgnoredCount: number
  errorCount: number
  queue: OfflineGuideOperation[]
}> {
  const queue = await getOfflineGuideQueue()
  const pending = queue.filter(
    (o) => o.syncStatus === "QUEUED_OFFLINE" || o.syncStatus === "ERROR"
  )
  if (pending.length === 0) {
    return { syncedCount: 0, duplicateIgnoredCount: 0, errorCount: 0, queue }
  }

  const res = await fetch("/api/tur", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "sync_offline_guide_batch",
      operations: pending,
    }),
  })
  const data = await res.json()
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Çevrimdışı rehber senkronizasyonu başarısız.")
  }

  const resultMap = new Map<string, any>(
    (data.results || []).map((r: any) => [r.offlineIdempotencyKey, r])
  )
  const now = new Date().toISOString()
  let syncedCount = 0
  let duplicateIgnoredCount = 0
  let errorCount = 0

  const nextQueue = queue.map((op) => {
    const r = resultMap.get(op.offlineIdempotencyKey)
    if (!r) return op
    if (r.status === "SYNCED") {
      syncedCount++
      return { ...op, syncStatus: "SYNCED" as const, syncedAt: now, errorMessage: undefined }
    }
    if (r.status === "DUPLICATE_IGNORED") {
      duplicateIgnoredCount++
      return { ...op, syncStatus: "DUPLICATE_IGNORED" as const, syncedAt: now }
    }
    errorCount++
    return { ...op, syncStatus: "ERROR" as const, errorMessage: r.message || "Hata" }
  })

  await persistQueue(nextQueue)
  return { syncedCount, duplicateIgnoredCount, errorCount, queue: nextQueue }
}
