const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()

async function main() {
  try {
    const c = await prisma.lead.count()
    console.log("SUCCESS! Lead count:", c)
  } catch (err) {
    console.error("CONNECTION FAILED:", err)
  } finally {
    await prisma.$disconnect()
  }
}

main()
