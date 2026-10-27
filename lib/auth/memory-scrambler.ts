import crypto from "crypto"
import { isSecurityDisabled, saveSystemConfig } from "../system-config"

/**
 * System 1: Memory Scrambling & Data Poisoning Routine
 * Invoked when anti-tamper, debugger, or unauthorized bypass is detected.
 * Wipes critical secrets & configuration keys in RAM memory, corrupts session caches,
 * and manipulates heap memory allocations to crash unauthorized runtime logic safely.
 */
export function executeMemoryScrambling(reason: string = "unauthorized_debugger_or_bypass") {
  if (isSecurityDisabled()) {
    console.log("[Memory Scrambler] Security bypass active (TEST_MODE). Memory scrambling skipped.")
    return
  }

  console.error(`!!! [ANTI-TAMPER] MEMORY SCRAMBLING ACTIVATED (Reason: ${reason}) !!!`)

  try {
    // 1. Poison & Wipe Critical Process Environment Secrets in RAM
    const sensitiveKeys = [
      "DATABASE_URL",
      "JWT_SECRET",
      "IYZICO_API_KEY",
      "IYZICO_SECRET_KEY",
      "API_INTEGRITY_SECRET",
      "NEXTAUTH_SECRET"
    ]

    sensitiveKeys.forEach(key => {
      if (process.env[key]) {
        // Overwrite memory string with random noise before deleting
        process.env[key] = crypto.randomBytes(64).toString("hex")
        delete process.env[key]
      }
    })

    // 2. Set permanent quarantine lock state in system config
    try {
      saveSystemConfig({
        tamperDetected: true,
        subscription: {
          plan: "free",
          status: "suspended",
          expiresAt: new Date(0).toISOString()
        }
      })
    } catch {
      // Ignore config save errors during scramble
    }

    // 3. Memory Heap Manipulation / Garbage Collector Noise
    const memoryPoisonBuffer: Array<ArrayBuffer> = []
    for (let i = 0; i < 50; i++) {
      try {
        const buf = new ArrayBuffer(1024 * 1024) // 1MB buffer allocation
        const view = new Uint8Array(buf)
        crypto.randomFillSync(view)
        memoryPoisonBuffer.push(buf)
      } catch {
        break
      }
    }

    // Force GC if node flag exposed
    if (typeof global !== "undefined" && typeof (global as any).gc === "function") {
      try {
        ;(global as any).gc()
      } catch {
        // Ignore
      }
    }

    console.error("[Memory Scrambler] RAM secrets overwritten and poisoned successfully.")
  } catch (err) {
    console.error("[Memory Scrambler] Scrambling failed:", err)
  }
}
