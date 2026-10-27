import { NextResponse } from "next/server"
import { getAuthPayload } from "@/lib/auth/server-permission"

const KUSCU_URL = process.env.KUSCU_URL || "http://localhost:8765"

export async function POST(req: Request) {
    const auth = await getAuthPayload()
    if (!auth) {
        return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 })
    }

    let body: unknown
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: "Geçersiz istek gövdesi" }, { status: 400 })
    }

    try {
        const res = await fetch(`${KUSCU_URL}/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            // 30 sn timeout
            signal: AbortSignal.timeout(30_000),
        })

        if (!res.ok) {
            const detail = await res.text()
            return NextResponse.json(
                { error: `Daron servisi hatası: ${detail}` },
                { status: res.status },
            )
        }

        const data = await res.json()
        return NextResponse.json(data)
    } catch (err: unknown) {
        const isTimeout = err instanceof Error && err.name === "TimeoutError"
        if (isTimeout) {
            return NextResponse.json(
                { error: "Daron servisine bağlanılamadı (zaman aşımı). Servisin çalıştığından emin olun." },
                { status: 503 },
            )
        }
        console.error("[/api/kuscu] Bağlantı hatası:", err)
        return NextResponse.json(
            { error: "Daron servisine ulaşılamıyor. Lütfen `kuscu/start.bat` dosyasını çalıştırın." },
            { status: 503 },
        )
    }
}

// Health check passthrough
export async function GET() {
    try {
        const res = await fetch(`${KUSCU_URL}/health`, {
            signal: AbortSignal.timeout(3_000),
        })
        const data = await res.json()
        return NextResponse.json(data)
    } catch {
        return NextResponse.json({ status: "offline", mode: "unknown" }, { status: 503 })
    }
}

