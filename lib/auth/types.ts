// Authentication and Authorization Types

export interface User {
  id: string
  username: string
  email?: string
  fullName: string
  phone?: string
  avatarUrl?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Branch {
  id: string
  name: string
  code: string
  address?: string
  phone?: string
  email?: string
  managerId?: string
  managerFullName?: string
  logoUrl?: string
  themeColor: string
  timezone: string
  operationalHours?: Record<string, any>
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Role {
  id: string
  name: string
  description?: string
  permissions: Permissions
}

export interface Permissions {
  [resource: string]: string[] | undefined
  branches?: string[]
  users?: string[]
  customers?: string[]
  leads?: string[]
  financial?: string[]
  orders?: string[]
  files?: string[]
  reports?: string[]
  settings?: string[]
  b2b?: string[]
  cargo?: string[]
  chat?: string[]
  announcements?: string[]
  takvim?: string[]
  ai?: string[]
  "ajans-kutuphanesi"?: string[]
  "personel-talepleri"?: string[]
  "icerik-takvimi"?: string[]
}

export interface UserBranchRole {
  id: string
  userId: string
  branchId: string
  roleId: string
  role?: Role
  branch?: Branch
  assignedAt: string
}

export interface AuthSession {
  user: User
  branches: UserBranchRole[]
  currentBranch?: Branch
  token: string
  isPlatformDeveloper?: boolean
}

export type RoleName = "Super Admin" | "Branch Admin" | "Employee" | "Field Staff" | "Accountant"
