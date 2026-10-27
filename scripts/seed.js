const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

const DEFAULT_ROLES = {
    "Super Admin": {
        branches: ["create", "read", "update", "delete", "manage_all"],
        users: ["create", "read", "update", "delete", "assign_roles"],
        customers: ["create", "read", "update", "delete", "view_all_branches"],
        leads: ["create", "read", "update", "delete", "view_all_branches"],
        financial: ["create", "read", "update", "delete", "view_all_branches"],
        orders: ["create", "read", "update", "delete", "approve", "view_all_branches"],
        files: ["create", "read", "update", "delete", "view_all_branches"],
        reports: ["view_all_branches"],
        settings: ["manage_system", "manage_branches"],
        b2b: ["create", "read", "update", "delete", "approve"],
        cargo: ["create", "read", "update", "delete", "view_all_branches"],
        chat: ["create", "read", "view_all_branches"],
        announcements: ["create", "read", "update", "delete"],
    },
    "Branch Admin": {
        branches: ["read", "update"],
        users: ["create", "read", "update", "assign_roles"],
        customers: ["create", "read", "update", "delete"],
        leads: ["create", "read", "update", "delete", "assign"],
        financial: ["create", "read", "update", "delete"],
        orders: ["create", "read", "update", "approve"],
        files: ["create", "read", "update"],
        reports: ["view_branch"],
        settings: ["manage_branch"],
        b2b: ["read", "create"],
        cargo: ["create", "read", "update"],
        chat: ["create", "read"],
        announcements: ["read"],
        takvim: ["read", "create"],
        ai: ["read", "upload"],
    },
    Employee: {
        branches: ["read"],
        users: ["read"],
        customers: ["create", "read", "update"],
        leads: ["create", "read", "update"],
        financial: ["read"],
        orders: ["create", "read", "update"],
        files: ["create", "read"],
        reports: ["view_own"],
        settings: [],
        b2b: ["read"],
        cargo: ["read"],
        chat: ["create", "read"],
        announcements: ["read"],
        takvim: ["read", "create"],
        ai: ["read"],
    },
    "Field Staff": {
        branches: ["read"],
        users: ["read"],
        customers: ["read", "update"],
        leads: ["create", "read", "update"],
        financial: [],
        orders: ["create", "read"],
        files: ["create", "read"],
        reports: ["view_own"],
        settings: [],
        b2b: ["read"],
        cargo: ["read"],
        chat: ["create", "read"],
        announcements: ["read"],
        takvim: ["read"],
        ai: ["read"],
    },
    Accountant: {
        branches: ["read"],
        users: ["read"],
        customers: ["read"],
        leads: ["read"],
        financial: ["create", "read", "update", "delete"],
        orders: ["read"],
        files: ["read"],
        reports: ["view_branch", "export"],
        settings: [],
        b2b: ["read"],
        cargo: ["read"],
        chat: ["create", "read"],
        announcements: ["read"],
        takvim: ["read"],
        ai: ["read"],
    },
}

async function main() {
    console.log('🌱 Seeding database...')

    // Create roles
    for (const [name, permissions] of Object.entries(DEFAULT_ROLES)) {
        await prisma.role.upsert({
            where: { name },
            update: { permissions: JSON.stringify(permissions) },
            create: {
                name,
                description: `${name} role`,
                permissions: JSON.stringify(permissions),
            },
        })
        console.log(`✅ Role created/updated: ${name}`)
    }

    // Create modules
    const defaultModules = [
        { key: "dashboard", label: "Dashboard", sortOrder: 1 },
        { key: "takvim", label: "Takvim", sortOrder: 2 },
        { key: "orders", label: "Siparişler", sortOrder: 3 },
        { key: "magaza", label: "Mağaza (B2B)", sortOrder: 4 },
        { key: "customers", label: "Müşteriler", sortOrder: 5 },
        { key: "hr", label: "İnsan Kaynakları", sortOrder: 6 },
        { key: "projects", label: "Projeler", sortOrder: 7 },
        { key: "leads", label: "Potansiyeller", sortOrder: 8 },
        { key: "cargo", label: "Kargo", sortOrder: 9 },
        { key: "files", label: "Dosyalar", sortOrder: 10 },
        { key: "yapilacaklar", label: "Yapılacaklar", sortOrder: 11 },
        { key: "notlarim", label: "Notlarım", sortOrder: 12 },
        { key: "hesaplama", label: "Hesaplama Aracı", sortOrder: 13 },
        { key: "financial", label: "Finans", sortOrder: 14 },
        { key: "sosyal-medya", label: "Sosyal Medya", sortOrder: 15 },
        { key: "chat", label: "Chat", sortOrder: 16 },
        { key: "duyurular", label: "Duyurular", sortOrder: 17 },
    ]

    for (const m of defaultModules) {
        await prisma.module.upsert({
            where: { key: m.key },
            update: { label: m.label, sortOrder: m.sortOrder },
            create: { key: m.key, label: m.label, sortOrder: m.sortOrder }
        })
        console.log(`✅ Module seeded: ${m.key}`)
    }

    // Create default branch
    let defaultBranch = await prisma.branch.findFirst({ where: { code: 'HQ' } })
    if (!defaultBranch) {
        defaultBranch = await prisma.branch.create({
            data: {
                name: 'Merkez',
                code: 'HQ',
                managerFullName: 'Admin Kullanıcı',
            },
        })
        console.log('✅ Default branch created: Merkez (HQ)')
    }

    // Create admin user
    const adminPassword = await bcrypt.hash('Admin123!', 10)
    let adminUser = await prisma.user.findUnique({ where: { username: 'admin' } })
    if (!adminUser) {
        adminUser = await prisma.user.create({
            data: {
                username: 'admin',
                fullName: 'Sistem Yöneticisi',
                email: 'admin@sistem.local',
                password: adminPassword,
                isActive: true,
            },
        })
        console.log('✅ Admin user created: admin / Admin123!')
    }

    // Assign Super Admin role
    const superAdminRole = await prisma.role.findUnique({ where: { name: 'Super Admin' } })
    if (superAdminRole && adminUser && defaultBranch) {
        const existing = await prisma.userBranchRole.findFirst({
            where: { userId: adminUser.id, branchId: defaultBranch.id }
        })
        if (!existing) {
            await prisma.userBranchRole.create({
                data: {
                    userId: adminUser.id,
                    branchId: defaultBranch.id,
                    roleId: superAdminRole.id,
                },
            })
            console.log('✅ Super Admin role assigned to admin')
        }
    }

    console.log('🎉 Seeding complete!')
}

main()
    .catch((e) => {
        console.error('❌ Seed error:', e)
        process.exit(1)
    })
    .finally(() => prisma.$disconnect())
