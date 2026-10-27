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
        const { branchId, leads } = await req.json()
        if (!branchId || !leads || !Array.isArray(leads)) {
            return NextResponse.json({ error: "Geçersiz veri formatı" }, { status: 400 })
        }

        const validLeads = leads
            .filter(l => l.Isim || l.Name || l.name) // En az isim olmalı
            .map(l => ({
                branchId,
                name: String(l.Isim || l.Name || l.name),
                company: l.Sirket || l.Company || l.company || null,
                email: l.Email || l.Eposta || l.email || null,
                phone: String(l.Telefon || l.Phone || l.phone || ""),
                status: "new",
                notes: l.Notlar || l.Notes || l.notes || "Excel'den yüklendi.",
                painPoint: null, // Always empty for bulk import as per requirement
            }))

        if (validLeads.length === 0) {
            return NextResponse.json({ error: "Yüklenecek geçerli kayıt bulunamadı." }, { status: 400 })
        }

        const created = await prisma.lead.createMany({
            data: validLeads
        })

        return NextResponse.json({ count: created.count })

    } catch (error) {
        console.error("Bulk import error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
