import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { cookies } from "next/headers"
import { jwtVerify } from "jose"
import { generateWithRotation } from "@/lib/gemini"

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-change-this"

async function getUser() {
    const cookieStore = await cookies()
    const token = cookieStore.get("auth-token")?.value
    if (!token) return null
    try {
        const secret = new TextEncoder().encode(JWT_SECRET)
        const { payload } = await jwtVerify(token, secret)
        return payload
    } catch { return null }
}

export async function POST(req: Request) {
    const user = await getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    try {
        const { leadId } = await req.json()
        if (!leadId) return NextResponse.json({ error: "Lead ID required" }, { status: 400 })

        const lead = await prisma.lead.findUnique({
            where: { id: leadId },
            include: { branch: true }
        })

        if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 })

        // Safely parse serviceSelection
        let services = "Dijital Çözümler"
        try {
            if (lead.serviceSelection) {
                const parsed = JSON.parse(lead.serviceSelection)
                if (Array.isArray(parsed) && parsed.length > 0) {
                    services = parsed.join(", ")
                }
            }
        } catch (e) {
            console.error("Error parsing serviceSelection:", e)
        }

        const prompt = `
        Sen bir dijital pazarlama uzmanısın. Aşağıdaki bilgilere sahip bir potansiyel müşteri (lead) için WhatsApp üzerinden gönderilecek bir pazarlama mesajı hazırla.
        
        Müşteri Adı: ${lead.name || "Belirtilmemiş"}
        Firma Adı: ${lead.company || "Belirtilmemiş"}
        Instagram: ${lead.instagramUrl || "Yok"}
        Web Sitesi: ${lead.websiteUrl || "Yok"}
        Google Maps: ${lead.googleMapsUrl || "Yok"}
        İlgilendiği Hizmetler: ${services}
        Müşterinin Acı Noktası (Eğer varsa): ${lead.painPoint || "Belirtilmemiş"}

        MESAJIN KARAKTERİSTİĞİ (ÇOK KRİTİK):
        - Upuzun, sıkıcı bir kurumsal mesaj OLMAYACAK.
        - Doğrudan, "Sorununuzu biliyoruz, çözüm sunmak istiyoruz, sizin için uygun mu?" mantığında olmalı.
        - Karşı tarafı sohbete çekmeyi hedefleyen, nokta atışı ve kısa bir giriş mesajı olmalı.
        - Samimi ama profesyonel bir dil kullan.
        - Emoji kullanabilirsin (aşırıya kaçmadan).
        - Mesaj Türkçe olmalı.
        - Sadece mesaj metnini döndür, başka hiçbir açıklama ekleme.
        `

        // Use gemini-2.5-flash for better stability and speed
        const text = await generateWithRotation(prompt, "gemini-2.5-flash")

        if (!text) {
            throw new Error("Gemini returned an empty response")
        }

        return NextResponse.json({ message: text, isAiGenerated: true })

    } catch (error: any) {
        console.error("Error generating message with Gemini:", error)
        
        // Detailed error for debugging
        const errorMessage = error.message || "Internal server error"
        return NextResponse.json({ 
            error: errorMessage,
            details: error.stack?.split('\n')[0] 
        }, { status: 500 })
    }
}
