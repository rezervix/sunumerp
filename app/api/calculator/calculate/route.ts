import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { jwtVerify } from "jose"
import { prisma } from "@/lib/db"
import { z } from "zod"
import { calculatePrice, CalculationParams } from "@/lib/services/calculationService"

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-change-this"

// Kimlik doğrulama fonksiyonu
async function getUserId() {
    const cookieStore = await cookies()
    const token = cookieStore.get("auth-token")?.value
    if (!token) return null

    try {
        const secret = new TextEncoder().encode(JWT_SECRET)
        const { payload } = await jwtVerify(token, secret)
        return payload.userId as string
    } catch {
        return null
    }
}

// Zod ile giriş verisi doğrulama şeması
const calculationSchema = z.object({
    productCost: z.number().min(0),
    shippingCost: z.number().min(0).default(0),
    commissionRate: z.number().min(0).default(0),
    vatRate: z.number().min(0).default(0),
    variantPrice: z.number().optional(),
    subtractVariant: z.boolean().optional(),
    roundingStrategy: z.enum(["none", "hundred", "90", "99", "premium"]).default("hundred"),
    manualProfitRate: z.number().min(0).optional(),
    saveToHistory: z.boolean().default(false)
})

export async function POST(req: Request) {
    const userId = await getUserId()
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
        const body = await req.json()

        // Girdi doğrulama
        const parsedData = calculationSchema.safeParse(body)
        if (!parsedData.success) {
            return NextResponse.json({
                error: "Geçersiz parametreler",
                details: parsedData.error.format()
            }, { status: 400 })
        }

        const data = parsedData.data

        // Hesaplama motorunu çalıştır
        const params: CalculationParams = {
            productCost: data.productCost,
            shippingCost: data.shippingCost,
            commissionRate: data.commissionRate,
            vatRate: data.vatRate,
            variantPrice: data.variantPrice,
            subtractVariant: data.subtractVariant,
            roundingStrategy: data.roundingStrategy,
            manualProfitRate: data.manualProfitRate
        }

        const result = calculatePrice(params)

        // Sadece kullanıcı isterse geçmişe kaydet
        if (data.saveToHistory) {
            await prisma.calculationHistory.create({
                data: {
                    userId,
                    productCost: params.productCost,
                    totalCost: result.totalCost,
                    appliedProfitRate: result.appliedProfitRate,
                    profitAmount: result.profitAmount,
                    finalPrice: result.roundedPrice,
                    roundingStrategy: params.roundingStrategy
                }
            })
        }

        return NextResponse.json(result, { status: 200 })

    } catch (error) {
        console.error("Fiyat hesaplama hatası:", error)
        return NextResponse.json({ error: "Sunucu hatası oluştu" }, { status: 500 })
    }
}
