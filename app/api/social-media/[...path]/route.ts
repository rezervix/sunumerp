import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { jwtVerify } from "jose"

const JWT_SECRET      = process.env.JWT_SECRET        || "super-secret-key-change-this"
const POSTIZ_BASE_URL = process.env.POSTIZ_BACKEND_URL || "http://localhost:3100"
const POSTIZ_API_KEY  = process.env.POSTIZ_API_KEY     || ""

/**
 * Validate the CRM's auth-token cookie before forwarding to Postiz.
 * Returns the decoded payload or null if invalid.
 */
async function validateAuth(): Promise<{ userId: string } | null> {
  try {
    const cookieStore = await cookies()
    const token       = cookieStore.get("auth-token")?.value
    if (!token) return null

    const secret      = new TextEncoder().encode(JWT_SECRET)
    const { payload } = await jwtVerify(token, secret)
    return { userId: payload.userId as string }
  } catch {
    return null
  }
}

/**
 * Build the upstream Postiz URL from the path segments and query string.
 */
function buildUpstreamUrl(pathSegments: string[], req: Request): string {
  const url = new URL(req.url)
  const upstream = `${POSTIZ_BASE_URL}/api/${pathSegments.join("/")}${url.search}`
  return upstream
}

/**
 * Forward a request to Postiz, injecting the API key header.
 */
async function forwardToPostiz(
  method: string,
  upstreamUrl: string,
  req: Request,
  userId: string
): Promise<Response> {
  // Build headers to forward (strip host/cookie, inject postiz key)
  const headers: Record<string, string> = {
    "Content-Type": req.headers.get("Content-Type") || "application/json",
    "x-postiz-api-key": POSTIZ_API_KEY,
    "x-crm-user-id": userId, // Pass CRM user identity downstream
  }

  const init: RequestInit = { method, headers }

  if (!["GET", "HEAD"].includes(method)) {
    try {
      const body = await req.text()
      if (body) init.body = body
    } catch { /* ignore empty body */ }
  }

  const upstream = await fetch(upstreamUrl, init)
  return upstream
}

// ─── Health check shortcut (no auth required for UX status indicator) ─────────
async function handleHealth(): Promise<NextResponse> {
  try {
    const res = await fetch(`${POSTIZ_BASE_URL}/healthz`, {
      signal: AbortSignal.timeout(4000),
    })
    if (res.ok) return NextResponse.json({ status: "ok" })
    return NextResponse.json({ status: "degraded" }, { status: 503 })
  } catch {
    return NextResponse.json({ status: "offline" }, { status: 503 })
  }
}

// ─── Shared handler ────────────────────────────────────────────────────────────
async function handler(
  req: Request,
  { params }: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
  const { path } = await params

  // Allow unauthenticated health checks so the UI can show backend status
  if (path.length === 1 && path[0] === "health") {
    return handleHealth()
  }

  // AI endpoint is handled by a separate dedicated route — but if it lands here, proxy it
  // All other routes require authentication
  const authResult = await validateAuth()
  if (!authResult) {
    return NextResponse.json({ error: "Kimlik doğrulama gerekli" }, { status: 401 })
  }

  const upstreamUrl = buildUpstreamUrl(path, req)

  try {
    const upstream = await forwardToPostiz(req.method, upstreamUrl, req, authResult.userId)

    // Pass the upstream response back, preserving status code
    const body        = await upstream.text()
    const contentType = upstream.headers.get("content-type") || "application/json"

    return new NextResponse(body, {
      status: upstream.status,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store",
      },
    })
  } catch (err) {
    console.error("[social-media proxy] upstream error:", err)
    return NextResponse.json(
      { error: "Postiz sunucusuna ulaşılamıyor. POSTIZ_BACKEND_URL ortam değişkenini kontrol edin." },
      { status: 502 }
    )
  }
}

export const GET    = handler
export const POST   = handler
export const PUT    = handler
export const PATCH  = handler
export const DELETE = handler
