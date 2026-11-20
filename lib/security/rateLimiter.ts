/**
 * Hafif bellek-içi kayan pencere (sliding-window) hız sınırlayıcı.
 * Webhook, herkese açık takip linki, tedarikçi portalı doğrulama ve dosya yükleme uçlarını korur.
 */

const globalForRateLimit = globalThis as unknown as {
  __sunumRateLimitStore?: Map<string, number[]>
}

function getRateLimitStore(): Map<string, number[]> {
  if (!globalForRateLimit.__sunumRateLimitStore) {
    globalForRateLimit.__sunumRateLimitStore = new Map<string, number[]>()
  }
  return globalForRateLimit.__sunumRateLimitStore
}

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  retryAfterSec: number
}

/**
 * İstek anahtarı için kayan pencere hız limitini kontrol eder.
 * Test izolasyonu için bellek store'u resetRateLimitStore ile temizlenebilir.
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const store = getRateLimitStore()
  const now = Date.now()
  const prev = store.get(key) || []
  const active = prev.filter((ts) => now - ts < windowMs)

  if (active.length >= limit) {
    const oldest = active[0] ?? now
    const retryAfterSec = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000))
    store.set(key, active)
    return {
      allowed: false,
      limit,
      remaining: 0,
      retryAfterSec,
    }
  }

  active.push(now)
  store.set(key, active)

  // Bellek büyümesini önlemek için periyodik temizlik
  if (store.size > 5000) {
    for (const [k, list] of store.entries()) {
      const fresh = list.filter((ts) => now - ts < windowMs)
      if (fresh.length === 0) store.delete(k)
    }
  }

  return {
    allowed: true,
    limit,
    remaining: Math.max(0, limit - active.length),
    retryAfterSec: 0,
  }
}

export function resolveRequestClientIp(headers: {
  get(name: string): string | null
}): string {
  const fwd = headers.get("x-forwarded-for")
  if (fwd) {
    const first = fwd.split(",")[0]?.trim()
    if (first) return first
  }
  const realIp = headers.get("x-real-ip")?.trim()
  if (realIp) return realIp
  return "local-client"
}

export function resetRateLimitStore(): void {
  getRateLimitStore().clear()
}
