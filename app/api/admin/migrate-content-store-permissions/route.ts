import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getAuthPayload, isSuperAdminUser } from "@/lib/auth/server-permission"

const CONTENT_STORE_PERMISSIONS: Record<string, string[]> = {
  icerik_magazasi_yukle:    ["read", "create", "update", "delete"],
  icerik_magazasi_sil:      ["read", "create", "update", "delete"],
  icerik_magazasi_onayla:   ["read", "create", "update", "delete"],
  icerik_magazasi_toplu:    ["read", "create", "update", "delete"],
  icerik_magazasi_analitik: ["read", "create", "update", "delete"],
}

const ADMIN_ROLE_NAMES = ["Super Admin", "Yonetim Kurulu Uyesi", "Genel Mudur"]

export async function POST() {
  const payload = await getAuthPayload()
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const isAdmin = await isSuperAdminUser(payload.userId)
  if (!isAdmin) return NextResponse.json({ error: "Sadece Super Admin" }, { status: 403 })
  try {
    const adminRoles = await prisma.role.findMany({ where: { name: { in: ADMIN_ROLE_NAMES } } })
    const results: { role: string; added: number; status: string }[] = []
    for (const role of adminRoles) {
      let currentPerms: Record<string, string[]> = {}
      try { currentPerms = JSON.parse(role.permissions) } catch { currentPerms = {} }
      const mergedPerms = { ...currentPerms }
      let addedCount = 0
      for (const [resource, actions] of Object.entries(CONTENT_STORE_PERMISSIONS)) {
        if (!mergedPerms[resource]) { mergedPerms[resource] = actions; addedCount++ }
        else {
          const existingActions = new Set(mergedPerms[resource])
          const newActions = actions.filter((a) => !existingActions.has(a))
          if (newActions.length > 0) { mergedPerms[resource] = [...mergedPerms[resource], ...newActions]; addedCount++ }
        }
      }
      if (addedCount > 0) {
        await prisma.role.update({ where: { id: role.id }, data: { permissions: JSON.stringify(mergedPerms) } })
        results.push({ role: role.name, added: addedCount, status: "updated" })
      } else {
        results.push({ role: role.name, added: 0, status: "already_up_to_date" })
      }
    }
    return NextResponse.json({ success: true, message: "Content Store izinleri guncellendi", results })
  } catch (err: any) {
    console.error("Migration error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
