import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requirePermission } from "@/lib/auth/server-permission"
import { PRODUCTION_MODULES_CATALOG } from "@/lib/config/production-feature-flags"
import { getServerProductionFeatureFlags } from "@/lib/system-config"

export async function GET(req: Request) {
    // Giriş yapmış kullanıcılara izin verelim
    const auth = await requirePermission("users", "view")
    if (auth instanceof NextResponse) return auth

    try {
        const { searchParams } = new URL(req.url)
        const branchId = searchParams.get("branchId")

        const modules = await prisma.module.findMany({
            orderBy: { sortOrder: "asc" }
        })

        // Özellik bayrakları kontrolü: sadece açık olan üretim modüllerini izin listesine ekle
        const prodFlags = getServerProductionFeatureFlags(branchId)
        const existingKeys = new Set(modules.map((m: { key: string }) => m.key))

        const enabledProductionModules = PRODUCTION_MODULES_CATALOG.filter(
            (pm) => prodFlags[pm.key] && !existingKeys.has(pm.key)
        ).map((pm) => ({
            id: `mod-${pm.key}`,
            key: pm.key,
            label: pm.label,
            sortOrder: pm.sortOrder,
        }))

        return NextResponse.json([...modules, ...enabledProductionModules])
    } catch (error) {
        console.error("Error fetching modules:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
