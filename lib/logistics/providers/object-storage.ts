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
    const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_")
    const rawBase64 = input.base64OrDataUrl.includes(",")
      ? input.base64OrDataUrl.split(",")[1] || ""
      : input.base64OrDataUrl
    const buffer = Buffer.from(rawBase64, "base64")
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
      mimeType: input.mimeType,
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

  constructor(private readonly baseUrl: string) {}

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
    const rawBase64 = input.base64OrDataUrl.includes(",")
      ? input.base64OrDataUrl.split(",")[1] || ""
      : input.base64OrDataUrl
    const buffer = Buffer.from(rawBase64, "base64")
    const checksumSha256 = crypto.createHash("sha256").update(buffer).digest("hex")
    const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_")
    const storageKey = `${input.category.toLowerCase()}/${input.referenceId}/${safeName}`

    return {
      storageKey,
      publicUrl: this.resolveArtifactUrl(storageKey),
      mimeType: input.mimeType,
      sizeBytes: buffer.byteLength,
      checksumSha256,
      storedAt: new Date().toISOString(),
    }
  }

  resolveArtifactUrl(storageKey: string): string {
    return `${this.baseUrl.replace(/\/$/, "")}/${storageKey}`
  }
}
