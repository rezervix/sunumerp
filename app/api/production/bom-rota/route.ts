import { NextResponse } from "next/server"
import { checkPermission, getAuthPayload, isSuperAdminUser } from "@/lib/auth/server-permission"
import { normalizePermissionAction, normalizePermissionResource } from "@/lib/auth/permissions"
import { getServerProductionFeatureFlags, getSystemConfig } from "@/lib/system-config"
import { DEBUG_USER_ID } from "@/lib/auth/local-debug"
import {
  ProductionDomainError,
  handleProductionApiError,
  logProductionAudit,
} from "@/lib/services/productionAuditAndError"
import {
  addBomItemToDb,
  addBomSubstituteInDb,
  addOperationToRoutingInDb,
  approveBomInDb,
  cloneBomAsNewRevisionInDb,
  compareBomRevisionsFromDb,
  createBomInDb,
  createRoutingInDb,
  deleteBomInDb,
  deleteBomItemInDb,
  deleteBomSubstituteInDb,
  deleteOperationInDb,
  getBomByIdFromDb,
  getExplodedBomFromDb,
  getRoutingByIdFromDb,
  getWhereUsedFromDb,
  listBomsFromDb,
  listRoutingsFromDb,
  recalculateBomCostInDb,
  updateBomInDb,
  updateBomItemInDb,
  updateOperationInDb,
} from "@/lib/services/productionBomRotaServerDb"
import {
  generateBomCsvContent,
  parseBomCsvContent,
} from "@/lib/services/productionBomRotaEngine"

/**
 * BOM & Rota özellikleri için yetki ve özellik bayrağı (feature flag) denetimi.
 */
export async function verifyProductionBomRotaAccess(params: {
  userId: string
  branchId?: string | null
  action: "read" | "create" | "update" | "delete" | "approve"
}) {
  const flags = getServerProductionFeatureFlags(params.branchId)
  if (!flags.uretim_bom_rota) {
    throw new ProductionDomainError(
      "FEATURE_DISABLED",
      "Ürün Reçeteleri ve Rotalar (BOM) modülü özellik bayrağı kapalıdır.",
      undefined,
      403
    )
  }

  if (params.userId === DEBUG_USER_ID && process.env.NODE_ENV !== "production") {
    return true
  }

  const isSuper = await isSuperAdminUser(params.userId)
  if (isSuper) return true

  const normRes = normalizePermissionResource("uretim_bom_rota")
  const normAct = normalizePermissionAction(params.action)

  const grantedSpecific = await checkPermission(
    params.userId,
    params.branchId || undefined,
    normRes,
    normAct
  )
  if (grantedSpecific) return true

  const grantedGeneral = await checkPermission(
    params.userId,
    params.branchId || undefined,
    "uretim",
    normAct
  )
  if (grantedGeneral) return true

  throw new ProductionDomainError(
    "FORBIDDEN",
    `Bu reçete/rota işlemi için yetkiniz bulunmamaktadır (${normRes}:${normAct}).`,
    undefined,
    403
  )
}

async function resolveAuth(request: Request) {
  const payload = await getAuthPayload()
  if (payload) return payload

  if (process.env.NODE_ENV !== "production") {
    const debugHeader = request.headers.get("x-user-id")
    if (debugHeader) {
      return {
        userId: debugHeader,
        username: "Debug User",
        email: "debug@sunumerp.local",
        role: "Super Admin",
        branchId: null,
      }
    }
  }
  return null
}

import { isDemoModeActive } from "@/lib/data-controller"
import { mockDatabase } from "@/lib/data/mockDatabase"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    if (isDemoModeActive()) {
      const section = searchParams.get("section") || "boms"
      if (section === "routings") return NextResponse.json(mockDatabase.getProductionRoutings())
      if (section === "bom_detail") {
        const id = searchParams.get("id") || undefined
        return NextResponse.json(mockDatabase.getProductionBomDetail(id))
      }
      return NextResponse.json(mockDatabase.getProductionBoms())
    }

    const branchId = searchParams.get("branchId") || null
    const flags = getServerProductionFeatureFlags(branchId)

    // Özellik bayrağı kontrolü
    if (!flags.uretim_bom_rota) {
      return NextResponse.json(
        {
          success: false,
          error: "Ürün Reçeteleri ve Rotalar (BOM) modülü devre dışıdır (özellik bayrağı kapalı).",
          code: "FEATURE_DISABLED",
        },
        { status: 403 }
      )
    }

    const auth = await resolveAuth(request)
    if (!auth) {
      return NextResponse.json(
        { success: false, error: "Oturum açmanız gerekiyor.", code: "UNAUTHORIZED" },
        { status: 401 }
      )
    }

    await verifyProductionBomRotaAccess({
      userId: auth.userId,
      branchId,
      action: "read",
    })

    const section = searchParams.get("section") || "boms"

    // 1. Reçete Listesi
    if (section === "boms") {
      const data = await listBomsFromDb({
        branchId,
        finishedItemId: searchParams.get("finishedItemId") || undefined,
        status: searchParams.get("status") || undefined,
        search: searchParams.get("search") || undefined,
        isPhantom: searchParams.get("isPhantom") || undefined,
        page: searchParams.get("page") || "1",
        pageSize: searchParams.get("pageSize") || "20",
      })
      return NextResponse.json({ success: true, ...data })
    }

    // 2. Reçete Detayı
    if (section === "bom_detail") {
      const id = searchParams.get("id") || ""
      const bom = await getBomByIdFromDb(id)
      return NextResponse.json({ success: true, bom })
    }

    // 3. Çok Seviyeli Patlatma (Explosion)
    if (section === "exploded") {
      const id = searchParams.get("id") || ""
      const targetQtyStr = searchParams.get("quantity")
      const targetQuantity = targetQtyStr ? parseFloat(targetQtyStr) : undefined
      const exploded = await getExplodedBomFromDb(id, targetQuantity)
      return NextResponse.json({ success: true, ...exploded })
    }

    // 4. Nerede Kullanılıyor (Where-Used)
    if (section === "where_used") {
      const itemId = searchParams.get("itemId") || ""
      const whereUsed = await getWhereUsedFromDb(itemId)
      return NextResponse.json({ success: true, whereUsed })
    }

    // 5. Revizyon Karşılaştırma (Diff)
    if (section === "compare") {
      const bomIdA = searchParams.get("bomIdA") || ""
      const bomIdB = searchParams.get("bomIdB") || ""
      const diff = await compareBomRevisionsFromDb(bomIdA, bomIdB)
      return NextResponse.json({ success: true, diff })
    }

    // 6. Rota Listesi
    if (section === "routings") {
      const data = await listRoutingsFromDb({
        branchId,
        finishedItemId: searchParams.get("finishedItemId") || undefined,
        bomId: searchParams.get("bomId") || undefined,
        status: searchParams.get("status") || undefined,
        search: searchParams.get("search") || undefined,
        page: searchParams.get("page") || "1",
        pageSize: searchParams.get("pageSize") || "20",
      })
      return NextResponse.json({ success: true, ...data })
    }

    // 7. Rota Detayı
    if (section === "routing_detail") {
      const id = searchParams.get("id") || ""
      const routing = await getRoutingByIdFromDb(id)
      return NextResponse.json({ success: true, routing })
    }

    // 8. CSV Olarak Dışa Aktarma
    if (section === "export_csv") {
      const boms = (await listBomsFromDb({ branchId, pageSize: 500 })).items
      const csv = generateBomCsvContent(boms)
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="urun_receteleri.csv"',
        },
      })
    }

    throw new ProductionDomainError(
      "VALIDATION_ERROR",
      `Tanımsız reçete/rota sorgu bölümü: ${section}`,
      undefined,
      400
    )
  } catch (err) {
    return handleProductionApiError(err, "Reçete ve rota verileri alınamadı.")
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const action = String(body.action || "").trim().toLowerCase()
    const payload = body.payload || body
    const branchId = payload.branchId || null

    const flags = getServerProductionFeatureFlags(branchId)
    if (!flags.uretim_bom_rota) {
      return NextResponse.json(
        {
          success: false,
          error: "Ürün Reçeteleri ve Rotalar (BOM) modülü devre dışıdır (özellik bayrağı kapalı).",
          code: "FEATURE_DISABLED",
        },
        { status: 403 }
      )
    }

    const auth = await resolveAuth(request)
    if (!auth) {
      return NextResponse.json(
        { success: false, error: "Oturum açmanız gerekiyor.", code: "UNAUTHORIZED" },
        { status: 401 }
      )
    }

    // ── 1. REÇETE (BOM) BAŞLIK İŞLEMLERİ ──────────────────────────
    if (action === "create_bom") {
      await verifyProductionBomRotaAccess({
        userId: auth.userId,
        branchId,
        action: "create",
      })
      const created = await createBomInDb(payload, auth.username || auth.userId)
      await logProductionAudit({
        userId: auth.userId,
        action: "CREATE",
        resource: "URETIM_BOM_ROTA",
        resourceId: created.id,
        branchId,
        afterData: created,
      })
      return NextResponse.json(
        { success: true, message: `Reçete (${created.code}) başarıyla oluşturuldu.`, bom: created },
        { status: 201 }
      )
    }

    if (action === "update_bom") {
      await verifyProductionBomRotaAccess({
        userId: auth.userId,
        branchId,
        action: "update",
      })
      const updated = await updateBomInDb(String(payload.id || body.id), payload, auth.username || auth.userId)
      await logProductionAudit({
        userId: auth.userId,
        action: "UPDATE",
        resource: "URETIM_BOM_ROTA",
        resourceId: updated.id,
        branchId,
        afterData: updated,
      })
      return NextResponse.json({ success: true, message: `Reçete (${updated.code}) güncellendi.`, bom: updated })
    }

    if (action === "delete_bom") {
      await verifyProductionBomRotaAccess({
        userId: auth.userId,
        branchId,
        action: "delete",
      })
      const deleted = await deleteBomInDb(String(payload.id || body.id))
      await logProductionAudit({
        userId: auth.userId,
        action: "DELETE",
        resource: "URETIM_BOM_ROTA",
        resourceId: deleted.id,
        branchId,
        beforeData: deleted,
      })
      return NextResponse.json({ success: true, message: `Reçete (${deleted.code}) silindi.` })
    }

    if (action === "approve_bom") {
      await verifyProductionBomRotaAccess({
        userId: auth.userId,
        branchId,
        action: "approve",
      })
      const approved = await approveBomInDb(String(payload.id || body.id), auth.username || auth.userId)
      await logProductionAudit({
        userId: auth.userId,
        action: "APPROVE",
        resource: "URETIM_BOM_ROTA",
        resourceId: approved.id,
        branchId,
        afterData: approved,
      })
      return NextResponse.json({
        success: true,
        message: `Reçete revizyonu (${approved.code} Rev.${approved.revision}) onaylandı ve üretime açıldı.`,
        bom: approved,
      })
    }

    if (action === "clone_bom") {
      await verifyProductionBomRotaAccess({
        userId: auth.userId,
        branchId,
        action: "create",
      })
      const cloned = await cloneBomAsNewRevisionInDb({
        sourceBomId: String(payload.sourceBomId || body.sourceBomId),
        newRevision: String(payload.newRevision || body.newRevision || "02"),
        newCode: payload.newCode || body.newCode,
        clonedBy: auth.username || auth.userId,
      })
      await logProductionAudit({
        userId: auth.userId,
        action: "CREATE",
        resource: "URETIM_BOM_ROTA",
        resourceId: cloned.id,
        branchId,
        afterData: cloned,
      })
      return NextResponse.json(
        {
          success: true,
          message: `Yeni reçete revizyonu (${cloned.code}) oluşturuldu.`,
          bom: cloned,
        },
        { status: 201 }
      )
    }

    // ── 2. REÇETE KALEMLERİ VE İKAME MALZEME İŞLEMLERİ ────────────
    if (action === "add_bom_item") {
      await verifyProductionBomRotaAccess({
        userId: auth.userId,
        branchId,
        action: "update",
      })
      const createdItem = await addBomItemToDb(payload)
      await logProductionAudit({
        userId: auth.userId,
        action: "UPDATE",
        resource: "URETIM_BOM_ROTA",
        resourceId: createdItem.id,
        branchId,
        afterData: createdItem,
      })
      return NextResponse.json(
        { success: true, message: "Reçete bileşeni eklendi.", item: createdItem },
        { status: 201 }
      )
    }

    if (action === "update_bom_item") {
      await verifyProductionBomRotaAccess({
        userId: auth.userId,
        branchId,
        action: "update",
      })
      const updatedItem = await updateBomItemInDb(String(payload.id || body.id), payload)
      return NextResponse.json({ success: true, message: "Reçete bileşeni güncellendi.", item: updatedItem })
    }

    if (action === "delete_bom_item") {
      await verifyProductionBomRotaAccess({
        userId: auth.userId,
        branchId,
        action: "update",
      })
      const deletedItem = await deleteBomItemInDb(String(payload.id || body.id))
      return NextResponse.json({ success: true, message: "Reçete bileşeni çıkarıldı." })
    }

    if (action === "add_substitute") {
      await verifyProductionBomRotaAccess({
        userId: auth.userId,
        branchId,
        action: "update",
      })
      const sub = await addBomSubstituteInDb(payload)
      return NextResponse.json({ success: true, message: "İkame malzeme eklendi.", substitute: sub }, { status: 201 })
    }

    if (action === "delete_substitute") {
      await verifyProductionBomRotaAccess({
        userId: auth.userId,
        branchId,
        action: "update",
      })
      await deleteBomSubstituteInDb(String(payload.id || body.id))
      return NextResponse.json({ success: true, message: "İkame malzeme silindi." })
    }

    // ── 3. ROTA VE OPERASYON İŞLEMLERİ ────────────────────────────
    if (action === "create_routing") {
      await verifyProductionBomRotaAccess({
        userId: auth.userId,
        branchId,
        action: "create",
      })
      const routing = await createRoutingInDb(payload)
      await logProductionAudit({
        userId: auth.userId,
        action: "CREATE",
        resource: "URETIM_BOM_ROTA",
        resourceId: routing.id,
        branchId,
        afterData: routing,
      })
      return NextResponse.json(
        { success: true, message: `Rota (${routing.code}) oluşturuldu.`, routing },
        { status: 201 }
      )
    }

    if (action === "add_operation") {
      await verifyProductionBomRotaAccess({
        userId: auth.userId,
        branchId,
        action: "update",
      })
      const op = await addOperationToRoutingInDb(payload)
      return NextResponse.json({ success: true, message: "Operasyon rotaya eklendi.", operation: op }, { status: 201 })
    }

    if (action === "update_operation") {
      await verifyProductionBomRotaAccess({
        userId: auth.userId,
        branchId,
        action: "update",
      })
      const op = await updateOperationInDb(String(payload.id || body.id), payload)
      return NextResponse.json({ success: true, message: "Operasyon güncellendi.", operation: op })
    }

    if (action === "delete_operation") {
      await verifyProductionBomRotaAccess({
        userId: auth.userId,
        branchId,
        action: "update",
      })
      await deleteOperationInDb(String(payload.id || body.id))
      return NextResponse.json({ success: true, message: "Operasyon silindi." })
    }

    // ── 4. MALİYET YENİDEN HESAPLAMA (ROLL-UP) ────────────────────
    if (action === "recalculate_cost") {
      await verifyProductionBomRotaAccess({
        userId: auth.userId,
        branchId,
        action: "update",
      })
      const cost = await recalculateBomCostInDb(String(payload.bomId || body.bomId))
      return NextResponse.json({ success: true, message: "Reçete teorik birim maliyeti yeniden hesaplandı.", cost })
    }

    // ── 5. CSV / EXCEL İÇE AKTARMA (IMPORT) ───────────────────────
    if (action === "import_csv") {
      await verifyProductionBomRotaAccess({
        userId: auth.userId,
        branchId,
        action: "create",
      })
      const csvContent = String(payload.csvContent || body.csvContent || "")
      const dryRun = Boolean(payload.dryRun ?? body.dryRun ?? false)

      const report = parseBomCsvContent(csvContent)
      if (dryRun || report.errors.length > 0) {
        return NextResponse.json({
          success: report.errors.length === 0,
          report,
          message: report.errors.length === 0 ? "CSV doğrulaması başarılı." : "CSV dosyasında doğrulama hataları bulundu.",
        })
      }

      // Veritabanına kaydet
      let importedBomsCount = 0
      for (const pBom of report.parsedBoms) {
        // finishedItemCode kontrolü
        const finishedItem = await (prisma as any).inventoryItem.findFirst({
          where: { OR: [{ sku: pBom.finishedItemCode }, { code: pBom.finishedItemCode }] },
        })
        if (!finishedItem) {
          report.errors.push({
            row: 0,
            message: `Mamul kodu (${pBom.finishedItemCode}) sistemde bulunamadı.`,
          })
          continue
        }

        const bom = await createBomInDb(
          {
            code: pBom.code,
            name: pBom.name,
            revision: pBom.revision,
            finishedItemId: finishedItem.id,
            baseQuantity: pBom.baseQuantity,
            baseUnit: pBom.baseUnit,
            isPhantom: pBom.isPhantom,
          },
          auth.username || auth.userId
        )

        for (const comp of pBom.components) {
          const compItem = await (prisma as any).inventoryItem.findFirst({
            where: { OR: [{ sku: comp.componentItemCode }, { code: comp.componentItemCode }] },
          })
          if (compItem) {
            await addBomItemToDb({
              bomId: bom.id,
              componentItemId: compItem.id,
              lineNumber: comp.lineNumber,
              quantity: comp.quantity,
              unit: comp.unit,
              scrapPercent: comp.scrapPercent,
              operationSequence: comp.operationSequence,
              notes: comp.notes,
            })
          }
        }
        importedBomsCount++
      }

      return NextResponse.json({
        success: true,
        message: `${importedBomsCount} reçete başarıyla içe aktarıldı.`,
        report,
      })
    }

    throw new ProductionDomainError(
      "VALIDATION_ERROR",
      `Tanımsız reçete/rota işlemi: ${action}`,
      undefined,
      400
    )
  } catch (err) {
    return handleProductionApiError(err, "Reçete/rota işlemi başarısız oldu.")
  }
}

