/**
 * scripts/add-content-store-permissions.js
 *
 * Admin rollerine Content Store izinlerini otomatik olarak ekler.
 * Çalıştırma: node scripts/add-content-store-permissions.js
 *
 * Güvenli: Mevcut izinleri korur, sadece eksik olanları ekler.
 */

const { PrismaClient } = require("@prisma/client")

const prisma = new PrismaClient()

// İçerik Mağazası için tüm aksiyonlar
const CONTENT_STORE_PERMISSIONS = {
  icerik_magazasi_yukle:    ["read", "create", "update", "delete"],
  icerik_magazasi_sil:      ["read", "create", "update", "delete"],
  icerik_magazasi_onayla:   ["read", "create", "update", "delete"],
  icerik_magazasi_toplu:    ["read", "create", "update", "delete"],
  icerik_magazasi_analitik: ["read", "create", "update", "delete"],
}

// Bu rollere otomatik olarak tüm Content Store izinleri atanır
const ADMIN_ROLE_NAMES = ["Super Admin", "Yonetim Kurulu Uyesi", "Genel Mudur"]

async function main() {
  console.log("🔐 Content Store izin migrasyonu başlıyor...\n")

  const adminRoles = await prisma.role.findMany({
    where: {
      name: { in: ADMIN_ROLE_NAMES },
    },
  })

  if (adminRoles.length === 0) {
    console.log("⚠️  Hiçbir admin rolü bulunamadı. Atlanıyor.")
    return
  }

  for (const role of adminRoles) {
    // Mevcut izinleri parse et
    let currentPerms = {}
    try {
      currentPerms = JSON.parse(role.permissions)
    } catch {
      console.warn(`⚠️  ${role.name} rolünün izinleri parse edilemedi, boş başlanıyor.`)
    }

    // Yeni izinleri merge et (mevcut izinleri koruyarak)
    const mergedPerms = { ...currentPerms }
    let addedCount = 0

    for (const [resource, actions] of Object.entries(CONTENT_STORE_PERMISSIONS)) {
      if (!mergedPerms[resource]) {
        mergedPerms[resource] = actions
        addedCount++
      } else {
        const existingActions = new Set(mergedPerms[resource])
        const newActions = actions.filter((a) => !existingActions.has(a))
        if (newActions.length > 0) {
          mergedPerms[resource] = [...mergedPerms[resource], ...newActions]
          addedCount++
        }
      }
    }

    if (addedCount > 0) {
      await prisma.role.update({
        where: { id: role.id },
        data: { permissions: JSON.stringify(mergedPerms) },
      })
      console.log(`✅ ${role.name}: ${addedCount} yeni kaynak izni eklendi.`)
    } else {
      console.log(`ℹ️  ${role.name}: Zaten tüm Content Store izinleri mevcut, atlandı.`)
    }
  }

  console.log("\n✅ Content Store izin migrasyonu tamamlandı!")
}

main()
  .catch((err) => {
    console.error("❌ Migrasyon hatası:", err)
    process.exit(1)
  })
  .finally(() => {
    prisma.$disconnect()
  })
