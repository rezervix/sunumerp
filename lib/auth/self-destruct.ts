import fs from "fs"
import path from "path"
import { prisma } from "@/lib/db"
import { executeMemoryScrambling } from "./memory-scrambler"
import { isSecurityDisabled } from "../system-config"

/**
 * System 2: Source Lock & Payload Nullification Routine
 * Invoked when unauthorized server copying/cloning, license invalidation,
 * or anti-tamper breaches are detected.
 *
 * 1. Executes Memory Scrambling (System 1)
 * 2. Locks & deactivates all DB users
 * 3. Nullifies local database storage & payload cache files
 * 4. Places system in permanent quarantine state
 */
export async function executeSelfDestruct() {
  if (isSecurityDisabled()) {
    console.log("[Self-Destruct] Security bypass active (TEST_MODE). Self-destruct skipped.")
    return
  }

  console.error("!!! [SECURITY / ANTI-TAMPER] INITIATING SOURCE LOCK & PAYLOAD NULLIFICATION !!!")
  
  try {
    // Step 1: Execute Memory Scrambling & RAM Poisoning (System 1)
    executeMemoryScrambling("self_destruct_sequence")

    // Step 2: Suspend all users in database to lock system access
    try {
      await prisma.user.updateMany({
        data: { isActive: false }
      })
      console.log("[Self-Destruct] Locked all database users successfully")
    } catch (dbErr) {
      console.warn("[Self-Destruct] Database query failed or offline. Continuing payload nullification...")
    }

    // Step 3: Delete local SQLite database (dev.db)
    const dbPath = path.join(process.cwd(), "prisma", "dev.db")
    if (fs.existsSync(dbPath)) {
      try {
        fs.unlinkSync(dbPath)
        console.log("[Self-Destruct] Local SQLite dev.db deleted successfully")
      } catch (e) {
        // Fallback: truncate file to 0 bytes
        fs.writeFileSync(dbPath, "")
      }
    }

    // Step 4: Delete local JSON Database fallbacks & payload caches
    const payloadPaths = [
      path.join(process.cwd(), "storage", "ajans-kutuphanesi", ".local-db.json"),
      path.join(process.cwd(), "storage", ".payload_cache")
    ]

    payloadPaths.forEach(p => {
      if (fs.existsSync(p)) {
        try {
          fs.unlinkSync(p)
        } catch {
          fs.writeFileSync(p, "")
        }
      }
    })

    // Step 5: Update system config to permanent lockdown
    const configPath = path.join(process.cwd(), "storage", "system_config.json")
    const blockedConfig = {
      onboarded: true,
      eulaApproved: true,
      tamperDetected: true,
      subscription: {
        plan: "free",
        status: "suspended",
        expiresAt: new Date(0).toISOString()
      }
    }
    
    const dir = path.dirname(configPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(configPath, JSON.stringify(blockedConfig, null, 2), "utf8")
    console.log("[Self-Destruct] Permanent quarantine lockdown state written to system_config.json")

  } catch (err) {
    console.error("[Self-Destruct] Error during self-destruction cleanup execution:", err)
  }
}
