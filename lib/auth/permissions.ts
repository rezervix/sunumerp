// Permission checking and authorization utilities

import type { Permissions, Role, UserBranchRole } from "./types"

export const ROLE_HIERARCHY = {
  "Super Admin": 5,
  "Branch Admin": 4,
  Employee: 3,
  "Field Staff": 2,
  Accountant: 2,
  "Tedarikçi": 1,
}

export const RESOURCE_ALIASES: Record<string, string> = {
  duyurular: "announcements",
  announcements: "announcements",
  notlarim: "notes",
  notes: "notes",
  projeler: "projects",
  projects: "projects",
  kargo: "cargo",
  cargo: "cargo",
  dosyalar: "files",
  files: "files",
  magaza: "b2b",
  b2b: "b2b",
  hesaplama: "hesaplama",
  hesaplama_araci: "hesaplama",
  "sosyal-medya": "sosyal-medya",
  socialMedia: "sosyal-medya",
  sosyalmedya: "sosyal-medya",
  yapilacaklar: "todos",
  todos: "todos",
  customers: "customers",
  musteriler: "customers",
  takvim: "takvim",
  calendar: "takvim",
  "file-delivery": "files",
  filedelivery: "files",
  tasks: "tasks",
  // ── İçerik Mağazası İzin Anahtarları ──────────────────────────
  icerik_magazasi_yukle:    "icerik_magazasi_yukle",
  icerik_magazasi_sil:      "icerik_magazasi_sil",
  icerik_magazasi_onayla:   "icerik_magazasi_onayla",
  icerik_magazasi_toplu:    "icerik_magazasi_toplu",
  icerik_magazasi_analitik: "icerik_magazasi_analitik",
  trash: "trash",
  "geri-donusum": "trash",
  stok: "stok",
  inventory: "stok",
  wms: "wms",
  satinalma: "satinalma",
  procurement: "satinalma",
  omnichannel: "omnichannel",
  "stok-ai": "stok-ai",
  ekosistem: "ekosistem",
  // ── Finans & İK & Diğer Modül Aliases ──────────────────────────
  finance: "financial",
  finans: "financial",
  financial: "financial",
  hr: "hr",
  ik: "hr",
  "insan-kaynaklari": "hr",
  "personel-talepleri": "hr",
  "icerik-takvimi": "icerik-takvimi",
  "ajans-kutuphanesi": "ajans-kutuphanesi",
  "icerik-magazasi": "icerik-magazasi",
  "personel-denetim": "personel-denetim",
  // ── Üretim Modülleri İzin Anahtarları ──────────────────────────
  uretim: "uretim",
  production: "uretim",
  uretim_bom_rota: "uretim_bom_rota",
  "uretim-bom-rota": "uretim_bom_rota",
  bom_rota: "uretim_bom_rota",
  uretim_mrp_mps: "uretim_mrp_mps",
  "uretim-mrp-mps": "uretim_mrp_mps",
  mrp_mps: "uretim_mrp_mps",
  uretim_is_emri: "uretim_is_emri",
  "uretim-is-emri": "uretim_is_emri",
  "is-emirleri": "uretim_is_emri",
  is_emri: "uretim_is_emri",
  uretim_kapasite: "uretim_kapasite",
  "uretim-kapasite": "uretim_kapasite",
  kapasite: "uretim_kapasite",
  uretim_kalite: "uretim_kalite",
  "uretim-kalite": "uretim_kalite",
  kalite: "uretim_kalite",
  uretim_bakim: "uretim_bakim",
  "uretim-bakim": "uretim_bakim",
  bakim: "uretim_bakim",
  // ── Lojistik & Depo Yönetimi İzin Anahtarları ──────────────────────────
  lojistik: "lojistik",
  logistics: "lojistik",
  lojistik_wms: "lojistik_wms",
  "lojistik-wms": "lojistik_wms",
  lojistik_sevkiyat_rota: "lojistik_sevkiyat_rota",
  "lojistik-sevkiyat-rota": "lojistik_sevkiyat_rota",
  sevkiyat: "lojistik_sevkiyat_rota",
  rota: "lojistik_sevkiyat_rota",
  lojistik_tedarikci: "lojistik_tedarikci",
  "lojistik-tedarikci": "lojistik_tedarikci",
  tedarikci: "lojistik_tedarikci",
  tedarikci_portali: "tedarikci_portali",
  "tedarikci-portali": "tedarikci_portali",
  lojistik_filo: "lojistik_filo",
  "lojistik-filo": "lojistik_filo",
  filo: "lojistik_filo",
  lojistik_iade: "lojistik_iade",
  "lojistik-iade": "lojistik_iade",
  iade: "lojistik_iade",
  rma: "lojistik_iade",
}

export const PRODUCTION_PERMISSION_ACTIONS = [
  "read",
  "create",
  "update",
  "delete",
  "approve",
] as const

export type ProductionPermissionAction = (typeof PRODUCTION_PERMISSION_ACTIONS)[number]

export const PRODUCTION_PERMISSION_ACTION_LABELS: Record<ProductionPermissionAction, string> = {
  read: "Görüntüle",
  create: "Oluştur",
  update: "Düzenle",
  delete: "Sil",
  approve: "Onayla",
}

const PRODUCTION_ACTION_ALIASES: Record<string, ProductionPermissionAction> = {
  read: "read",
  view: "read",
  goruntule: "read",
  "görüntüle": "read",
  create: "create",
  write: "create",
  olustur: "create",
  "oluştur": "create",
  update: "update",
  edit: "update",
  duzenle: "update",
  "düzenle": "update",
  delete: "delete",
  sil: "delete",
  approve: "approve",
  onayla: "approve",
}

export const LOGISTICS_PERMISSION_ACTIONS = PRODUCTION_PERMISSION_ACTIONS
export const LOGISTICS_PERMISSION_ACTION_LABELS = PRODUCTION_PERMISSION_ACTION_LABELS

export function normalizeProductionPermissionAction(action: string): string {
  return PRODUCTION_ACTION_ALIASES[action.toLowerCase()] ?? action
}

export const normalizePermissionAction = normalizeProductionPermissionAction

export function normalizePermissionResource(resource: string): string {
  return RESOURCE_ALIASES[resource] ?? resource
}

export function normalizePermissionsObject(permissions: Record<string, string[] | undefined>): Record<string, string[]> {
  return Object.entries(permissions).reduce((acc, [key, value]) => {
    if (!value) return acc
    const normalizedKey = normalizePermissionResource(key)
    if (!acc[normalizedKey]) {
      acc[normalizedKey] = value
    } else {
      acc[normalizedKey] = Array.from(new Set([...acc[normalizedKey], ...value]))
    }
    return acc
  }, {} as Record<string, string[]>)
}

// Check if user has specific permission
export function hasPermission(
  userRoles: UserBranchRole[],
  branchId: string,
  resource: string,
  action: string,
): boolean {
  const normalizedResource = normalizePermissionResource(resource)

  // Super Admin has all permissions across all branches
  const superAdminRole = userRoles.find((ur) => ur.role?.name === "Super Admin")
  if (superAdminRole) return true

  // Check branch-specific permissions
  const branchRole = userRoles.find((ur) => ur.branchId === branchId)
  if (!branchRole || !branchRole.role) return false

  const permissions = normalizePermissionsObject(branchRole.role.permissions)[normalizedResource]
  if (!permissions) return false

  if (
    normalizedResource === "uretim" ||
    normalizedResource.startsWith("uretim_") ||
    normalizedResource === "lojistik" ||
    normalizedResource.startsWith("lojistik_") ||
    normalizedResource === "tedarikci_portali" ||
    normalizedResource === "stok" ||
    normalizedResource === "wms" ||
    normalizedResource === "satinalma" ||
    normalizedResource === "omnichannel"
  ) {
    const normalizedAction = normalizeProductionPermissionAction(action)
    return permissions.some((p) => normalizeProductionPermissionAction(p) === normalizedAction)
  }

  return permissions.includes(action)
}

// Check if user can access branch
export function canAccessBranch(userRoles: UserBranchRole[], branchId: string): boolean {
  // Super Admin can access all branches
  const superAdminRole = userRoles.find((ur) => ur.role?.name === "Super Admin")
  if (superAdminRole) return true

  // Check if user has any role in this branch
  return userRoles.some((ur) => ur.branchId === branchId)
}

// Get user's role in a specific branch
export function getBranchRole(userRoles: UserBranchRole[], branchId: string): Role | null {
  const branchRole = userRoles.find((ur) => ur.branchId === branchId)
  return branchRole?.role || null
}

// Check if user is Super Admin
export function isSuperAdmin(userRoles: UserBranchRole[]): boolean {
  return userRoles.some((ur) => ur.role?.name === "Super Admin")
}

// Check if user is Branch Admin for specific branch
export function isBranchAdmin(userRoles: UserBranchRole[], branchId: string): boolean {
  const role = getBranchRole(userRoles, branchId)
  return role?.name === "Branch Admin" || isSuperAdmin(userRoles)
}

// Get all accessible branches for user
export function getAccessibleBranches(userRoles: UserBranchRole[]): string[] {
  // Super Admin can access all branches - return special flag
  if (isSuperAdmin(userRoles)) {
    return ["*"]
  }

  return userRoles.map((ur) => ur.branchId)
}

// Filter data by branch access
export function filterByBranchAccess<T extends { branchId: string }>(
  data: T[],
  userRoles: UserBranchRole[],
  currentBranchId?: string,
): T[] {
  // Super Admin sees all
  if (isSuperAdmin(userRoles)) {
    // If specific branch selected, filter to that branch
    if (currentBranchId) {
      return data.filter((item) => item.branchId === currentBranchId)
    }
    return data
  }

  const accessibleBranches = getAccessibleBranches(userRoles)

  // If specific branch selected, only show that branch
  if (currentBranchId) {
    return data.filter((item) => item.branchId === currentBranchId && accessibleBranches.includes(item.branchId))
  }

  return data.filter((item) => accessibleBranches.includes(item.branchId))
}

// Default roles with permissions
export const DEFAULT_ROLES: Record<string, Permissions> = {
  "Super Admin": {
    branches: ["create", "read", "update", "delete", "manage_all"],
    users: ["create", "read", "update", "delete", "assign_roles"],
    customers: ["create", "read", "update", "delete", "view_all_branches"],
    leads: ["create", "read", "update", "delete", "view_all_branches"],
    financial: ["create", "read", "update", "delete", "view_all_branches"],
    orders: ["create", "read", "update", "delete", "approve", "view_all_branches"],
    files: ["create", "read", "update", "delete", "view_all_branches"],
    reports: ["view_all_branches"],
    settings: ["manage_system", "manage_branches"],
    takvim: ["create", "read", "update", "delete"],
    todos: ["create", "read", "update", "delete"],
    notes: ["create", "read", "update", "delete"],
    projects: ["create", "read", "update", "delete"],
    tasks: ["create", "read", "update", "delete"],
    cargo: ["create", "read", "update", "delete"],
    b2b: ["create", "read", "update", "delete"],
    hesaplama: ["create", "read", "update", "delete"],
    "sosyal-medya": ["create", "read", "update", "delete"],
    hr: ["create", "read", "update", "delete"],
    announcements: ["create", "read", "update", "delete"],
    chat: ["create", "read", "update", "delete"],
    stok: ["create", "read", "update", "delete"],
    wms: ["create", "read", "update", "delete"],
    satinalma: ["create", "read", "update", "delete"],
    omnichannel: ["create", "read", "update", "delete"],
    "stok-ai": ["create", "read", "update", "delete"],
    uretim: ["read", "create", "update", "delete", "approve"],
    uretim_bom_rota: ["read", "create", "update", "delete", "approve"],
    uretim_mrp_mps: ["read", "create", "update", "delete", "approve"],
    uretim_is_emri: ["read", "create", "update", "delete", "approve"],
    uretim_kapasite: ["read", "create", "update", "delete", "approve"],
    uretim_kalite: ["read", "create", "update", "delete", "approve"],
    uretim_bakim: ["read", "create", "update", "delete", "approve"],
    lojistik: ["read", "create", "update", "delete", "approve"],
    lojistik_wms: ["read", "create", "update", "delete", "approve"],
    lojistik_sevkiyat_rota: ["read", "create", "update", "delete", "approve"],
    lojistik_tedarikci: ["read", "create", "update", "delete", "approve"],
    lojistik_filo: ["read", "create", "update", "delete", "approve"],
    lojistik_iade: ["read", "create", "update", "delete", "approve"],
    tedarikci_portali: ["read", "create", "update", "delete", "approve"],
    trash: ["read", "restore", "purge"],
  },
  "Branch Admin": {
    branches: ["read", "update"],
    users: ["create", "read", "update", "assign_roles"],
    customers: ["create", "read", "update", "delete"],
    leads: ["create", "read", "update", "delete", "assign"],
    financial: ["create", "read", "update", "delete"],
    orders: ["create", "read", "update", "approve"],
    files: ["create", "read", "update"],
    reports: ["view_branch"],
    settings: ["manage_branch"],
    takvim: ["read", "create", "update"],
    ai: ["read", "upload"],
    projects: ["read", "create", "update"],
    todos: ["read", "create", "update"],
    notes: ["read", "create", "update"],
    hesaplama: ["read", "create"],
    b2b: ["read", "create"],
    cargo: ["read", "create", "update"],
    hr: ["read", "create"],
    "sosyal-medya": ["read", "create"],
    announcements: ["read", "create"],
    chat: ["read", "create"],
    stok: ["read", "create", "update"],
    wms: ["read", "create", "update"],
    satinalma: ["read", "create"],
    omnichannel: ["read", "create"],
    "stok-ai": ["read"],
    uretim: ["read", "create", "update", "approve"],
    uretim_bom_rota: ["read", "create", "update", "approve"],
    uretim_mrp_mps: ["read", "create", "update", "approve"],
    uretim_is_emri: ["read", "create", "update", "approve"],
    uretim_kapasite: ["read", "create", "update", "approve"],
    uretim_kalite: ["read", "create", "update", "approve"],
    uretim_bakim: ["read", "create", "update", "approve"],
    lojistik: ["read", "create", "update", "approve"],
    lojistik_wms: ["read", "create", "update", "approve"],
    lojistik_sevkiyat_rota: ["read", "create", "update", "approve"],
    lojistik_tedarikci: ["read", "create", "update", "approve"],
    lojistik_filo: ["read", "create", "update", "approve"],
    lojistik_iade: ["read", "create", "update", "approve"],
    tedarikci_portali: ["read", "create", "update"],
    trash: ["read"],
  },
  Employee: {
    branches: ["read"],
    users: ["read"],
    customers: ["create", "read", "update"],
    leads: ["create", "read", "update"],
    financial: ["read"],
    orders: ["create", "read", "update"],
    files: ["create", "read"],
    reports: ["view_own"],
    settings: [],
    takvim: ["read", "create"],
    ai: ["read"],
    projects: ["read"],
    todos: ["read", "create", "update"],
    notes: ["read", "create", "update"],
    hesaplama: ["read"],
    b2b: ["read"],
    cargo: ["read"],
    hr: ["read"],
    "sosyal-medya": ["read"],
    announcements: ["read"],
    chat: ["read", "create"],
    stok: ["read"],
    wms: ["read"],
    uretim: ["read"],
    uretim_bom_rota: ["read"],
    uretim_mrp_mps: ["read"],
    uretim_is_emri: ["read"],
    uretim_kapasite: ["read"],
    uretim_kalite: ["read"],
    uretim_bakim: ["read"],
    lojistik: ["read"],
    lojistik_wms: ["read", "update"],
    lojistik_sevkiyat_rota: ["read"],
    lojistik_tedarikci: ["read"],
    lojistik_filo: ["read"],
    lojistik_iade: ["read"],
    trash: ["read"],
  },
  "Field Staff": {
    branches: ["read"],
    users: ["read"],
    customers: ["read", "update"],
    leads: ["create", "read", "update"],
    financial: [],
    orders: ["create", "read"],
    files: ["create", "read"],
    reports: ["view_own"],
    settings: [],
    takvim: ["read"],
    ai: ["read"],
    projects: ["read"],
    todos: ["read", "create", "update"],
    notes: ["read", "create", "update"],
    cargo: ["read"],
    lojistik_sevkiyat_rota: ["read", "update"],
    lojistik_filo: ["read"],
    announcements: ["read"],
    chat: ["read", "create"],
  },
  Accountant: {
    branches: ["read"],
    users: ["read"],
    customers: ["read"],
    leads: ["read"],
    financial: ["create", "read", "update", "delete"],
    orders: ["read"],
    files: ["read"],
    reports: ["view_branch", "export"],
    settings: [],
    takvim: ["read"],
    ai: ["read"],
    hesaplama: ["read", "create"],
    announcements: ["read"],
    chat: ["read", "create"],
    todos: ["read", "create", "update"],
    notes: ["read", "create", "update"],
    satinalma: ["read"],
    omnichannel: ["read"],
    lojistik_tedarikci: ["read"],
    lojistik_iade: ["read"],
  },
  "Tedarikçi": {
    dashboard: ["read"],
    lojistik_tedarikci: ["read", "create", "update"],
    tedarikci_portali: ["read", "create", "update"],
    satinalma: ["read"],
    chat: ["read", "create"],
  },
}
