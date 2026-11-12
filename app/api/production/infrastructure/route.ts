import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import {
  PRODUCTION_PERMISSION_ACTIONS,
  PRODUCTION_PERMISSION_ACTION_LABELS,
} from "@/lib/auth/permissions"
import { getAuthPayload, isSuperAdminUser } from "@/lib/auth/server-permission"
import {
  PRODUCTION_MODULES_CATALOG,
  isAnyProductionFeatureEnabled,
} from "@/lib/config/production-feature-flags"
import {
  handleProductionApiError,
  logProductionAudit,
} from "@/lib/services/productionAuditAndError"
import { getServerProductionFeatureFlags, getSystemConfig } from "@/lib/system-config"
import { isDemoModeActive } from "@/lib/data-controller"
import { mockDatabase } from "@/lib/data/mockDatabase"

export async function GET(req: Request) {
  try {
    if (isDemoModeActive()) {
      return NextResponse.json(mockDatabase.getProductionInfrastructure())
    }

    const payload = await getAuthPayload()
    if (!payload) {
      return NextResponse.json(
        { error: "Oturum açmanız gerekiyor.", code: "UNAUTHORIZED" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(req.url)
    const branchId = searchParams.get("branchId") || payload.branchId || null

    const sysConfig = getSystemConfig()
    const flags = getServerProductionFeatureFlags(branchId)
    const anyFlagEnabled = isAnyProductionFeatureEnabled(sysConfig.featureFlags, branchId)
    const isSuperAdmin = await isSuperAdminUser(payload.userId)

    // Mevcut veritabanındaki üretimle ilişkili gerçek kayıt sayılarını sorgula
    const [
      bomHeaderCount,
      bomComponentCount,
      warehouses,
      inventoryItems,
      recentAuditLogs,
    ] = await Promise.all([
      (prisma as any).bomHeader ? (prisma as any).bomHeader.count() : Promise.resolve(0),
      (prisma as any).bomComponent ? (prisma as any).bomComponent.count() : Promise.resolve(0),
      (prisma as any).warehouse ? (prisma as any).warehouse.findMany() : Promise.resolve([]),
      (prisma as any).inventoryItem
        ? (prisma as any).inventoryItem.findMany()
        : Promise.resolve([]),
      prisma.auditLog.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
      }),
    ])

    const manufacturingWarehouses = Array.isArray(warehouses)
      ? warehouses.filter((w: any) => w.type === "MANUFACTURING" || w.code?.includes("ATL"))
      : []

    const rawMaterialCount = Array.isArray(inventoryItems)
      ? inventoryItems.filter((i: any) => i.itemType === "RAW_MATERIAL").length
      : 0
    const semiFinishedCount = Array.isArray(inventoryItems)
      ? inventoryItems.filter((i: any) => i.itemType === "SEMI_FINISHED").length
      : 0
    const finishedGoodCount = Array.isArray(inventoryItems)
      ? inventoryItems.filter((i: any) => i.itemType === "FINISHED_GOOD").length
      : 0

    const modulesStatus = PRODUCTION_MODULES_CATALOG.map((mod) => ({
      key: mod.key,
      slug: mod.slug,
      href: mod.href,
      label: mod.label,
      menuLabel: mod.menuLabel,
      description: mod.description,
      auditResource: mod.auditResource,
      sortOrder: mod.sortOrder,
      enabled: Boolean(flags[mod.key]),
      permissions: PRODUCTION_PERMISSION_ACTIONS.map((action) => ({
        action,
        label: PRODUCTION_PERMISSION_ACTION_LABELS[action],
        granted: isSuperAdmin ? true : true,
      })),
    }))

    await logProductionAudit({
      userId: payload.userId,
      action: "VIEW",
      resource: "URETIM_ALTYAPI",
      branchId,
      metadata: {
        anyFlagEnabled,
        bomHeaderCount,
      },
    })

    return NextResponse.json({
      success: true,
      branchId,
      anyFlagEnabled,
      flags,
      modules: modulesStatus,
      databaseReadiness: {
        bomHeaderCount,
        bomComponentCount,
        manufacturingWarehouseCount: manufacturingWarehouses.length,
        rawMaterialCount,
        semiFinishedCount,
        finishedGoodCount,
        recentAuditCount: Array.isArray(recentAuditLogs) ? recentAuditLogs.length : 0,
      },
      permissionActions: PRODUCTION_PERMISSION_ACTIONS.map((a) => ({
        key: a,
        label: PRODUCTION_PERMISSION_ACTION_LABELS[a],
      })),
    })
  } catch (err) {
    return handleProductionApiError(err, "Üretim altyapı durumu alınamadı.")
  }
}
