import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { requirePermission, isSuperAdminUser } from "@/lib/auth/server-permission";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get("branchId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const auth = await requirePermission("finance", "view", branchId || undefined);
    if (auth instanceof NextResponse) return auth;

    try {
        let whereClause: any = {};

        if (branchId) {
            whereClause.branchId = branchId;
        }

        if (startDate || endDate) {
            whereClause.date = {};
            if (startDate) whereClause.date.gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                whereClause.date.lte = end;
            }
        }

        const finances = await prisma.finance.findMany({
            where: whereClause,
            orderBy: { date: 'desc' },
            include: { branch: true }
        });

        return NextResponse.json(finances);
    } catch (error) {
        console.error("Error fetching finances:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { branchId, type, amount, category, description, receiptUrl, date } = body;

        if (!branchId || !type || amount === undefined || !category) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const auth = await requirePermission("finance", "create", branchId);
        if (auth instanceof NextResponse) return auth;

        const validTypes = ["INCOME", "EXPENSE", "DEBT", "EXPECTED_PAYMENT"];
        if (!validTypes.includes(type)) {
            return NextResponse.json({ error: "Invalid transaction type" }, { status: 400 });
        }

        const isSuperAdmin = await isSuperAdminUser(auth.payload.userId);

        const finance = await prisma.finance.create({
            data: {
                branchId,
                type,
                amount: parseFloat(amount),
                category,
                description,
                receiptUrl,
                status: isSuperAdmin ? "approved" : "pending",
                approvedBy: isSuperAdmin ? auth.payload.userId : null,
                date: date ? new Date(date) : new Date()
            }
        });

        return NextResponse.json(finance, { status: 201 });
    } catch (error) {
        console.error("Error creating finance:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const body = await req.json();
        const { id, status } = body;

        if (!id || !status) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const financeRecord = await prisma.finance.findUnique({ where: { id } });
        if (!financeRecord) return NextResponse.json({ error: "Not found" }, { status: 404 });

        const auth = await requirePermission("finance", "update", financeRecord.branchId);
        if (auth instanceof NextResponse) return auth;

        const isSuperAdmin = await isSuperAdminUser(auth.payload.userId);
        if (!isSuperAdmin) {
            return NextResponse.json({ error: "Sadece Super Admin onay verebilir" }, { status: 403 });
        }

        const finance = await prisma.finance.update({
            where: { id },
            data: {
                status,
                approvedBy: status === 'approved' ? auth.payload.userId : null
            }
        });

        await createAuditLog({
            userId: auth.payload.userId,
            action: status === 'approved' ? 'APPROVE' : 'REJECT',
            resource: 'FINANCE',
            resourceId: id,
            details: { previousStatus: 'pending', newStatus: status }
        });

        return NextResponse.json(finance);
    } catch (error) {
        console.error("Error updating finance:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "Finance ID required" }, { status: 400 });
        }

        const finance = await prisma.finance.findUnique({ where: { id } });
        if (!finance) return NextResponse.json({ error: "Not found" }, { status: 404 });

        const auth = await requirePermission("finance", "delete", finance.branchId);
        if (auth instanceof NextResponse) return auth;

        await prisma.finance.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting finance:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

