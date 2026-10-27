import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requirePermission } from "@/lib/auth/server-permission"

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const branchId = searchParams.get("branchId")
    const id = searchParams.get("id")

    if (!id && !branchId) {
        return NextResponse.json({ error: "Branch ID required" }, { status: 400 })
    }

    const auth = await requirePermission("hr", "view", branchId || undefined)
    if (auth instanceof NextResponse) return auth

    try {
        if (id) {
            const candidate = await prisma.candidate.findUnique({
                where: { id },
                include: {
                    documents: { orderBy: { createdAt: "desc" } },
                    chats: { orderBy: { timestamp: "desc" } }
                }
            })
            if (!candidate) return NextResponse.json({ error: "Not found" }, { status: 404 })
            return NextResponse.json(candidate)
        } else {
            const take = parseInt(searchParams.get("take") || "20")
            const skip = parseInt(searchParams.get("skip") || "0")
            const [candidates, total] = await Promise.all([
                prisma.candidate.findMany({
                    where: { branchId: branchId || undefined },
                    include: {
                        documents: { orderBy: { createdAt: "desc" } },
                        chats: { orderBy: { timestamp: "desc" } }
                    },
                    orderBy: { createdAt: "desc" },
                    take,
                    skip,
                }),
                prisma.candidate.count({ where: { branchId: branchId || undefined } }),
            ])
            return NextResponse.json({ data: candidates, total, page: Math.floor(skip / take) + 1, pageSize: take })
        }
    } catch (error) {
        console.error("Error fetching candidates:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { branchId, firstName, lastName, email, phone, position, status, kanbanStatus, department, rating, experienceYears, education, location, skills } = body

        if (!branchId) return NextResponse.json({ error: "Missing branchId" }, { status: 400 })

        const auth = await requirePermission("hr", "create", branchId)
        if (auth instanceof NextResponse) return auth

        const candidate = await prisma.candidate.create({
            data: {
                branchId,
                firstName,
                lastName,
                email,
                phone,
                position,
                status: status || "Aday",
                kanbanStatus: kanbanStatus || "Başvurdu",
                department,
                rating: rating ? parseInt(rating) : 0,
                experienceYears: experienceYears ? parseInt(experienceYears) : null,
                education,
                location,
                skills,
                applicationDate: new Date()
            },
        })

        return NextResponse.json(candidate)
    } catch (error) {
        console.error("Error creating candidate:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

export async function PUT(req: Request) {
    try {
        const body = await req.json()
        const { id, ...data } = body

        if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 })

        // Kaydın hangi şubeye ait olduğunu bul
        const record = await prisma.candidate.findUnique({ where: { id }, select: { branchId: true } })
        if (!record) return NextResponse.json({ error: "Aday bulunamadi" }, { status: 404 })

        const auth = await requirePermission("hr", "update", record.branchId)
        if (auth instanceof NextResponse) return auth

        // Remove nested records if they came with the payload unhandled
        delete data.documents
        delete data.chats

        if (data.rating) data.rating = parseInt(data.rating)
        if (data.experienceYears) data.experienceYears = parseInt(data.experienceYears)

        const candidate = await prisma.candidate.update({
            where: { id },
            data,
        })

        return NextResponse.json(candidate)
    } catch (error: any) {
        console.error("Error updating candidate:", error)
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
    }
}

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const id = searchParams.get("id")

        if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 })

        const record = await prisma.candidate.findUnique({ where: { id }, select: { branchId: true } })
        if (!record) return NextResponse.json({ error: "Aday bulunamadi" }, { status: 404 })

        const auth = await requirePermission("hr", "delete", record.branchId)
        if (auth instanceof NextResponse) return auth

        await prisma.candidate.delete({ where: { id } })
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error deleting candidate:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

