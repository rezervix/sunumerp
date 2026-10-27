const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getUsers() {
    const users = await prisma.user.findMany({
        select: { username: true, isActive: true, branches: true }
    });
    console.log(JSON.stringify(users, null, 2));
}

getUsers().catch(console.error).finally(() => prisma.$disconnect());
