import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getAuthPayload, isSuperAdminUser } from "@/lib/auth/server-permission"

/**
 * POST /api/admin/run-content-store-migration
 * Sadece Super Admin. ContentStore V2 migration'ini calistirir.
 * KRITiK: Mevcut icerikler approved yapilir.
 */
export async function POST() {
  const payload = await getAuthPayload()
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const isAdmin = await isSuperAdminUser(payload.userId)
  if (!isAdmin) return NextResponse.json({ error: "Sadece Super Admin" }, { status: 403 })

  try {
    // Raw SQL migration - IF NOT EXISTS kullaniyor, guvenli
    await prisma.$executeRawUnsafe(`ALTER TABLE "ContentStore" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'pending_approval'`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "ContentStore" ADD COLUMN IF NOT EXISTS "approvedById" TEXT`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "ContentStore" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "ContentStore" ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "ContentStore" ADD COLUMN IF NOT EXISTS "fileHash" TEXT`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "ContentStore" ADD COLUMN IF NOT EXISTS "currentVersionNumber" INTEGER NOT NULL DEFAULT 1`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "ContentStore" ADD COLUMN IF NOT EXISTS "duplicateOfContentId" TEXT`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "ContentStore" ADD COLUMN IF NOT EXISTS "viewCount" INTEGER NOT NULL DEFAULT 0`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "ContentStore" ADD COLUMN IF NOT EXISTS "downloadCount" INTEGER NOT NULL DEFAULT 0`)

    // KRITiK: Mevcut icerikleri approved yap
    const updated = await prisma.$executeRawUnsafe(`UPDATE "ContentStore" SET "status" = 'approved' WHERE "status" = 'pending_approval'`)

    // ContentVersion tablosu
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ContentVersion" (
        "id" TEXT NOT NULL,
        "contentId" TEXT NOT NULL,
        "versionNumber" INTEGER NOT NULL,
        "fileUrl" TEXT NOT NULL,
        "fileHash" TEXT,
        "fileSizeBytes" BIGINT NOT NULL,
        "uploadedById" TEXT NOT NULL,
        "changeNote" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "ContentVersion_pkey" PRIMARY KEY ("id")
      )
    `)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ContentVersion_contentId_idx" ON "ContentVersion"("contentId")`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ContentVersion_cId_vNum_idx" ON "ContentVersion"("contentId", "versionNumber")`)

    // ContentAnalyticsEvent tablosu
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ContentAnalyticsEvent" (
        "id" TEXT NOT NULL,
        "contentId" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "eventType" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "ContentAnalyticsEvent_pkey" PRIMARY KEY ("id")
      )
    `)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "CAE_contentId_createdAt_idx" ON "ContentAnalyticsEvent"("contentId", "createdAt")`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "CAE_userId_idx" ON "ContentAnalyticsEvent"("userId")`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "CAE_eventType_idx" ON "ContentAnalyticsEvent"("eventType")`)

    // Content Store izin migrasyonu
    const adminRoles = await prisma.role.findMany({ where: { name: { in: ["Super Admin", "Yonetim Kurulu Uyesi", "Genel Mudur"] } } })
    const PERMS: Record<string, string[]> = {
      icerik_magazasi_yukle: ["read","create","update","delete"],
      icerik_magazasi_sil: ["read","create","update","delete"],
      icerik_magazasi_onayla: ["read","create","update","delete"],
      icerik_magazasi_toplu: ["read","create","update","delete"],
      icerik_magazasi_analitik: ["read","create","update","delete"],
    }
    for (const role of adminRoles) {
      let perms: Record<string, string[]> = {}
      try { perms = JSON.parse(role.permissions) } catch { perms = {} }
      const merged = { ...perms }
      for (const [k, v] of Object.entries(PERMS)) { if (!merged[k]) merged[k] = v }
      await prisma.role.update({ where: { id: role.id }, data: { permissions: JSON.stringify(merged) } })
    }

    return NextResponse.json({
      success: true,
      message: "Migration tamamlandi",
      existingRecordsApproved: updated,
      adminRolesUpdated: adminRoles.length,
    })
  } catch (err: any) {
    console.error("Migration error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
