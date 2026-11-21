/**
 * Sunum ERP — Turizm Faz 3: Housekeeping Mobil Çevrimdışı (Offline-First) Senkronizasyon Motoru
 *
 * Mevcut WMS El Terminali çevrimdışı senkron kalıbını (`lib/wms/offlineSyncEngine.ts`)
 * doğrudan yeniden kullanır:
 * - IndexedDB (`sunum_otel_hk_offline_db`) + LocalStorage yedekli çevrimdışı işlem kuyruğu
 * - Kat koridorlarında Wi-Fi/internet koptuğunda temizlik tamamlama, minibar sayımı ve
 *   teknik arıza bildirimini yerel kuyruğa alır; bağlantı geldiğinde `offlineIdempotencyKey`
 *   ile sunucudaki `POST /api/otel` (`action: "sync_offline_housekeeping_batch"`) ucuna
 *   mükerrer işlem riski olmadan senkronize eder.
 */

export interface OfflineHousekeepingOperation {
  id: string
  offlineIdempotencyKey: string
  taskId?: string
  roomId: string
  roomNumber: string
  operationType: "START_CLEANING" | "COMPLETE_CLEANING" | "REPORT_FAULT" | "MINIBAR_COUNT"
  notes?: string
  faultCategory?: string
  faultDescription?: string
  minibarItems?: Array<{ inventoryItemId: string; name: string; consumedQty: number }>
  queuedAt: string
  syncedAt?: string
  syncStatus: "QUEUED_OFFLINE" | "SYNCING" | "SYNCED" | "DUPLICATE_IGNORED" | "ERROR"
  errorMessage?: string
}

const DB_NAME = "sunum_otel_hk_offline_db"
const STORE_NAME = "hk_offline_ops"
const LS_FALLBACK_KEY = "sunum_otel_hk_offline_queue_v1"

function openHkIndexedDb(): Promise<IDBDatabase | null> {
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

async function persistQueue(items: OfflineHousekeepingOperation[]): Promise<void> {
  if (typeof window === "undefined") return
  window.localStorage.setItem(LS_FALLBACK_KEY, JSON.stringify(items))
  const db = await openHkIndexedDb()
  if (!db) return
  try {
    const tx = db.transaction(STORE_NAME, "readwrite")
    const store = tx.objectStore(STORE_NAME)
    store.clear()
    for (const item of items) {
      store.put(item)
    }
  } catch {
    // LocalStorage yedekli devam
  }
}

export async function getOfflineHousekeepingQueue(): Promise<OfflineHousekeepingOperation[]> {
  if (typeof window === "undefined") return []
  const rawLs = window.localStorage.getItem(LS_FALLBACK_KEY)
  let items: OfflineHousekeepingOperation[] = []
  try {
    items = rawLs ? JSON.parse(rawLs) : []
  } catch {
    items = []
  }

  const db = await openHkIndexedDb()
  if (db) {
    try {
      const tx = db.transaction(STORE_NAME, "readonly")
      const store = tx.objectStore(STORE_NAME)
      const idbItems: OfflineHousekeepingOperation[] = await new Promise((res) => {
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

export async function enqueueOfflineHousekeepingOperation(
  op: Omit<OfflineHousekeepingOperation, "id" | "offlineIdempotencyKey" | "queuedAt" | "syncStatus">
): Promise<OfflineHousekeepingOperation[]> {
  const existing = await getOfflineHousekeepingQueue()
  const now = new Date().toISOString()
  const entry: OfflineHousekeepingOperation = {
    ...op,
    id: `hk-off-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    offlineIdempotencyKey: `hk-idem-${op.roomId}-${op.operationType}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    queuedAt: now,
    syncStatus: "QUEUED_OFFLINE",
  }
  const updated = [entry, ...existing]
  await persistQueue(updated)
  return updated
}

export async function removeOfflineHousekeepingOperation(
  id: string
): Promise<OfflineHousekeepingOperation[]> {
  const existing = await getOfflineHousekeepingQueue()
  const updated = existing.filter((o) => o.id !== id)
  await persistQueue(updated)
  return updated
}

export async function syncAllOfflineHousekeepingOperations(): Promise<{
  syncedCount: number
  duplicateIgnoredCount: number
  errorCount: number
  queue: OfflineHousekeepingOperation[]
}> {
  const queue = await getOfflineHousekeepingQueue()
  const pending = queue.filter(
    (o) => o.syncStatus === "QUEUED_OFFLINE" || o.syncStatus === "ERROR"
  )
  if (pending.length === 0) {
    return { syncedCount: 0, duplicateIgnoredCount: 0, errorCount: 0, queue }
  }

  const res = await fetch("/api/otel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "sync_offline_housekeeping_batch",
      operations: pending,
    }),
  })
  const data = await res.json()
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Çevrimdışı housekeeping senkronizasyonu başarısız.")
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
