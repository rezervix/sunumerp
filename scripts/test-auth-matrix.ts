import { prisma } from "../lib/db"
import { isPlatformDeveloperUser, isSuperAdminUser } from "../lib/auth/server-permission"
import { SignJWT } from "jose"

const JWT_SECRET = process.env.JWT_SECRET || "Cicekanamurat47MC"

async function createToken(userId: string, username: string, branchId?: string) {
  const secret = new TextEncoder().encode(JWT_SECRET)
  return await new SignJWT({ userId, username, branchId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("1h")
    .sign(secret)
}

async function runAuthMatrixTests() {
  console.log("=== AUTHORIZATION & API SECURITY INTEGRATION TEST MATRIX ===")

  // 1. Veritabanından mevcut kullanıcıları çek
  const users = await prisma.user.findMany({
    take: 10,
    include: {
      branches: {
        include: { role: true, branch: true }
      }
    }
  })

  console.log(`Toplam bulunan test kullanıcısı sayısı: ${users.length}`)

  let superAdminUser = users.find(u => u.branches.some(b => b.role?.name === "Super Admin"))
  let devUser = users.find(u => u.branches.some(b => ["Platform Developer", "Developer", "Geliştirici"].includes(b.role?.name || "")))
  let normalUser = users.find(u => !u.branches.some(b => ["Super Admin", "Platform Developer", "Developer", "Geliştirici"].includes(b.role?.name || "")))

  console.log("Kullanıcı Rol Eşleşmeleri:")
  console.log("  - Super Admin:", superAdminUser?.username || "Bulunamadı (Mevcut değilse simüle edilecek)")
  console.log("  - Platform Developer:", devUser?.username || "Bulunamadı (Mevcut değilse simüle edilecek)")
  console.log("  - Normal Kullanıcı:", normalUser?.username || "Bulunamadı")

  // Mock test verileri
  const testScenarios = [
    { name: "Oturumsuz (Anonim)", userId: "anon-id", username: "anonymous", expectedDev: false, expectedSA: false },
    { name: "Normal Kullanıcı", userId: normalUser?.id || "normal-id", username: normalUser?.username || "normaluser", expectedDev: false, expectedSA: false },
    { name: "Super Admin", userId: superAdminUser?.id || "sa-id", username: superAdminUser?.username || "superadmin", expectedDev: false, expectedSA: true },
    { name: "Platform Developer", userId: devUser?.id || "dev-id", username: devUser?.username || "cicekana.dev", expectedDev: true, expectedSA: false },
  ]

  console.log("\n--- SERVER-SIDE GUARD PERMISSION VERIFICATION ---")
  for (const sc of testScenarios) {
    const isDev = await isPlatformDeveloperUser(sc.userId, sc.username)
    const isSA = await isSuperAdminUser(sc.userId)
    
    console.log(`[${sc.name}] -> isPlatformDeveloper: ${isDev} (Beklenen: ${sc.expectedDev}) | isSuperAdmin: ${isSA} (Beklenen: ${sc.expectedSA})`)
  }

  await prisma.$disconnect()
}

runAuthMatrixTests().catch(err => {
  console.error("Test hatası:", err)
  process.exit(1)
})
