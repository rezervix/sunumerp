import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requirePermission } from "@/lib/auth/server-permission"
import { isDemoModeActive, getMockData } from "@/lib/data-controller"

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const branchId = searchParams.get("branchId")

    const auth = await requirePermission("projects", "view", branchId || undefined)
    if (auth instanceof NextResponse) return auth

    if (isDemoModeActive()) {
        return NextResponse.json(getMockData("projects", branchId))
    }

    try {
        const projects = await prisma.project.findMany({
            where: { branchId: branchId || undefined },
            orderBy: { createdAt: "desc" },
        })
        return NextResponse.json(projects)
    } catch (error) {
        console.error("Error fetching projects:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { branchId, name, description, status, startDate, endDate } = body

        if (!branchId || !name) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        const auth = await requirePermission("projects", "create", branchId)
        if (auth instanceof NextResponse) return auth

        const project = await prisma.project.create({
            data: {
                branchId,
                name,
                description,
                status,
                progress: body.progress !== undefined ? Number(body.progress) : 0,
                customerNotes: body.customerNotes,
                startDate: body.startDate ? new Date(body.startDate) : undefined,
                endDate: body.endDate ? new Date(body.endDate) : undefined,
            },
        })

        return NextResponse.json(project)
    } catch (error) {
        console.error("Error creating project:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const id = searchParams.get("id")

        if (!id) {
            return NextResponse.json({ error: "Project ID required" }, { status: 400 })
        }

        const record = await prisma.project.findUnique({ where: { id }, select: { branchId: true } })
        if (!record) return NextResponse.json({ error: "Proje bulunamadi" }, { status: 404 })

        const auth = await requirePermission("projects", "delete", record.branchId)
        if (auth instanceof NextResponse) return auth

        await prisma.project.delete({
            where: { id },
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error deleting project:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

export async function PUT(req: Request) {
    try {
        const body = await req.json()
        const { id, status, progress, name, description } = body

        if (!id) {
            return NextResponse.json({ error: "Project ID required" }, { status: 400 })
        }

        const record = await prisma.project.findUnique({ where: { id }, select: { branchId: true } })
        if (!record) return NextResponse.json({ error: "Proje bulunamadi" }, { status: 404 })

        const auth = await requirePermission("projects", "update", record.branchId)
        if (auth instanceof NextResponse) return auth

        const project = await prisma.project.update({
            where: { id },
            data: {
                status,
                progress: progress !== undefined ? Number(progress) : undefined,
                name,
                description,
                customerNotes: body.customerNotes,
                startDate: body.startDate ? new Date(body.startDate) : undefined,
                endDate: body.endDate ? new Date(body.endDate) : undefined,
            },
        })

        return NextResponse.json(project)
    } catch (error) {
        console.error("Error updating project:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

