import crypto from "crypto"
import fs from "fs"
import path from "path"
import { getSystemConfig, saveSystemConfig } from "@/lib/system-config"

export interface BackupFileEntry {
  fileName: string
  originalRelativePath: string
  sizeBytes: number
  sha256: string
}

export interface BackupManifest {
  backupId: string
  label: string
  createdAt: string
  environment: string
  files: BackupFileEntry[]
  collectionCounts: Record<string, number>
  totalRecords: number
}

export interface BackupVerificationResult {
  valid: boolean
  backupId: string
  checkedFiles: number
  totalRecords: number
  errors: string[]
}

export interface BackupRestoreResult {
  restored: boolean
  backupId: string
  safetyBackupId: string | null
  restoredFiles: string[]
  totalRecordsRestored: number
}

const STORAGE_DIR = path.join(process.cwd(), "storage")
const BACKUPS_ROOT_DIR = path.join(STORAGE_DIR, "backups")
const LOCAL_JSON_DB_PATH = path.join(STORAGE_DIR, "ajans-kutuphanesi", ".local-db.json")
const SYSTEM_CONFIG_PATH = path.join(STORAGE_DIR, "system_config.json")

function computeSha256(content: Buffer | string): string {
  return crypto.createHash("sha256").update(content).digest("hex")
}

function formatTimestampForId(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    "-",
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join("")
}

function sanitizeLabel(label: string): string {
  const cleaned = label
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
  return cleaned || "manual"
}

function ensureBackupsRootDir(): void {
  if (!fs.existsSync(BACKUPS_ROOT_DIR)) {
    fs.mkdirSync(BACKUPS_ROOT_DIR, { recursive: true })
  }
}

/**
 * Veritabanı koleksiyon sayılarını (.local-db.json içinden) hesaplar.
 */
function inspectJsonDbCollections(rawJson: string): {
  collectionCounts: Record<string, number>
  totalRecords: number
} {
  const parsed = JSON.parse(rawJson)
  const collectionCounts: Record<string, number> = {}
  let totalRecords = 0

  if (parsed && typeof parsed === "object") {
    for (const [key, value] of Object.entries(parsed)) {
      if (Array.isArray(value)) {
        collectionCounts[key] = value.length
        totalRecords += value.length
      }
    }
  }

  return { collectionCounts, totalRecords }
}

/**
 * Mevcut veritabanı (.local-db.json) ve sistem yapılandırmasının (system_config.json)
 * SHA-256 doğrulamalı tam yedeğini alır.
 */
export function createDatabaseBackup(options?: {
  label?: string
  updateSystemConfigLastBackup?: boolean
}): BackupManifest {
  ensureBackupsRootDir()

  if (!fs.existsSync(LOCAL_JSON_DB_PATH)) {
    throw new Error(`Yerel veritabanı dosyası bulunamadı: ${LOCAL_JSON_DB_PATH}`)
  }

  const now = new Date()
  const label = sanitizeLabel(options?.label || "manual")
  const nonce = crypto.randomBytes(2).toString("hex")
  const backupId = `bkp-${formatTimestampForId(now)}-${nonce}-${label}`
  const backupDir = path.join(BACKUPS_ROOT_DIR, backupId)

  fs.mkdirSync(backupDir, { recursive: true })

  const files: BackupFileEntry[] = []

  // 1. .local-db.json yedeği
  const dbBuffer = fs.readFileSync(LOCAL_JSON_DB_PATH)
  const dbText = dbBuffer.toString("utf8")
  const { collectionCounts, totalRecords } = inspectJsonDbCollections(dbText)

  const dbBackupFileName = "local-db.backup.json"
  fs.writeFileSync(path.join(backupDir, dbBackupFileName), dbBuffer)
  files.push({
    fileName: dbBackupFileName,
    originalRelativePath: "storage/ajans-kutuphanesi/.local-db.json",
    sizeBytes: dbBuffer.byteLength,
    sha256: computeSha256(dbBuffer),
  })

  // 2. system_config.json yedeği (varsa)
  if (fs.existsSync(SYSTEM_CONFIG_PATH)) {
    const configBuffer = fs.readFileSync(SYSTEM_CONFIG_PATH)
    // JSON geçerliliğini doğrula
    JSON.parse(configBuffer.toString("utf8"))
    const configBackupFileName = "system_config.backup.json"
    fs.writeFileSync(path.join(backupDir, configBackupFileName), configBuffer)
    files.push({
      fileName: configBackupFileName,
      originalRelativePath: "storage/system_config.json",
      sizeBytes: configBuffer.byteLength,
      sha256: computeSha256(configBuffer),
    })
  }

  const manifest: BackupManifest = {
    backupId,
    label,
    createdAt: now.toISOString(),
    environment: process.env.NODE_ENV || "development",
    files,
    collectionCounts,
    totalRecords,
  }

  fs.writeFileSync(
    path.join(backupDir, "manifest.json"),
    JSON.stringify(manifest, null, 2),
    "utf8"
  )

  if (options?.updateSystemConfigLastBackup) {
    const currentConfig = getSystemConfig()
    saveSystemConfig({
      backup: {
        autoBackupInterval: currentConfig.backup?.autoBackupInterval || "daily",
        lastBackupAt: now.toISOString(),
      },
    })
  }

  return manifest
}

/**
 * Alınmış bir yedeğin dosya bütünlüğünü (SHA-256) ve JSON parse edilebilirliğini doğrular.
 */
export function verifyDatabaseBackup(backupId: string): BackupVerificationResult {
  const backupDir = path.join(BACKUPS_ROOT_DIR, backupId)
  const manifestPath = path.join(backupDir, "manifest.json")
  const errors: string[] = []

  if (!fs.existsSync(backupDir) || !fs.existsSync(manifestPath)) {
    return {
      valid: false,
      backupId,
      checkedFiles: 0,
      totalRecords: 0,
      errors: [`Yedek klasörü veya manifest bulunamadı: ${backupId}`],
    }
  }

  let manifest: BackupManifest
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as BackupManifest
  } catch (err) {
    return {
      valid: false,
      backupId,
      checkedFiles: 0,
      totalRecords: 0,
      errors: [`Manifest dosyası bozuk: ${(err as Error).message}`],
    }
  }

  let checkedFiles = 0
  for (const fileEntry of manifest.files) {
    const filePath = path.join(backupDir, fileEntry.fileName)
    if (!fs.existsSync(filePath)) {
      errors.push(`Yedek dosyası eksik: ${fileEntry.fileName}`)
      continue
    }

    const buffer = fs.readFileSync(filePath)
    const actualHash = computeSha256(buffer)
    if (actualHash !== fileEntry.sha256) {
      errors.push(
        `${fileEntry.fileName} SHA-256 uyuşmazlığı (Beklenen: ${fileEntry.sha256}, Gerçek: ${actualHash})`
      )
    }

    try {
      JSON.parse(buffer.toString("utf8"))
    } catch (parseErr) {
      errors.push(`${fileEntry.fileName} geçerli bir JSON değil: ${(parseErr as Error).message}`)
    }

    checkedFiles++
  }

  return {
    valid: errors.length === 0 && checkedFiles === manifest.files.length,
    backupId,
    checkedFiles,
    totalRecords: manifest.totalRecords,
    errors,
  }
}

/**
 * Mevcut tüm yedekleri yeniden eskiye doğru listeler.
 */
export function listDatabaseBackups(): BackupManifest[] {
  ensureBackupsRootDir()
  const entries = fs.readdirSync(BACKUPS_ROOT_DIR, { withFileTypes: true })
  const manifests: BackupManifest[] = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const manifestPath = path.join(BACKUPS_ROOT_DIR, entry.name, "manifest.json")
    if (!fs.existsSync(manifestPath)) continue
    try {
      const parsed = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as BackupManifest
      manifests.push(parsed)
    } catch {
      // Bozuk manifestli klasörü atla
    }
  }

  return manifests.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

/**
 * Belirtilen yedeği doğrular ve geri yükler (Restore / Rollback).
 * Varsayılan olarak geri yükleme öncesinde otomatik bir güvenlik yedeği alır.
 */
export function restoreDatabaseBackup(
  backupId: string,
  options?: {
    createPreRestoreSafetyBackup?: boolean
    restoreSystemConfig?: boolean
  }
): BackupRestoreResult {
  const verification = verifyDatabaseBackup(backupId)
  if (!verification.valid) {
    throw new Error(
      `Yedek doğrulaması başarısız olduğu için geri yükleme iptal edildi (${backupId}): ${verification.errors.join("; ")}`
    )
  }

  const backupDir = path.join(BACKUPS_ROOT_DIR, backupId)
  const manifest = JSON.parse(
    fs.readFileSync(path.join(backupDir, "manifest.json"), "utf8")
  ) as BackupManifest

  let safetyBackupId: string | null = null
  const shouldCreateSafety = options?.createPreRestoreSafetyBackup ?? true
  if (shouldCreateSafety && fs.existsSync(LOCAL_JSON_DB_PATH)) {
    const safetyManifest = createDatabaseBackup({
      label: "pre-restore-safety",
      updateSystemConfigLastBackup: false,
    })
    safetyBackupId = safetyManifest.backupId
  }

  const restoredFiles: string[] = []
  const restoreConfig = options?.restoreSystemConfig ?? false

  for (const fileEntry of manifest.files) {
    if (fileEntry.fileName === "system_config.backup.json" && !restoreConfig) {
      continue
    }

    const srcPath = path.join(backupDir, fileEntry.fileName)
    const destPath = path.join(process.cwd(), fileEntry.originalRelativePath)
    const destDir = path.dirname(destPath)
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true })
    }

    const tempDestPath = `${destPath}.restore-tmp`
    fs.copyFileSync(srcPath, tempDestPath)
    fs.renameSync(tempDestPath, destPath)
    restoredFiles.push(fileEntry.originalRelativePath)
  }

  return {
    restored: true,
    backupId,
    safetyBackupId,
    restoredFiles,
    totalRecordsRestored: manifest.totalRecords,
  }
}

/**
 * Belirtilen yedek klasörünü siler (test tatbikatı temizliği veya eski yedek temizliği için).
 */
export function deleteDatabaseBackup(backupId: string): boolean {
  if (!backupId || backupId.includes("..") || backupId.includes("/") || backupId.includes("\\")) {
    throw new Error("Geçersiz yedek kimliği")
  }
  const backupDir = path.join(BACKUPS_ROOT_DIR, backupId)
  if (!fs.existsSync(backupDir)) return false
  fs.rmSync(backupDir, { recursive: true, force: true })
  return true
}

/**
 * Geliştirme ortamında Yedek Alma -> Veri Değiştirme -> Geri Dönüş (Restore) tatbikatını
 * uçtan uca çalıştırır ve veritabanını başlangıçtaki birebir (SHA-256 eşleşmeli) durumunda bırakır.
 */
export function runBackupRestoreDrill(): {
  passed: boolean
  initialHash: string
  mutatedHash: string
  restoredHash: string
  totalRecords: number
  collectionCount: number
} {
  if (!fs.existsSync(LOCAL_JSON_DB_PATH)) {
    throw new Error(`Yerel veritabanı bulunamadı: ${LOCAL_JSON_DB_PATH}`)
  }

  const initialBuffer = fs.readFileSync(LOCAL_JSON_DB_PATH)
  const initialHash = computeSha256(initialBuffer)

  const backupManifest = createDatabaseBackup({
    label: "automated-drill",
    updateSystemConfigLastBackup: false,
  })

  try {
    const verification = verifyDatabaseBackup(backupManifest.backupId)
    if (!verification.valid) {
      throw new Error(`Alınan yedek doğrulanamadı: ${verification.errors.join(", ")}`)
    }

    // Geçici bir mutasyon uygula
    const parsedDb = JSON.parse(initialBuffer.toString("utf8"))
    if (!Array.isArray(parsedDb.auditLog)) {
      parsedDb.auditLog = []
    }
    parsedDb.auditLog.push({
      id: "drill-temp-audit-record",
      userId: "drill-system",
      action: "DRILL_MUTATION_TEST",
      resource: "BACKUP_DRILL",
      createdAt: new Date().toISOString(),
    })
    fs.writeFileSync(LOCAL_JSON_DB_PATH, JSON.stringify(parsedDb, null, 2), "utf8")

    const mutatedBuffer = fs.readFileSync(LOCAL_JSON_DB_PATH)
    const mutatedHash = computeSha256(mutatedBuffer)
    if (mutatedHash === initialHash) {
      throw new Error("Tatbikat mutasyonu veritabanı özetini (hash) değiştirmedi.")
    }

    // Yedekten geri dön (safety backup oluşturmadan)
    restoreDatabaseBackup(backupManifest.backupId, {
      createPreRestoreSafetyBackup: false,
      restoreSystemConfig: false,
    })

    const restoredBuffer = fs.readFileSync(LOCAL_JSON_DB_PATH)
    const restoredHash = computeSha256(restoredBuffer)

    if (restoredHash !== initialHash) {
      // Acil durum geri yüklemesi
      fs.writeFileSync(LOCAL_JSON_DB_PATH, initialBuffer)
      throw new Error(
        `Geri yükleme sonrası SHA-256 uyuşmazlığı! Beklenen: ${initialHash}, Gerçek: ${restoredHash}`
      )
    }

    return {
      passed: true,
      initialHash,
      mutatedHash,
      restoredHash,
      totalRecords: backupManifest.totalRecords,
      collectionCount: Object.keys(backupManifest.collectionCounts).length,
    }
  } finally {
    deleteDatabaseBackup(backupManifest.backupId)
  }
}
