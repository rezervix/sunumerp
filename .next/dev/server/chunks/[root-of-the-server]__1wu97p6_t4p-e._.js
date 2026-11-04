module.exports = [
"[externals]/events [external] (events, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("events", () => require("events"));

module.exports = mod;
}),
"[project]/lib/services/cronService.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "cronService",
    ()=>cronService
]);
/**
 * cronService.ts
 *
 * Hafif, bağımsız (zero-dependency) zamanlanmış görev servisi.
 * Next.js hot-reload sırasında mükerrer çalışmayı önlemek için global singleton olarak tasarlanmıştır.
 * Her 60 saniyede bir periyodik tarama yapar.
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/db.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$notificationService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/services/notificationService.ts [app-route] (ecmascript)");
;
;
class ContentCronService {
    intervalId = null;
    isRunning = false;
    start() {
        if (this.intervalId) return; // Zaten çalışıyor
        if (process.env.NEXT_PHASE === 'phase-production-build') return; // Build aşamasında arka plan görevlerini çalıştırma
        console.log("🚀 İçerik Takvimi Otomatik Hatırlatıcı & Takip Servisi başlatıldı.");
        // Her 60 saniyede bir çalıştır
        this.intervalId = setInterval(()=>this.runTasks(), 60 * 1000);
        if (this.intervalId && typeof this.intervalId.unref === "function") {
            this.intervalId.unref();
        }
        // İlk çalışmayı hemen yap
        this.runTasks();
    }
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            console.log("⏹️ İçerik Takvimi Otomatik Hatırlatıcı & Takip Servisi durduruldu.");
        }
    }
    async runTasks() {
        if (this.isRunning) return;
        this.isRunning = true;
        try {
            await Promise.all([
                this.checkOverdueContents(),
                this.checkUpcomingShoots(),
                this.checkImpendingPublishTimes(),
                this.sendPendingApprovalDigest(),
                this.checkActiveTaskThresholds(),
                this.sendIdleStaffReminders(),
                this.checkOverdueTasks()
            ]);
        } catch (error) {
            console.error("Cron Tasks Error:", error);
        } finally{
            this.isRunning = false;
        }
    }
    // 1. Tarihi geçmiş ama hâlâ taslak/planlandı kalan içerikleri "missed" (Kaçırıldı) yap
    async checkOverdueContents() {
        const now = new Date();
        try {
            const overdueItems = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].contentItem.findMany({
                where: {
                    scheduledDate: {
                        lt: now
                    },
                    status: {
                        in: [
                            "draft",
                            "awaiting_shoot",
                            "in_editing",
                            "pending_approval",
                            "scheduled"
                        ]
                    }
                }
            });
            if (overdueItems.length === 0) return;
            console.log(`⏰ ${overdueItems.length} adet tarihi geçmiş içerik tespit edildi. Durumlar 'missed' olarak güncelleniyor.`);
            for (const item of overdueItems){
                await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].contentItem.update({
                    where: {
                        id: item.id
                    },
                    data: {
                        status: "missed"
                    }
                });
                // Geçmiş kaydı oluştur
                await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].contentStatusHistory.create({
                    data: {
                        entityType: "content_item",
                        entityId: item.id,
                        oldStatus: item.status,
                        newStatus: "missed",
                        changedById: "system",
                        note: "Paylaşım tarihi geçtiği için sistem tarafından otomatik kaçırıldı olarak işaretlendi."
                    }
                });
                // Sosyal medya yöneticisine bildirim
                if (item.managerId) {
                    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$notificationService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createNotification"])({
                        userId: item.managerId,
                        title: "İçerik Zamanı Geçti (Kaçırıldı)",
                        message: `"${item.title}" planlanan paylaşım zamanı geçtiği için kaçırıldı olarak işaretlendi.`,
                        type: "alert",
                        moduleType: "icerik-takvimi",
                        link: `/dashboard/icerik-takvimi`
                    });
                }
            }
        } catch (e) {
            console.error("checkOverdueContents error:", e);
        }
    }
    // 2. Çekim günü yaklaşan (yarın veya bugün olan) çekimler için videoçekimcileri uyar
    async checkUpcomingShoots() {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);
        try {
            // Yarınki çekimleri al
            const tomorrowShoots = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].productionShoot.findMany({
                where: {
                    shootDate: {
                        gte: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 0, 0, 0),
                        lte: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 23, 59, 59)
                    },
                    status: "planned"
                }
            });
            for (const shoot of tomorrowShoots){
                if (!shoot.videographerIds) continue;
                const videographerIds = JSON.parse(shoot.videographerIds);
                if (videographerIds.length === 0) continue;
                // Hatırlatıcı gönder
                const dateStr = new Date(shoot.shootDate).toLocaleDateString("tr-TR");
                await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$notificationService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createNotificationMany"])(videographerIds.map((userId)=>({
                        userId,
                        title: "Yarın Çekiminiz Var 🎥",
                        message: `Yarın (${dateStr}) ${shoot.location || "belirtilmemiş konumda"} çekiminiz planlanmıştır.`,
                        type: "alert",
                        moduleType: "icerik-takvimi",
                        link: `/dashboard/icerik-takvimi`
                    })));
            }
        } catch (e) {
            console.error("checkUpcomingShoots error:", e);
        }
    }
    // 3. Paylaşım saati yaklaşan (< 2 saat) ama henüz "scheduled" / "published" olmayanlar için uyarı
    async checkImpendingPublishTimes() {
        const now = new Date();
        const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
        try {
            const impendingItems = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].contentItem.findMany({
                where: {
                    scheduledDate: {
                        gte: now,
                        lte: twoHoursLater
                    },
                    status: {
                        in: [
                            "draft",
                            "awaiting_shoot",
                            "in_editing",
                            "pending_approval"
                        ]
                    }
                }
            });
            for (const item of impendingItems){
                if (item.managerId) {
                    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$notificationService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createNotification"])({
                        userId: item.managerId,
                        title: "Paylaşıma Az Kaldı! ⚠️",
                        message: `"${item.title}" içeriğinin paylaşılmasına 2 saatten az kaldı ancak durumu hâlâ ${this.translateStatus(item.status)}.`,
                        type: "alert",
                        moduleType: "icerik-takvimi",
                        link: `/dashboard/icerik-takvimi`
                    });
                }
            }
        } catch (e) {
            console.error("checkImpendingPublishTimes error:", e);
        }
    }
    // 4. Onay bekleyen içerikler için yöneticilere günlük özet (günde 1 kez sabah 09:00'da)
    async sendPendingApprovalDigest() {
        const now = new Date();
        // Sadece sabah 09:00 - 09:01 aralığında tetiklenmesini sağla
        if (now.getHours() !== 9 || now.getMinutes() !== 0) return;
        try {
            const pendingCount = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].contentItem.count({
                where: {
                    status: "pending_approval"
                }
            });
            if (pendingCount === 0) return;
            // Super admin'leri veya şube yöneticilerini bul
            const managers = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].userBranchRole.findMany({
                where: {
                    role: {
                        name: {
                            in: [
                                "Super Admin",
                                "Yonetim Kurulu Uyesi",
                                "Genel Mudur",
                                "Branch Admin"
                            ]
                        }
                    }
                },
                select: {
                    userId: true
                }
            });
            const uniqueManagerIds = Array.from(new Set(managers.map((m)=>m.userId)));
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$notificationService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createNotificationMany"])(uniqueManagerIds.map((userId)=>({
                    userId,
                    title: "Onay Bekleyen İçerikler 📋",
                    message: `Şu anda onayınızı bekleyen toplam ${pendingCount} adet içerik bulunuyor.`,
                    type: "task",
                    moduleType: "icerik-takvimi",
                    link: `/dashboard/icerik-takvimi`
                })));
        } catch (e) {
            console.error("sendPendingApprovalDigest error:", e);
        }
    }
    // 5. 4 saattir aktif kalan görevleri denetle ve uyarı gönder
    async checkActiveTaskThresholds() {
        const now = new Date();
        const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);
        try {
            const longActiveTasks = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].activeTask.findMany({
                where: {
                    startedAt: {
                        lt: fourHoursAgo
                    }
                },
                include: {
                    task: true
                }
            });
            for (const at of longActiveTasks){
                // Zaten son 4 saat içinde bildirilmiş mi?
                const lastNotif = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].notification.findFirst({
                    where: {
                        userId: at.userId,
                        moduleType: "tasks",
                        title: "Aktif Görev Süresi Aşıldı!",
                        createdAt: {
                            gte: new Date(now.getTime() - 4 * 60 * 60 * 1000)
                        }
                    }
                });
                if (!lastNotif) {
                    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$notificationService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createNotification"])({
                        userId: at.userId,
                        title: "Aktif Görev Süresi Aşıldı!",
                        message: `"${at.task.title}" görevi üzerinde 4 saatten uzun süredir çalışıyorsunuz. Güncellemeyi unutmayın!`,
                        type: "warning",
                        moduleType: "tasks",
                        link: "/dashboard/personel-denetim"
                    });
                    if (at.task.assignerId !== at.userId) {
                        const userObj = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].user.findUnique({
                            where: {
                                id: at.userId
                            },
                            select: {
                                fullName: true
                            }
                        });
                        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$notificationService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createNotification"])({
                            userId: at.task.assignerId,
                            title: "Personel Görev Süresi Aşıldı",
                            message: `${userObj?.fullName || "Personel"}, "${at.task.title}" görevi üzerinde 4 saatten uzun süredir çalışıyor.`,
                            type: "warning",
                            moduleType: "tasks",
                            link: "/dashboard/personel-denetim"
                        });
                    }
                }
            }
        } catch (e) {
            console.error("checkActiveTaskThresholds error:", e);
        }
    }
    // 6. Sabah 09:00'da aktif görevi olmayan personele nazik hatırlatma
    async sendIdleStaffReminders() {
        const now = new Date();
        if (now.getHours() !== 9 || now.getMinutes() !== 0) return;
        try {
            const activeTasks = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].activeTask.findMany();
            const activeUserIds = new Set(activeTasks.map((at)=>at.userId));
            const allUsers = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].user.findMany({
                where: {
                    isActive: true
                }
            });
            const idleUsers = allUsers.filter((u)=>!activeUserIds.has(u.id));
            for (const u of idleUsers){
                await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$notificationService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createNotification"])({
                    userId: u.id,
                    title: "Güne Başlarken Hatırlatma 🌅",
                    message: "Henüz bir aktif göreve başlamadınız. Lütfen üzerinde çalıştığınız görevi 'Başlat' diyerek işaretleyin.",
                    type: "info",
                    moduleType: "tasks",
                    link: "/dashboard/personel-denetim"
                });
            }
        } catch (e) {
            console.error("sendIdleStaffReminders error:", e);
        }
    }
    // 7. Teslim tarihi geçen görevler için otomatik uyarılar
    async checkOverdueTasks() {
        const now = new Date();
        try {
            const overdueTasks = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].internalTask.findMany({
                where: {
                    status: {
                        not: "DONE"
                    },
                    dueDate: {
                        lt: now
                    }
                }
            });
            for (const task of overdueTasks){
                const lastNotif = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].notification.findFirst({
                    where: {
                        userId: task.assigneeId,
                        moduleType: "tasks",
                        title: "Görev Gecikti! ⚠️",
                        taskId: task.id,
                        createdAt: {
                            gte: new Date(now.getTime() - 24 * 60 * 60 * 1000)
                        }
                    }
                });
                if (!lastNotif) {
                    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$notificationService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createNotification"])({
                        userId: task.assigneeId,
                        title: "Görev Gecikti! ⚠️",
                        message: `"${task.title}" görevinizin teslim tarihi geçti. Lütfen durumunu güncelleyin.`,
                        type: "warning",
                        moduleType: "tasks",
                        link: "/dashboard/personel-denetim"
                    });
                    if (task.assignerId !== task.assigneeId) {
                        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$notificationService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createNotification"])({
                            userId: task.assignerId,
                            title: "Görev Gecikti! ⚠️",
                            message: `Atadığınız "${task.title}" görevinin teslim tarihi geçti.`,
                            type: "warning",
                            moduleType: "tasks",
                            link: "/dashboard/personel-denetim"
                        });
                    }
                }
            }
        } catch (e) {
            console.error("checkOverdueTasks error:", e);
        }
    }
    translateStatus(status) {
        const map = {
            draft: "Taslak",
            awaiting_shoot: "Çekim Bekleniyor",
            in_editing: "Editleniyor",
            pending_approval: "Onay Bekliyor"
        };
        return map[status] || status;
    }
}
// Global nesne singleton'ı koruma
const globalForCron = /*TURBOPACK member replacement*/ __turbopack_context__.g;
const cronService = globalForCron.cronService || new ContentCronService();
if ("TURBOPACK compile-time truthy", 1) {
    globalForCron.cronService = cronService;
}
// Başlat
cronService.start();
}),
"[project]/lib/services/notificationService.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createNotification",
    ()=>createNotification,
    "createNotificationMany",
    ()=>createNotificationMany,
    "notificationEmitter",
    ()=>notificationEmitter
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$events__$5b$external$5d$__$28$events$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/events [external] (events, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/db.ts [app-route] (ecmascript)");
;
;
// Create a global Event Emitter for real-time notification dispatching.
// In Next.js hot reloading, caching the emitter on the global object prevents creating multiple emitters.
const globalForEmitter = /*TURBOPACK member replacement*/ __turbopack_context__.g;
const notificationEmitter = globalForEmitter.notificationEmitter || new __TURBOPACK__imported__module__$5b$externals$5d2f$events__$5b$external$5d$__$28$events$2c$__cjs$29$__["EventEmitter"]();
if ("TURBOPACK compile-time truthy", 1) globalForEmitter.notificationEmitter = notificationEmitter;
async function createNotification(data) {
    try {
        const notification = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].notification.create({
            data: {
                userId: data.userId,
                title: data.title,
                message: data.message,
                type: data.type || "info",
                moduleType: data.moduleType || null,
                content: data.content || null,
                link: data.link || null,
                isRead: false
            }
        });
        // Broadcast to SSE clients
        notificationEmitter.emit("notification", notification);
        return notification;
    } catch (error) {
        console.error("Error creating notification in service:", error);
        throw error;
    }
}
async function createNotificationMany(dataList) {
    const notifications = [];
    for (const item of dataList){
        try {
            const notif = await createNotification(item);
            notifications.push(notif);
        } catch (error) {
            console.error("Error in createNotificationMany for item:", item, error);
        }
    }
    return notifications;
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__1wu97p6_t4p-e._.js.map