"use client"

import { useEffect } from "react"
import { toast } from "sonner"

export function DemoModeInterceptor() {
  useEffect(() => {
    if (typeof window === "undefined") return

    const originalFetch = window.fetch

    window.fetch = async function (...args) {
      const [input, init] = args
      const url = typeof input === "string" ? input : (input instanceof Request ? input.url : "")
      const method = (init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase()

      // Allow auth routes, session verification, push notifications, and system configs to proceed normally
      const isExempt =
        url.includes("/api/auth/") ||
        url.includes("/api/system-config") ||
        url.includes("/api/notifications/") ||
        url.includes("/api/stats")

      const isMutation = ["POST", "PUT", "DELETE", "PATCH"].includes(method)

      if (isMutation && !isExempt && url.includes("/api/")) {
        console.log(`[Sunum ERP Demo] Simüle Edilen İstek: ${method} ${url}`)

        toast.info("Demo Modu: Salt Okunur Simülasyon", {
          description: "İşlem demo ortamında başarıyla simüle edildi. Veritabanı bütünlüğü için kayıtlar kalıcı yazılmaz.",
          duration: 3500,
        })

        // Return a realistic JSON response indicating success
        return new Response(
          JSON.stringify({
            success: true,
            demoSimulated: true,
            id: `demo-sim-${Date.now()}`,
            message: "Demo modunda işlem simüle edildi",
            status: "success",
            data: { id: `demo-sim-${Date.now()}` }
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" }
          }
        )
      }

      return originalFetch.apply(this, args)
    }

    return () => {
      window.fetch = originalFetch
    }
  }, [])

  return null
}
