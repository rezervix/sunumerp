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
      "Üretim modülü özellik bayrağı (feature flag) kapalıdır. Bu işlem gerçekleştirilemez.",
      "FEATURE_DISABLED",
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
    `Bu işlem için yetkiniz bulunmamaktadır (${normRes}:${normAct}).`,
    "FORBIDDEN",
    403
  )
}

export async function GET(request: Request) {
  try {
    const payload = await getAuthPayload()
    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Oturum açmanız gerekiyor.", code: "UNAUTHORIZED" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const section = searchParams.get("section") || "snapshot"
    const branchId = searchParams.get("branchId") || payload.branchId || null
    const page = searchParams.get("page") || "1"
    const pageSize = searchParams.get("pageSize") || "10"
    const search = searchParams.get("search") || ""

    const sysConfig = getSystemConfig()
    const flags = getServerProductionFeatureFlags(branchId)
    const anyFlagEnabled = isAnyProductionFeatureEnabled(
      sysConfig.featureFlags,
      branchId
    )

    // Özellik bayrakları kapalıyken, istemciye kapalı durum bilgisini güvenli şekilde dön
    if (!anyFlagEnabled) {
      return NextResponse.json({
        success: true,
        anyFlagEnabled: false,
        flags,
        message: "Üretim özellik bayrakları kapalı durumdadır.",
      })
    }

    await verifyProductionMasterDataAccess({
      userId: payload.userId,
      branchId,
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
    const authPayload = await getAuthPayload()
    if (!authPayload) {
      return NextResponse.json(
        { success: false, error: "Oturum açmanız gerekiyor.", code: "UNAUTHORIZED" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const action = String(body.action || "").trim()
    const payload = body.payload || body
    const branchId = payload.branchId || authPayload.branchId || null

    // ── 1. İŞ MERKEZİ / İSTASYON İŞLEMLERİ ──────────────────────────
    if (action === "create_work_center") {
      await verifyProductionMasterDataAccess({
        userId: authPayload.userId,
        branchId,
        resource: "uretim_kapasite",
        action: "create",
      })
      const created = await createWorkCenterInDb({ ...payload, branchId })
      await logProductionAudit({
        userId: authPayload.userId,
        action: "CREATE",
        resource: "URETIM_IS_MERKEZI",
        resourceId: created.id,
        branchId,
        afterData: created,
      })
      return NextResponse.json({
        success: true,
        message: `İş merkezi (${created.code} - ${created.name}) başarıyla oluşturuldu.`,
        workCenter: created,
      })
    }

    if (action === "update_work_center") {
      await verifyProductionMasterDataAccess({
        userId: authPayload.userId,
        branchId,
        resource: "uretim_kapasite",
        action: "update",
      })
      const updated = await updateWorkCenterInDb(String(payload.id || ""), payload)
      await logProductionAudit({
        userId: authPayload.userId,
        action: "UPDATE",
        resource: "URETIM_IS_MERKEZI",
        resourceId: updated.id,
        branchId,
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
        branchId,
        resource: "uretim_kapasite",
        action: "delete",
      })
      const deleted = await deleteWorkCenterInDb(String(payload.id || ""))
      await logProductionAudit({
        userId: authPayload.userId,
        action: "DELETE",
        resource: "URETIM_IS_MERKEZI",
        resourceId: deleted.id,
        branchId,
        beforeData: deleted,
      })
      return NextResponse.json({
        success: true,
        message: `İş merkezi (${deleted.code}) silindi.`,
      })
    }

    // ── 2. MAKİNE / EKİPMAN VARLIĞI İŞLEMLERİ ───────────────────────
    if (action === "create_machine") {
      await verifyProductionMasterDataAccess({
        userId: authPayload.userId,
        branchId,
        resource: "uretim_bakim",
        action: "create",
      })
      const created = await createMachineAssetInDb({ ...payload, branchId })
      await logProductionAudit({
        userId: authPayload.userId,
        action: "CREATE",
        resource: "URETIM_MAKINE_EKIPMAN",
        resourceId: created.id,
        branchId,
        afterData: created,
      })
      return NextResponse.json({
        success: true,
        message: `Makine/ekipman (${created.code} - ${created.name}) başarıyla kaydedildi.`,
        machine: created,
      })
    }

    if (action === "update_machine") {
      await verifyProductionMasterDataAccess({
        userId: authPayload.userId,
        branchId,
        resource: "uretim_bakim",
        action: "update",
      })
      const updated = await updateMachineAssetInDb(String(payload.id || ""), payload)
      await logProductionAudit({
        userId: authPayload.userId,
        action: "UPDATE",
        resource: "URETIM_MAKINE_EKIPMAN",
        resourceId: updated.id,
        branchId,
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
        branchId,
        resource: "uretim_bakim",
        action: "update",
      })
      const updated = await updateMachineCounterInDb(String(payload.id || ""), payload)
      await logProductionAudit({
        userId: authPayload.userId,
        action: "UPDATE_COUNTER",
        resource: "URETIM_MAKINE_EKIPMAN",
        resourceId: updated.id,
        branchId,
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
        branchId,
        resource: "uretim_bakim",
        action: "delete",
      })
      const deleted = await deleteMachineAssetInDb(String(payload.id || ""))
      await logProductionAudit({
        userId: authPayload.userId,
        action: "DELETE",
        resource: "URETIM_MAKINE_EKIPMAN",
        resourceId: deleted.id,
        branchId,
        beforeData: deleted,
      })
      return NextResponse.json({
        success: true,
        message: `Makine/ekipman (${deleted.code}) silindi.`,
      })
    }

    // ── 3. ÇALIŞMA TAKVİMİ, VARDİYA, TATİL VE İSTİSNA İŞLEMLERİ ────
    if (action === "create_calendar") {
      await verifyProductionMasterDataAccess({
        userId: authPayload.userId,
        branchId,
        resource: "uretim_kapasite",
        action: "create",
      })
      const created = await createWorkCalendarInDb({ ...payload, branchId })
      await logProductionAudit({
        userId: authPayload.userId,
        action: "CREATE",
        resource: "URETIM_CALISMA_TAKVIMI",
        resourceId: created.id,
        branchId,
        afterData: created,
      })
      return NextResponse.json({
        success: true,
        message: `Çalışma takvimi (${created.code}) oluşturuldu.`,
        calendar: created,
      })
    }

    if (action === "update_calendar") {
      await verifyProductionMasterDataAccess({
        userId: authPayload.userId,
        branchId,
        resource: "uretim_kapasite",
        action: "update",
      })
      const updated = await updateWorkCalendarInDb(String(payload.id || ""), payload)
      await logProductionAudit({
        userId: authPayload.userId,
        action: "UPDATE",
        resource: "URETIM_CALISMA_TAKVIMI",
        resourceId: updated.id,
        branchId,
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
        branchId,
        resource: "uretim_kapasite",
        action: "delete",
      })
      const deleted = await deleteWorkCalendarInDb(String(payload.id || ""))
      await logProductionAudit({
        userId: authPayload.userId,
        action: "DELETE",
        resource: "URETIM_CALISMA_TAKVIMI",
        resourceId: deleted.id,
        branchId,
        beforeData: deleted,
      })
      return NextResponse.json({
        success: true,
        message: `Çalışma takvimi (${deleted.code}) silindi.`,
      })
    }

    if (action === "create_shift") {
      await verifyProductionMasterDataAccess({
        userId: authPayload.userId,
        branchId,
        resource: "uretim_kapasite",
        action: "create",
      })
      const created = await createShiftInDb(payload)
      await logProductionAudit({
        userId: authPayload.userId,
        action: "CREATE",
        resource: "URETIM_VARDIYA",
        resourceId: created.id,
        branchId,
        afterData: created,
      })
      return NextResponse.json({
        success: true,
        message: `Vardiya (${created.code} - ${created.name}) eklendi.`,
        shift: created,
      })
    }

    if (action === "update_shift") {
      await verifyProductionMasterDataAccess({
        userId: authPayload.userId,
        branchId,
        resource: "uretim_kapasite",
        action: "update",
      })
      const updated = await updateShiftInDb(String(payload.id || ""), payload)
      await logProductionAudit({
        userId: authPayload.userId,
        action: "UPDATE",
        resource: "URETIM_VARDIYA",
        resourceId: updated.id,
        branchId,
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
        branchId,
        resource: "uretim_kapasite",
        action: "delete",
      })
      const deleted = await deleteShiftInDb(String(payload.id || ""))
      await logProductionAudit({
        userId: authPayload.userId,
        action: "DELETE",
        resource: "URETIM_VARDIYA",
        resourceId: deleted.id,
        branchId,
        beforeData: deleted,
      })
      return NextResponse.json({
        success: true,
        message: `Vardiya (${deleted.code}) silindi.`,
      })
    }

    if (action === "create_holiday") {
      await verifyProductionMasterDataAccess({
        userId: authPayload.userId,
        branchId,
        resource: "uretim_kapasite",
        action: "create",
      })
      const created = await createCalendarHolidayInDb(payload)
      await logProductionAudit({
        userId: authPayload.userId,
        action: "CREATE",
        resource: "URETIM_TATIL_GUNU",
        resourceId: created.id,
        branchId,
        afterData: created,
      })
      return NextResponse.json({
        success: true,
        message: `Tatil günü (${created.holidayDate} - ${created.name}) kaydedildi.`,
        holiday: created,
      })
    }

    if (action === "delete_holiday") {
      await verifyProductionMasterDataAccess({
        userId: authPayload.userId,
        branchId,
        resource: "uretim_kapasite",
        action: "delete",
      })
      const deleted = await deleteCalendarHolidayInDb(String(payload.id || ""))
      await logProductionAudit({
        userId: authPayload.userId,
        action: "DELETE",
        resource: "URETIM_TATIL_GUNU",
        resourceId: deleted.id,
        branchId,
        beforeData: deleted,
      })
      return NextResponse.json({
        success: true,
        message: "Tatil günü kaydı silindi.",
      })
    }

    if (action === "create_exception") {
      await verifyProductionMasterDataAccess({
        userId: authPayload.userId,
        branchId,
        resource: "uretim_kapasite",
        action: "create",
      })
      const created = await createCalendarExceptionInDb(payload)
      await logProductionAudit({
        userId: authPayload.userId,
        action: "CREATE",
        resource: "URETIM_TAKVIM_ISTISNASI",
        resourceId: created.id,
        branchId,
        afterData: created,
      })
      return NextResponse.json({
        success: true,
        message: `İş merkezi takvim istisnası (${created.exceptionDate}) kaydedildi.`,
        exception: created,
      })
    }

    if (action === "delete_exception") {
      await verifyProductionMasterDataAccess({
        userId: authPayload.userId,
        branchId,
        resource: "uretim_kapasite",
        action: "delete",
      })
      const deleted = await deleteCalendarExceptionInDb(String(payload.id || ""))
      await logProductionAudit({
        userId: authPayload.userId,
        action: "DELETE",
        resource: "URETIM_TAKVIM_ISTISNASI",
        resourceId: deleted.id,
        branchId,
        beforeData: deleted,
      })
      return NextResponse.json({
        success: true,
        message: "İş merkezi takvim istisnası silindi.",
      })
    }

    // ── 4. ÜRETİM PARAMETRELERİ İŞLEMLERİ ──────────────────────────
    if (action === "save_parameters") {
      await verifyProductionMasterDataAccess({
        userId: authPayload.userId,
        branchId,
        resource: "uretim",
        action: "update",
      })
      const saved = await upsertProductionParametersInDb(
        { ...payload, branchId },
        authPayload.username || authPayload.userId
      )
      await logProductionAudit({
        userId: authPayload.userId,
        action: "UPDATE",
        resource: "URETIM_PARAMETRELERI",
        resourceId: saved.id,
        branchId,
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
        branchId,
        resource: "uretim_bom_rota",
        action: "update",
      })
      const profile = await upsertItemProductionProfileInDb(payload)
      await logProductionAudit({
        userId: authPayload.userId,
        action: "UPSERT",
        resource: "URETIM_URUN_PROFILI",
        resourceId: profile.id,
        branchId,
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
        branchId,
        resource: "uretim_bom_rota",
        action: "delete",
      })
      const deleted = await deleteItemProductionProfileInDb(
        String(payload.id || payload.itemId || "")
      )
      await logProductionAudit({
        userId: authPayload.userId,
        action: "DELETE",
        resource: "URETIM_URUN_PROFILI",
        resourceId: deleted.id,
        branchId,
        beforeData: deleted,
      })
      return NextResponse.json({
        success: true,
        message: "Stok/ürün kartı üretim profili sıfırlandı.",
      })
    }

    throw new ProductionDomainError(
      `Tanımsız üretim ana veri işlemi: ${action}`,
      "VALIDATION_ERROR",
      400
    )
  } catch (err) {
    return handleProductionApiError(err, "Üretim ana veri işlemi başarısız oldu.")
  }
}
