import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requirePermission } from "@/lib/auth/server-permission"
import { isDemoModeActive, getMockData } from "@/lib/data-controller"

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const branchId = searchParams.get("branchId")

    const auth = await requirePermission("leads", "read", branchId || undefined)
    if (auth instanceof NextResponse) return auth

    if (isDemoModeActive()) {
        const leads = getMockData("leads", branchId) as any[]
        return NextResponse.json({
            data: leads,
            total: leads.length,
            page: 1,
            pageSize: 20
        })
    }

    const take = parseInt(searchParams.get("take") || "20")
    const skip = parseInt(searchParams.get("skip") || "0")

    try {
        const where = branchId ? { branchId } : {}
        const [leads, total] = await Promise.all([
            prisma.lead.findMany({
                where,
                orderBy: { createdAt: "desc" },
                take,
                skip,
            }),
            prisma.lead.count({ where }),
        ])
        return NextResponse.json({ data: leads, total, page: Math.floor(skip / take) + 1, pageSize: take })
    } catch (error) {
        console.error("Error fetching leads:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const {
            branchId, name, company, email, phone, status, notes, digitalAssets, serviceSelection, amount, painPoint,
            instagramUrl, websiteUrl, googleMapsUrl,
            employeeCount, industry, companyAge, legalStructure, currentERP, competitorInUse,
            scoreTemp, budgetRange, timeline, decisionStructure, lastContactedAt, nextFollowUpDate, referralSource
        } = body

        if (!branchId || !name) {
            return NextResponse.json({ error: "Şube ve isim zorunludur" }, { status: 400 })
        }

        const auth = await requirePermission("leads", "write", branchId)
        if (auth instanceof NextResponse) return auth
        const createdById = auth.payload.userId

        if (isDemoModeActive()) {
            return NextResponse.json({
                id: `lead-demo-${Date.now()}`,
                branchId,
                name,
                company: company || "Demo Şirket",
                email: email || "info@demo.com",
                phone: phone || "",
                status: status || "hot",
                amount: amount ? parseFloat(amount) : 100000,
                createdAt: new Date().toISOString()
            })
        }

        const lead = await prisma.lead.create({
            data: {
                branchId,
                name,
                company,
                email,
                phone,
                status: status || "new",
                notes,
                digitalAssets: digitalAssets ? JSON.stringify(digitalAssets) : null,
                serviceSelection: serviceSelection ? JSON.stringify(serviceSelection) : null,
                amount: amount ? parseFloat(amount) : null,
                painPoint,
                instagramUrl,
                websiteUrl,
                googleMapsUrl,
                employeeCount,
                industry,
                companyAge,
                legalStructure,
                currentERP,
                competitorInUse,
                scoreTemp,
                budgetRange,
                timeline,
                decisionStructure,
                lastContactedAt: lastContactedAt ? new Date(lastContactedAt) : null,
                nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate) : null,
                referralSource,
                createdById: createdById as string | undefined,
            },
        })
        return NextResponse.json(lead)
    } catch (error) {
        console.error("Error creating lead:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
