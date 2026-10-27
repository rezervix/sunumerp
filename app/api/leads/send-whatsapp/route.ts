import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { cookies } from "next/headers"
import { jwtVerify } from "jose"

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
        const { leadId, message } = await req.json()
        if (!leadId || !message) return NextResponse.json({ error: "Lead ID and message required" }, { status: 400 })

        const lead = await prisma.lead.findUnique({
            where: { id: leadId },
            include: { branch: true }
        })

        if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 })
        if (!lead.phone) return NextResponse.json({ error: "Lead phone number missing" }, { status: 400 })

        // Telefon numarasını temizle ve 90 formatına getir
        let cleanedPhone = lead.phone.replace(/\D/g, "")
        
        // Türkiye formatı için düzeltmeler (5XX -> 905XX, 05XX -> 905XX)
        if (cleanedPhone.startsWith("0")) {
            cleanedPhone = "90" + cleanedPhone.substring(1)
        } else if (cleanedPhone.length === 10 && cleanedPhone.startsWith("5")) {
            cleanedPhone = "90" + cleanedPhone
        } else if (cleanedPhone.length === 11 && cleanedPhone.startsWith("9")) {
             // Zaten 90 ile başlıyor olabilir veya 9 ile başlayan başka bir numara
             if (!cleanedPhone.startsWith("90")) {
                cleanedPhone = "90" + cleanedPhone.substring(1) // 95XX -> 905XX düzeltmesi gibi
             }
        } else if (cleanedPhone.length === 12 && cleanedPhone.startsWith("90")) {
            // Doğru format
        }

        // Generate wa.me link
        const encodedMessage = encodeURIComponent(message)
        const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanedPhone}&text=${encodedMessage}`

        // Log the action
        try {
            await prisma.auditLog.create({
                data: {
                    userId: user.id as string,
                    action: "WHATSAPP_LINK_GENERATED",
                    resource: "Lead",
                    resourceId: leadId,
                    details: JSON.stringify({
                        recipient: cleanedPhone,
                        messageContent: message.substring(0, 100),
                        timestamp: new Date().toISOString()
                    })
                }
            })
        } catch (e) {
            console.error("Audit log error:", e)
        }

        // Update lead status
        await prisma.lead.update({
            where: { id: leadId },
            data: {
                status: "contacted",
                notes: (lead.notes || "") + `\n\n[Sistem] WhatsApp mesajı oluşturuldu (${new Date().toLocaleString("tr-TR")})`
            }
        })

        return NextResponse.json({ success: true, whatsappUrl })

    } catch (error) {
        console.error("Error generating WhatsApp link:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
