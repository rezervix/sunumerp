/**
 * Kullanıcı Lojistik Bildirim Tercihleri & On-Demand Kural Değerlendirme API
 * GET  /api/notifications/preferences — Kullanıcının 6 kural tercihini döner
 * PUT  /api/notifications/preferences — Kullanıcının kendi bildirim tercihlerini günceller
 * POST /api/notifications/preferences — Yetkili iç kullanıcı için kuralları anlık değerlendirir
 */

import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { createAuditLog } from "@/lib/audit"
import { getAuthPayload, checkPermission } from "@/lib/auth/server-permission"
import { DEBUG_USER_ID } from "@/lib/auth/local-debug"
import { getServerLogisticsFeatureFlags } from "@/lib/system-config"
import { getLogisticsScopeContext, handleLogisticsApiError } from "@/lib/logistics/security"
import {
  ALL_LOGISTICS_ALERT_RULE_KEYS,
  evaluateAndDispatchLogisticsAlerts,
  LOGISTICS_ALERT_RULE_DEFINITIONS,
  mergeUserLogisticsNotificationPrefs,
  parseUserLogisticsNotificationPrefs,
  type LogisticsAlertRuleKey,
} from "@/lib/logistics/notifications"

async function resolveUserRuleAccess(userId: string, username: string) {
  const payload = { userId, username }
  const scope = await getLogisticsScopeContext(payload)
  const flags = getServerLogisticsFeatureFlags()

  const allowedRules: Record<LogisticsAlertRuleKey, boolean> = {
    DELAYED_SHIPMENT: false,
    CRITICAL_STOCK_SHORTAGE: false,
    OVERDUE_PURCHASE_ORDER: false,
    FLEET_DOC_MAINT_EXPIRING: false,
    RMA_DEADLINE_EXPIRING: false,
    ANOMALOUS_FUEL_CONSUMPTION: false,
  }

  for (const def of LOGISTICS_ALERT_RULE_DEFINITIONS) {
    if (scope.isSupplierScoped) {
      allowedRules[def.key] = false
      continue
    }
    if (!flags[def.flagKey]) {
      allowedRules[def.key] = false
      continue
    }
    if (scope.isSuperAdmin || scope.isPlatformDeveloper) {
      allowedRules[def.key] = true
      continue
    }
    allowedRules[def.key] = await checkPermission(userId, undefined, def.moduleResource, "read")
  }

  return { scope, flags, allowedRules }
}

export async function GET() {
  try {
    const payload = await getAuthPayload()
    if (!payload) {
      return NextResponse.json({ error: "Oturum açmanız gerekiyor." }, { status: 401 })
    }

    const user: any = await (prisma as any).user
      .findUnique({ where: { id: payload.userId } })
      .catch(() => null)

    const preferences = parseUserLogisticsNotificationPrefs(
      user?.logisticsNotificationPrefsJson ?? null
    )
    const { scope, flags, allowedRules } = await resolveUserRuleAccess(
      payload.userId,
      payload.username
    )

    const canEvaluateRules =
      !scope.isSupplierScoped &&
      (scope.isSuperAdmin ||
        scope.isPlatformDeveloper ||
        Object.values(allowedRules).some(Boolean))

    return NextResponse.json({
      preferences,
      ruleDefinitions: LOGISTICS_ALERT_RULE_DEFINITIONS,
      activeFlags: flags,
      allowedRules,
      isSupplierScoped: scope.isSupplierScoped,
      canEvaluateRules,
    })
  } catch (error) {
    return handleLogisticsApiError(error)
  }
}

export async function PUT(req: Request) {
  try {
    const payload = await getAuthPayload()
    if (!payload) {
      return NextResponse.json({ error: "Oturum açmanız gerekiyor." }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const patchRules: Partial<Record<LogisticsAlertRuleKey, boolean>> = {}
    if (body?.rules && typeof body.rules === "object") {
      for (const key of ALL_LOGISTICS_ALERT_RULE_KEYS) {
        if (typeof body.rules[key] === "boolean") {
          patchRules[key] = body.rules[key]
        }
      }
    }

    const existingUser: any = await (prisma as any).user
      .findUnique({ where: { id: payload.userId } })
      .catch(() => null)

    const merged = mergeUserLogisticsNotificationPrefs(
      existingUser?.logisticsNotificationPrefsJson ?? null,
      {
        rules: patchRules,
        inAppEnabled:
          typeof body?.inAppEnabled === "boolean" ? body.inAppEnabled : undefined,
        emailDigestEnabled:
          typeof body?.emailDigestEnabled === "boolean"
            ? body.emailDigestEnabled
            : undefined,
        soundEnabled:
          typeof body?.soundEnabled === "boolean" ? body.soundEnabled : undefined,
      }
    )

    const serialized = JSON.stringify(merged)

    if (existingUser) {
      await (prisma as any).user.update({
        where: { id: payload.userId },
        data: { logisticsNotificationPrefsJson: serialized },
      })
    } else if (payload.userId !== DEBUG_USER_ID) {
      return NextResponse.json({ error: "Kullanıcı bulunamadı." }, { status: 404 })
    }

    await createAuditLog({
      userId: payload.userId,
      action: "NOTIFICATION_PREFERENCES_UPDATED",
      resource: "notifications",
      resourceId: payload.userId,
      details: { rules: merged.rules, inAppEnabled: merged.inAppEnabled },
    }).catch(() => undefined)

    return NextResponse.json({ ok: true, preferences: merged })
  } catch (error) {
    return handleLogisticsApiError(error)
  }
}

export async function POST(req: Request) {
  try {
    const payload = await getAuthPayload()
    if (!payload) {
      return NextResponse.json({ error: "Oturum açmanız gerekiyor." }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    if (body?.action !== "evaluate_rules") {
      return NextResponse.json({ error: "Geçersiz işlem." }, { status: 400 })
    }

    const { scope, allowedRules } = await resolveUserRuleAccess(
      payload.userId,
      payload.username
    )
    if (
      scope.isSupplierScoped ||
      (!scope.isSuperAdmin &&
        !scope.isPlatformDeveloper &&
        !Object.values(allowedRules).some(Boolean))
    ) {
      return NextResponse.json(
        { error: "Lojistik uyarı kurallarını çalıştırma yetkiniz yok." },
        { status: 403 }
      )
    }

    const result = await evaluateAndDispatchLogisticsAlerts({
      now: new Date(),
      recipientUserIds:
        scope.isSuperAdmin || scope.isPlatformDeveloper ? undefined : [payload.userId],
    })

    return NextResponse.json({ ok: true, evaluation: result })
  } catch (error) {
    return handleLogisticsApiError(error)
  }
}
