import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requirePermission } from "@/lib/auth/server-permission"

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const branchId = searchParams.get("branchId")

    const auth = await requirePermission("leads", "read", branchId || undefined)
    if (auth instanceof NextResponse) return auth

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

        const lead = await prisma.lead.create({
            data: {
                branchId,
                name,
                company,
                email: email || null,
                phone,
                status: status || "new",
                notes,
                digitalAssets,
                serviceSelection: serviceSelection ? JSON.stringify(serviceSelection) : undefined,
                amount: amount ? parseFloat(amount) : undefined,
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
                referralSource,
                createdById,
                lastContactedAt: lastContactedAt ? new Date(lastContactedAt) : null,
                nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate) : null,
            },
        })

        // Create notifications for branch members
        const branchUsers = await prisma.userBranchRole.findMany({
            where: { branchId },
            select: { userId: true }
        })

        if (branchUsers.length > 0) {
            try {
                const { createNotificationMany } = await import("@/lib/services/notificationService")
                await createNotificationMany(
                    branchUsers.map(bu => ({
                        userId: bu.userId,
                        title: "Yeni Potansiyel Müşteri",
                        message: `${name}${company ? ` (${company})` : ""} için yeni bir kayıt oluşturuldu.`,
                        type: "info",
                        moduleType: "leads",
                        link: "/dashboard/leads"
                    }))
                )
            } catch (err) {
                console.error("Error creating leads notifications:", err)
            }
        }

        return NextResponse.json(lead)
    } catch (error) {
        console.error("Error creating lead:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

export async function PUT(req: Request) {
    try {
        const body = await req.json()
        const {
            id, status, name, company, email, phone, notes, digitalAssets, serviceSelection, amount, painPoint,
            instagramUrl, websiteUrl, googleMapsUrl,
            employeeCount, industry, companyAge, legalStructure, currentERP, competitorInUse,
            scoreTemp, budgetRange, timeline, decisionStructure, lastContactedAt, nextFollowUpDate, referralSource
        } = body

        if (!id) return NextResponse.json({ error: "Lead ID required" }, { status: 400 })

        const record = await prisma.lead.findUnique({ where: { id }, select: { branchId: true } })
        if (!record) return NextResponse.json({ error: "Kayit bulunamadi" }, { status: 404 })

        const auth = await requirePermission("leads", "update", record.branchId)
        if (auth instanceof NextResponse) return auth

        const lead = await prisma.lead.update({
            where: { id },
            data: {
                status,
                name,
                company,
                email,
                phone,
                notes,
                digitalAssets,
                serviceSelection: serviceSelection ? JSON.stringify(serviceSelection) : undefined,
                amount: amount !== undefined ? (amount === "" || amount === null ? null : parseFloat(amount)) : undefined,
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
                referralSource,
                lastContactedAt: lastContactedAt !== undefined ? (lastContactedAt ? new Date(lastContactedAt) : null) : undefined,
                nextFollowUpDate: nextFollowUpDate !== undefined ? (nextFollowUpDate ? new Date(nextFollowUpDate) : null) : undefined,
            },
        })

        return NextResponse.json(lead)
    } catch (error) {
        console.error("Error updating lead:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const id = searchParams.get("id")
        if (!id) return NextResponse.json({ error: "Lead ID required" }, { status: 400 })

        const record = await prisma.lead.findUnique({ where: { id }, select: { branchId: true } })
        if (!record) return NextResponse.json({ error: "Kayit bulunamadi" }, { status: 404 })

        const auth = await requirePermission("leads", "delete", record.branchId)
        if (auth instanceof NextResponse) return auth

        await prisma.lead.delete({ where: { id } })
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error deleting lead:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

