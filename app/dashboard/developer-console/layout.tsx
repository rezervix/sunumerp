import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { jwtVerify } from "jose"
import { isPlatformDeveloperUser } from "@/lib/auth/server-permission"

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-change-this"

/**
 * Server-side layout guard for Developer Console.
 * This is the PRIMARY security layer (Tier 2).
 * Client-side useEffect redirect in page.tsx is an additional UX layer only.
 */
export default async function DeveloperConsoleLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // 1. Cookie'den JWT oku
  const cookieStore = await cookies()
  const token = cookieStore.get("auth-token")?.value

  if (!token) {
    redirect("/")
  }

  // 2. JWT doğrula
  let userId: string | undefined
  let username: string | undefined
  try {
    const secret = new TextEncoder().encode(JWT_SECRET)
    const { payload } = await jwtVerify(token, secret)
    userId = payload.userId as string
    username = payload.username as string | undefined
  } catch {
    redirect("/")
  }

  if (!userId) {
    redirect("/")
  }

  // 3. Platform developer yetkisi kontrol et (server-side, immutable)
  const isDeveloper = await isPlatformDeveloperUser(userId, username)

  if (!isDeveloper) {
    // Hassas veriyi yetkisiz kullanıcı için render etme
    redirect("/dashboard")
  }

  return <>{children}</>
}
