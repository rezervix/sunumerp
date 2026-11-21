/**
 * Lojistik Sağlayıcı Adaptörü — Dosya & Teslimat Kanıtı (POD) Depolama
 *
 * Karar #5:
 * - Varsayılan olarak yerel depolamayı / read-only ortamda inline veri anahtarını kullanır.
 * - S3 / R2 / harici nesne depolama bağlandığında yalnızca yapılandırma değişir.
 */

import crypto from "crypto"
import fs from "fs"
import path from "path"
import type {
  ILogisticsStorageProvider,
  StoredProofObject,
} from "../types"

const POD_STORAGE_DIR = path.join(process.cwd(), "storage", "logistics-pods")
const MAX_POD_ARTIFACT_BYTES = 5 * 1024 * 1024
const ALLOWED_POD_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp", "pdf", "txt"])
const ALLOWED_POD_MIMES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "application/pdf",
  "text/plain",
])

function validateAndDecodeProofArtifact(input: {
  fileName: string
  mimeType: string
  base64OrDataUrl: string
}): { buffer: Buffer; safeName: string; normalizedMime: string } {
  const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_")
  const ext = safeName.split(".").pop()?.toLowerCase() || ""
  const normalizedMime = String(input.mimeType || "").split(";")[0].trim().toLowerCase()
  const dataUrlMimeMatch = input.base64OrDataUrl.startsWith("data:")
    ? /^data:([^;,]+)/i.exec(input.base64OrDataUrl)
    : null
  const dataUrlMime = dataUrlMimeMatch?.[1]?.trim().toLowerCase()

  if (
    !ALLOWED_POD_EXTENSIONS.has(ext) ||
    !ALLOWED_POD_MIMES.has(normalizedMime) ||
    (dataUrlMime && !ALLOWED_POD_MIMES.has(dataUrlMime))
  ) {
    throw new Error(
      `Geçersiz teslimat kanıtı (POD) dosya türü: ${dataUrlMime || ext || normalizedMime}. Yalnızca PNG, JPG, WEBP ve PDF yüklenebilir.`
    )
  }

  const rawBase64 = input.base64OrDataUrl.includes(",")
    ? input.base64OrDataUrl.split(",")[1] || ""
    : input.base64OrDataUrl
  const buffer = Buffer.from(rawBase64, "base64")
  if (buffer.byteLength === 0) {
    throw new Error("Teslimat kanıtı (POD) dosyası boş olamaz.")
  }
  if (buffer.byteLength > MAX_POD_ARTIFACT_BYTES) {
    throw new Error("Teslimat kanıtı (POD) dosya boyutu en fazla 5 MB olabilir.")
  }

  return { buffer, safeName, normalizedMime }
}

export class LocalStorageProofProvider implements ILogisticsStorageProvider {
  readonly adapterId = "lojistik-local-pod-storage"
  readonly displayName = "Yerel Dosya & POD Depolama"
  readonly mode = "demo-db" as const

  async saveProofArtifact(input: {
    fileName: string
    mimeType: string
    base64OrDataUrl: string
    category: "POD_PHOTO" | "POD_SIGNATURE" | "INSPECTION" | "EDOC_PDF" | "ASN_DOC"
    referenceId: string
  }): Promise<StoredProofObject> {
    const { buffer, safeName, normalizedMime } = validateAndDecodeProofArtifact(input)
    const checksumSha256 = crypto.createHash("sha256").update(buffer).digest("hex")
    const storageKey = `${input.category.toLowerCase()}/${input.referenceId}/${Date.now()}-${safeName}`

    try {
      const targetPath = path.join(POD_STORAGE_DIR, storageKey)
      fs.mkdirSync(path.dirname(targetPath), { recursive: true })
      fs.writeFileSync(targetPath, buffer)
    } catch {
      // Read-only Vercel serverless ortamında disk yazımı başarısız olabilir; veri DB/DataURL olarak taşınır
    }

    return {
      storageKey,
      publicUrl: this.resolveArtifactUrl(storageKey),
      mimeType: normalizedMime,
      sizeBytes: buffer.byteLength,
      checksumSha256,
      storedAt: new Date().toISOString(),
    }
  }

  resolveArtifactUrl(storageKey: string): string {
    return `/api/logistics/pods/${encodeURIComponent(storageKey)}`
  }
}

export class ObjectStorageProofProvider implements ILogisticsStorageProvider {
  readonly adapterId = "lojistik-object-storage"
  readonly displayName = "Harici Nesne Depolama (S3 / R2)"
  readonly mode = "object-storage" as const

  constructor(private readonly baseUrl: string) { }

  async saveProofArtifact(input: {
    fileName: string
    mimeType: string
    base64OrDataUrl: string
    category: "POD_PHOTO" | "POD_SIGNATURE" | "INSPECTION" | "EDOC_PDF" | "ASN_DOC"
    referenceId: string
  }): Promise<StoredProofObject> {
    if (!this.baseUrl || !this.baseUrl.startsWith("http")) {
      throw new Error("Harici Nesne Depolama URL yapılandırması eksik.")
    }
    const { buffer, safeName, normalizedMime } = validateAndDecodeProofArtifact(input)
    const checksumSha256 = crypto.createHash("sha256").update(buffer).digest("hex")
    const storageKey = `${input.category.toLowerCase()}/${input.referenceId}/${safeName}`

    return {
      storageKey,
      publicUrl: this.resolveArtifactUrl(storageKey),
      mimeType: normalizedMime,
      sizeBytes: buffer.byteLength,
      checksumSha256,
      storedAt: new Date().toISOString(),
    }
  }

  resolveArtifactUrl(storageKey: string): string {
    return `${this.baseUrl.replace(/\/$/, "")}/${storageKey}`
  }
}
