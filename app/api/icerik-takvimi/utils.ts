import { prisma } from "@/lib/db"

// ─── PLATFORM ve DURUM SABİTLERİ ──────────────────────────────────────
export const PLATFORMS = ["instagram", "tiktok", "youtube", "facebook", "linkedin", "x", "other"] as const
export const CONTENT_TYPES = ["reels", "motion", "akis", "story", "static_post", "carousel", "video", "blog", "other"] as const
export const CONTENT_STATUSES = [
  "taslak",
  "cekim_tasarim_bekliyor",
  "yuklendi",
  "revize_istendi",
  "revize_edildi",
  "onaylandi",
  "planlandi",
  "yayinlandi",
  "iptal_edildi",
] as const

// Gerekli rollerin varlığını doğrular
export async function ensureRolesExist() {
  const roles = [
    { name: "Kameraman", desc: "Çekim uzmanı" },
    { name: "Video Editörü", desc: "Kurgu ve edit uzmanı" },
    { name: "Grafik Tasarım Uzmanı", desc: "Grafik tasarım uzmanı" },
    { name: "Müşteri Hizmetleri", desc: "Müşteri ilişkileri yöneticisi" },
    { name: "Sosyal Medya Uzmanı", desc: "Sosyal medya yöneticisi" }
  ]
  for (const r of roles) {
    try {
      const existing = await prisma.role.findUnique({ where: { name: r.name } })
      if (!existing) {
        await prisma.role.create({
          data: {
            name: r.name,
            description: r.desc,
            permissions: JSON.stringify({
              "icerik-takvimi": ["read", "create", "update", "delete"]
            })
          }
        })
      }
    } catch (err) {
      console.error(`Error ensuring role ${r.name} exists:`, err)
    }
  }
}

// İşlem bazlı bildirim gönderici yardımcı fonksiyon
export async function notifyContentAction({
  branchId,
  branchName,
  contentTitle,
  contentType,
  scheduledDate,
  actionType,
  customMessage,
  producerIds = [],
  excludeUserIds = []
}: {
  branchId: string
  branchName: string
  contentTitle: string
  contentType: string
  scheduledDate: Date
  actionType: "CREATE" | "STATUS_CHANGE" | "REVISION_REQUEST" | "REVISION_COMPLETE" | "CANCEL" | "REOPEN"
  customMessage: string
  producerIds?: string[]
  excludeUserIds?: string[]
}) {
  try {
    const { createNotificationMany } = await import("@/lib/services/notificationService")
    const notificationList: any[] = []

    const contentLabels: Record<string, string> = {
      reels: "Reels Videosu",
      motion: "Motion Video",
      akis: "Akış Gönderisi",
      story: "Story Tasarımı",
    }
    const label = contentLabels[contentType] || contentType
    const dateStr = new Date(scheduledDate).toLocaleDateString("tr-TR")

    // 1. Müşteri Hizmetleri ve Sosyal Medya Uzmanı (Genel Kural)
    const specialRoles = await prisma.userBranchRole.findMany({
      where: {
        branchId,
        role: {
          name: { in: ["Müşteri Hizmetleri", "Sosyal Medya Uzmanı"] }
        }
      },
      select: { userId: true }
    })
    const specialRoleUserIds = specialRoles.map(r => r.userId)

    // 2. Atanan üreticiler
    const uniqueProducers = Array.from(new Set(producerIds.filter(Boolean)))
    for (const prodId of uniqueProducers) {
      if (excludeUserIds.includes(prodId)) continue
      let msg = customMessage
      if (actionType === "CREATE") {
        msg = `Sana yeni bir ${label} görevi atandı: ${branchName}, ${dateStr}`
      }
      notificationList.push({
        userId: prodId,
        title: "İçerik Görevi",
        message: msg,
        type: "task",
        moduleType: "icerik-takvimi",
        link: "/dashboard/icerik-takvimi"
      })
    }

    // 3. MH ve SM kullanıcıları (Genel Kural alıcıları)
    const uniqueMH_SM = Array.from(new Set(specialRoleUserIds)).filter(uid => !uniqueProducers.includes(uid))
    for (const userId of uniqueMH_SM) {
      if (excludeUserIds.includes(userId)) continue
      notificationList.push({
        userId,
        title: "İçerik Takvimi Bildirimi",
        message: customMessage,
        type: "info",
        moduleType: "icerik-takvimi",
        link: "/dashboard/icerik-takvimi"
      })
    }

    // 4. Sistemdeki tüm kullanıcılara genel bildirim (Sadece CREATE aşamasında)
    if (actionType === "CREATE") {
      const branchUsers = await prisma.userBranchRole.findMany({
        where: { branchId },
        select: { userId: true }
      })
      const allBranchUserIds = branchUsers.map(u => u.userId)
      const otherUserIds = allBranchUserIds.filter(uid => !uniqueProducers.includes(uid) && !uniqueMH_SM.includes(uid))
      for (const userId of otherUserIds) {
        if (excludeUserIds.includes(userId)) continue
        notificationList.push({
          userId,
          title: "Yeni İçerik Planlandı",
          message: `${branchName} firması için ${dateStr} tarihine ${label} planlandı`,
          type: "info",
          moduleType: "icerik-takvimi",
          link: "/dashboard/icerik-takvimi"
        })
      }
    }

    if (notificationList.length > 0) {
      await createNotificationMany(notificationList)
    }
  } catch (err) {
    console.error("Error sending notifications in helper:", err)
  }
}
