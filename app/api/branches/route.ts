import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requirePermission } from "@/lib/auth/server-permission"

export async function GET(req: Request) {
    const auth = await requirePermission("branches", "view")
    if (auth instanceof NextResponse) return auth

    try {
        const branches = await prisma.branch.findMany({
            orderBy: { name: "asc" },
            select: {
                id: true,
                name: true,
                code: true,
                themeColor: true,
                isActive: true,
                managerId: true,
                managerFullName: true,
                address: true,
                phone: true,
                email: true,
                logoUrl: true,
            }
        })
        return NextResponse.json(branches)
    } catch (error) {
        console.error("Error fetching branches:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

export async function POST(req: Request) {
    const auth = await requirePermission("branches", "manage")
    if (auth instanceof NextResponse) return auth

    try {
        const body = await req.json()
        const { name, code, themeColor, address, phone, email, managerFullName, logoUrl } = body

        if (!name || !code) {
            return NextResponse.json({ error: "Name and Code are required" }, { status: 400 })
        }

        const branch = await prisma.branch.create({
            data: {
                name,
                code,
                themeColor: themeColor || "#3B82F6",
                address,
                phone,
                email,
                managerFullName,
                logoUrl,
                isActive: true,
            }
        })

        return NextResponse.json(branch)
    } catch (error) {
        console.error("Error creating branch:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

export async function PUT(req: Request) {
    const auth = await requirePermission("branches", "manage")
    if (auth instanceof NextResponse) return auth

    try {
        const body = await req.json()
        const { id, isActive, name, code, themeColor, address, phone, email, managerFullName, logoUrl } = body

        if (!id) {
            return NextResponse.json({ error: "Branch ID required" }, { status: 400 })
        }

        const updateData: any = {}
        if (isActive !== undefined) updateData.isActive = isActive
        if (name) updateData.name = name
        if (code) updateData.code = code
        if (themeColor) updateData.themeColor = themeColor
        if (address) updateData.address = address
        if (phone) updateData.phone = phone
        if (email) updateData.email = email
        if (managerFullName !== undefined) updateData.managerFullName = managerFullName
        if (logoUrl !== undefined) updateData.logoUrl = logoUrl

        const branch = await prisma.branch.update({
            where: { id },
            data: updateData,
        })

        return NextResponse.json(branch)
    } catch (error) {
        console.error("Error updating branch:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

