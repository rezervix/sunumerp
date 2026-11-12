import { NextResponse } from "next/server"
import {
  getInventoryAiDashboardFromDb,
  runRealAmaQueryOnDb,
  createPurchaseRequisitionFromAiRecommendation
} from "@/lib/services/inventoryAiServerDb"
import { mockDatabase } from "@/lib/data/mockDatabase"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get("q") || undefined
    const dashboard = await getInventoryAiDashboardFromDb(q)

    if (!dashboard.forecasts || dashboard.forecasts.length === 0) {
      return NextResponse.json(mockDatabase.getInventoryAiDashboard(q))
    }

    return NextResponse.json({
      success: true,
      forecasts: dashboard.forecasts,
      executiveBanner: dashboard.executiveBanner,
      narrativeReports: dashboard.narrativeReports,
      defaultAmaResult: dashboard.defaultAmaResult,
      meta: dashboard.meta
    })
  } catch (error: any) {
    console.warn("GET /api/inventory-ai fallback to mockDatabase:", error)
    const { searchParams } = new URL(request.url)
    const q = searchParams.get("q") || undefined
    return NextResponse.json(mockDatabase.getInventoryAiDashboard(q))
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, question } = body

    if (action === "create_ai_requisition") {
      const pr = await createPurchaseRequisitionFromAiRecommendation({
        itemId: body.itemId,
        sku: body.sku,
        itemName: body.itemName,
        recommendedQty: Number(body.recommendedQty || 10),
        unit: body.unit || "Adet",
        unitCostTry: Number(body.unitCostTry || 250),
        reason: body.reason
      })
      return NextResponse.json({
        success: true,
        requisition: pr,
        message: `${pr.requisitionNo} numaralı satın alma talebi veritabanına kaydedildi.`
      })
    }

    if (action === "ama_query" || question) {
      const result = await runRealAmaQueryOnDb(question || "")

      // Opsiyonel: GEMINI_API_KEY tanımlıysa gerçek veritabanı sonucunu Gemini ile doğal dilde özetle
      if (process.env.GEMINI_API_KEY) {
        try {
          const { GoogleGenerativeAI } = await (import("@google/generative-ai" as any) as any)
          const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
          const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
          const prompt = `Sen Sunum ERP Stok ve WMS Yapay Zeka Asistanısın. Kullanıcı sorusu: "${question}". Gerçek veritabanı sorgu sonucu: ${result.answerNarrative}. Satırlar: ${JSON.stringify(result.rows.slice(0, 5))}. Türkçe, 2-3 cümlelik net bir yönetici özeti ver.`
          const aiResp = await model.generateContent(prompt)
          const text = aiResp.response.text()
          if (text && text.trim().length > 15) {
            result.answerNarrative = text.trim()
          }
        } catch {
          // Gerçek veritabanı NLQ özeti doğrudan kullanılır
        }
      }

      return NextResponse.json({ success: true, data: result })
    }

    const dashboard = await getInventoryAiDashboardFromDb()
    return NextResponse.json({
      success: true,
      forecasts: dashboard.forecasts,
      executiveBanner: dashboard.executiveBanner,
      narrativeReports: dashboard.narrativeReports,
      defaultAmaResult: dashboard.defaultAmaResult
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "AI sorgusu başarısız" },
      { status: 500 }
    )
  }
}
