import { NextResponse } from "next/server"
import { IyzicoClient } from "@/lib/iyzico"
import { getSystemConfig, saveSystemConfig } from "@/lib/system-config"
import { verifyIntegrity } from "@/lib/auth/integrity"
import { cookies } from "next/headers"
import { jwtVerify } from "jose"

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-change-this"

async function getUser() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("auth-token")?.value
    if (!token) return null
    const secret = new TextEncoder().encode(JWT_SECRET)
    const { payload } = await jwtVerify(token, secret)
    return payload
  } catch {
    return null
  }
}

export async function POST(req: Request) {
  // 1. API Integrity Check (Phase 3)
  if (!verifyIntegrity(req)) {
    return NextResponse.json({ error: "API Integrity Verification Failed" }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { cardHolderName, cardNumber, expireMonth, expireYear, cvc, planName } = body

    if (!planName) {
      return NextResponse.json({ error: "Lütfen bir paket seçiniz." }, { status: 400 })
    }

    // Get logged-in user if available (otherwise fallback to system customer for onboarding flow)
    const user = await getUser()

    // Determine package pricing
    let price = 0
    if (planName === "pro") {
      price = 15000 // Special promo logic: client handles the first 3 months as 10.000 TL
    } else if (planName === "enterprise") {
      price = 30000
    } else if (planName === "free") {
      // Free plan requires no card billing
      saveSystemConfig({
        subscription: {
          plan: "free",
          status: "active",
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        }
      })
      return NextResponse.json({ success: true, plan: "free" })
    } else {
      return NextResponse.json({ error: "Geçersiz paket seçimi." }, { status: 400 })
    }

    // Validation for paid plans (Pro & Enterprise)
    if (!cardHolderName || !cardNumber || !expireMonth || !expireYear || !cvc) {
      return NextResponse.json({ error: "Lütfen tüm kart alanlarını doldurunuz." }, { status: 400 })
    }

    // Process payment via Iyzico Client
    const client = new IyzicoClient()
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1"
    const fullName = (user?.fullName as string) || cardHolderName || "System Customer"
    const email = (user?.email as string) || "customer@sunumerp.local"

    const result = await client.createSubscription({
      cardHolderName,
      cardNumber,
      expireMonth,
      expireYear,
      cvc,
      planName,
      price,
      email,
      fullName,
      ip
    })

    if (result.success && result.subscriptionId) {
      // Save subscription settings in config
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days subscription
      
      saveSystemConfig({
        subscription: {
          plan: planName,
          status: "active",
          expiresAt,
          iyzicoSubscriptionId: result.subscriptionId
        }
      })

      return NextResponse.json({ success: true, plan: planName, subscriptionId: result.subscriptionId })
    } else {
      return NextResponse.json({ error: result.error || "Ödeme işlemi başarısız oldu." }, { status: 400 })
    }
  } catch (err: any) {
    console.error("[Subscribe API Error]:", err)
    return NextResponse.json({ error: "Ödeme işlemi sırasında sistemsel hata oluştu." }, { status: 500 })
  }
}
