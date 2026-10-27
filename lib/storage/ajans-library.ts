/**
 * Ajans Kütüphanesi — Storage Katmanı
 * Orijinal dosyalar asla değiştirilmez, üzerine yazılmaz (DOKUNULMAZLIK KURALI)
 */
import fs from "fs"
import path from "path"
import crypto from "crypto"
import { pipeline } from "stream/promises"

// Proje kökünden storage dizini
const STORAGE_ROOT = path.join(process.cwd(), "storage", "ajans-kutuphanesi")
const TEMP_DIR = path.join(process.cwd(), "storage", "ajans-kutuphanesi", ".tmp")
const CHUNKS_DIR = path.join(process.cwd(), "storage", "ajans-kutuphanesi", ".chunks")

// İzin verilen MIME tiplerine ait whitelist
export const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  image: [
    "image/jpeg", "image/png", "image/webp", "image/gif",
    "image/tiff", "image/svg+xml", "image/heic", "image/heif",
    "image/bmp", "image/avif",
  ],
  video: [
    "video/mp4", "video/quicktime", "video/x-msvideo", "video/webm",
    "video/x-matroska", "video/mpeg", "video/3gpp",
  ],
  audio: [
    "audio/mpeg", "audio/wav", "audio/aac", "audio/flac",
    "audio/ogg", "audio/x-m4a", "audio/webm",
  ],
  document: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain", "text/csv", "text/html",
    "application/rtf",
  ],
  archive: [
    "application/zip", "application/x-zip-compressed",
    "application/x-rar-compressed", "application/x-7z-compressed",
    "application/gzip", "application/x-tar",
  ],
  design: [
    "image/vnd.adobe.photoshop",
    "application/illustrator",
    "application/vnd.figma",
    "image/x-xcf",
  ],
}

export const ALL_ALLOWED_MIMES = Object.values(ALLOWED_MIME_TYPES).flat()

// Dosya boyutu limitleri (byte cinsinden)
export const FILE_SIZE_LIMITS: Record<string, number> = {
  image: 100 * 1024 * 1024,      // 100 MB
  video: 10 * 1024 * 1024 * 1024, // 10 GB
  audio: 2 * 1024 * 1024 * 1024,  // 2 GB
  document: 500 * 1024 * 1024,    // 500 MB
  archive: 5 * 1024 * 1024 * 1024, // 5 GB
  design: 500 * 1024 * 1024,      // 500 MB
  default: 500 * 1024 * 1024,     // 500 MB
}

/**
 * Storage dizinlerini oluşturur (uygulama başlangıcında çağrılır)
 */
export function ensureStorageDirs() {
  ;[STORAGE_ROOT, TEMP_DIR, CHUNKS_DIR].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  })
}

/**
 * Yıl/ay bazlı depolama yolu oluşturur
 * Örn: storage/ajans-kutuphanesi/2026/07/uuid.jpg
 */
export function buildStoragePath(uuid: string, ext: string): string {
  const now = new Date()
  const yil = now.getFullYear().toString()
  const ay = (now.getMonth() + 1).toString().padStart(2, "0")
  const dir = path.join(STORAGE_ROOT, yil, ay)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return path.join(dir, `${uuid}.${ext}`)
}

/**
 * Chunk depolama yolu
 */
export function buildChunkPath(uploadId: string, chunkIndex: number): string {
  const dir = path.join(CHUNKS_DIR, uploadId)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return path.join(dir, `chunk_${chunkIndex.toString().padStart(6, "0")}`)
}

/**
 * SHA-256 checksum hesaplar
 */
export async function computeChecksum(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256")
    const stream = fs.createReadStream(filePath)
    stream.on("data", (chunk) => hash.update(chunk))
    stream.on("end", () => resolve(hash.digest("hex")))
    stream.on("error", reject)
  })
}

/**
 * Checksum'ı stream üzerinden hesaplar (yükleme sırasında)
 */
export function createChecksumStream(): {
  hash: crypto.Hash
  getDigest: () => string
} {
  const hash = crypto.createHash("sha256")
  return {
    hash,
    getDigest: () => hash.digest("hex"),
  }
}

/**
 * ATOMIC WRITE: Önce temp dosyaya yaz → checksum doğrula → asıl konuma taşı
 * Bu fonksiyon orijinal dosyalar için kullanılır.
 */
export async function writeFileAtomic(
  sourceBuffer: Buffer,
  targetPath: string
): Promise<{ checksum: string; sizeBytes: number }> {
  ensureStorageDirs()

  const tempPath = path.join(TEMP_DIR, `tmp_${Date.now()}_${Math.random().toString(36).slice(2)}`)

  try {
    // 1. Temp dosyaya yaz
    await fs.promises.writeFile(tempPath, sourceBuffer)

    // 2. Checksum hesapla
    const checksum = await computeChecksum(tempPath)

    // 3. Hedef dizini oluştur
    const targetDir = path.dirname(targetPath)
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true })
    }

    // 4. Atomik rename (aynı filesystem içinde atomik garantisi)
    await fs.promises.rename(tempPath, targetPath)

    return { checksum, sizeBytes: sourceBuffer.length }
  } catch (err) {
    // Başarısızsa temp dosyayı temizle
    if (fs.existsSync(tempPath)) {
      await fs.promises.unlink(tempPath).catch(() => {})
    }
    throw err
  }
}

/**
 * Chunk'ları birleştirerek atomik write ile kalıcı konuma taşır
 */
export async function assembleChunks(
  uploadId: string,
  totalChunks: number,
  targetPath: string
): Promise<{ checksum: string; sizeBytes: number }> {
  ensureStorageDirs()

  const tempPath = path.join(TEMP_DIR, `assembled_${uploadId}`)
  const writeStream = fs.createWriteStream(tempPath)

  try {
    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = buildChunkPath(uploadId, i)
      if (!fs.existsSync(chunkPath)) {
        throw new Error(`Chunk ${i} eksik: ${chunkPath}`)
      }
      const readStream = fs.createReadStream(chunkPath)
      await pipeline(readStream, writeStream, { end: false })
    }
    writeStream.end()
    await new Promise<void>((resolve, reject) => {
      writeStream.on("finish", resolve)
      writeStream.on("error", reject)
    })

    // Checksum ve boyut
    const checksum = await computeChecksum(tempPath)
    const stat = await fs.promises.stat(tempPath)

    // Hedef dizini oluştur
    const targetDir = path.dirname(targetPath)
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true })
    }

    // Atomik taşı
    await fs.promises.rename(tempPath, targetPath)

    // Chunk klasörünü temizle
    const chunkDir = path.join(CHUNKS_DIR, uploadId)
    if (fs.existsSync(chunkDir)) {
      await fs.promises.rm(chunkDir, { recursive: true, force: true })
    }

    return { checksum, sizeBytes: stat.size }
  } catch (err) {
    if (fs.existsSync(tempPath)) {
      await fs.promises.unlink(tempPath).catch(() => {})
    }
    throw err
  }
}

/**
 * Dosya kategorisini MIME tipine göre döndürür
 */
export function getMimeCategory(mimeType: string): string {
  for (const [category, mimes] of Object.entries(ALLOWED_MIME_TYPES)) {
    if (mimes.includes(mimeType)) return category
  }
  return "unknown"
}

/**
 * MIME tipine göre dosya boyutu limitini döndürür
 */
export function getSizeLimit(mimeType: string): number {
  const category = getMimeCategory(mimeType)
  return FILE_SIZE_LIMITS[category] ?? FILE_SIZE_LIMITS.default
}

/**
 * Dosya uzantısını MIME tipine göre normalize eder
 */
export function getExtensionForMime(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/tiff": "tiff",
    "image/svg+xml": "svg",
    "image/heic": "heic",
    "image/bmp": "bmp",
    "image/avif": "avif",
    "video/mp4": "mp4",
    "video/quicktime": "mov",
    "video/x-msvideo": "avi",
    "video/webm": "webm",
    "video/x-matroska": "mkv",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
    "audio/aac": "aac",
    "audio/flac": "flac",
    "audio/ogg": "ogg",
    "audio/x-m4a": "m4a",
    "application/pdf": "pdf",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.ms-excel": "xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/vnd.ms-powerpoint": "ppt",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
    "text/plain": "txt",
    "text/csv": "csv",
    "application/zip": "zip",
    "application/x-rar-compressed": "rar",
    "application/x-7z-compressed": "7z",
  }
  return mimeToExt[mimeType] ?? "bin"
}

/**
 * Dosyayı güvenli şekilde okur (path traversal koruması)
 * storagePath mutlaka STORAGE_ROOT içinde olmalı
 */
export function validateStoragePath(storagePath: string): boolean {
  const resolved = path.resolve(storagePath)
  return resolved.startsWith(path.resolve(STORAGE_ROOT))
}

/**
 * Disk kullanım istatistikleri — tüm storage dizini üzerinden
 */
export async function calculateDiskUsage(branchId?: string): Promise<number> {
  async function getDirSize(dir: string): Promise<number> {
    if (!fs.existsSync(dir)) return 0
    let total = 0
    const entries = await fs.promises.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue // .tmp, .chunks atla
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        total += await getDirSize(fullPath)
      } else {
        const stat = await fs.promises.stat(fullPath)
        total += stat.size
      }
    }
    return total
  }
  return getDirSize(STORAGE_ROOT)
}

export { STORAGE_ROOT, TEMP_DIR, CHUNKS_DIR }
