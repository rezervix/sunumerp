/**
 * Lojistik & Depo Yönetimi — Demo Seed Çerçevesi
 *
 * KURALLAR (Pazarlık Konusu Değil):
 * 1. SADECE DEMO ortamında çalışır (isDemoEnvironment() === true). Gerçek müşteri
 *    ortamında (DISABLE_DEMO_MODE=true veya ENABLE_DEMO_MODE=false) kesinlikle reddeder.
 * 2. Başlamadan önce .local-db.json güvenlik yedeği alır (createDatabaseBackup).
 * 3. Tamamen idempotent ve eklemelidir (additive-only); mevcut hiçbir demo kaydını
 *    silmez veya bozmaz — çalışma öncesi ve sonrası mevcut kayıt parmak izini doğrular.
 * 4. Tek komutla tamamen geri alınabilir (rollbackLogisticsDemoSeed).
 * 5. Mevcut scripts/seed-demo-database.js dosyasına DOKUNMAZ.
 */

import crypto from "crypto"
import fs from "fs"
import path from "path"
import { isDemoEnvironment } from "@/lib/config/production-feature-flags"
import { createDatabaseBackup } from "@/lib/services/databaseBackupService"
import type {
  LogisticsSeedExecutionReport,
  LogisticsSeedStepResult,
} from "../types"

export const LOCAL_JSON_DB_PATH = path.join(
  process.cwd(),
  "storage",
  "ajans-kutuphanesi",
  ".local-db.json"
)

export class LogisticsSeedEnvironmentError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "LogisticsSeedEnvironmentError"
  }
}

/**
 * Yalnızca DEMO ortamında çalışmayı zorunlu kılan ortam güvenlik kilidi.
 */
export function assertLogisticsDemoSeedAllowed(): void {
  if (!isDemoEnvironment()) {
    throw new LogisticsSeedEnvironmentError(
      "Güvenlik Kilidi: Demo seed betiği gerçek müşteri/üretim ortamında çalıştırılamaz (DISABLE_DEMO_MODE/ENABLE_DEMO_MODE kontrolü)."
    )
  }

  const dbUrl = process.env.DATABASE_URL || ""
  const looksLikeExternalProdDb =
    Boolean(dbUrl) &&
    !dbUrl.includes("localhost") &&
    !dbUrl.includes("127.0.0.1") &&
    !dbUrl.includes("mock") &&
    process.env.VERCEL_ENV === "production" &&
    process.env.ALLOW_DEMO_SEED !== "true"

  if (looksLikeExternalProdDb) {
    throw new LogisticsSeedEnvironmentError(
      "Güvenlik Kilidi: Harici production veritabanı bağlantısı algılandı; demo seed durduruldu."
    )
  }
}

export interface LogisticsSeedModule {
  readonly moduleKey: string
  readonly phase: number
  readonly seededIdsByCollection: Readonly<Record<string, readonly string[]>>
  seed: (db: Record<string, any[]>) => Promise<LogisticsSeedStepResult> | LogisticsSeedStepResult
  rollback?: (db: Record<string, any[]>) => Record<string, number>
}

export function readRawLocalDb(): Record<string, any[]> {
  if (!fs.existsSync(LOCAL_JSON_DB_PATH)) {
    throw new Error(`Yerel demo veritabanı bulunamadı: ${LOCAL_JSON_DB_PATH}`)
  }
  const raw = fs.readFileSync(LOCAL_JSON_DB_PATH, "utf8")
  return JSON.parse(raw) as Record<string, any[]>
}

export function writeRawLocalDb(db: Record<string, any[]>): void {
  const payload = JSON.stringify(db, null, 2) + "\n"
  fs.writeFileSync(LOCAL_JSON_DB_PATH, payload, "utf8")
}

function stableHashRecord(rec: unknown): string {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(rec))
    .digest("hex")
}

function collectSeededIdSet(modules: readonly LogisticsSeedModule[]): Record<string, Set<string>> {
  const map: Record<string, Set<string>> = {}
  for (const mod of modules) {
    for (const [col, ids] of Object.entries(mod.seededIdsByCollection)) {
      if (!map[col]) map[col] = new Set<string>()
      for (const id of ids) map[col].add(id)
    }
  }
  return map
}

function snapshotPreExistingRecords(
  db: Record<string, any[]>,
  ignoreIdsByCollection: Record<string, Set<string>>
): { counts: Record<string, number>; fingerprints: Record<string, Record<string, string>> } {
  const counts: Record<string, number> = {}
  const fingerprints: Record<string, Record<string, string>> = {}

  for (const [col, list] of Object.entries(db)) {
    if (!Array.isArray(list)) continue
    const ignored = ignoreIdsByCollection[col]
    counts[col] = list.length
    fingerprints[col] = {}
    for (let idx = 0; idx < list.length; idx++) {
      const rec = list[idx]
      const key = String(rec?.id ?? rec?.code ?? `idx:${idx}`)
      if (ignored?.has(key)) continue
      fingerprints[col][key] = stableHashRecord(rec)
    }
  }
  return { counts, fingerprints }
}

function verifyPreExistingIntact(
  before: Record<string, Record<string, string>>,
  postDb: Record<string, any[]>
): boolean {
  for (const [col, beforeMap] of Object.entries(before)) {
    const postList = Array.isArray(postDb[col]) ? postDb[col] : []
    const byKey = new Map<string, string>()
    for (let idx = 0; idx < postList.length; idx++) {
      const rec = postList[idx]
      const key = String(rec?.id ?? rec?.code ?? `idx:${idx}`)
      byKey.set(key, stableHashRecord(rec))
    }
    for (const [key, beforeHash] of Object.entries(beforeMap)) {
      if (byKey.get(key) !== beforeHash) {
        return false
      }
    }
  }
  return true
}

/**
 * Kayıtlı tüm lojistik demo seed modüllerini güvenli, yedekli ve idempotent biçimde çalıştırır.
 */
export async function executeLogisticsDemoSeed(
  modules: readonly LogisticsSeedModule[],
  options?: { createBackup?: boolean; backupLabel?: string }
): Promise<LogisticsSeedExecutionReport> {
  assertLogisticsDemoSeedAllowed()

  let backupId: string | null = null
  if (options?.createBackup !== false) {
    const manifest = createDatabaseBackup({
      label: options?.backupLabel ?? "pre-logistics-seed",
      updateSystemConfigLastBackup: false,
    })
    backupId = manifest.backupId
  }

  const db = readRawLocalDb()
  const seedIdMap = collectSeededIdSet(modules)
  const before = snapshotPreExistingRecords(db, seedIdMap)

  const modulesExecuted: LogisticsSeedStepResult[] = []
  let anyChanged = false

  for (const mod of modules) {
    const step = await mod.seed(db)
    modulesExecuted.push(step)
    const insertedTotal = Object.values(step.inserted).reduce((a, b) => a + b, 0)
    if (insertedTotal > 0) anyChanged = true
  }

  if (anyChanged) {
    writeRawLocalDb(db)
  }

  const afterDb = readRawLocalDb()
  const postCounts: Record<string, number> = {}
  for (const [col, list] of Object.entries(afterDb)) {
    if (Array.isArray(list)) postCounts[col] = list.length
  }

  const preExistingIntegrityIntact = verifyPreExistingIntact(
    before.fingerprints,
    afterDb
  )
  if (!preExistingIntegrityIntact) {
    throw new Error(
      "KRİTİK: Lojistik seed sonrası mevcut demo kayıtlarından birinde beklenmeyen değişiklik tespit edildi!"
    )
  }

  return {
    success: true,
    environment: "demo",
    backupId,
    executedAt: new Date().toISOString(),
    modulesExecuted,
    preExistingCounts: before.counts,
    postCounts,
    preExistingIntegrityIntact,
  }
}

/**
 * Yalnızca Lojistik demo seed tarafından eklenen kayıtları tek komutta geri alır.
 * Mevcut hiçbir pre-existing demo kaydına dokunmaz.
 */
export function executeLogisticsDemoRollback(
  modules: readonly LogisticsSeedModule[],
  options?: { createSafetyBackup?: boolean }
): {
  success: boolean
  backupId: string | null
  removedByCollection: Record<string, number>
  preExistingIntegrityIntact: boolean
} {
  assertLogisticsDemoSeedAllowed()

  let backupId: string | null = null
  if (options?.createSafetyBackup !== false) {
    const manifest = createDatabaseBackup({
      label: "pre-logistics-rollback",
      updateSystemConfigLastBackup: false,
    })
    backupId = manifest.backupId
  }

  const db = readRawLocalDb()
  const seedIdMap = collectSeededIdSet(modules)
  const before = snapshotPreExistingRecords(db, seedIdMap)

  const removedByCollection: Record<string, number> = {}

  for (const mod of modules) {
    if (mod.rollback) {
      const customRemoved = mod.rollback(db)
      for (const [col, count] of Object.entries(customRemoved)) {
        removedByCollection[col] = (removedByCollection[col] || 0) + count
      }
    }
    for (const [col, ids] of Object.entries(mod.seededIdsByCollection)) {
      const list = db[col]
      if (!Array.isArray(list) || ids.length === 0) continue
      const idSet = new Set(ids)
      const beforeLen = list.length
      db[col] = list.filter((rec) => !idSet.has(String(rec?.id ?? "")))
      const diff = beforeLen - db[col].length
      if (diff > 0) {
        removedByCollection[col] = (removedByCollection[col] || 0) + diff
      }
      // Lojistik prefixli boş koleksiyonu tamamen temizle
      if (col.startsWith("lojistik") && db[col].length === 0) {
        delete db[col]
      }
    }
  }

  const totalRemoved = Object.values(removedByCollection).reduce((a, b) => a + b, 0)
  if (totalRemoved > 0) {
    writeRawLocalDb(db)
  }

  const afterDb = readRawLocalDb()
  const preExistingIntegrityIntact = verifyPreExistingIntact(
    before.fingerprints,
    afterDb
  )

  return {
    success: true,
    backupId,
    removedByCollection,
    preExistingIntegrityIntact,
  }
}
