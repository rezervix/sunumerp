import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"
import { createAuditLog } from "@/lib/audit"
import { requirePermission, isSuperAdminUser } from "@/lib/auth/server-permission"

export async function GET(req: Request) {
    const auth = await requirePermission("users", "view")
    if (auth instanceof NextResponse) return auth

    const { searchParams } = new URL(req.url)
    const take = parseInt(searchParams.get("take") || "50")
    const skip = parseInt(searchParams.get("skip") || "0")

    try {
        const [users, total] = await Promise.all([
            prisma.user.findMany({
                include: {
                    branches: {
                        include: {
                            branch: true,
                            role: true,
                        },
                    },
                },
                orderBy: { fullName: "asc" },
                take,
                skip,
            }),
            prisma.user.count(),
        ])

        const formattedUsers = users.map((u) => ({
            id: u.id,
            username: u.username,
            fullName: u.fullName,
            email: u.email,
            phone: u.phone,
            isActive: u.isActive,
            department: u.department,
            position: u.position,
            createdAt: u.createdAt,
            branches: (u.branches || []).map((ub) => ({
                branchId: ub.branchId,
                branchName: ub.branch?.name || "",
                roleName: ub.role?.name || "",
                roleColor: ub.branch?.themeColor || "#3B82F6",
            })),
        }))

        return NextResponse.json({ data: formattedUsers, total, page: Math.floor(skip / take) + 1, pageSize: take })
    } catch (error) {
        console.error("Error fetching users:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

export async function POST(req: Request) {
    const auth = await requirePermission("users", "create")
    if (auth instanceof NextResponse) return auth

    try {
        const body = await req.json()
        const { action } = body

        // Create new user
        if (action === "create") {
            const { username, fullName, password, email, phone, department, position, branchId, roleName } = body

            if (!username || !fullName || !password) {
                return NextResponse.json({ error: "Kullanıcı adı, ad soyad ve şifre zorunludur" }, { status: 400 })
            }

            const existing = await prisma.user.findUnique({ where: { username } })
            if (existing) {
                return NextResponse.json({ error: "Bu kullanıcı adı zaten kullanılıyor" }, { status: 400 })
            }

            const hashedPassword = await bcrypt.hash(password, 10)
            const newUser = await prisma.user.create({
                data: { username, fullName, password: hashedPassword, email, phone, department, position },
            })

            // If branchId and roleName are provided, assign the role immediately
            if (branchId && roleName) {
                const role = await prisma.role.findUnique({ where: { name: roleName } })
                if (role) {
                    await prisma.userBranchRole.create({
                        data: { userId: newUser.id, branchId, roleId: role.id },
                    })
                }
            }

            await createAuditLog({
                userId: auth.payload.userId,
                action: 'CREATE',
                resource: 'USER',
                resourceId: newUser.id,
                details: { username, fullName, branchId, roleName }
            });

            return NextResponse.json({ success: true, user: { id: newUser.id, username: newUser.username } })
        }

        // Create a custom role with given permissions
        if (action === "create-role") {
            const { name, permissions } = body
            if (!name || !permissions) {
                return NextResponse.json({ error: "Rol adı ve izinler zorunludur" }, { status: 400 })
            }
            // Check if role with same name already exists; if so, update it
            const existingRole = await prisma.role.findUnique({ where: { name } })
            let role
            if (existingRole) {
                role = await prisma.role.update({
                    where: { name },
                    data: { permissions: JSON.stringify(permissions) },
                })
            } else {
                role = await prisma.role.create({
                    data: { name, description: "Özel rol", permissions: JSON.stringify(permissions) },
                })
            }
            return NextResponse.json({ roleName: role.name, roleId: role.id })
        }

        // Assign role to user for a branch
        const { userId, branchId, roleName } = body

        if (!userId || !branchId || !roleName) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        const role = await prisma.role.findUnique({ where: { name: roleName } })
        if (!role) {
            return NextResponse.json({ error: "Role not found" }, { status: 400 })
        }

        const existing = await prisma.userBranchRole.findUnique({
            where: { userId_branchId: { userId, branchId } },
        })

        if (existing) {
            await prisma.userBranchRole.update({
                where: { id: existing.id },
                data: { roleId: role.id },
            })
        } else {
            await prisma.userBranchRole.create({
                data: { userId, branchId, roleId: role.id },
            })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error in users POST:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

export async function PUT(req: Request) {
    const auth = await requirePermission("users", "update")
    if (auth instanceof NextResponse) return auth

    try {
        const body = await req.json()
        const { id, fullName, email, phone, isActive, password } = body

        if (!id) {
            return NextResponse.json({ error: "User ID required" }, { status: 400 })
        }

        const updateData: {
            fullName?: string
            email?: string
            phone?: string
            isActive?: boolean
            password?: string
        } = {}
        if (fullName !== undefined) updateData.fullName = fullName
        if (email !== undefined) updateData.email = email
        if (phone !== undefined) updateData.phone = phone
        if (isActive !== undefined) updateData.isActive = isActive
        if (password) {
            updateData.password = await bcrypt.hash(password, 10)
        }

        const updated = await prisma.user.update({ where: { id }, data: updateData })

        // Şifre değiştiğinde veya pasife çekildiğinde oturumları kapat
        if (isActive === false || password) {
            await prisma.userSession.updateMany({
                where: { userId: id, isActive: true },
                data: { isActive: false, revokedAt: new Date() }
            })
        }

        await createAuditLog({
            userId: auth.payload.userId,
            action: 'UPDATE',
            resource: 'USER',
            resourceId: id,
            details: { updatedFields: Object.keys(updateData) }
        });

        return NextResponse.json({ user: { id: updated.id, fullName: updated.fullName } })
    } catch (error) {
        console.error("Error updating user:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

export async function DELETE(req: Request) {
    const auth = await requirePermission("users", "delete")
    if (auth instanceof NextResponse) return auth

    try {
        const { searchParams } = new URL(req.url)
        const id = searchParams.get("id")

        if (!id) {
            return NextResponse.json({ error: "User ID required" }, { status: 400 })
        }

        // Soft delete – deactivate instead of hard delete
        await prisma.user.update({ where: { id }, data: { isActive: false } })

        await createAuditLog({
            userId: auth.payload.userId,
            action: 'DEACTIVATE',
            resource: 'USER',
            resourceId: id
        });

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error deactivating user:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

