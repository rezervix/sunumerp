import { NextResponse } from "next/server"
import { saveSystemConfig, getSystemConfig } from "@/lib/system-config"
import crypto from "crypto"

/**
 * İyzico Webhook Callback Handler
 * Listens for asynchronous payment, subscription renewal, and cancellation events from İyzico POS.
 */
export async function POST(req: Request) {
  try {
    const rawBody = await req.text()
    let payload: any = {}
    try {
      payload = JSON.parse(rawBody)
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
    }

    console.log("[Iyzico Webhook] Received event notification:", payload.iyziEventType || payload.status || "Unknown Event")

    // Optional Iyzico Webhook Signature verification if key is set
    const iyzicoSecret = process.env.IYZICO_SECRET_KEY
    const signature = req.headers.get("x-iyzi-signature")
    if (iyzicoSecret && signature) {
      const expectedSig = crypto
        .createHmac("sha256", iyzicoSecret)
        .update(rawBody)
        .digest("hex")
      if (signature !== expectedSig) {
        console.warn("[Iyzico Webhook] Signature mismatch!")
        return NextResponse.json({ error: "Invalid signature" }, { status: 403 })
      }
    }

    const eventType = payload.iyziEventType || payload.event
    const subscriptionReferenceCode = payload.subscriptionReferenceCode || payload.referenceCode

    const currentConfig = getSystemConfig()

    // Handle Subscription Renewal / Payment Success
    if (eventType === "SUBSCRIPTION_RENEWAL_SUCCESS" || payload.status === "SUCCESS") {
      const newExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      
      saveSystemConfig({
        subscription: {
          ...currentConfig.subscription,
          status: "active",
          expiresAt: newExpiresAt,
          iyzicoSubscriptionId: subscriptionReferenceCode || currentConfig.subscription.iyzicoSubscriptionId
        }
      })
      console.log(`[Iyzico Webhook] Subscription renewed successfully until ${newExpiresAt}`)
      return NextResponse.json({ status: "success", message: "Abonelik başarıyla yenilendi" })
    }

    // Handle Payment Failure / Subscription Cancellation
    if (eventType === "SUBSCRIPTION_RENEWAL_FAILED" || eventType === "SUBSCRIPTION_CANCELLED" || payload.status === "FAILURE") {
      saveSystemConfig({
        subscription: {
          ...currentConfig.subscription,
          status: "suspended"
        }
      })
      console.warn("[Iyzico Webhook] Payment failed or subscription cancelled. Subscription suspended.")
      return NextResponse.json({ status: "success", message: "Abonelik askıya alındı" })
    }

    return NextResponse.json({ status: "success", message: "Event processed" })
  } catch (err: any) {
    console.error("[Iyzico Webhook Error]:", err)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}
