/**
 * FAZ 1C — Rol permissions güncelleme script'i
 * Çalıştırmak için: node scripts/update-roles.js
 */
require('dotenv').config()
const { Client } = require('pg')

const connectionString = process.env.DATABASE_URL

// Resource isimleri (1A ile belirlendi)
const SAHA_SATIS_PERMISSIONS = {
  dashboard: ["read"],
  takvim: ["read", "create", "update", "delete"],
  orders: ["read", "create", "update"],
  magaza: ["read"],
  customers: ["read", "create", "update"],
  leads: ["read", "create", "update"],
  cargo: ["read"],
  yapilacaklar: ["read", "create", "update", "delete"],
  notlarim: ["read", "create", "update", "delete"],
  chat: ["read", "create"],
  duyurular: ["read"],
}

const SUPER_ADMIN_PERMISSIONS = {
  dashboard: ["read", "create", "update", "delete"],
  takvim: ["read", "create", "update", "delete"],
  orders: ["read", "create", "update", "delete", "approve"],
  magaza: ["read", "create", "update", "delete"],
  customers: ["read", "create", "update", "delete"],
  hr: ["read", "create", "update", "delete"],
  projects: ["read", "create", "update", "delete"],
  leads: ["read", "create", "update", "delete"],
  cargo: ["read", "create", "update", "delete"],
  files: ["read", "create", "update", "delete"],
  yapilacaklar: ["read", "create", "update", "delete"],
  notlarim: ["read", "create", "update", "delete"],
  hesaplama: ["read", "create", "update", "delete"],
  financial: ["read", "create", "update", "delete"],
  "sosyal-medya": ["read", "create", "update", "delete"],
  chat: ["read", "create", "update", "delete"],
  duyurular: ["read", "create", "update", "delete"],
  branches: ["read", "create", "update", "delete", "manage_all"],
  users: ["read", "create", "update", "delete", "assign_roles"],
}

const MUHASEBE_PERMISSIONS = {
  dashboard: ["read"],
  financial: ["read", "create", "update", "delete"],
  orders: ["read"],
  customers: ["read"],
  files: ["read", "create"],
  notlarim: ["read", "create", "update", "delete"],
  chat: ["read", "create"],
  duyurular: ["read"],
}

const IK_PERMISSIONS = {
  dashboard: ["read"],
  hr: ["read", "create", "update", "delete"],
  files: ["read", "create", "update"],
  notlarim: ["read", "create", "update", "delete"],
  chat: ["read", "create"],
  duyurular: ["read"],
}

const DEPO_PERMISSIONS = {
  dashboard: ["read"],
  cargo: ["read", "create", "update", "delete"],
  orders: ["read", "update"],
  magaza: ["read"],
  files: ["read", "create"],
  duyurular: ["read"],
}

async function main() {
  const client = new Client({ connectionString })
  await client.connect()
  console.log('✅ Veritabanına bağlandı')

  try {
    // Mevcut rolleri listele
    const { rows: existingRoles } = await client.query('SELECT id, name FROM "Role"')
    console.log('Mevcut roller:', existingRoles.map(r => r.name))

    // Super Admin güncelle
    const superAdminRow = existingRoles.find(r => r.name === 'Super Admin')
    if (superAdminRow) {
      await client.query(
        'UPDATE "Role" SET permissions = $1 WHERE id = $2',
        [JSON.stringify(SUPER_ADMIN_PERMISSIONS), superAdminRow.id]
      )
      console.log('✅ Super Admin permissions güncellendi')
    }

    // Saha Satis rolü — varsa güncelle, yoksa oluştur
    const sahaSatisRow = existingRoles.find(r =>
      r.name === 'Saha Satis' || r.name === 'Field Staff' || r.name === 'Saha Satış'
    )
    if (sahaSatisRow) {
      await client.query(
        'UPDATE "Role" SET name = $1, permissions = $2, description = $3 WHERE id = $4',
        ['Saha Satis', JSON.stringify(SAHA_SATIS_PERMISSIONS), 'Saha satış personeli', sahaSatisRow.id]
      )
      console.log('✅ Saha Satis permissions güncellendi')
    } else {
      await client.query(
        'INSERT INTO "Role" (id, name, description, permissions) VALUES (gen_random_uuid(), $1, $2, $3)',
        ['Saha Satis', 'Saha satış personeli', JSON.stringify(SAHA_SATIS_PERMISSIONS)]
      )
      console.log('✅ Saha Satis rolü oluşturuldu')
    }

    // Muhasebe rolü — varsa güncelle, yoksa oluştur
    const muhasebeRow = existingRoles.find(r => r.name === 'Muhasebe' || r.name === 'Accountant')
    if (muhasebeRow) {
      await client.query(
        'UPDATE "Role" SET name = $1, permissions = $2, description = $3 WHERE id = $4',
        ['Muhasebe', JSON.stringify(MUHASEBE_PERMISSIONS), 'Muhasebe personeli', muhasebeRow.id]
      )
      console.log('✅ Muhasebe permissions güncellendi')
    } else {
      await client.query(
        'INSERT INTO "Role" (id, name, description, permissions) VALUES (gen_random_uuid(), $1, $2, $3)',
        ['Muhasebe', 'Muhasebe personeli', JSON.stringify(MUHASEBE_PERMISSIONS)]
      )
      console.log('✅ Muhasebe rolü oluşturuldu')
    }

    // IK Personeli rolü
    const ikRow = existingRoles.find(r => r.name === 'IK Personeli' || r.name === 'İK Personeli')
    if (ikRow) {
      await client.query(
        'UPDATE "Role" SET name = $1, permissions = $2, description = $3 WHERE id = $4',
        ['IK Personeli', JSON.stringify(IK_PERMISSIONS), 'İnsan Kaynakları personeli', ikRow.id]
      )
      console.log('✅ IK Personeli permissions güncellendi')
    } else {
      await client.query(
        'INSERT INTO "Role" (id, name, description, permissions) VALUES (gen_random_uuid(), $1, $2, $3)',
        ['IK Personeli', 'İnsan Kaynakları personeli', JSON.stringify(IK_PERMISSIONS)]
      )
      console.log('✅ IK Personeli rolü oluşturuldu')
    }

    // Depo / Lojistik rolü
    const depoRow = existingRoles.find(r => r.name === 'Depo Lojistik' || r.name === 'Depo / Lojistik')
    if (depoRow) {
      await client.query(
        'UPDATE "Role" SET name = $1, permissions = $2, description = $3 WHERE id = $4',
        ['Depo Lojistik', JSON.stringify(DEPO_PERMISSIONS), 'Depo ve lojistik personeli', depoRow.id]
      )
      console.log('✅ Depo Lojistik permissions güncellendi')
    } else {
      await client.query(
        'INSERT INTO "Role" (id, name, description, permissions) VALUES (gen_random_uuid(), $1, $2, $3)',
        ['Depo Lojistik', 'Depo ve lojistik personeli', JSON.stringify(DEPO_PERMISSIONS)]
      )
      console.log('✅ Depo Lojistik rolü oluşturuldu')
    }

    // Sonuç kontrolü
    const { rows: updatedRoles } = await client.query('SELECT name, permissions FROM "Role" ORDER BY name')
    console.log('\n📋 Güncellenmiş roller:')
    updatedRoles.forEach(r => {
      const perms = typeof r.permissions === 'string' ? JSON.parse(r.permissions) : r.permissions
      console.log(`  ${r.name}: ${Object.keys(perms).join(', ')}`)
    })

  } finally {
    await client.end()
    console.log('\n✅ Bağlantı kapatıldı')
  }
}

main().catch(err => {
  console.error('❌ Hata:', err)
  process.exit(1)
})
