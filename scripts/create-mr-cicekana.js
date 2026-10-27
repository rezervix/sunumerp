const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Seeding cicekana.dev admin user...')

    // Hash password
    const hashedPassword = await bcrypt.hash('admin', 10)

    // Upsert user
    const user = await prisma.user.upsert({
        where: { username: 'cicekana.dev' },
        update: {
            password: hashedPassword,
            isActive: true,
            fullName: 'Çiçekana Admin' // Make sure full name is set
        },
        create: {
            username: 'cicekana.dev',
            email: 'admin@cicekana.local',
            password: hashedPassword,
            fullName: 'Çiçekana Admin',
            phone: '+90 555 000 0000',
            isActive: true,
        }
    })

    console.log('✅ User cicekana.dev created/updated.')

    // Get Super Admin role
    let role = await prisma.role.findUnique({ where: { name: 'Super Admin' } })
    if (!role) {
        role = await prisma.role.create({
            data: {
                name: 'Super Admin',
                description: 'Full system access',
                permissions: JSON.stringify({
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
                })
            }
        })
    }
    console.log('✅ Super Admin role verified.')

    // Get default branch
    let branch = await prisma.branch.findFirst({ where: { code: 'HQ' } })
    if (!branch) {
        branch = await prisma.branch.findFirst()
        if (!branch) {
            branch = await prisma.branch.create({
                data: {
                    name: 'Merkez HQ',
                    code: 'HQ',
                    isActive: true,
                }
            })
        }
    }
    console.log(`✅ Default branch found/created: ${branch.name}`)

    // Assign role to user for branch
    const existingRole = await prisma.userBranchRole.findFirst({
        where: {
            userId: user.id,
            branchId: branch.id
        }
    })

    if (!existingRole) {
        await prisma.userBranchRole.create({
            data: {
                userId: user.id,
                branchId: branch.id,
                roleId: role.id,
            }
        })
        console.log(`✅ Super Admin role assigned to mr.cicekana at branch ${branch.name}`)
    } else if (existingRole.roleId !== role.id) {
        await prisma.userBranchRole.update({
            where: { id: existingRole.id },
            data: { roleId: role.id }
        })
        console.log(`✅ Super Admin role fixed for mr.cicekana at branch ${branch.name}`)
    } else {
        console.log(`✅ mr.cicekana already has Super Admin at branch ${branch.name}`)
    }

    console.log('🎉 Done!')
}

main()
    .catch((e) => {
        console.error('❌ Error executing seed:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
