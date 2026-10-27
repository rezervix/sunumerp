import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { cookies } from "next/headers"
import { jwtVerify } from "jose"

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-change-this"

// Resource isimleri (1A ile belirlendi)
const ROLE_PERMISSIONS: Record<string, Record<string, string[]>> = {
  "Super Admin": {
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
  },
  "Saha Satis": {
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
  },
  "Muhasebe": {
    dashboard: ["read"],
    financial: ["read", "create", "update", "delete"],
    orders: ["read"],
    customers: ["read"],
    files: ["read", "create"],
    notlarim: ["read", "create", "update", "delete"],
    chat: ["read", "create"],
    duyurular: ["read"],
  },
  "IK Personeli": {
    dashboard: ["read"],
    hr: ["read", "create", "update", "delete"],
    files: ["read", "create", "update"],
    notlarim: ["read", "create", "update", "delete"],
    chat: ["read", "create"],
    duyurular: ["read"],
  },
  "Depo Lojistik": {
    dashboard: ["read"],
    cargo: ["read", "create", "update", "delete"],
    orders: ["read", "update"],
    magaza: ["read"],
    files: ["read", "create"],
    duyurular: ["read"],
  },
}

export async function GET(req: Request) {
  // Sadece Super Admin çalıştırabilir
  const cookieStore = await cookies()
  const token = cookieStore.get("auth-token")?.value
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const secret = new TextEncoder().encode(JWT_SECRET)
    await jwtVerify(token, secret)
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const results: string[] = []

  for (const [roleName, permissions] of Object.entries(ROLE_PERMISSIONS)) {
    const existing = await prisma.role.findUnique({ where: { name: roleName } })

    if (existing) {
      await prisma.role.update({
        where: { name: roleName },
        data: { permissions: JSON.stringify(permissions) },
      })
      results.push(`✅ ${roleName} güncellendi`)
    } else {
      await prisma.role.create({
        data: {
          name: roleName,
          description: `${roleName} rolü`,
          permissions: JSON.stringify(permissions),
        },
      })
      results.push(`🆕 ${roleName} oluşturuldu`)
    }
  }

  // Modülleri seed etme
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
    const existingMod = await prisma.module.findUnique({ where: { key: m.key } })
    if (existingMod) {
      await prisma.module.update({
        where: { key: m.key },
        data: { label: m.label, sortOrder: m.sortOrder }
      })
    } else {
      await prisma.module.create({
        data: { key: m.key, label: m.label, sortOrder: m.sortOrder }
      })
    }
  }
  results.push(`✅ ${defaultModules.length} modül migrate edildi`)

  const allRoles = await prisma.role.findMany({ orderBy: { name: "asc" } })

  return NextResponse.json({
    message: "Migration tamamlandı",
    results,
    roles: allRoles.map(r => ({
      name: r.name,
      permissionKeys: Object.keys(
        typeof r.permissions === "string" ? JSON.parse(r.permissions) : (r.permissions as any)
      ),
    })),
  })
}
