import { NextResponse } from "next/server"
import { checkPermission, getAuthPayload, isSuperAdminUser } from "@/lib/auth/server-permission"
import { normalizePermissionAction, normalizePermissionResource } from "@/lib/auth/permissions"
import { isAnyProductionFeatureEnabled } from "@/lib/config/production-feature-flags"
import {
  ProductionDomainError,
  handleProductionApiError,
  logProductionAudit,
} from "@/lib/services/productionAuditAndError"
import {
  createCalendarExceptionInDb,
  createCalendarHolidayInDb,
  createMachineAssetInDb,
  createShiftInDb,
  createWorkCalendarInDb,
  createWorkCenterInDb,
  deleteCalendarExceptionInDb,
  deleteCalendarHolidayInDb,
  deleteItemProductionProfileInDb,
  deleteMachineAssetInDb,
  deleteShiftInDb,
  deleteWorkCalendarInDb,
  deleteWorkCenterInDb,
  getItemProductionProfileFromDb,
  getProductionMasterDataSnapshotFromDb,
  getProductionParametersFromDb,
  listItemProductionProfilesInDb,
  listMachineAssetsInDb,
  listWorkCalendarsInDb,
  listWorkCentersInDb,
  updateMachineAssetInDb,
  updateMachineCounterInDb,
  updateShiftInDb,
  updateWorkCalendarInDb,
  updateWorkCenterInDb,
  upsertItemProductionProfileInDb,
  upsertProductionParametersInDb,
} from "@/lib/services/productionMasterDataServerDb"
import { getServerProductionFeatureFlags, getSystemConfig } from "@/lib/system-config"
import { DEBUG_USER_ID } from "@/lib/auth/local-debug"

/**
 * Sunucu tarafı üretim özelliği ve RBAC izin doğrulayıcısı.
 */
export async function verifyProductionMasterDataAccess(params: {
  userId: string
  branchId?: string | null
  resource: string
  action: "read" | "create" | "update" | "delete" | "approve"
}) {
  const sysConfig = getSystemConfig()
  const anyEnabled = isAnyProductionFeatureEnabled(
    sysConfig.featureFlags,
    params.branchId
  )
  if (!anyEnabled) {
    throw new ProductionDomainError(
      "FEATURE_DISABLED",
      "Üretim modülü özellik bayrağı (feature flag) kapalıdır. Bu işlem gerçekleştirilemez.",
      undefined,
      403
    )
  }

  if (params.userId === DEBUG_USER_ID && process.env.NODE_ENV !== "production") {
    return true
  }

  const isSuper = await isSuperAdminUser(params.userId)
  if (isSuper) return true

  const normRes = normalizePermissionResource(params.resource)
  const normAct = normalizePermissionAction(params.action)

  const grantedSpecific = await checkPermission(
    params.userId,
    params.branchId || undefined,
    normRes,
    normAct
  )
  if (grantedSpecific) return true

  // Genel "uretim" kaynağı üzerinde yetkisi varsa da kabul et
  const grantedGeneral = await checkPermission(
    params.userId,
    params.branchId || undefined,
    "uretim",
    normAct
  )
  if (grantedGeneral) return true

  throw new ProductionDomainError(
    "FORBIDDEN",
    `Bu işlem için yetkiniz bulunmamaktadır (${normRes}:${normAct}).`,
    undefined,
    403
  )
}

async function resolveAuth(request: Request) {
  const payload = await getAuthPayload()
  if (payload) return payload

  // Local test / development fallback
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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const branchId = searchParams.get("branchId") || null

    const sysConfig = getSystemConfig()
    const flags = getServerProductionFeatureFlags(branchId)
    const anyFlagEnabled = isAnyProductionFeatureEnabled(
      sysConfig.featureFlags,
      branchId
    )

    // Özellik bayrakları kapalıyken 403 FEATURE_DISABLED dön
    if (!anyFlagEnabled) {
      return NextResponse.json(
        {
          success: false,
          error: "Üretim modülü özellik bayrakları kapalı durumdadır.",
          code: "FEATURE_DISABLED",
        },
        { status: 403 }
      )
    }

    const payload = await resolveAuth(request)
    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Oturum açmanız gerekiyor.", code: "UNAUTHORIZED" },
        { status: 401 }
      )
    }

    const section = searchParams.get("section") || "snapshot"
    const page = searchParams.get("page") || "1"
    const pageSize = searchParams.get("pageSize") || "10"
    const search = searchParams.get("search") || ""

    await verifyProductionMasterDataAccess({
      userId: payload.userId,
      branchId: branchId || payload.branchId || null,
      resource: "uretim",
      action: "read",
    })

    if (section === "work_centers") {
      const result = await listWorkCentersInDb({
        branchId,
        search,
        type: searchParams.get("type"),
        isActive: searchParams.get("isActive"),
        alternativeGroupCode: searchParams.get("alternativeGroupCode"),
        page,
        pageSize,
      })
      return NextResponse.json({ success: true, anyFlagEnabled: true, flags, ...result })
    }

    if (section === "machines") {
      const result = await listMachineAssetsInDb({
        branchId,
        search,
        status: searchParams.get("status"),
        workCenterId: searchParams.get("workCenterId"),
        isActive: searchParams.get("isActive"),
        page,
        pageSize,
      })
      return NextResponse.json({ success: true, anyFlagEnabled: true, flags, ...result })
    }

    if (section === "calendars") {
      const result = await listWorkCalendarsInDb({
        branchId,
        search,
        page,
        pageSize,
      })
      return NextResponse.json({ success: true, anyFlagEnabled: true, flags, ...result })
    }

    if (section === "parameters") {
      const parameters = await getProductionParametersFromDb(branchId, false)
      return NextResponse.json({ success: true, anyFlagEnabled: true, flags, parameters })
    }

    if (section === "item_profiles") {
      const result = await listItemProductionProfilesInDb({
        search,
        productionItemType: searchParams.get("productionItemType"),
        productionMethod: searchParams.get("productionMethod"),
        onlyConfigured: searchParams.get("onlyConfigured") === "true",
        page,
        pageSize,
      })
      return NextResponse.json({ success: true, anyFlagEnabled: true, flags, ...result })
    }

    if (section === "item_profile") {
      const itemId = searchParams.get("itemId") || ""
      const data = await getItemProductionProfileFromDb(itemId)
      return NextResponse.json({ success: true, anyFlagEnabled: true, flags, ...data })
    }

    const snapshot = await getProductionMasterDataSnapshotFromDb({
      branchId,
      page,
      pageSize,
    })

    return NextResponse.json({
      success: true,
      anyFlagEnabled: true,
      flags,
      ...snapshot,
    })
  } catch (err) {
    return handleProductionApiError(err, "Üretim ana verileri alınamadı.")
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const action = String(body.action || "").trim().toLowerCase()
    const payload = body.payload || body
    const branchId = payload.branchId || null

    const sysConfig = getSystemConfig()
    const anyFlagEnabled = isAnyProductionFeatureEnabled(
      sysConfig.featureFlags,
      branchId
    )

    if (!anyFlagEnabled) {
      return NextResponse.json(
        {
          success: false,
          error: "Üretim modülü özellik bayrakları kapalı durumdadır.",
          code: "FEATURE_DISABLED",
        },
        { status: 403 }
      )
    }

    const authPayload = await resolveAuth(request)
    if (!authPayload) {
      return NextResponse.json(
        { success: false, error: "Oturum açmanız gerekiyor.", code: "UNAUTHORIZED" },
        { status: 401 }
      )
    }

    const effectiveBranchId = branchId || authPayload.branchId || null

    // ── 1. İŞ MERKEZİ / İSTASYON İŞLEMLERİ ──────────────────────────
    if (action === "create_work_center") {
      await verifyProductionMasterDataAccess({
        userId: authPayload.userId,
        branchId: effectiveBranchId,
        resource: "uretim_kapasite",
        action: "create",
      })
      const created = await createWorkCenterInDb({ ...payload, branchId: effectiveBranchId })
      await logProductionAudit({
        userId: authPayload.userId,
        action: "CREATE",
        resource: "URETIM_KAPASITE",
        resourceId: created.id,
        branchId: effectiveBranchId,
        afterData: created,
      })
      return NextResponse.json(
        {
          success: true,
          message: `İş merkezi (${created.code} - ${created.name}) başarıyla oluşturuldu.`,
          workCenter: created,
        },
        { status: 201 }
      )
    }

    if (action === "update_work_center") {
      await verifyProductionMasterDataAccess({
        userId: authPayload.userId,
        branchId: effectiveBranchId,
        resource: "uretim_kapasite",
        action: "update",
      })
      const targetId = String(payload.id || body.id || "")
      const updated = await updateWorkCenterInDb(targetId, payload)
      await logProductionAudit({
        userId: authPayload.userId,
        action: "UPDATE",
        resource: "URETIM_KAPASITE",
        resourceId: updated.id,
        branchId: effectiveBranchId,
        afterData: updated,
      })
      return NextResponse.json({
        success: true,
        message: `İş merkezi (${updated.code}) başarıyla güncellendi.`,
        workCenter: updated,
      })
    }

    if (action === "delete_work_center") {
      await verifyProductionMasterDataAccess({
        userId: authPayload.userId,
        branchId: effectiveBranchId,
        resource: "uretim_kapasite",
        action: "delete",
      })
      const targetId = String(payload.id || body.id || "")
      const deleted = await deleteWorkCenterInDb(targetId)
      await logProductionAudit({
        userId: authPayload.userId,
        action: "DELETE",
        resource: "URETIM_KAPASITE",
        resourceId: deleted.id,
        branchId: effectiveBranchId,
        beforeData: deleted,
      })
      return NextResponse.json({
        success: true,
        message: `İş merkezi (${deleted.code}) silindi.`,
        deleted,
      })
    }

    // ── 2. MAKİNE / EKİPMAN VARLIĞI İŞLEMLERİ ───────────────────────
    if (action === "create_machine") {
      await verifyProductionMasterDataAccess({
        userId: authPayload.userId,
        branchId: effectiveBranchId,
        resource: "uretim_bakim",
        action: "create",
      })
      const created = await createMachineAssetInDb({ ...payload, branchId: effectiveBranchId })
      await logProductionAudit({
        userId: authPayload.userId,
        action: "CREATE",
        resource: "URETIM_BAKIM",
        resourceId: created.id,
        branchId: effectiveBranchId,
        afterData: created,
      })
      return NextResponse.json(
        {
          success: true,
          message: `Makine/ekipman (${created.code} - ${created.name}) başarıyla kaydedildi.`,
          machine: created,
        },
        { status: 201 }
      )
    }

    if (action === "update_machine") {
      await verifyProductionMasterDataAccess({
        userId: authPayload.userId,
        branchId: effectiveBranchId,
        resource: "uretim_bakim",
        action: "update",
      })
      const targetId = String(payload.id || body.id || "")
      const updated = await updateMachineAssetInDb(targetId, payload)
      await logProductionAudit({
        userId: authPayload.userId,
        action: "UPDATE",
        resource: "URETIM_BAKIM",
        resourceId: updated.id,
        branchId: effectiveBranchId,
        afterData: updated,
      })
      return NextResponse.json({
        success: true,
        message: `Makine/ekipman (${updated.code}) güncellendi.`,
        machine: updated,
      })
    }

    if (action === "update_machine_counter") {
      await verifyProductionMasterDataAccess({
        userId: authPayload.userId,
        branchId: effectiveBranchId,
        resource: "uretim_bakim",
        action: "update",
      })
      const targetId = String(payload.id || body.id || "")
      const updated = await updateMachineCounterInDb(targetId, payload)
      await logProductionAudit({
        userId: authPayload.userId,
        action: "UPDATE",
        resource: "URETIM_BAKIM",
        resourceId: updated.id,
        branchId: effectiveBranchId,
        afterData: {
          operatingHours: updated.operatingHours,
          productionCount: updated.productionCount,
          status: updated.status,
        },
      })
      return NextResponse.json({
        success: true,
        message: `Makine (${updated.code}) sayaç ve durum bilgisi güncellendi.`,
        machine: updated,
      })
    }

    if (action === "delete_machine") {
      await verifyProductionMasterDataAccess({
        userId: authPayload.userId,
        branchId: effectiveBranchId,
        resource: "uretim_bakim",
        action: "delete",
      })
      const targetId = String(payload.id || body.id || "")
      const deleted = await deleteMachineAssetInDb(targetId)
      await logProductionAudit({
        userId: authPayload.userId,
        action: "DELETE",
        resource: "URETIM_BAKIM",
        resourceId: deleted.id,
        branchId: effectiveBranchId,
        beforeData: deleted,
      })
      return NextResponse.json({
        success: true,
        message: `Makine/ekipman (${deleted.code}) silindi.`,
        deleted,
      })
    }

    // ── 3. ÇALIŞMA TAKVİMİ, VARDİYA, TATİL VE İSTİSNA İŞLEMLERİ ────
    if (action === "create_calendar") {
      await verifyProductionMasterDataAccess({
        userId: authPayload.userId,
        branchId: effectiveBranchId,
        resource: "uretim_kapasite",
        action: "create",
      })
      const created = await createWorkCalendarInDb({ ...payload, branchId: effectiveBranchId })
      await logProductionAudit({
        userId: authPayload.userId,
        action: "CREATE",
        resource: "URETIM_KAPASITE",
        resourceId: created.id,
        branchId: effectiveBranchId,
        afterData: created,
      })
      return NextResponse.json(
        {
          success: true,
          message: `Çalışma takvimi (${created.code}) oluşturuldu.`,
          calendar: created,
        },
        { status: 201 }
      )
    }

    if (action === "update_calendar") {
      await verifyProductionMasterDataAccess({
        userId: authPayload.userId,
        branchId: effectiveBranchId,
        resource: "uretim_kapasite",
        action: "update",
      })
      const targetId = String(payload.id || body.id || "")
      const updated = await updateWorkCalendarInDb(targetId, payload)
      await logProductionAudit({
        userId: authPayload.userId,
        action: "UPDATE",
        resource: "URETIM_KAPASITE",
        resourceId: updated.id,
        branchId: effectiveBranchId,
        afterData: updated,
      })
      return NextResponse.json({
        success: true,
        message: `Çalışma takvimi (${updated.code}) güncellendi.`,
        calendar: updated,
      })
    }

    if (action === "delete_calendar") {
      await verifyProductionMasterDataAccess({
        userId: authPayload.userId,
        branchId: effectiveBranchId,
        resource: "uretim_kapasite",
        action: "delete",
      })
      const targetId = String(payload.id || body.id || "")
      const deleted = await deleteWorkCalendarInDb(targetId)
      await logProductionAudit({
        userId: authPayload.userId,
        action: "DELETE",
        resource: "URETIM_KAPASITE",
        resourceId: deleted.id,
        branchId: effectiveBranchId,
        beforeData: deleted,
      })
      return NextResponse.json({
        success: true,
        message: `Çalışma takvimi (${deleted.code}) silindi.`,
        deleted,
      })
    }

    if (action === "create_shift") {
      await verifyProductionMasterDataAccess({
        userId: authPayload.userId,
        branchId: effectiveBranchId,
        resource: "uretim_kapasite",
        action: "create",
      })
      const created = await createShiftInDb(payload)
      await logProductionAudit({
        userId: authPayload.userId,
        action: "CREATE",
        resource: "URETIM_KAPASITE",
        resourceId: created.id,
        branchId: effectiveBranchId,
        afterData: created,
      })
      return NextResponse.json(
        {
          success: true,
          message: `Vardiya (${created.code} - ${created.name}) eklendi.`,
          shift: created,
        },
        { status: 201 }
      )
    }

    if (action === "update_shift") {
      await verifyProductionMasterDataAccess({
        userId: authPayload.userId,
        branchId: effectiveBranchId,
        resource: "uretim_kapasite",
        action: "update",
      })
      const targetId = String(payload.id || body.id || "")
      const updated = await updateShiftInDb(targetId, payload)
      await logProductionAudit({
        userId: authPayload.userId,
        action: "UPDATE",
        resource: "URETIM_KAPASITE",
        resourceId: updated.id,
        branchId: effectiveBranchId,
        afterData: updated,
      })
      return NextResponse.json({
        success: true,
        message: `Vardiya (${updated.code}) güncellendi.`,
        shift: updated,
      })
    }

    if (action === "delete_shift") {
      await verifyProductionMasterDataAccess({
        userId: authPayload.userId,
        branchId: effectiveBranchId,
        resource: "uretim_kapasite",
        action: "delete",
      })
      const targetId = String(payload.id || body.id || "")
      const deleted = await deleteShiftInDb(targetId)
      await logProductionAudit({
        userId: authPayload.userId,
        action: "DELETE",
        resource: "URETIM_KAPASITE",
        resourceId: deleted.id,
        branchId: effectiveBranchId,
        beforeData: deleted,
      })
      return NextResponse.json({
        success: true,
        message: `Vardiya (${deleted.code}) silindi.`,
        deleted,
      })
    }

    if (action === "create_holiday") {
      await verifyProductionMasterDataAccess({
        userId: authPayload.userId,
        branchId: effectiveBranchId,
        resource: "uretim_kapasite",
        action: "create",
      })
      const created = await createCalendarHolidayInDb(payload)
      await logProductionAudit({
        userId: authPayload.userId,
        action: "CREATE",
        resource: "URETIM_KAPASITE",
        resourceId: created.id,
        branchId: effectiveBranchId,
        afterData: created,
      })
      return NextResponse.json(
        {
          success: true,
          message: `Tatil günü (${created.holidayDate} - ${created.name}) kaydedildi.`,
          holiday: created,
        },
        { status: 201 }
      )
    }

    if (action === "delete_holiday") {
      await verifyProductionMasterDataAccess({
        userId: authPayload.userId,
        branchId: effectiveBranchId,
        resource: "uretim_kapasite",
        action: "delete",
      })
      const targetId = String(payload.id || body.id || "")
      const deleted = await deleteCalendarHolidayInDb(targetId)
      await logProductionAudit({
        userId: authPayload.userId,
        action: "DELETE",
        resource: "URETIM_KAPASITE",
        resourceId: deleted.id,
        branchId: effectiveBranchId,
        beforeData: deleted,
      })
      return NextResponse.json({
        success: true,
        message: "Tatil günü kaydı silindi.",
        deleted,
      })
    }

    if (action === "create_exception") {
      await verifyProductionMasterDataAccess({
        userId: authPayload.userId,
        branchId: effectiveBranchId,
        resource: "uretim_kapasite",
        action: "create",
      })
      const created = await createCalendarExceptionInDb(payload)
      await logProductionAudit({
        userId: authPayload.userId,
        action: "CREATE",
        resource: "URETIM_KAPASITE",
        resourceId: created.id,
        branchId: effectiveBranchId,
        afterData: created,
      })
      return NextResponse.json(
        {
          success: true,
          message: `İş merkezi takvim istisnası (${created.exceptionDate}) kaydedildi.`,
          exception: created,
        },
        { status: 201 }
      )
    }

    if (action === "delete_exception") {
      await verifyProductionMasterDataAccess({
        userId: authPayload.userId,
        branchId: effectiveBranchId,
        resource: "uretim_kapasite",
        action: "delete",
      })
      const targetId = String(payload.id || body.id || "")
      const deleted = await deleteCalendarExceptionInDb(targetId)
      await logProductionAudit({
        userId: authPayload.userId,
        action: "DELETE",
        resource: "URETIM_KAPASITE",
        resourceId: deleted.id,
        branchId: effectiveBranchId,
        beforeData: deleted,
      })
      return NextResponse.json({
        success: true,
        message: "İş merkezi takvim istisnası silindi.",
        deleted,
      })
    }

    // ── 4. ÜRETİM PARAMETRELERİ İŞLEMLERİ ──────────────────────────
    if (action === "save_parameters") {
      await verifyProductionMasterDataAccess({
        userId: authPayload.userId,
        branchId: effectiveBranchId,
        resource: "uretim",
        action: "update",
      })
      const saved = await upsertProductionParametersInDb(
        { ...payload, branchId: effectiveBranchId },
        authPayload.username || authPayload.userId
      )
      await logProductionAudit({
        userId: authPayload.userId,
        action: "UPDATE",
        resource: "URETIM_BOM_ROTA",
        resourceId: saved.id,
        branchId: effectiveBranchId,
        afterData: saved,
      })
      return NextResponse.json({
        success: true,
        message: "Üretim planlama ve iş akışı parametreleri güncellendi.",
        parameters: saved,
      })
    }

    // ── 5. STOK / ÜRÜN KARTI 1-1 ÜRETİM PROFİLİ İŞLEMLERİ ──────────
    if (action === "upsert_item_profile") {
      await verifyProductionMasterDataAccess({
        userId: authPayload.userId,
        branchId: effectiveBranchId,
        resource: "uretim_bom_rota",
        action: "update",
      })
      const profile = await upsertItemProductionProfileInDb(payload)
      await logProductionAudit({
        userId: authPayload.userId,
        action: "UPDATE",
        resource: "URETIM_BOM_ROTA",
        resourceId: profile.id,
        branchId: effectiveBranchId,
        afterData: profile,
      })
      return NextResponse.json({
        success: true,
        message: "Stok/ürün kartı 1-1 üretim profili başarıyla kaydedildi.",
        profile,
      })
    }

    if (action === "delete_item_profile") {
      await verifyProductionMasterDataAccess({
        userId: authPayload.userId,
        branchId: effectiveBranchId,
        resource: "uretim_bom_rota",
        action: "delete",
      })
      const targetId = String(payload.id || payload.itemId || body.id || body.itemId || "")
      const deleted = await deleteItemProductionProfileInDb(targetId)
      await logProductionAudit({
        userId: authPayload.userId,
        action: "DELETE",
        resource: "URETIM_BOM_ROTA",
        resourceId: deleted.id,
        branchId: effectiveBranchId,
        beforeData: deleted,
      })
      return NextResponse.json({
        success: true,
        message: "Stok/ürün kartı üretim profili sıfırlandı.",
        deleted,
      })
    }

    throw new ProductionDomainError(
      "VALIDATION_ERROR",
      `Tanımsız üretim ana veri işlemi: ${action}`,
      undefined,
      400
    )
  } catch (err) {
    return handleProductionApiError(err, "Üretim ana veri işlemi başarısız oldu.")
  }
}
