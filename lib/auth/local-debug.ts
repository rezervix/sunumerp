export const DEBUG_USER_ID = "local-debug-user"
export const DEBUG_BRANCH_ID = "local-debug-branch"
export const DEBUG_ROLE_ID = "local-debug-role"

export function isLocalhostRequest(req: Request) {
  const host = req.headers.get("host") ?? ""
  const url = req.url ?? ""

  return ["localhost", "127.0.0.1", "::1"].some((value) =>
    host.includes(value) || url.includes(value)
  )
}

export function parseJsonField<T>(value: string | T | null | undefined): T | undefined {
  if (!value) return undefined
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T
    } catch {
      return undefined
    }
  }
  return value as T
}

export function createLocalDebugSession(username = "local-debug") {
  const now = new Date().toISOString()
  const displayName = username && username.trim() ? `Local ${username}` : "Local Debug User"

  return {
    user: {
      id: DEBUG_USER_ID,
      username: username || "local-debug",
      email: "local@localhost",
      fullName: displayName,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    branches: [
      {
        id: DEBUG_BRANCH_ID,
        userId: DEBUG_USER_ID,
        branchId: DEBUG_BRANCH_ID,
        roleId: DEBUG_ROLE_ID,
        assignedAt: now,
        branch: {
          id: DEBUG_BRANCH_ID,
          name: "Local Debug Branch",
          code: "LOCAL",
          address: "Yerel Geliştirme",
          phone: "",
          email: "local@localhost",
          managerId: undefined,
          managerFullName: "Local Admin",
          logoUrl: undefined,
          themeColor: "#2563eb",
          timezone: "Europe/Istanbul",
          operationalHours: undefined,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
        role: {
          id: DEBUG_ROLE_ID,
          name: "Super Admin",
          description: "Yerel hata ayıklama rolü",
          permissions: {
            dashboard: ["read"],
            branches: ["read", "create", "update", "delete", "manage_all"],
            users: ["read", "create", "update", "delete", "assign_roles"],
            customers: ["read", "create", "update", "delete", "view_all_branches"],
            leads: ["read", "create", "update", "delete", "view_all_branches"],
            financial: ["read", "create", "update", "delete", "view_all_branches"],
            orders: ["read", "create", "update", "delete", "approve", "view_all_branches"],
            files: ["read", "create", "update", "delete", "view_all_branches"],
            reports: ["read", "create", "update", "delete"],
            settings: ["manage_system", "manage_branches"],
            magaza: ["read", "create", "update", "delete"],
            b2b: ["read", "create", "update", "delete"],
            cargo: ["read", "create", "update", "delete"],
            chat: ["read", "create", "update", "delete"],
            announcements: ["read", "create", "update", "delete"],
            duyrular: ["read", "create", "update", "delete"],
            takvim: ["read", "create", "update", "delete"],
            yapilacaklar: ["read", "create", "update", "delete"],
            todos: ["read", "create", "update", "delete"],
            notlarim: ["read", "create", "update", "delete"],
            notes: ["read", "create", "update", "delete"],
            hesaplama: ["read", "create", "update", "delete"],
            socialMedia: ["read", "create", "update", "delete"],
            "sosyal-medya": ["read", "create", "update", "delete"],
            ai: ["read", "upload"],
            hr: ["read", "create", "update", "delete"],
            projects: ["read", "create", "update", "delete"],
            tasks: ["read", "create", "update", "delete"],
          },
        },
      },
    ],
  }
}
