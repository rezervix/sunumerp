import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requirePermission } from "@/lib/auth/server-permission"

export async function GET(req: Request) {
    const auth = await requirePermission("files", "read")
    if (auth instanceof NextResponse) {
        return auth
    }
    const user = auth.payload

    const { searchParams } = new URL(req.url)
    const branchId = searchParams.get("branchId")

    if (!branchId) {
        return NextResponse.json({ error: "Branch ID required" }, { status: 400 })
    }

    try {
        const deliveries = await prisma.fileDelivery.findMany({
            where: {
                OR: [
                    { fromBranchId: branchId },
                    { toBranchId: branchId },
                    { fromUserId: user.userId as string },
                    { toUserId: user.userId as string }
                ]
            },
            orderBy: { createdAt: "desc" },
            include: {
                fromBranch: { select: { name: true } },
                toBranch: { select: { name: true } }
            }
        })

        // Transform to match UI expectation if needed
        const formattedDeliveries = deliveries.map(d => ({
            ...d,
            fromBranchName: d.fromBranch?.name || "",
            toBranchName: d.toBranch?.name || "",
            fileUrls: JSON.parse(d.fileUrls) // Parse JSON string back to array
        }))

        return NextResponse.json(formattedDeliveries)
    } catch (error) {
        console.error("Error fetching deliveries:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

export async function POST(req: Request) {
    const auth = await requirePermission("files", "create")
    if (auth instanceof NextResponse) {
        return auth
    }
    const user = auth.payload

    try {
        const body = await req.json()
        const { fromBranchId, toBranchId, fromUserId, toUserId, title, description, fileUrls, priority } = body

        if (!fromBranchId || !title || !fileUrls) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        // Generate tracking number
        const count = await prisma.fileDelivery.count()
        const trackingNumber = `TRK-${(count + 1).toString().padStart(6, "0")}`

        const delivery = await prisma.fileDelivery.create({
            data: {
                fromBranchId,
                toBranchId: toBranchId || null,
                fromUserId: fromUserId || user.userId as string,
                toUserId: toUserId || null,
                title,
                description,
                fileUrls: JSON.stringify(fileUrls), // Store as JSON string
                priority: priority || "normal",
                trackingNumber,
                status: "sent",
            },
        })

        // Create notifications
        try {
            const { createNotification, createNotificationMany } = await import("@/lib/services/notificationService")
            if (toUserId) {
                await createNotification({
                    userId: toUserId,
                    title: "Yeni Dosya Transferi",
                    message: `Size '${title}' başlıklı yeni bir dosya gönderildi.`,
                    type: "info",
                    moduleType: "files",
                    link: "/dashboard/files"
                })
            } else if (toBranchId) {
                const branchUsers = await prisma.userBranchRole.findMany({
                    where: { branchId: toBranchId },
                    select: { userId: true }
                })

                if (branchUsers.length > 0) {
                    await createNotificationMany(
                        branchUsers.map(bu => ({
                            userId: bu.userId,
                            title: "Şubeye Yeni Dosya",
                            message: `Şubenize '${title}' başlıklı yeni bir dosya transferi yapıldı.`,
                            type: "info",
                            moduleType: "files",
                            link: "/dashboard/files"
                        }))
                    )
                }
            }
        } catch (err) {
            console.error("Error creating files notifications:", err)
        }

        return NextResponse.json(delivery)
    } catch (error) {
        console.error("Error creating delivery:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

export async function DELETE(req: Request) {
    const auth = await requirePermission("files", "delete")
    if (auth instanceof NextResponse) {
        return auth
    }
    const user = auth.payload

    try {
        const { searchParams } = new URL(req.url)
        const id = searchParams.get("id")

        if (!id) {
            return NextResponse.json({ error: "Delivery ID required" }, { status: 400 })
        }

        await prisma.fileDelivery.delete({
            where: { id },
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error deleting delivery:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

export async function PUT(req: Request) {
    const auth = await requirePermission("files", "update")
    if (auth instanceof NextResponse) {
        return auth
    }
    const user = auth.payload

    try {
        const body = await req.json()
        const { id, status } = body

        if (!id || !status) {
            return NextResponse.json({ error: "ID and status are required" }, { status: 400 })
        }

        const delivery = await prisma.fileDelivery.update({
            where: { id },
            data: { status },
        })

        return NextResponse.json(delivery)
    } catch (error) {
        console.error("Error updating delivery:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
