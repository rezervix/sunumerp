/**
 * cronService.ts
 *
 * Hafif, bağımsız (zero-dependency) zamanlanmış görev servisi.
 * Next.js hot-reload sırasında mükerrer çalışmayı önlemek için global singleton olarak tasarlanmıştır.
 * Her 60 saniyede bir periyodik tarama yapar.
 */
import { prisma } from "@/lib/db"
import { createNotification, createNotificationMany } from "./notificationService"

class ContentCronService {
  private intervalId: NodeJS.Timeout | null = null
  private isRunning = false

  public start() {
    if (this.intervalId) return // Zaten çalışıyor

    console.log("🚀 İçerik Takvimi Otomatik Hatırlatıcı & Takip Servisi başlatıldı.")
    // Her 60 saniyede bir çalıştır
    this.intervalId = setInterval(() => this.runTasks(), 60 * 1000)
    // İlk çalışmayı hemen yap
    this.runTasks()
  }

  public stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
      console.log("⏹️ İçerik Takvimi Otomatik Hatırlatıcı & Takip Servisi durduruldu.")
    }
  }

  private async runTasks() {
    if (this.isRunning) return
    this.isRunning = true

    try {
      await Promise.all([
        this.checkOverdueContents(),
        this.checkUpcomingShoots(),
        this.checkImpendingPublishTimes(),
        this.sendPendingApprovalDigest(),
        this.checkActiveTaskThresholds(),
        this.sendIdleStaffReminders(),
        this.checkOverdueTasks(),
      ])
    } catch (error) {
      console.error("Cron Tasks Error:", error)
    } finally {
      this.isRunning = false
    }
  }

  // 1. Tarihi geçmiş ama hâlâ taslak/planlandı kalan içerikleri "missed" (Kaçırıldı) yap
  private async checkOverdueContents() {
    const now = new Date()

    try {
      const overdueItems = await prisma.contentItem.findMany({
        where: {
          scheduledDate: { lt: now },
          status: { in: ["draft", "awaiting_shoot", "in_editing", "pending_approval", "scheduled"] },
        },
      })

      if (overdueItems.length === 0) return

      console.log(`⏰ ${overdueItems.length} adet tarihi geçmiş içerik tespit edildi. Durumlar 'missed' olarak güncelleniyor.`)

      for (const item of overdueItems) {
        await prisma.contentItem.update({
          where: { id: item.id },
          data: { status: "missed" },
        })

        // Geçmiş kaydı oluştur
        await prisma.contentStatusHistory.create({
          data: {
            entityType: "content_item",
            entityId: item.id,
            oldStatus: item.status,
            newStatus: "missed",
            changedById: "system",
            note: "Paylaşım tarihi geçtiği için sistem tarafından otomatik kaçırıldı olarak işaretlendi.",
          },
        })

        // Sosyal medya yöneticisine bildirim
        if (item.managerId) {
          await createNotification({
            userId: item.managerId,
            title: "İçerik Zamanı Geçti (Kaçırıldı)",
            message: `"${item.title}" planlanan paylaşım zamanı geçtiği için kaçırıldı olarak işaretlendi.`,
            type: "alert",
            moduleType: "icerik-takvimi",
            link: `/dashboard/icerik-takvimi`,
          })
        }
      }
    } catch (e) {
      console.error("checkOverdueContents error:", e)
    }
  }

  // 2. Çekim günü yaklaşan (yarın veya bugün olan) çekimler için videoçekimcileri uyar
  private async checkUpcomingShoots() {
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(now.getDate() + 1)

    try {
      // Yarınki çekimleri al
      const tomorrowShoots = await prisma.productionShoot.findMany({
        where: {
          shootDate: {
            gte: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 0, 0, 0),
            lte: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 23, 59, 59),
          },
          status: "planned",
        },
      })

      for (const shoot of tomorrowShoots) {
        if (!shoot.videographerIds) continue
        const videographerIds = JSON.parse(shoot.videographerIds) as string[]
        if (videographerIds.length === 0) continue

        // Hatırlatıcı gönder
        const dateStr = new Date(shoot.shootDate).toLocaleDateString("tr-TR")
        await createNotificationMany(
          videographerIds.map((userId) => ({
            userId,
            title: "Yarın Çekiminiz Var 🎥",
            message: `Yarın (${dateStr}) ${shoot.location || "belirtilmemiş konumda"} çekiminiz planlanmıştır.`,
            type: "alert",
            moduleType: "icerik-takvimi",
            link: `/dashboard/icerik-takvimi`,
          }))
        )
      }
    } catch (e) {
      console.error("checkUpcomingShoots error:", e)
    }
  }

  // 3. Paylaşım saati yaklaşan (< 2 saat) ama henüz "scheduled" / "published" olmayanlar için uyarı
  private async checkImpendingPublishTimes() {
    const now = new Date()
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000)

    try {
      const impendingItems = await prisma.contentItem.findMany({
        where: {
          scheduledDate: {
            gte: now,
            lte: twoHoursLater,
          },
          status: { in: ["draft", "awaiting_shoot", "in_editing", "pending_approval"] },
        },
      })

      for (const item of impendingItems) {
        if (item.managerId) {
          await createNotification({
            userId: item.managerId,
            title: "Paylaşıma Az Kaldı! ⚠️",
            message: `"${item.title}" içeriğinin paylaşılmasına 2 saatten az kaldı ancak durumu hâlâ ${this.translateStatus(item.status)}.`,
            type: "alert",
            moduleType: "icerik-takvimi",
            link: `/dashboard/icerik-takvimi`,
          })
        }
      }
    } catch (e) {
      console.error("checkImpendingPublishTimes error:", e)
    }
  }

  // 4. Onay bekleyen içerikler için yöneticilere günlük özet (günde 1 kez sabah 09:00'da)
  private async sendPendingApprovalDigest() {
    const now = new Date()
    // Sadece sabah 09:00 - 09:01 aralığında tetiklenmesini sağla
    if (now.getHours() !== 9 || now.getMinutes() !== 0) return

    try {
      const pendingCount = await prisma.contentItem.count({
        where: { status: "pending_approval" },
      })

      if (pendingCount === 0) return

      // Super admin'leri veya şube yöneticilerini bul
      const managers = await prisma.userBranchRole.findMany({
        where: {
          role: {
            name: { in: ["Super Admin", "Yonetim Kurulu Uyesi", "Genel Mudur", "Branch Admin"] },
          },
        },
        select: { userId: true },
      })

      const uniqueManagerIds = Array.from(new Set(managers.map((m) => m.userId)))

      await createNotificationMany(
        uniqueManagerIds.map((userId) => ({
          userId,
          title: "Onay Bekleyen İçerikler 📋",
          message: `Şu anda onayınızı bekleyen toplam ${pendingCount} adet içerik bulunuyor.`,
          type: "task",
          moduleType: "icerik-takvimi",
          link: `/dashboard/icerik-takvimi`,
        }))
      )
    } catch (e) {
      console.error("sendPendingApprovalDigest error:", e)
    }
  }

  // 5. 4 saattir aktif kalan görevleri denetle ve uyarı gönder
  private async checkActiveTaskThresholds() {
    const now = new Date()
    const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000)

    try {
      const longActiveTasks = await prisma.activeTask.findMany({
        where: {
          startedAt: { lt: fourHoursAgo }
        },
        include: {
          task: true
        }
      })

      for (const at of longActiveTasks) {
        // Zaten son 4 saat içinde bildirilmiş mi?
        const lastNotif = await prisma.notification.findFirst({
          where: {
            userId: at.userId,
            moduleType: "tasks",
            title: "Aktif Görev Süresi Aşıldı!",
            createdAt: { gte: new Date(now.getTime() - 4 * 60 * 60 * 1000) }
          }
        })

        if (!lastNotif) {
          await createNotification({
            userId: at.userId,
            title: "Aktif Görev Süresi Aşıldı!",
            message: `"${at.task.title}" görevi üzerinde 4 saatten uzun süredir çalışıyorsunuz. Güncellemeyi unutmayın!`,
            type: "warning",
            moduleType: "tasks",
            link: "/dashboard/personel-denetim"
          })

          if (at.task.assignerId !== at.userId) {
            const userObj = await prisma.user.findUnique({
              where: { id: at.userId },
              select: { fullName: true }
            })
            await createNotification({
              userId: at.task.assignerId,
              title: "Personel Görev Süresi Aşıldı",
              message: `${userObj?.fullName || "Personel"}, "${at.task.title}" görevi üzerinde 4 saatten uzun süredir çalışıyor.`,
              type: "warning",
              moduleType: "tasks",
              link: "/dashboard/personel-denetim"
            })
          }
        }
      }
    } catch (e) {
      console.error("checkActiveTaskThresholds error:", e)
    }
  }

  // 6. Sabah 09:00'da aktif görevi olmayan personele nazik hatırlatma
  private async sendIdleStaffReminders() {
    const now = new Date()
    if (now.getHours() !== 9 || now.getMinutes() !== 0) return

    try {
      const activeTasks = await prisma.activeTask.findMany()
      const activeUserIds = new Set(activeTasks.map(at => at.userId))

      const allUsers = await prisma.user.findMany({
        where: { isActive: true }
      })

      const idleUsers = allUsers.filter(u => !activeUserIds.has(u.id))

      for (const u of idleUsers) {
        await createNotification({
          userId: u.id,
          title: "Güne Başlarken Hatırlatma 🌅",
          message: "Henüz bir aktif göreve başlamadınız. Lütfen üzerinde çalıştığınız görevi 'Başlat' diyerek işaretleyin.",
          type: "info",
          moduleType: "tasks",
          link: "/dashboard/personel-denetim"
        })
      }
    } catch (e) {
      console.error("sendIdleStaffReminders error:", e)
    }
  }

  // 7. Teslim tarihi geçen görevler için otomatik uyarılar
  private async checkOverdueTasks() {
    const now = new Date()
    try {
      const overdueTasks = await prisma.internalTask.findMany({
        where: {
          status: { not: "DONE" },
          dueDate: { lt: now }
        }
      })

      for (const task of overdueTasks) {
        const lastNotif = await prisma.notification.findFirst({
          where: {
            userId: task.assigneeId,
            moduleType: "tasks",
            title: "Görev Gecikti! ⚠️",
            taskId: task.id,
            createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
          }
        })

        if (!lastNotif) {
          await createNotification({
            userId: task.assigneeId,
            title: "Görev Gecikti! ⚠️",
            message: `"${task.title}" görevinizin teslim tarihi geçti. Lütfen durumunu güncelleyin.`,
            type: "warning",
            moduleType: "tasks",
            link: "/dashboard/personel-denetim"
          })

          if (task.assignerId !== task.assigneeId) {
            await createNotification({
              userId: task.assignerId,
              title: "Görev Gecikti! ⚠️",
              message: `Atadığınız "${task.title}" görevinin teslim tarihi geçti.`,
              type: "warning",
              moduleType: "tasks",
              link: "/dashboard/personel-denetim"
            })
          }
        }
      }
    } catch (e) {
      console.error("checkOverdueTasks error:", e)
    }
  }

  private translateStatus(status: string): string {
    const map: Record<string, string> = {
      draft: "Taslak",
      awaiting_shoot: "Çekim Bekleniyor",
      in_editing: "Editleniyor",
      pending_approval: "Onay Bekliyor",
    }
    return map[status] || status
  }
}

// Global nesne singleton'ı koruma
const globalForCron = global as unknown as { cronService?: ContentCronService }
export const cronService = globalForCron.cronService || new ContentCronService()

if (process.env.NODE_ENV !== "production") {
  globalForCron.cronService = cronService
}

// Başlat
cronService.start()
