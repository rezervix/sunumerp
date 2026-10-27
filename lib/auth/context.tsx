"use client"

import type React from "react"

import { createContext, useContext, useState, useEffect } from "react"
import { handleResponse } from "@/lib/api/api-config"
import type { Branch, UserBranchRole, AuthSession } from "./types"
import { normalizePermissionResource, normalizePermissionsObject } from "./permissions"

interface AuthContextType {
  session: AuthSession | null
  currentBranch: Branch | null
  setCurrentBranch: (branch: Branch) => void
  userBranches: Branch[]
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  hasPermission: (resource: string, action: string) => boolean
  isSuperAdmin: boolean
  isPlatformDeveloper: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [currentBranch, setCurrentBranchState] = useState<Branch | null>(null)
  const [userBranches, setUserBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSession()
  }, [])

  const loadSession = async () => {
    try {
      const res = await fetch("/api/auth/me")
      const sessionData = await handleResponse<AuthSession>(res)
      setSession(sessionData)

      const branches = sessionData.branches.map((b: any) => b.branch)
      setUserBranches(branches)

      const storedBranch = localStorage.getItem("currentBranch")
      if (storedBranch) {
        setCurrentBranchState(JSON.parse(storedBranch))
      } else if (branches.length > 0) {
        setCurrentBranchState(branches[0])
        localStorage.setItem("currentBranch", JSON.stringify(branches[0]))
      }
    } catch (error) {
      console.error("Error loading session:", error)
      setSession(null)
      setCurrentBranchState(null)
      setUserBranches([])
      localStorage.removeItem("currentBranch")
      // Redirect to login if on dashboard
      if (typeof window !== "undefined" && window.location.pathname.startsWith("/dashboard")) {
        window.location.href = "/"
      }
    } finally {
      setLoading(false)
    }
  }

  const login = async (username: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    })

    const sessionData = await handleResponse<AuthSession>(res)
    setSession(sessionData)

    const branches = sessionData.branches.map((b: any) => b.branch)
    setUserBranches(branches)

    if (branches.length > 0) {
      setCurrentBranchState(branches[0])
      localStorage.setItem("currentBranch", JSON.stringify(branches[0]))
    }
  }

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    localStorage.removeItem("currentBranch")
    setSession(null)
    setCurrentBranchState(null)
    setUserBranches([])
    window.location.href = "/"
  }

  const setCurrentBranch = (branch: Branch) => {
    setCurrentBranchState(branch)
    localStorage.setItem("currentBranch", JSON.stringify(branch))
  }

  const hasPermission = (resource: string, action: string): boolean => {
    // loading sirasinda false donme - henuz session gelmemis olabilir
    if (loading) return true
    if (!session || !currentBranch) return false

    const normalizedResource = normalizePermissionResource(resource)

    const superAdmin = session.branches.find((ur) => ur.role?.name === "Super Admin")
    if (superAdmin) return true

    const branchRole = session.branches.find((ur) => ur.branchId === currentBranch.id)
    if (!branchRole?.role) return false

    const normalizedPermissions = normalizePermissionsObject(branchRole.role.permissions)
    const permissions = normalizedPermissions[normalizedResource]
    return permissions ? permissions.includes(action) : false
  }

  const isSuperAdmin = session?.branches.some((ur) => ur.role?.name === "Super Admin") || false
  const isPlatformDeveloper = session?.isPlatformDeveloper ?? (session?.user?.id === "local-debug-user" || false)

  return (
    <AuthContext.Provider
      value={{
        session,
        currentBranch,
        setCurrentBranch,
        userBranches,
        loading,
        login,
        logout,
        hasPermission,
        isSuperAdmin,
        isPlatformDeveloper,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
