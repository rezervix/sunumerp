import os from "os"
import crypto from "crypto"
import { getSystemConfig, isSecurityDisabled } from "../system-config"

/**
 * Hardware & Domain Fingerprinting Engine
 * Generates a unique signature combining host machine specs & domain identity.
 */
export function getSystemFingerprint(): { hardwareId: string; domainId: string; combinedFingerprint: string } {
  try {
    const hostname = os.hostname() || "cicekana-node"
    const platform = os.platform() || "win32"
    const arch = os.arch() || "x64"
    const cpus = os.cpus()
    const cpuModel = cpus && cpus.length > 0 ? cpus[0].model : "unknown-cpu"
    const totalMem = os.totalmem().toString()

    const rawHardware = `${hostname}:${platform}:${arch}:${cpuModel}:${totalMem}`
    const hardwareId = crypto.createHash("sha256").update(rawHardware).digest("hex")

    const domain = process.env.NEXT_PUBLIC_APP_DOMAIN || process.env.VERCEL_URL || "localhost"
    const domainId = crypto.createHash("sha256").update(domain).digest("hex")

    const combinedFingerprint = crypto
      .createHash("sha256")
      .update(`${hardwareId}:${domainId}:cicekana-erp-license-2026`)
      .digest("hex")

    return { hardwareId, domainId, combinedFingerprint }
  } catch (err) {
    console.error("[Fingerprint] Error generating hardware fingerprint:", err)
    return {
      hardwareId: "fallback-hardware-id",
      domainId: "fallback-domain-id",
      combinedFingerprint: "fallback-combined-fingerprint"
    }
  }
}

/**
 * Validates hardware and domain license token.
 * Returns true if valid, false if unauthorized server copy/clone detected.
 */
export function verifyLicenseFingerprint(): boolean {
  if (isSecurityDisabled()) {
    return true
  }

  try {
    const config = getSystemConfig()
    
    // Quarantine check
    if (config.tamperDetected) {
      return false
    }

    const { combinedFingerprint } = getSystemFingerprint()

    // If a custom hardware fingerprint is stored in config, verify match
    const storedFingerprint = (config as any).hardwareFingerprint
    if (storedFingerprint && storedFingerprint !== combinedFingerprint) {
      console.warn("[License Verification] Hardware/Domain fingerprint mismatch! Server cloning detected.")
      return false
    }

    return true
  } catch (err) {
    console.error("[License Verification] Failed to verify fingerprint:", err)
    return false
  }
}
