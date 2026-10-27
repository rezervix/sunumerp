import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getAuthPayload, checkPermission, isSuperAdminUser } from "@/lib/auth/server-permission"
import fs from "fs"

export async function POST(req: Request) {
  const payload = await getAuthPayload()
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const isSuperAdmin = await isSuperAdminUser(payload.userId)

  try {
    const body = await req.json()
    const { ids, action, nicheId, rejectionReason } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "İçerik ID'leri seçilmedi" }, { status: 400 })
    }
    if (!action) {
      return NextResponse.json({ error: "Aksiyon belirtilmedi" }, { status: 400 })
    }

    if (action === "delete") {
      const canDelete = isSuperAdmin || await checkPermission(payload.userId, undefined, "icerik_magazasi_sil", "delete")
      if (!canDelete) return NextResponse.json({ error: "Silme yetkiniz yok" }, { status: 403 })

      const items = await prisma.contentStore.findMany({
        where: { id: { in: ids } },
        select: { id: true, url: true }
      })

      await prisma.contentStore.deleteMany({ where: { id: { in: ids } } })

      for (const item of items) {
        if (item.url) {
          const isLocal = !item.url.startsWith("http://") && !item.url.startsWith("https://")
          if (isLocal && fs.existsSync(item.url)) {
            await fs.promises.unlink(item.url).catch(() => {})
          }
        }
      }
      return NextResponse.json({ success: true, message: `${items.length} içerik silindi.` })
    }

    if (action === "approve") {
      const canApprove = isSuperAdmin || await checkPermission(payload.userId, undefined, "icerik_magazasi_onayla", "create")
      if (!canApprove) return NextResponse.json({ error: "Onaylama yetkiniz yok" }, { status: 403 })

      await prisma.contentStore.updateMany({
        where: { id: { in: ids } },
        data: { status: "approved", approvedById: payload.userId, approvedAt: new Date(), rejectionReason: null }
      })
      return NextResponse.json({ success: true, message: `${ids.length} içerik onaylandı.` })
    }

    if (action === "reject") {
      const canApprove = isSuperAdmin || await checkPermission(payload.userId, undefined, "icerik_magazasi_onayla", "create")
      if (!canApprove) return NextResponse.json({ error: "Reddetme yetkiniz yok" }, { status: 403 })
      if (!rejectionReason?.trim()) return NextResponse.json({ error: "Red gerekçesi zorunludur" }, { status: 400 })

      await prisma.contentStore.updateMany({
        where: { id: { in: ids } },
        data: { status: "rejected", rejectionReason: rejectionReason.trim() }
      })
      return NextResponse.json({ success: true, message: `${ids.length} içerik reddedildi.` })
    }

    if (action === "niche") {
      const canBulk = isSuperAdmin || await checkPermission(payload.userId, undefined, "icerik_magazasi_toplu", "create")
      if (!canBulk) return NextResponse.json({ error: "Toplu işlem yetkiniz yok" }, { status: 403 })
      if (!nicheId) return NextResponse.json({ error: "Niş seçilmedi" }, { status: 400 })

      await prisma.contentStore.updateMany({
        where: { id: { in: ids } },
        data: { nicheId }
      })
      return NextResponse.json({ success: true, message: `${ids.length} içerik nişi güncellendi.` })
    }

    return NextResponse.json({ error: "Geçersiz aksiyon" }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
