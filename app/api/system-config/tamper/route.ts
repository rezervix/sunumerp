import { NextResponse } from "next/server"
import { executeSelfDestruct } from "@/lib/auth/self-destruct"
import { isSecurityDisabled } from "@/lib/system-config"

export async function POST(req: Request) {
  try {
    if (isSecurityDisabled()) {
      console.log("[Tamper API] Security bypass active (storage/TEST_MODE found). Self-destruct sequence skipped.")
      return NextResponse.json({ status: "bypassed_in_test_mode" })
    }

    console.warn("[Tamper API] Tamper alert received! Activating quarantine and self-destruct sequence...")
    
    // Call the file destruction and db suspension routine
    await executeSelfDestruct()
    
    return NextResponse.json({ 
      status: "locked",
      error: "Güvenlik ihlali tespit edildi. Sistem kilitlendi." 
    })
  } catch (err: any) {
    console.error("[Tamper API Error]:", err)
    return NextResponse.json({ error: "Lockdown sequence failed internally" }, { status: 500 })
  }
}
