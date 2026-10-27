import { prisma } from "../lib/db"

async function runTests() {
    console.log("🧪 Starting Local TS State Machine Verification...")
    const userId = "local-debug-user"

    try {
        await prisma.activeTask.deleteMany({ where: { userId } }).catch((e) => console.log("Del active failed:", e.message))
        await prisma.internalTaskStatusLog.deleteMany({ where: { userId } }).catch((e) => console.log("Del logs failed:", e.message))
        await prisma.internalTask.deleteMany({ where: { assigneeId: userId } }).catch((e) => console.log("Del tasks failed:", e.message))

        console.log("Creating task...")
        const task1 = await prisma.internalTask.create({
            data: {
                id: "test-task-1",
                title: "Test Görevi 1 - Yazılım Geliştirme",
                description: "Veritabanı optimizasyonu yapılacak.",
                status: "TODO",
                priority: "HIGH",
                assignerId: userId,
                assigneeId: userId
            }
        })
        console.log("Created task successfully:", task1.id)
    } catch (e: any) {
        console.error("CRITICAL ERROR IN TEST:", e)
    }
}

runTests()
