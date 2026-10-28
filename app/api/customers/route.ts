import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requirePermission } from "@/lib/auth/server-permission"
import { isDemoModeActive, getMockData } from "@/lib/data-controller"

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const branchId = searchParams.get("branchId")
    const id = searchParams.get("id")

    if (!id && !branchId) {
        return NextResponse.json({ error: "Branch ID required" }, { status: 400 })
    }

    // Permission check
    const auth = isDemoModeActive() ? null : await requirePermission("customers", "read", branchId || undefined)
    if (auth instanceof NextResponse) return auth

    if (isDemoModeActive()) {
        const customers = getMockData("customers", branchId) as any[]
        if (id) {
            const customer = customers.find(c => c.id === id)
            if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 })
            return NextResponse.json({
                ...customer,
                notes: [],
                chats: [],
                documents: [],
                tasks: [],
                contacts: [],
                orders: []
            })
        } else {
            const enrichedCustomers = customers.map(c => ({
                ...c,
                notes: [],
                chats: [],
                documents: [],
                tasks: [],
                contacts: [],
                orders: []
            }))
            return NextResponse.json({
                data: enrichedCustomers,
                total: enrichedCustomers.length,
                page: 1,
                pageSize: 100
            })
        }
    }

    try {
        if (id) {
            const customer = await prisma.customer.findUnique({
                where: { id },
                include: {
                    notes: { orderBy: { createdAt: "desc" } },
                    chats: { orderBy: { timestamp: "desc" } },
                    documents: { orderBy: { createdAt: "desc" } },
                    tasks: { orderBy: { dueDate: "asc" } },
                    contacts: { orderBy: { createdAt: "desc" } },
                    orders: { orderBy: { orderDate: "desc" } }
                }
            })
            if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 })
            return NextResponse.json(customer)
        } else {
            const take = parseInt(searchParams.get("take") || "20")
            const skip = parseInt(searchParams.get("skip") || "0")
            const [customers, total] = await Promise.all([
                prisma.customer.findMany({
                    where: { branchId: branchId || undefined },
                    include: {
                        notes: { orderBy: { createdAt: "desc" } },
                        chats: { orderBy: { timestamp: "desc" } },
                        documents: { orderBy: { createdAt: "desc" } },
                        tasks: { orderBy: { dueDate: "asc" } },
                        contacts: { orderBy: { createdAt: "desc" } }
                    },
                    orderBy: { createdAt: "desc" },
                    take,
                    skip,
                }),
                prisma.customer.count({ where: { branchId: branchId || undefined } }),
            ])
            return NextResponse.json({ data: customers, total, page: Math.floor(skip / take) + 1, pageSize: take })
        }
    } catch (error) {
        console.error("Error fetching customers:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json()

        if (Array.isArray(body)) {
            // Bulk import
            if (body.length === 0) return NextResponse.json({ error: "Empty array" }, { status: 400 })
            const branchId = body[0].branchId
            if (!branchId) return NextResponse.json({ error: "Missing branchId" }, { status: 400 })

            const auth = await requirePermission("customers", "write", branchId)
            if (auth instanceof NextResponse) return auth

            const created = await prisma.customer.createMany({
                data: body.map(c => ({
                    branchId: c.branchId,
                    name: c.name || "İsimsiz",
                    company: c.company,
                    email: c.email,
                    phone: c.phone,
                    address: c.address,
                    scoreTemp: c.scoreTemp || "Ilık",
                    purchaseProb: c.purchaseProb ? parseInt(c.purchaseProb) : null,
                    segment: c.segment,
                })),
                skipDuplicates: true,
            })
            return NextResponse.json({ success: true, count: created.count })
        }

        const { branchId, name, company, email, phone, address, scoreTemp, purchaseProb, segment, recallDate, anniversary } = body

        if (!branchId) {
            return NextResponse.json({ error: "Missing branchId" }, { status: 400 })
        }

        const auth = await requirePermission("customers", "write", branchId)
        if (auth instanceof NextResponse) return auth

        const customer = await prisma.customer.create({
            data: {
                branchId,
                name: name || "İsimsiz",
                company,
                email,
                phone,
                address,
                scoreTemp: scoreTemp || "Ilık",
                purchaseProb: purchaseProb ? parseInt(purchaseProb) : null,
                segment,
                recallDate: recallDate ? new Date(recallDate) : undefined,
                anniversary: anniversary ? new Date(anniversary) : undefined
            },
        })

        return NextResponse.json(customer)
    } catch (error) {
        console.error("Error creating customer:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const id = searchParams.get("id")

        if (!id) {
            return NextResponse.json({ error: "Customer ID required" }, { status: 400 })
        }

        const record = await prisma.customer.findUnique({ where: { id }, select: { branchId: true } })
        if (!record) return NextResponse.json({ error: "Musteri bulunamadi" }, { status: 404 })

        const auth = await requirePermission("customers", "delete", record.branchId)
        if (auth instanceof NextResponse) return auth

        await prisma.customer.delete({
            where: { id },
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error deleting customer:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

export async function PUT(req: Request) {
    try {
        const body = await req.json()
        const { id, name, company, email, phone, address, status, scoreTemp, purchaseProb, segment, recallDate, anniversary } = body

        if (!id) {
            return NextResponse.json({ error: "Customer ID required" }, { status: 400 })
        }

        const record = await prisma.customer.findUnique({ where: { id }, select: { branchId: true } })
        if (!record) return NextResponse.json({ error: "Musteri bulunamadi" }, { status: 404 })

        const auth = await requirePermission("customers", "update", record.branchId)
        if (auth instanceof NextResponse) return auth

        const customer = await prisma.customer.update({
            where: { id },
            data: {
                name: name || undefined,
                company: company !== undefined ? company : undefined,
                email: email !== undefined ? email : undefined,
                phone: phone !== undefined ? phone : undefined,
                address: address !== undefined ? address : undefined,
                status: status !== undefined ? status : undefined,
                scoreTemp: scoreTemp !== undefined ? scoreTemp : undefined,
                purchaseProb: purchaseProb !== undefined ? parseInt(purchaseProb) : undefined,
                segment: segment !== undefined ? segment : undefined,
                recallDate: recallDate !== undefined ? (recallDate ? new Date(recallDate) : null) : undefined,
                anniversary: anniversary !== undefined ? (anniversary ? new Date(anniversary) : null) : undefined
            },
        })

        return NextResponse.json(customer)
    } catch (error) {
        console.error("Error updating customer:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

