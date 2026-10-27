import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    const email = 'sinasnmedya@gmail.com'
    const password = '123456'

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
        where: { username: 'admin2' }
    })

    if (existingUser) {
        console.log('✅ Kullanıcı zaten mevcut:', email)
        return
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const user = await prisma.user.create({
        data: {
            username: 'admin2',
            email,
            password: hashedPassword,
            fullName: 'Admin User',
            phone: '+90 555 123 4567',
            isActive: true,
        }
    })

    console.log('✅ Kullanıcı oluşturuldu:', user.email)
    console.log('📧 Email:', email)
    console.log('🔑 Şifre:', password)

    // Create a default branch
    const branch = await prisma.branch.create({
        data: {
            name: 'Ana Şube',
            code: 'ANA001',
            address: 'İstanbul',
            phone: '+90 212 123 4567',
            email: 'ana@sube.com',
            isActive: true,
        }
    })

    console.log('✅ Şube oluşturuldu:', branch.name)

    // Create a default role
    const role = await prisma.role.create({
        data: {
            name: 'Admin',
            description: 'Yönetici rolü',
            permissions: JSON.stringify({
                canManageUsers: true,
                canManageBranches: true,
                canViewReports: true,
                canManageOrders: true,
                canManageProjects: true,
            })
        }
    })

    console.log('✅ Rol oluşturuldu:', role.name)

    // Assign user to branch with role
    await prisma.userBranchRole.create({
        data: {
            userId: user.id,
            branchId: branch.id,
            roleId: role.id,
        }
    })

    console.log('✅ Kullanıcı şubeye atandı')
}

main()
    .catch((e) => {
        console.error('❌ Hata:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
