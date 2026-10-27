import { prisma } from "@/lib/db"
import fs from "fs"
import path from "path"

export interface MoveToTrashParams {
  entityType: string
  entityId: string
  title: string
  payload: Record<string, any> | string
  filePaths?: string[]
  userId: string
  userFullName: string
  branchId?: string | null
  retentionDays?: number
}

const QUARANTINE_DIR = path.join(process.cwd(), "storage", "trash_quarantine")

function ensureQuarantineDir(trashId: string) {
  const dir = path.join(QUARANTINE_DIR, trashId)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return dir
}

export class TrashService {
  /**
   * Taşıma / Soft-Delete: Bir ögeyi siler, snapshot alıp Geri Dönüşüm Kutusu'na ekler.
   */
  static async moveToTrash(params: MoveToTrashParams) {
    const retentionDays = params.retentionDays || 30
    const expiresAt = new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000)

    const payloadString = typeof params.payload === "string" 
      ? params.payload 
      : JSON.stringify(params.payload)

    // 1. Prisma TrashItem kaydı oluştur
    const trashItem = await prisma.trashItem.create({
      data: {
        entityType: params.entityType,
        entityId: params.entityId,
        title: params.title,
        payload: payloadString,
        filePaths: params.filePaths ? JSON.stringify(params.filePaths) : null,
        deletedByUserId: params.userId,
        deletedByFullName: params.userFullName,
        branchId: params.branchId || null,
        expiresAt,
        status: "IN_TRASH",
      },
    })

    // 2. Varsa fiziksel dosyaları karantina klasörüne taşı
    if (params.filePaths && params.filePaths.length > 0) {
      const qDir = ensureQuarantineDir(trashItem.id)
      for (const relOrAbsPath of params.filePaths) {
        try {
          const absPath = path.isAbsolute(relOrAbsPath)
            ? relOrAbsPath
            : path.join(process.cwd(), relOrAbsPath)

          if (fs.existsSync(absPath)) {
            const fileName = path.basename(absPath)
            const destPath = path.join(qDir, fileName)
            fs.copyFileSync(absPath, destPath)
            fs.unlinkSync(absPath) // Orijinal konudan kaldır (Karantinada sakla)
          }
        } catch (err) {
          console.error(`[TrashService] File quarantine error for ${relOrAbsPath}:`, err)
        }
      }
    }

    // 3. AuditLog kaydı oluştur
    try {
      await prisma.auditLog.create({
        data: {
          userId: params.userId,
          action: "MOVE_TO_TRASH",
          resource: "trash",
          resourceId: trashItem.id,
          details: JSON.stringify({
            entityType: params.entityType,
            entityId: params.entityId,
            title: params.title,
          }),
        },
      })
    } catch (auditErr) {
      console.warn("[TrashService] AuditLog creation warning:", auditErr)
    }

    return trashItem
  }

  /**
   * Geri Yükle / Restore: Geri dönüşüm kutusundaki ögeyi ve fiziksel dosyalarını orijinal yerine döndürür.
   */
  static async restoreFromTrash(trashItemId: string, userId: string) {
    const trashItem = await prisma.trashItem.findUnique({
      where: { id: trashItemId },
    })

    if (!trashItem || trashItem.status !== "IN_TRASH") {
      throw new Error("Öge geri dönüşüm kutusunda bulunamadı veya daha önce işlem görmüş.")
    }

    const payload = JSON.parse(trashItem.payload)

    // 1. Fiziksel dosyaları karantinadan orijinal konumuna geri taşı
    if (trashItem.filePaths) {
      try {
        const filePaths: string[] = JSON.parse(trashItem.filePaths)
        const qDir = path.join(QUARANTINE_DIR, trashItem.id)

        for (const relOrAbsPath of filePaths) {
          const fileName = path.basename(relOrAbsPath)
          const qFilePath = path.join(qDir, fileName)

          if (fs.existsSync(qFilePath)) {
            const destPath = path.isAbsolute(relOrAbsPath)
              ? relOrAbsPath
              : path.join(process.cwd(), relOrAbsPath)

            const destDir = path.dirname(destPath)
            if (!fs.existsSync(destDir)) {
              fs.mkdirSync(destDir, { recursive: true })
            }

            fs.copyFileSync(qFilePath, destPath)
            fs.unlinkSync(qFilePath)
          }
        }

        // Karantina dizinini temizle
        if (fs.existsSync(qDir)) {
          fs.rmSync(qDir, { recursive: true, force: true })
        }
      } catch (fileErr) {
        console.error("[TrashService] File restore error:", fileErr)
      }
    }

    // 2. Orijinal veriyi ilgili Prisma tablosuna geri ekle / güncelle
    const modelName = trashItem.entityType.charAt(0).toLowerCase() + trashItem.entityType.slice(1)
    const modelDelegate = (prisma as any)[modelName]
    if (modelDelegate && typeof modelDelegate.create === "function") {
      try {
        const existing = await modelDelegate.findUnique({ where: { id: trashItem.entityId } })
        if (!existing) {
          await modelDelegate.create({ data: payload })
        } else if (typeof modelDelegate.update === "function") {
          await modelDelegate.update({
            where: { id: trashItem.entityId },
            data: payload,
          })
        }
      } catch (dbErr) {
        console.error(`[TrashService] DB restore failed for model ${trashItem.entityType}:`, dbErr)
        throw new Error(`Veritabanı geri yükleme hatası: ${(dbErr as Error).message}`)
      }
    }

    // 3. TrashItem durumunu güncelle
    const updated = await prisma.trashItem.update({
      where: { id: trashItemId },
      data: { status: "RESTORED" },
    })

    // 4. AuditLog
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action: "RESTORE_FROM_TRASH",
          resource: "trash",
          resourceId: trashItemId,
          details: JSON.stringify({
            entityType: trashItem.entityType,
            entityId: trashItem.entityId,
            title: trashItem.title,
          }),
        },
      })
    } catch {}

    return updated
  }

  /**
   * Kalıcı Sil / Purge: Ögeyi ve karantinadaki dosyalarını veritabanından tamamen siler.
   */
  static async purgeFromTrash(trashItemId: string, userId: string) {
    const trashItem = await prisma.trashItem.findUnique({
      where: { id: trashItemId },
    })

    if (!trashItem) {
      throw new Error("Çöp ögesi bulunamadı.")
    }

    // 1. Karantinadaki dosyaları tamamen temizle
    const qDir = path.join(QUARANTINE_DIR, trashItem.id)
    if (fs.existsSync(qDir)) {
      try {
        fs.rmSync(qDir, { recursive: true, force: true })
      } catch (err) {
        console.error("[TrashService] Quarantine cleanup error:", err)
      }
    }

    // 2. TrashItem kaydını sil
    await prisma.trashItem.delete({
      where: { id: trashItemId },
    })

    // 3. AuditLog
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action: "PURGE_FROM_TRASH",
          resource: "trash",
          resourceId: trashItemId,
          details: JSON.stringify({
            entityType: trashItem.entityType,
            title: trashItem.title,
          }),
        },
      })
    } catch {}

    return true
  }

  /**
   * Çöp Kutusu'nu tamamen boşaltır.
   */
  static async emptyTrash(userId: string, branchId?: string | null) {
    const where: any = { status: "IN_TRASH" }
    if (branchId) {
      where.branchId = branchId
    }

    const items = await prisma.trashItem.findMany({ where })

    for (const item of items) {
      await this.purgeFromTrash(item.id, userId)
    }

    return items.length
  }

  /**
   * Süresi dolan ögeleri otomatik temizler (Night Scan Job için).
   */
  static async purgeExpiredItems() {
    const expiredItems = await prisma.trashItem.findMany({
      where: {
        expiresAt: { lte: new Date() },
        status: "IN_TRASH",
      },
    })

    let count = 0
    for (const item of expiredItems) {
      try {
        await this.purgeFromTrash(item.id, "SYSTEM_NIGHT_SCAN")
        count++
      } catch (err) {
        console.error(`[TrashService] Auto purge failed for ${item.id}:`, err)
      }
    }

    return count
  }
}
