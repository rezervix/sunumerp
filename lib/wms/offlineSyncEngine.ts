/**
 * FAZ 2: Çevrimdışı (Offline-First) Saha & Mobil Terminal Senkronizasyon Motoru
 * - IndexedDB (`sunum_wms_offline_db`) + LocalStorage yedekli çevrimdışı işlem kuyruğu
 * - Barkod (EAN-13, Code128, QR) tarama desteği
 * - İnternet bağlantısı kesildiğinde sahadaki mal kabul, rafa yerleştirme (put-away),
 *   toplama (pick) ve sayım işlemlerini yerel veritabanına yazar; bağlantı geldiğinde
 *   gerçek POST /api/wms isteğiyle sunucuya iletir.
 */

export interface OfflineWmsOperation {
  id: string
  idempotencyKey?: string
  deviceId: string
  operatorName: string
  operationType:
    | "BARCODE_SCAN"
    | "QR_LOT_SCAN"
    | "PUTAWAY_CONFIRM"
    | "PICK_CONFIRM"
    | "BLIND_COUNT_ENTRY"
    | "GOODS_RECEIPT"
    | "WAVE_PICK"
    | "SSCC_SCAN"
    | "CYCLE_COUNT_LINE"
  codeScanned: string
  sku: string
  itemId?: string
  warehouseId?: string
  taskId?: string
  lineId?: string
  itemName: string
  lotNumber?: string
  binCode: string
  lpnCode?: string
  quantity: number
  unit: string
  queuedAt: string
  syncedAt?: string
  syncStatus: "QUEUED_OFFLINE" | "SYNCING" | "SYNCED" | "CONFLICT" | "DUPLICATE_IGNORED" | "ERROR"
  conflictNote?: string
}

const DB_NAME = "sunum_wms_offline_db"
const STORE_NAME = "offline_operations"
const LS_FALLBACK_KEY = "sunum_wms_offline_queue_v2"

const INITIAL_OFFLINE_LOGS: OfflineWmsOperation[] = [
  {
    id: "off-op-01",
    deviceId: "ZEBRA-TC58-IST-01",
    operatorName: "Ahmet Yılmaz",
    operationType: "PUTAWAY_CONFIRM",
    codeScanned: "8690001001",
    sku: "GUL-EKV-01",
    itemName: "Ekvator Kırmızı Gül (1. Kalite - 60cm)",
    lotNumber: "LOT-GUL-2610A",
    binCode: "A-01-01",
    lpnCode: "LPN-2026-001",
    quantity: 50,
    unit: "Demet",
    queuedAt: "2026-11-04 09:15:00",
    syncedAt: "2026-11-04 09:15:05",
    syncStatus: "SYNCED"
  },
  {
    id: "off-op-02",
    deviceId: "HONEYWELL-EDA52-02",
    operatorName: "Elif Demir",
    operationType: "PUTAWAY_CONFIRM",
    codeScanned: "8690001002",
    sku: "LIL-KAZ-02",
    itemName: "Beyaz Kazablanka Lilyum (Kokulu)",
    lotNumber: "LOT-LIL-28",
    binCode: "A-01-02",
    lpnCode: "LPN-2026-002",
    quantity: 30,
    unit: "Dal",
    queuedAt: "2026-11-04 10:20:15",
    syncStatus: "QUEUED_OFFLINE",
    conflictNote: "Soğuk hava deposu içinde çevrimdışı kaydedildi, Wi-Fi senkronu bekliyor."
  }
]

function openIndexedDb(): Promise<IDBDatabase | null> {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    return Promise.resolve(null)
  }
  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, 2)
      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id" })
        }
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

export async function getOfflineWmsQueue(): Promise<OfflineWmsOperation[]> {
  if (typeof window === "undefined") return INITIAL_OFFLINE_LOGS

  const rawLs = window.localStorage.getItem(LS_FALLBACK_KEY)
  let items: OfflineWmsOperation[] = rawLs ? JSON.parse(rawLs) : INITIAL_OFFLINE_LOGS

  const db = await openIndexedDb()
  if (db) {
    try {
      const tx = db.transaction(STORE_NAME, "readonly")
      const store = tx.objectStore(STORE_NAME)
      const idbItems: OfflineWmsOperation[] = await new Promise((res) => {
        const req = store.getAll()
        req.onsuccess = () => res(req.result || [])
        req.onerror = () => res([])
      })
      if (idbItems.length > 0) {
        items = idbItems.sort((a, b) => (a.queuedAt < b.queuedAt ? 1 : -1))
      } else {
        const writeTx = db.transaction(STORE_NAME, "readwrite")
        const writeStore = writeTx.objectStore(STORE_NAME)
        for (const seed of items) {
          writeStore.put(seed)
        }
      }
    } catch {
      // LocalStorage fallback
    }
  }

  window.localStorage.setItem(LS_FALLBACK_KEY, JSON.stringify(items))
  return items
}

function toServerBatchItem(op: OfflineWmsOperation) {
  const mappedType =
    op.operationType === "PICK_CONFIRM" || op.operationType === "WAVE_PICK"
      ? "WAVE_PICK"
      : op.operationType === "GOODS_RECEIPT"
        ? "RECEIVE"
        : op.operationType === "BLIND_COUNT_ENTRY" || op.operationType === "CYCLE_COUNT_LINE"
          ? "CYCLE_COUNT"
          : "PUTAWAY"

  return {
    idempotencyKey: op.idempotencyKey || op.id,
    operationType: mappedType,
    queuedAt: op.queuedAt,
    payload: {
      taskId: op.taskId,
      lineId: op.lineId,
      itemId: op.itemId,
      sku: op.sku,
      warehouseId: op.warehouseId || "wh-merkez-01",
      binCode: op.binCode,
      quantity: op.quantity,
      countedQty: op.quantity,
      lotNumber: op.lotNumber,
      lpnCode: op.lpnCode,
    },
  }
}

export async function removeOfflineOperation(id: string): Promise<OfflineWmsOperation[]> {
  const current = await getOfflineWmsQueue()
  const updated = current.filter((item) => item.id !== id)
  if (typeof window !== "undefined") {
    window.localStorage.setItem(LS_FALLBACK_KEY, JSON.stringify(updated))
    const db = await openIndexedDb()
    if (db) {
      try {
        const tx = db.transaction(STORE_NAME, "readwrite")
        tx.objectStore(STORE_NAME).delete(id)
      } catch {
        // Fallback saved
      }
    }
  }
  return updated
}

export async function enqueueOfflineWmsOperation(
  op: Omit<OfflineWmsOperation, "id" | "queuedAt" | "syncStatus">,
  isOfflineMode: boolean
): Promise<OfflineWmsOperation> {
  const nowStr = new Date().toISOString().replace("T", " ").slice(0, 19)
  const idempotencyKey =
    op.idempotencyKey || `${op.deviceId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const newOp: OfflineWmsOperation = {
    ...op,
    idempotencyKey,
    id: `off-op-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    queuedAt: nowStr,
    syncedAt: isOfflineMode ? undefined : nowStr,
    syncStatus: isOfflineMode ? "QUEUED_OFFLINE" : "SYNCED"
  }

  // Eğer çevrimiçiyse, anında sunucuya gönder ve çakışma/duplicate sonucunu kaydet
  if (!isOfflineMode) {
    try {
      const res = await fetch("/api/wms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "offline_batch_sync",
          deviceId: newOp.deviceId,
          operatorName: newOp.operatorName,
          queueItems: [toServerBatchItem(newOp)]
        })
      })
      const data = await res.json()
      const firstResult = Array.isArray(data.results) ? data.results[0] : null
      if (firstResult) {
        newOp.syncStatus = firstResult.status
        newOp.conflictNote = firstResult.detail || firstResult.message || firstResult.reason
      } else if (!data.success) {
        newOp.syncStatus = "QUEUED_OFFLINE"
        newOp.conflictNote = data.error || "Sunucuya iletilemedi; kuyruğa alındı."
      }
    } catch (e: any) {
      newOp.syncStatus = "QUEUED_OFFLINE"
      newOp.conflictNote = "Bağlantı kesildi; yerelde kuyruğa alındı."
    }
  }

  const current = await getOfflineWmsQueue()
  const updated = [newOp, ...current]

  if (typeof window !== "undefined") {
    window.localStorage.setItem(LS_FALLBACK_KEY, JSON.stringify(updated))
    const db = await openIndexedDb()
    if (db) {
      try {
        const tx = db.transaction(STORE_NAME, "readwrite")
        tx.objectStore(STORE_NAME).put(newOp)
      } catch {
        // Fallback saved
      }
    }
  }

  return newOp
}

export async function syncAllOfflineWmsOperations(): Promise<{
  syncedCount: number
  conflictCount: number
  duplicateCount: number
  operations: OfflineWmsOperation[]
}> {
  const current = await getOfflineWmsQueue()
  const queuedItems = current.filter(
    (item) => item.syncStatus === "QUEUED_OFFLINE" || item.syncStatus === "ERROR"
  )
  const nowStr = new Date().toISOString().replace("T", " ").slice(0, 19)

  if (queuedItems.length === 0) {
    return { syncedCount: 0, conflictCount: 0, duplicateCount: 0, operations: current }
  }

  let syncedCount = 0
  let conflictCount = 0
  let duplicateCount = 0
  const resultMap = new Map<string, { status: OfflineWmsOperation["syncStatus"]; message?: string }>()

  try {
    const res = await fetch("/api/wms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "offline_batch_sync",
        deviceId: queuedItems[0]?.deviceId || "EL-TERMINAL-01",
        operatorName: queuedItems[0]?.operatorName || "Saha Operatörü",
        queueItems: queuedItems.map(toServerBatchItem)
      })
    })

    const data = await res.json()
    if (data.success && Array.isArray(data.results)) {
      syncedCount = Number(data.syncedCount || 0)
      conflictCount = Number(data.conflictCount || 0)
      duplicateCount = Number(data.duplicateCount || 0)
      for (const r of data.results) {
        resultMap.set(r.idempotencyKey, {
          status: r.status,
          message: r.detail || r.message || r.reason,
        })
      }
    } else {
      throw new Error(data.error || "Toplu senkronizasyon reddedildi")
    }
  } catch (error: any) {
    console.error("Sunucu senkronizasyon hatası:", error)
    return { syncedCount: 0, conflictCount: 0, duplicateCount: 0, operations: current }
  }

  const updated = current.map((item) => {
    const key = item.idempotencyKey || item.id
    const res = resultMap.get(key)
    if (res) {
      return {
        ...item,
        syncStatus: res.status,
        syncedAt: res.status === "SYNCED" ? nowStr : item.syncedAt,
        conflictNote: res.message || (res.status === "SYNCED" ? "Sunucu veritabanına işlendi." : item.conflictNote),
      }
    }
    return item
  })

  if (typeof window !== "undefined") {
    window.localStorage.setItem(LS_FALLBACK_KEY, JSON.stringify(updated))
    const db = await openIndexedDb()
    if (db) {
      try {
        const tx = db.transaction(STORE_NAME, "readwrite")
        const store = tx.objectStore(STORE_NAME)
        for (const item of updated) {
          store.put(item)
        }
      } catch {
        // Fallback saved
      }
    }
  }

  return { syncedCount, conflictCount, duplicateCount, operations: updated }
}
