import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requirePermission } from "@/lib/auth/server-permission"
import { notifyContentAction } from "../utils"

function safeParseJson(str: string | null | undefined, fallback: unknown = null) {
  if (!str) return fallback
  try { return JSON.parse(str) } catch { return fallback }
}

// ─── GET: Tekil içerik + tüm detaylar ────────────────────────────────
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission("icerik-takvimi", "read")
  if (auth instanceof NextResponse) return auth

  const { id } = await params

  try {
    const item = await prisma.contentItem.findUnique({
      where: { id },
      include: {
        branch: { select: { id: true, name: true, themeColor: true, logoUrl: true } },
        shoot: true,
        media: { orderBy: [{ isFinal: "desc" }, { version: "desc" }] },
        statusHistory: { orderBy: { changedAt: "asc" } },
        chatLinks: { orderBy: { sentAt: "desc" } },
        revisions: {
          include: {
            createdBy: { select: { fullName: true } },
            completedBy: { select: { fullName: true } }
          },
          orderBy: { createdAt: "asc" }
        }
      },
    })

    if (!item) {
      return NextResponse.json({ error: "Kayıt bulunamadı" }, { status: 404 })
    }

    return NextResponse.json({
      ...item,
      platforms: safeParseJson(item.platforms, []),
    })
  } catch (error) {
    console.error("ContentItem GET [id] error:", error)
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 })
  }
}

// ─── PUT: Güncelleme ──────────────────────────────────────────────────
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission("icerik-takvimi", "update")
  if (auth instanceof NextResponse) return auth

  const { id } = await params

  try {
    const body = await req.json()
    const {
      title,
      caption,
      description,
      platforms,
      contentType,
      scheduledDate,
      scheduledTime,
      status,
      shooterId,
      editorId,
      managerId,
      designerId,
      shootId,
      clientApprovalRequired,
      clientApprovalStatus,
      publishedUrl,
      statusNote,
    } = body

    // Mevcut kaydı al (durum değişikliği takibi için)
    const existing = await prisma.contentItem.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Kayıt bulunamadı" }, { status: 404 })
    }

    // Rol ve Yetki Kontrolü
    const userBranchRole = await prisma.userBranchRole.findFirst({
      where: { userId: auth.payload.userId, branchId: existing.branchId },
      include: { role: true }
    })
    const userRoleName = userBranchRole?.role?.name || ""
    const isSuperAdmin = ["Super Admin", "Yonetim Kurulu Uyesi", "Genel Mudur"].includes(userRoleName) || auth.payload.userId === "local-debug-user"

    let finalStatus = status
    let finalIptalOncesi = undefined

    // Durum Değişikliği Akış Kontrolleri
    if (status && status !== existing.status) {
      let isReopening = false
      if (existing.status === "iptal_edildi") {
        if (existing.iptalOncesiDurum && status === existing.iptalOncesiDurum) {
          isReopening = true
          finalIptalOncesi = null // Reset on reopen
        } else {
          return NextResponse.json({ error: "İptal edilmiş kayıt sadece iptal öncesi son durumuna geri açılabilir." }, { status: 400 })
        }
      }

      if (!isReopening) {
        const valid = isValidTransition(existing.status, status)
        if (!valid) {
          return NextResponse.json({ error: `Geçersiz durum değişikliği: ${translateStatus(existing.status)} -> ${translateStatus(status)}` }, { status: 400 })
        }
      }

      // Yetki Matrisi Kontrolleri
      if (status === "yuklendi") {
        const isAssigned = 
          existing.shooterId === auth.payload.userId ||
          existing.editorId === auth.payload.userId ||
          existing.designerId === auth.payload.userId
        if (!isAssigned && !isSuperAdmin) {
          return NextResponse.json({ error: "İçeriği sadece atanan üretici yükleyebilir." }, { status: 403 })
        }
      }

      if (status === "revize_edildi") {
        const isAssigned = 
          existing.shooterId === auth.payload.userId ||
          existing.editorId === auth.payload.userId ||
          existing.designerId === auth.payload.userId
        if (!isAssigned && !isSuperAdmin) {
          return NextResponse.json({ error: "Revizyonu sadece atanan üretici tamamlandı olarak işaretleyebilir." }, { status: 403 })
        }
      }

      if (status === "onaylandi") {
        if (userRoleName !== "Müşteri Hizmetleri" && userRoleName !== "Sosyal Medya Uzmanı" && !isSuperAdmin) {
          return NextResponse.json({ error: "Bu içeriği onaylama yetkiniz bulunmamaktadır." }, { status: 403 })
        }
      }

      if (status === "planlandi" || status === "yayinlandi") {
        if (userRoleName !== "Sosyal Medya Uzmanı" && !isSuperAdmin) {
          return NextResponse.json({ error: "İçeriği planlama/yayınlama yetkisi sadece Sosyal Medya Uzmanı rolündedir." }, { status: 403 })
        }
      }

      if (status === "iptal_edildi" || isReopening) {
        if (userRoleName !== "Müşteri Hizmetleri" && userRoleName !== "Sosyal Medya Uzmanı" && !isSuperAdmin) {
          return NextResponse.json({ error: "İçeriği iptal etme veya geri açma yetkiniz bulunmamaktadır." }, { status: 403 })
        }
        if (status === "iptal_edildi") {
          finalIptalOncesi = existing.status
        }
      }
    }

    const updated = await prisma.contentItem.update({
      where: { id },
      data: {
        title: title ?? undefined,
        caption: caption !== undefined ? caption : undefined,
        description: description !== undefined ? description : undefined,
        platforms: platforms !== undefined ? JSON.stringify(Array.isArray(platforms) ? platforms : []) : undefined,
        contentType: contentType ?? undefined,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
        scheduledTime: scheduledTime !== undefined ? scheduledTime : undefined,
        status: status ?? undefined,
        iptalOncesiDurum: finalIptalOncesi,
        shooterId: shooterId !== undefined ? (shooterId || null) : undefined,
        editorId: editorId !== undefined ? (editorId || null) : undefined,
        managerId: managerId !== undefined ? (managerId || null) : undefined,
        designerId: designerId !== undefined ? (designerId || null) : undefined,
        shootId: shootId !== undefined ? (shootId || null) : undefined,
        clientApprovalRequired: clientApprovalRequired !== undefined ? clientApprovalRequired : undefined,
        clientApprovalStatus: clientApprovalStatus !== undefined ? clientApprovalStatus : undefined,
        publishedUrl: publishedUrl !== undefined ? publishedUrl : undefined,
      },
      include: {
        branch: { select: { id: true, name: true, themeColor: true } },
        media: { where: { isFinal: true }, orderBy: { version: "desc" }, take: 1 },
      },
    })

    // Durum değişikliği → history kaydı + bildirim
    if (status && status !== existing.status) {
      const isReopening = existing.status === "iptal_edildi" && status === existing.iptalOncesiDurum

      await prisma.contentStatusHistory.create({
        data: {
          entityType: "content_item",
          entityId: id,
          oldStatus: existing.status,
          newStatus: status,
          changedById: auth.payload.userId,
          note: statusNote || (isReopening ? "İptal edilen kayıt yeniden açıldı" : null),
        },
      })

      // Bildirim gönderimi
      const producers = [updated.shooterId, updated.editorId, updated.designerId].filter(Boolean) as string[]
      const dateStr = new Date(updated.scheduledDate).toLocaleDateString("tr-TR")

      let notificationType: "STATUS_CHANGE" | "CANCEL" | "REOPEN" = "STATUS_CHANGE"
      let notificationMsg = `"${updated.title}" içeriğinin durumu güncellendi: ${translateStatus(status)}`

      if (status === "yuklendi") {
        notificationMsg = `${auth.payload.username} kullanıcısı, ${updated.branch.name} firmasının ${dateStr} tarihli içeriğini yükledi`
      } else if (status === "revize_edildi") {
        notificationMsg = `${auth.payload.username} kullanıcısı revizyonu tamamladı, yeni içerik yüklendi`
      } else if (status === "onaylandi") {
        notificationMsg = `"${updated.title}" içeriği onaylandı`
      } else if (status === "planlandi") {
        notificationMsg = `"${updated.title}" içeriği Instagram'da planlandı`
      } else if (status === "yayinlandi") {
        notificationMsg = `"${updated.title}" içeriği yayınlandı`
      } else if (status === "iptal_edildi") {
        notificationType = "CANCEL"
        notificationMsg = `"${updated.title}" içeriği iptal edildi`
      } else if (isReopening) {
        notificationType = "REOPEN"
        notificationMsg = `"${updated.title}" içeriği yeniden aktif edildi`
      }

      await notifyContentAction({
        branchId: updated.branchId,
        branchName: updated.branch.name,
        contentTitle: updated.title,
        contentType: updated.contentType,
        scheduledDate: updated.scheduledDate,
        actionType: notificationType === "CANCEL" ? "CANCEL" : (notificationType === "REOPEN" ? "REOPEN" : "STATUS_CHANGE"),
        customMessage: notificationMsg,
        producerIds: producers
      })
    }

    return NextResponse.json({
      ...updated,
      platforms: safeParseJson(updated.platforms, []),
    })
  } catch (error) {
    console.error("ContentItem PUT error:", error)
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 })
  }
}

// ─── DELETE ───────────────────────────────────────────────────────────
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission("icerik-takvimi", "delete")
  if (auth instanceof NextResponse) return auth

  const { id } = await params

  try {
    await prisma.contentItem.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("ContentItem DELETE error:", error)
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 })
  }
}

// ─── Yardımcı ─────────────────────────────────────────────────────────
function translateStatus(status: string): string {
  const map: Record<string, string> = {
    taslak: "Taslak",
    cekim_tasarim_bekliyor: "Çekim/Tasarım Bekliyor",
    yuklendi: "Yüklendi",
    revize_istendi: "Revize İstendi",
    revize_edildi: "Revize Edildi",
    onaylandi: "Onaylandı",
    planlandi: "Planlandı",
    yayinlandi: "Yayınlandı",
    iptal_edildi: "İptal Edildi"
  }
  return map[status] || status
}

function isValidTransition(oldStatus: string, newStatus: string): boolean {
  if (oldStatus === newStatus) return true
  if (newStatus === "iptal_edildi") return oldStatus !== "yayinlandi"

  switch (oldStatus) {
    case "taslak":
      return newStatus === "cekim_tasarim_bekliyor"
    case "cekim_tasarim_bekliyor":
      return newStatus === "yuklendi"
    case "yuklendi":
      return newStatus === "revize_istendi" || newStatus === "onaylandi"
    case "revize_istendi":
      return newStatus === "revize_edildi"
    case "revize_edildi":
      return newStatus === "revize_istendi" || newStatus === "onaylandi"
    case "onaylandi":
      return newStatus === "planlandi"
    case "planlandi":
      return newStatus === "yayinlandi"
    case "yayinlandi":
      return false
    case "iptal_edildi":
      return false
    default:
      return false
  }
}
