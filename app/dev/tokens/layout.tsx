import type React from "react"
import { cookies } from "next/headers"
import { notFound, redirect } from "next/navigation"
import { jwtVerify } from "jose"
import { isPlatformDeveloperUser, isSuperAdminUser } from "@/lib/auth/server-permission"

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-change-this"

/**
 * Faz 1 Token Önizleme Koruma Katmanı:
 * 1) Yalnızca geliştirme ortamında (`NODE_ENV === "development"`) çalışır; aksi halde 404 (`notFound()`) döner.
 * 2) Rota korumalıdır: geçerli oturum (JWT cookie) ve yönetici/geliştirici yetkisi zorunludur.
 */
export default async function DevTokensLayout({
  children,
}: {
  children: React.ReactNode
}) {
  if (process.env.NODE_ENV !== "development") {
    notFound()
  }

  const cookieStore = await cookies()
  const token = cookieStore.get("auth-token")?.value

  if (!token) {
    redirect("/")
  }

  let userId: string | undefined
  let username: string | undefined
  let isDemoSession = false
  try {
    const secret = new TextEncoder().encode(JWT_SECRET)
    const { payload } = await jwtVerify(token, secret)
    userId = payload.userId as string | undefined
    username = payload.username as string | undefined
    isDemoSession = Boolean(payload.isDemo)
  } catch {
    redirect("/")
  }

  if (!userId) {
    redirect("/")
  }

  const [isAdmin, isDev] = await Promise.all([
    isSuperAdminUser(userId),
    isPlatformDeveloperUser(userId, username),
  ])

  if (!isDemoSession && !isAdmin && !isDev) {
    redirect("/dashboard")
  }

  return <>{children}</>
}
