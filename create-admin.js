const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');

async function main() {
  const hashedPassword = await bcrypt.hash('feride123', 10);
  const user = await prisma.user.create({
    data: {
      username: 'maximus',
      email: 'admin@cicekana.com',
      password: hashedPassword,
      fullName: 'Maximus Promeks',
      isActive: true
    }
  });
  console.log('Kullanıcı başarıyla oluşturuldu:', user.username);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
