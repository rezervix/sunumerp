import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requirePermission } from "@/lib/auth/server-permission"
import { notifyContentAction } from "../../utils"

// ─── POST: Yeni Revizyon Talebi Aç ──────────────────────────────────────
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission("icerik-takvimi", "update")
  if (auth instanceof NextResponse) return auth

  const { id: contentItemId } = await params

  try {
    const body = await req.json()
    const { message } = body

    if (!message || !message.trim()) {
      return NextResponse.json({ error: "Revizyon mesajı zorunlu" }, { status: 400 })
    }

    // 1. İçerik kaydını bul ve yüklenmiş mi doğrula
    const item = await prisma.contentItem.findUnique({
      where: { id: contentItemId },
      include: {
        branch: { select: { id: true, name: true } }
      }
    })

    if (!item) {
      return NextResponse.json({ error: "İçerik bulunamadı" }, { status: 404 })
    }

    // Revizyon talebi sadece "yuklendi" veya "revize_edildi" durumunda açılabilir
    if (item.status !== "yuklendi" && item.status !== "revize_edildi") {
      return NextResponse.json({ error: "Sadece yüklenmiş veya revize edilmiş içeriklere revizyon talebi açılabilir." }, { status: 400 })
    }

    // 2. Aktif (bekleyen) revizyon var mı kontrol et
    const activeRevision = await prisma.revisionRequest.findFirst({
      where: { contentItemId, status: "bekliyor" }
    })

    if (activeRevision) {
      return NextResponse.json({ error: "Bu içerik için zaten aktif bir revizyon talebi var. Önce onu tamamlayın." }, { status: 400 })
    }

    // 3. Revizyon numarasını hesapla
    const revCount = await prisma.revisionRequest.count({
      where: { contentItemId }
    })
    const nextRevisionNumber = revCount + 1

    // 4. Revizyon talebini ve durum geçmişini kaydet
    const revision = await prisma.revisionRequest.create({
      data: {
        contentItemId,
        revisionNumber: nextRevisionNumber,
        message: message.trim(),
        createdById: auth.payload.userId,
        status: "bekliyor"
      },
      include: {
        createdBy: { select: { fullName: true } }
      }
    })

    const oldStatus = item.status
    const newStatus = "revize_istendi"

    // İçerik durumunu güncelle
    await prisma.contentItem.update({
      where: { id: contentItemId },
      data: { status: newStatus }
    })

    // Durum geçmişi logu ekle
    await prisma.contentStatusHistory.create({
      data: {
        entityType: "content_item",
        entityId: contentItemId,
        oldStatus,
        newStatus,
        changedById: auth.payload.userId,
        note: `Revizyon Talebi #${nextRevisionNumber}: ${message.trim().substring(0, 50)}...`
      }
    })

    // 5. Atanan üreticilere ve MH + SM rollerine bildirim gönder
    const producers = [item.shooterId, item.editorId, item.designerId].filter(Boolean) as string[]
    const msgSummary = message.length > 50 ? `${message.substring(0, 50)}...` : message
    const notifyMsg = `"${item.title}" içeriğine revizyon talebi geldi: [${msgSummary}]`

    await notifyContentAction({
      branchId: item.branchId,
      branchName: item.branch.name,
      contentTitle: item.title,
      contentType: item.contentType,
      scheduledDate: item.scheduledDate,
      actionType: "REVISION_REQUEST",
      customMessage: notifyMsg,
      producerIds: producers
    })

    return NextResponse.json(revision, { status: 201 })
  } catch (error) {
    console.error("RevisionRequest POST error:", error)
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 })
  }
}

// ─── PUT: Revizyonu Edildi (Tamamlandı) Olarak İşaretle ────────────────
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission("icerik-takvimi", "update")
  if (auth instanceof NextResponse) return auth

  const { id: contentItemId } = await params

  try {
    // 1. İçerik kaydını kontrol et
    const item = await prisma.contentItem.findUnique({
      where: { id: contentItemId },
      include: {
        branch: { select: { id: true, name: true } }
      }
    })

    if (!item) {
      return NextResponse.json({ error: "İçerik bulunamadı" }, { status: 404 })
    }

    // Yetki kontrolü: sadece atanan üretici (shooter, editor, designer) veya admin tamamlayabilir
    const userBranchRole = await prisma.userBranchRole.findFirst({
      where: { userId: auth.payload.userId, branchId: item.branchId },
      include: { role: true }
    })
    const userRoleName = userBranchRole?.role?.name || ""
    const isSuperAdmin = ["Super Admin", "Yonetim Kurulu Uyesi", "Genel Mudur"].includes(userRoleName) || auth.payload.userId === "local-debug-user"

    const isAssigned =
      item.shooterId === auth.payload.userId ||
      item.editorId === auth.payload.userId ||
      item.designerId === auth.payload.userId

    if (!isAssigned && !isSuperAdmin) {
      return NextResponse.json({ error: "Revizyonu sadece içerik sorumlusu tamamlandı olarak işaretleyebilir." }, { status: 403 })
    }

    // 2. Aktif revizyonu bul
    const activeRevision = await prisma.revisionRequest.findFirst({
      where: { contentItemId, status: "bekliyor" }
    })

    if (!activeRevision) {
      return NextResponse.json({ error: "Bu içerik için bekleyen aktif revizyon talebi bulunamadı." }, { status: 400 })
    }

    // 3. Revizyon talebini tamamla
    const updatedRevision = await prisma.revisionRequest.update({
      where: { id: activeRevision.id },
      data: {
        status: "tamamlandi",
        completedById: auth.payload.userId,
        completedAt: new Date()
      },
      include: {
        createdBy: { select: { fullName: true } },
        completedBy: { select: { fullName: true } }
      }
    })

    // 4. İçerik durumunu "revize_edildi" yap
    const oldStatus = item.status
    const newStatus = "revize_edildi"

    await prisma.contentItem.update({
      where: { id: contentItemId },
      data: { status: newStatus }
    })

    // Durum geçmişi logu ekle
    await prisma.contentStatusHistory.create({
      data: {
        entityType: "content_item",
        entityId: contentItemId,
        oldStatus,
        newStatus,
        changedById: auth.payload.userId,
        note: `Revizyon #${activeRevision.revisionNumber} tamamlandı`
      }
    })

    // 5. MH + SM rollerine bildirim gönder
    const notifyMsg = `${auth.payload.username} kullanıcısı revizyonu tamamladı, yeni içerik yüklendi`
    const producers = [item.shooterId, item.editorId, item.designerId].filter(Boolean) as string[]

    await notifyContentAction({
      branchId: item.branchId,
      branchName: item.branch.name,
      contentTitle: item.title,
      contentType: item.contentType,
      scheduledDate: item.scheduledDate,
      actionType: "REVISION_COMPLETE",
      customMessage: notifyMsg,
      producerIds: producers
    })

    return NextResponse.json(updatedRevision)
  } catch (error) {
    console.error("RevisionRequest PUT error:", error)
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 })
  }
}
