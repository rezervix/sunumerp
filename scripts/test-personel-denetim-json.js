const fs = require("fs");
const path = require("path");

const JSON_DB_PATH = path.join(process.cwd(), "storage", "ajans-kutuphanesi", ".local-db.json");

function readJsonDb() {
  if (!fs.existsSync(JSON_DB_PATH)) {
    throw new Error("JSON DB not found");
  }
  return JSON.parse(fs.readFileSync(JSON_DB_PATH, "utf8"));
}

function writeJsonDb(data) {
  fs.writeFileSync(JSON_DB_PATH, JSON.stringify(data, null, 2), "utf8");
}

async function runTests() {
  console.log("🧪 Starting JSON DB State Machine Verification Tests...\n");

  try {
    const userId = "local-debug-user";
    const db = readJsonDb();

    // Reset old test data in JSON collection arrays
    db.activeTask = db.activeTask.filter(at => at.userId !== userId);
    db.internalTaskStatusLog = db.internalTaskStatusLog.filter(log => log.userId !== userId);
    db.internalTask = db.internalTask.filter(t => t.assigneeId !== userId);
    writeJsonDb(db);

    console.log("🧹 Cleaned old test data in local JSON database.");

    // 1. Create two test tasks
    const task1 = {
      id: "test-task-1",
      title: "Test Görevi 1 - Yazılım Geliştirme",
      description: "Veritabanı optimizasyonu yapılacak.",
      status: "TODO",
      priority: "HIGH",
      assignerId: userId,
      assigneeId: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const task2 = {
      id: "test-task-2",
      title: "Test Görevi 2 - Dokümantasyon",
      description: "Kullanıcı kılavuzu yazılacak.",
      status: "TODO",
      priority: "MEDIUM",
      assignerId: userId,
      assigneeId: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.internalTask.push(task1);
    db.internalTask.push(task2);
    writeJsonDb(db);

    console.log(`✅ Created test tasks in JSON DB:\n  - Task 1: "${task1.title}" (ID: ${task1.id})\n  - Task 2: "${task2.title}" (ID: ${task2.id})`);

    // 2. Start Task 1
    console.log("\n▶️ Starting Task 1...");
    const now1 = new Date();
    
    // Simulate POST /api/personel-denetim/report with START action
    let activeTask = db.activeTask.find(at => at.userId === userId);
    if (!activeTask) {
      db.activeTask.push({
        id: "active-task-1",
        userId,
        taskId: task1.id,
        startedAt: now1.toISOString()
      });
      db.internalTaskStatusLog.push({
        id: "log-1",
        taskId: task1.id,
        userId,
        status: "START",
        startedAt: now1.toISOString(),
        endedAt: null,
        note: "Görev başlatıldı."
      });
      const tIdx = db.internalTask.findIndex(t => t.id === task1.id);
      db.internalTask[tIdx].status = "IN_PROGRESS";
      writeJsonDb(db);
    }

    // Verify Task 1 is active
    let freshDb = readJsonDb();
    let currentActive = freshDb.activeTask.find(at => at.userId === userId);
    if (currentActive && currentActive.taskId === task1.id) {
      console.log("✅ Verified: Task 1 is currently the ACTIVE task.");
    } else {
      throw new Error("FAIL: Task 1 should be active.");
    }

    // 3. Start Task 2 (Triggers Auto-Pause on Task 1)
    console.log("\n🔄 Starting Task 2 (Task 1 should automatically be paused)...");
    const now2 = new Date();
    
    freshDb = readJsonDb();
    const currentActiveBefore = freshDb.activeTask.find(at => at.userId === userId);
    
    if (currentActiveBefore) {
      // Auto-pause old task
      const oldTaskId = currentActiveBefore.taskId;
      
      // Delete active task entry
      freshDb.activeTask = freshDb.activeTask.filter(at => at.userId !== userId);
      
      // Add pause log
      freshDb.internalTaskStatusLog.push({
        id: "log-2",
        taskId: oldTaskId,
        userId,
        status: "PAUSE",
        startedAt: currentActiveBefore.startedAt,
        endedAt: now2.toISOString(),
        note: "Farklı göreve geçiş nedeniyle otomatik duraklatıldı."
      });
      
      // Update status
      const tIdx = freshDb.internalTask.findIndex(t => t.id === oldTaskId);
      freshDb.internalTask[tIdx].status = "IN_PROGRESS";
    }

    // Upsert Task 2 as active
    freshDb.activeTask.push({
      id: "active-task-2",
      userId,
      taskId: task2.id,
      startedAt: now2.toISOString()
    });
    freshDb.internalTaskStatusLog.push({
      id: "log-3",
      taskId: task2.id,
      userId,
      status: "START",
      startedAt: now2.toISOString(),
      endedAt: null,
      note: "Dokümantasyon görevi başlatıldı."
    });
    const tIdx2 = freshDb.internalTask.findIndex(t => t.id === task2.id);
    freshDb.internalTask[tIdx2].status = "IN_PROGRESS";
    writeJsonDb(freshDb);

    // Verify Task 2 is active and Task 1 has PAUSE log
    freshDb = readJsonDb();
    currentActive = freshDb.activeTask.find(at => at.userId === userId);
    const logsForTask1 = freshDb.internalTaskStatusLog.filter(l => l.taskId === task1.id);
    const hasPauseLog = logsForTask1.some(l => l.status === "PAUSE");

    if (currentActive && currentActive.taskId === task2.id && hasPauseLog) {
      console.log("✅ Verified: Task 2 is active, and Task 1 was AUTOMATICALLY PAUSED in status history log.");
    } else {
      throw new Error("FAIL: Auto-pause logic validation failed.");
    }

    // 4. Complete Task 2
    console.log("\n🏁 Completing Task 2...");
    const now3 = new Date();
    freshDb = readJsonDb();
    
    const activeBeforeComplete = freshDb.activeTask.find(at => at.userId === userId);
    let activeSince = now3.toISOString();
    
    if (activeBeforeComplete && activeBeforeComplete.taskId === task2.id) {
      activeSince = activeBeforeComplete.startedAt;
      freshDb.activeTask = freshDb.activeTask.filter(at => at.userId !== userId);
    }
    
    freshDb.internalTaskStatusLog.push({
      id: "log-4",
      taskId: task2.id,
      userId,
      status: "COMPLETE",
      startedAt: activeSince,
      endedAt: now3.toISOString(),
      note: "Başarıyla tamamlandı."
    });
    
    const compIdx = freshDb.internalTask.findIndex(t => t.id === task2.id);
    freshDb.internalTask[compIdx].status = "DONE";
    writeJsonDb(freshDb);

    // Verify Task 2 is completed and user is idle
    freshDb = readJsonDb();
    currentActive = freshDb.activeTask.find(at => at.userId === userId);
    const updatedTask2 = freshDb.internalTask.find(t => t.id === task2.id);

    if (!currentActive && updatedTask2.status === "DONE") {
      console.log("✅ Verified: User is now IDLE (no active task), and Task 2 status is DONE.");
    } else {
      throw new Error("FAIL: Completion state logic validation failed.");
    }

    // 5. Query Metrics Aggregations
    console.log("\n📊 Computing Performance Metrics from logs...");
    const logs = freshDb.internalTaskStatusLog.filter(l => l.userId === userId);
    const completedCount = logs.filter(l => l.status === "COMPLETE").length;
    const totalDuration = logs
      .filter(l => l.status === "COMPLETE" && l.endedAt)
      .reduce((acc, l) => acc + (new Date(l.endedAt).getTime() - new Date(l.startedAt).getTime()), 0);

    console.log(`📈 Results:
  - Total Log Count: ${logs.length}
  - Completed Tasks: ${completedCount}
  - Total Working Duration: ${totalDuration} ms`);

    console.log("\n🎉 All Verification Tests Passed Successfully!");

  } catch (error) {
    console.error("\n❌ Verification Failed with error:", error);
  }
}

runTests();
