import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requirePermission } from "@/lib/auth/server-permission"

function safeParseJson(str: string | null | undefined, fallback: unknown = null) {
  if (!str) return fallback
  try { return JSON.parse(str) } catch { return fallback }
}

// ─── GET: Tekil çekim detayı ──────────────────────────────────────────
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission("icerik-takvimi", "read")
  if (auth instanceof NextResponse) return auth

  const { id } = await params

  try {
    const shoot = await prisma.productionShoot.findUnique({
      where: { id },
      include: {
        branch: { select: { id: true, name: true, themeColor: true } },
        contentItems: {
          select: { id: true, title: true, status: true, platforms: true, contentType: true },
        },
      },
    })

    if (!shoot) {
      return NextResponse.json({ error: "Kayıt bulunamadı" }, { status: 404 })
    }

    return NextResponse.json({
      ...shoot,
      videographerIds: safeParseJson(shoot.videographerIds, []),
      contentItems: shoot.contentItems.map((ci) => ({
        ...ci,
        platforms: safeParseJson(ci.platforms, []),
      })),
    })
  } catch (error) {
    console.error("ProductionShoot GET [id] error:", error)
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 })
  }
}

// ─── PUT: Çekim güncelle ──────────────────────────────────────────────
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
      shootDate,
      shootTime,
      location,
      videographerIds,
      status,
      equipmentNotes,
      contentItemIds, // Opsiyonel bağlı içerikler listesi (güncelleme için)
      statusNote,
    } = body

    const existing = await prisma.productionShoot.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Kayıt bulunamadı" }, { status: 404 })
    }

    const updated = await prisma.productionShoot.update({
      where: { id },
      data: {
        shootDate: shootDate ? new Date(shootDate) : undefined,
        shootTime: shootTime !== undefined ? shootTime : undefined,
        location: location !== undefined ? location : undefined,
        videographerIds: videographerIds !== undefined ? JSON.stringify(videographerIds) : undefined,
        status: status ?? undefined,
        equipmentNotes: equipmentNotes !== undefined ? equipmentNotes : undefined,
      },
    })

    // Bağlı içerikleri güncelle
    if (contentItemIds !== undefined) {
      // Önce bu çekime bağlı olan eski içeriklerin shootId'sini kaldır
      await prisma.contentItem.updateMany({
        where: { shootId: id },
        data: { shootId: null },
      })
      // Sonra yeni seçilenlerin shootId'sini set et
      if (contentItemIds.length > 0) {
        await prisma.contentItem.updateMany({
          where: { id: { in: contentItemIds } },
          data: { shootId: id, status: "awaiting_shoot" },
        })
      }
    }

    // Durum değişikliği geçmişi
    if (status && status !== existing.status) {
      await prisma.contentStatusHistory.create({
        data: {
          entityType: "production_shoot",
          entityId: id,
          oldStatus: existing.status,
          newStatus: status,
          changedById: auth.payload.userId,
          note: statusNote || "Chat/Sistem üzerinden güncellendi",
        },
      })

      // Videoçekimcilere bildirim
      const vIds = safeParseJson(updated.videographerIds, []) as string[]
      if (vIds.length > 0) {
        try {
          const { createNotificationMany } = await import("@/lib/services/notificationService")
          await createNotificationMany(
            vIds.map((userId) => ({
              userId,
              title: "Çekim Durumu Değişti",
              message: `Çekim durumu: ${translateStatus(status)}`,
              type: "task",
              moduleType: "icerik-takvimi",
              link: `/dashboard/icerik-takvimi`,
            }))
          )
        } catch (err) {
          console.error("Shoot status notification error:", err)
        }
      }
    }

    return NextResponse.json({
      ...updated,
      videographerIds: safeParseJson(updated.videographerIds, []),
    })
  } catch (error) {
    console.error("ProductionShoot PUT error:", error)
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 })
  }
}

// ─── DELETE: Çekim sil ────────────────────────────────────────────────
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission("icerik-takvimi", "delete")
  if (auth instanceof NextResponse) return auth

  const { id } = await params

  try {
    await prisma.productionShoot.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("ProductionShoot DELETE error:", error)
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 })
  }
}

function translateStatus(status: string): string {
  const map: Record<string, string> = {
    planned: "Planlandı",
    shot: "Çekildi",
    in_editing: "Editleniyor",
    completed: "Tamamlandı",
    cancelled: "İptal Edildi",
    postponed: "Ertelendi",
  }
  return map[status] || status
}
