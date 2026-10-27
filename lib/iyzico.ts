import crypto from "crypto"

export interface IyzicoPaymentRequest {
  cardHolderName: string
  cardNumber: string
  expireMonth: string
  expireYear: string
  cvc: string
  planName: "free" | "pro" | "enterprise"
  price: number
  email: string
  fullName: string
  ip: string
}

export class IyzicoClient {
  private apiKey: string
  private secretKey: string
  private baseUrl: string

  constructor() {
    this.apiKey = process.env.IYZICO_API_KEY || ""
    this.secretKey = process.env.IYZICO_SECRET_KEY || ""
    this.baseUrl = process.env.IYZICO_BASE_URL || "https://sandbox-api.iyzipay.com"
  }

  // Generates unique Iyzico Auth Headers
  private generateHeaders(payload: string) {
    const rnd = Math.random().toString(36).substring(2, 15)
    
    // Hash format: apiKey + rnd + secretKey + payload
    const dataToHash = this.apiKey + rnd + this.secretKey + payload
    const signature = crypto
      .createHash("sha256")
      .update(dataToHash)
      .digest("hex")

    const authString = Buffer.from(`${this.apiKey}:${signature}`).toString("base64")

    return {
      "Content-Type": "application/json",
      "x-iyzi-rnd": rnd,
      "Authorization": `IYZWS ${authString}`
    }
  }

  // Subscribes user to a plan
  async createSubscription(request: IyzicoPaymentRequest): Promise<{ success: boolean; subscriptionId?: string; error?: string }> {
    console.log(`[Iyzico] Processing subscription request for plan ${request.planName} (${request.price} TL)...`)

    // If API credentials are not set, run Sandbox Simulation Mode
    if (!this.apiKey || !this.secretKey) {
      console.log("[Iyzico] API Keys missing. Running in Simulation Mode.")
      await new Promise(resolve => setTimeout(resolve, 1500)) // simulate network delay
      
      // Simulate validation error for testing card lengths
      if (request.cardNumber.replace(/\s+/g, "").length < 16) {
        return { success: false, error: "Geçersiz kart numarası." }
      }

      return {
        success: true,
        subscriptionId: `sub_mock_${Math.random().toString(36).substring(2, 10)}`
      }
    }

    try {
      // Setup payload for actual Iyzico Subscription API
      const payload = JSON.stringify({
        locale: "tr",
        conversationId: Math.random().toString(36).substring(2, 12),
        pricingPlanCode: request.planName === "pro" ? "plan_pro_123" : "plan_ent_456",
        subscriptionAddress: {
          contactName: request.fullName,
          city: "Istanbul",
          country: "Turkey",
          address: "Merkez Mh. Buyukdere Cd. No:1",
          zipCode: "34394"
        },
        customer: {
          name: request.fullName.split(" ")[0] || "User",
          surname: request.fullName.split(" ").slice(1).join(" ") || "Customer",
          gsmNumber: "+905551234567",
          email: request.email,
          identityNumber: "11111111111",
          shippingAddress: {
            contactName: request.fullName,
            city: "Istanbul",
            country: "Turkey",
            address: "Merkez Mh. Buyukdere Cd. No:1",
            zipCode: "34394"
          },
          billingAddress: {
            contactName: request.fullName,
            city: "Istanbul",
            country: "Turkey",
            address: "Merkez Mh. Buyukdere Cd. No:1",
            zipCode: "34394"
          }
        },
        paymentCard: {
          cardHolderName: request.cardHolderName,
          cardNumber: request.cardNumber.replace(/\s+/g, ""),
          expireMonth: request.expireMonth,
          expireYear: request.expireYear,
          cvc: request.cvc
        }
      })

      const headers = this.generateHeaders(payload)
      const response = await fetch(`${this.baseUrl}/v2/subscription/initialize`, {
        method: "POST",
        headers: headers as any,
        body: payload
      })

      const data = await response.json()
      if (data.status === "success") {
        return {
          success: true,
          subscriptionId: data.data?.referenceCode
        }
      } else {
        return {
          success: false,
          error: data.errorMessage || "Ödeme işlemi başarısız oldu."
        }
      }
    } catch (err: any) {
      console.error("[Iyzico API Error]:", err)
      return {
        success: false,
        error: "İyzico ödeme servisine bağlanırken bir hata oluştu."
      }
    }
  }
}
