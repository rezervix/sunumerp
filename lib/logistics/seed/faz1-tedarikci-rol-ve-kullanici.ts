/**
 * Lojistik Faz 1 Seed Modülü — Kısıtlı "Tedarikçi" Rolü & Demo Tedarikçi Kullanıcısı
 *
 * Mevcut Royal Flora Holland (sup-holland-01) tedarikçi kaydını ve "local-debug-branch"
 * şubesini yeniden kullanır; mevcut kullanıcı veya rolleri değiştirmez.
 */

import bcrypt from "bcryptjs"
import { DEFAULT_ROLES } from "@/lib/auth/permissions"
import { TEDARIKCI_ROLE_NAME } from "../constants"
import type { LogisticsSeedModule } from "./framework"

export const SEED_SUPPLIER_ROLE_ID = "role-tedarikci"
export const SEED_SUPPLIER_USER_ID = "user-tedarikci-flora"
export const SEED_SUPPLIER_UBR_ID = "ubr-tedarikci-flora-1"
export const SEED_SUPPLIER_USERNAME = "tedarikci.royal"

export const faz1SupplierAuthSeedModule: LogisticsSeedModule = {
  moduleKey: "faz1_tedarikci_rol_ve_kullanici",
  phase: 1,
  seededIdsByCollection: {
    role: [SEED_SUPPLIER_ROLE_ID],
    user: [SEED_SUPPLIER_USER_ID],
    userBranchRole: [SEED_SUPPLIER_UBR_ID],
  },
  seed(db) {
    const now = "2026-11-10T09:00:00.000Z"
    const inserted: Record<string, number> = {}
    let skippedExisting = 0
    const notes: string[] = []

    if (!Array.isArray(db.role)) db.role = []
    if (!Array.isArray(db.user)) db.user = []
    if (!Array.isArray(db.userBranchRole)) db.userBranchRole = []

    // 1. Kısıtlı "Tedarikçi" rolü
    const hasRole = db.role.some(
      (r) => r.id === SEED_SUPPLIER_ROLE_ID || r.name === TEDARIKCI_ROLE_NAME
    )
    if (!hasRole) {
      db.role.push({
        id: SEED_SUPPLIER_ROLE_ID,
        name: TEDARIKCI_ROLE_NAME,
        description:
          "Dış tedarikçi portalı rolü — yalnızca firmasına atanmış satınalma, RFQ ve ASN kayıtlarına erişir.",
        permissions: JSON.stringify(DEFAULT_ROLES[TEDARIKCI_ROLE_NAME]),
      })
      inserted.role = 1
      notes.push("Tedarikçi rolü eklendi (role-tedarikci).")
    } else {
      skippedExisting++
    }

    // 2. Demo Tedarikçi Kullanıcısı (Royal Flora Holland - sup-holland-01 bağlı)
    const existingSupplier = Array.isArray(db.supplier)
      ? db.supplier.find((s) => s.id === "sup-holland-01") ?? db.supplier[0]
      : null
    const linkedSupplierId = existingSupplier?.id ?? "sup-holland-01"

    const hasUser = db.user.some(
      (u) => u.id === SEED_SUPPLIER_USER_ID || u.username === SEED_SUPPLIER_USERNAME
    )
    if (!hasUser) {
      const hashedPassword = bcrypt.hashSync("demo123", 10)
      db.user.push({
        id: SEED_SUPPLIER_USER_ID,
        username: SEED_SUPPLIER_USERNAME,
        email: existingSupplier?.email ?? "orders@royalfloraholland.com.tr",
        password: hashedPassword,
        fullName: "Arzu Kaya (Royal Flora Tedarikçi)",
        phone: existingSupplier?.phone ?? "0212 465 88 00",
        avatarUrl: null,
        department: "Dış Tedarikçi Portalı",
        position: "İhracat & Sipariş Sorumlusu",
        supplierId: linkedSupplierId,
        isActive: true,
        mustChangePassword: false,
        createdAt: now,
        updatedAt: now,
      })
      inserted.user = 1
      notes.push(`Demo tedarikçi kullanıcısı (${SEED_SUPPLIER_USERNAME} -> ${linkedSupplierId}) eklendi.`)
    } else {
      skippedExisting++
    }

    // 3. Şube-Rol Ataması (Merkez Şube)
    const defaultBranchId =
      Array.isArray(db.branch) && db.branch.some((b) => b.id === "local-debug-branch")
        ? "local-debug-branch"
        : db.branch?.[0]?.id ?? "local-debug-branch"

    const hasUbr = db.userBranchRole.some(
      (ubr) =>
        ubr.id === SEED_SUPPLIER_UBR_ID ||
        (ubr.userId === SEED_SUPPLIER_USER_ID && ubr.branchId === defaultBranchId)
    )
    if (!hasUbr) {
      db.userBranchRole.push({
        id: SEED_SUPPLIER_UBR_ID,
        userId: SEED_SUPPLIER_USER_ID,
        branchId: defaultBranchId,
        roleId: SEED_SUPPLIER_ROLE_ID,
        assignedAt: now,
        assignedBy: "lojistik-faz1-seed",
      })
      inserted.userBranchRole = 1
    } else {
      skippedExisting++
    }

    return {
      moduleKey: "faz1_tedarikci_rol_ve_kullanici",
      inserted,
      skippedExisting,
      notes,
    }
  },
}
