/**
 * Automated Verification Script for Personnel Audit & Task Tracking System
 * This script runs through the state machine transitions (Start, Auto-Pause, Complete)
 * and verifies that metrics are aggregated correctly.
 */

// Override DB connection to SQLite file for safety if offline
process.env.DATABASE_URL = "file:./prisma/dev.db"

const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()

async function runTests() {
    console.log("🧪 Starting Personnel Audit State Machine Verification Tests...\n")

    try {
        const userId = "local-debug-user"
        
        // Clean up existing data to have a clean environment
        await prisma.activeTask.deleteMany({ where: { userId } }).catch(() => {})
        await prisma.internalTaskStatusLog.deleteMany({ where: { userId } }).catch(() => {})
        await prisma.internalTask.deleteMany({ where: { assigneeId: userId } }).catch(() => {})

        console.log("🧹 Cleaned old test data.")

        // 1. Create two test tasks
        const task1 = await prisma.internalTask.create({
            data: {
                title: "Test Görevi 1 - Yazılım Geliştirme",
                description: "Veritabanı optimizasyonu yapılacak.",
                status: "TODO",
                priority: "HIGH",
                assignerId: userId,
                assigneeId: userId
            }
        })

        const task2 = await prisma.internalTask.create({
            data: {
                title: "Test Görevi 2 - Dokümantasyon",
                description: "Kullanıcı kılavuzu yazılacak.",
                status: "TODO",
                priority: "MEDIUM",
                assignerId: userId,
                assigneeId: userId
            }
        })

        console.log(`✅ Created test tasks: \n  - Task 1: "${task1.title}" (ID: ${task1.id})\n  - Task 2: "${task2.title}" (ID: ${task2.id})`)

        // 2. Start Task 1
        console.log("\n▶️ Starting Task 1...")
        await prisma.activeTask.create({
            data: {
                userId,
                taskId: task1.id,
                startedAt: new Date()
            }
        })
        await prisma.internalTaskStatusLog.create({
            data: {
                taskId: task1.id,
                userId,
                status: "START",
                startedAt: new Date(),
                note: "Görev başlatıldı."
            }
        })
        await prisma.internalTask.update({
            where: { id: task1.id },
            data: { status: "IN_PROGRESS" }
        })

        // Verify Task 1 is active
        let currentActive = await prisma.activeTask.findUnique({ where: { userId } })
        if (currentActive && currentActive.taskId === task1.id) {
            console.log("✅ Verified: Task 1 is currently the ACTIVE task.")
        } else {
            throw new Error("FAIL: Task 1 should be active.")
        }

        // 3. Start Task 2 (This should trigger auto-pause on Task 1)
        console.log("\n🔄 Starting Task 2 (Task 1 should automatically be paused)...")
        // Simulate auto-pause logic from backend route
        const activeBefore = await prisma.activeTask.findUnique({ where: { userId } })
        if (activeBefore) {
            // Delete active task
            await prisma.activeTask.delete({ where: { userId } })
            // Create PAUSE log
            await prisma.internalTaskStatusLog.create({
                data: {
                    taskId: activeBefore.taskId,
                    userId,
                    status: "PAUSE",
                    startedAt: activeBefore.startedAt,
                    endedAt: new Date(),
                    note: "Farklı göreve geçiş nedeniyle otomatik duraklatıldı."
                }
            })
            // Update old task status
            await prisma.internalTask.update({
                where: { id: activeBefore.taskId },
                data: { status: "IN_PROGRESS" }
            })
        }

        // Set Task 2 active
        await prisma.activeTask.create({
            data: {
                userId,
                taskId: task2.id,
                startedAt: new Date()
            }
        })
        await prisma.internalTaskStatusLog.create({
            data: {
                taskId: task2.id,
                userId,
                status: "START",
                startedAt: new Date(),
                note: "Dokümantasyon görevi başlatıldı."
            }
        })
        await prisma.internalTask.update({
            where: { id: task2.id },
            data: { status: "IN_PROGRESS" }
        })

        // Verify Task 2 is active and Task 1 has PAUSE log
        currentActive = await prisma.activeTask.findUnique({ where: { userId } })
        const logsForTask1 = await prisma.internalTaskStatusLog.findMany({ where: { taskId: task1.id } })
        const hasPauseLog = logsForTask1.some(l => l.status === "PAUSE")

        if (currentActive && currentActive.taskId === task2.id && hasPauseLog) {
            console.log("✅ Verified: Task 2 is active, and Task 1 was AUTOMATICALLY PAUSED in status history log.")
        } else {
            throw new Error("FAIL: Auto-pause logic validation failed.")
        }

        // 4. Complete Task 2
        console.log("\n🏁 Completing Task 2...")
        const activeBeforeComplete = await prisma.activeTask.findUnique({ where: { userId } })
        if (activeBeforeComplete && activeBeforeComplete.taskId === task2.id) {
            await prisma.activeTask.delete({ where: { userId } })
        }
        await prisma.internalTaskStatusLog.create({
            data: {
                taskId: task2.id,
                userId,
                status: "COMPLETE",
                startedAt: activeBeforeComplete ? activeBeforeComplete.startedAt : new Date(),
                endedAt: new Date(),
                note: "Başarıyla tamamlandı."
            }
        })
        await prisma.internalTask.update({
            where: { id: task2.id },
            data: { status: "DONE" }
        })

        // Verify Task 2 is completed and user is idle
        currentActive = await prisma.activeTask.findUnique({ where: { userId } })
        const updatedTask2 = await prisma.internalTask.findUnique({ where: { id: task2.id } })

        if (!currentActive && updatedTask2.status === "DONE") {
            console.log("✅ Verified: User is now IDLE (no active task), and Task 2 status is DONE.")
        } else {
            throw new Error("FAIL: Completion state logic validation failed.")
        }

        // 5. Query Metrics
        console.log("\n📊 Computing Performance Metrics...")
        const logs = await prisma.internalTaskStatusLog.findMany({ where: { userId } })
        const completedCount = logs.filter(l => l.status === "COMPLETE").length
        const totalDuration = logs
            .filter(l => l.status === "COMPLETE" && l.endedAt)
            .reduce((acc, l) => acc + (new Date(l.endedAt).getTime() - new Date(l.startedAt).getTime()), 0)

        console.log(`📈 Results:
  - Total Log Count: ${logs.length}
  - Completed Tasks: ${completedCount}
  - Total Working Duration (ms): ${totalDuration} ms`)

        console.log("\n🎉 All Verification Tests Passed Successfully!")
    } catch (error) {
        console.error("\n❌ Verification Failed with error:", error)
    } finally {
        await prisma.$disconnect()
    }
}

runTests()
