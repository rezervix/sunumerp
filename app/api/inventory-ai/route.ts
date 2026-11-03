import { NextResponse } from "next/server"
import {
  enterpriseInventoryService,
  executeInventoryAmaQuery
} from "@/lib/services/enterpriseInventorySuite"

export async function GET() {
  try {
    const state = enterpriseInventoryService.getState()
    return NextResponse.json({
      success: true,
      forecasts: state.forecasts,
      narrativeReports: state.narrativeReports
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "AI analiz verileri alınamadı" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, question } = body

    if (action === "ama_query" || question) {
      const result = executeInventoryAmaQuery(question || "")

      // Opsiyonel: GEMINI_API_KEY tanımlıysa Gemini ile ek yönetici yorumu zenginleştirme
      if (process.env.GEMINI_API_KEY) {
        try {
          const { GoogleGenerativeAI } = await import("@google/generative-ai")
          const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
          const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
          const prompt = `Sen Sunum ERP Stok ve WMS Yapay Zeka Asistanısın. Kullanıcı sorusu: "${question}". Sistem veritabanı sonucu: ${result.answerNarrative}. Türkçe, 2-3 cümlelik net bir yönetici özeti ver.`
          const aiResp = await model.generateContent(prompt)
          const text = aiResp.response.text()
          if (text && text.trim().length > 15) {
            result.answerNarrative = text.trim()
          }
        } catch {
          // Deterministik NLQ motoru sonucu doğrudan kullanılır
        }
      }

      return NextResponse.json({ success: true, data: result })
    }

    return NextResponse.json({
      success: true,
      forecasts: enterpriseInventoryService.getState().forecasts,
      narrativeReports: enterpriseInventoryService.getState().narrativeReports
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "AI sorgusu başarısız" },
      { status: 500 }
    )
  }
}

