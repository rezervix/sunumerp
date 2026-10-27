"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"

export function SaasManager() {
  const router = useRouter()
  const pathname = usePathname()
  const [configLoaded, setConfigLoaded] = useState(false)

  // 1. Dynamic CSS Brand Kit & Redirection Logic
  useEffect(() => {
    async function loadConfig() {
      if (pathname.startsWith("/api/")) return

      try {
        // Skip integrity headers check for config retrieval in bootstrap
        const res = await fetch("/api/system-config")
        if (!res.ok) return
        const config = await res.json()

        // Apply theme colors
        if (config.themeColors) {
          const {
            primary, accent, primaryForeground, accentForeground,
            darkBackground, darkCard, darkPopover, darkSidebar, darkHeader,
            darkPrimary, darkPrimaryForeground, darkAccent, darkAccentForeground,
            darkForeground, darkMutedForeground, darkBorder
          } = config.themeColors

          const pFg = primaryForeground || "#FFFFFF"
          const aFg = accentForeground || "#FFFFFF"
          
          // Dark mode custom tokens derived from brand kit
          const dBg = darkBackground || "#171310"
          const dCard = darkCard || "#231C17"
          const dPopover = darkPopover || "#2E261F"
          const dSidebar = darkSidebar || "#1C1613"
          const dHeader = darkHeader || dSidebar
          const dPrimary = darkPrimary || primary || "#E6923C"
          const dPrimaryFg = darkPrimaryForeground || "#FFFFFF"
          const dAccent = darkAccent || accent || "#E2534B"
          const dAccentFg = darkAccentForeground || "#FFFFFF"
          const dFg = darkForeground || "#F6F3F0"
          const dMutedFg = darkMutedForeground || "#A89F95"
          const dBorder = darkBorder || "rgba(248, 239, 226, 0.1)"

          // Inject custom color styles
          let styleEl = document.getElementById("dynamic-brand-kit")
          if (!styleEl) {
            styleEl = document.createElement("style")
            styleEl.id = "dynamic-brand-kit"
            document.head.appendChild(styleEl)
          }

          styleEl.innerHTML = `
            :root {
              --primary: ${primary};
              --primary-foreground: ${pFg};
              --ring: ${primary};
              --accent: ${accent};
              --accent-foreground: ${aFg};
              --sidebar-primary: ${primary};
              --sidebar-primary-foreground: ${pFg};
              --sidebar-accent-foreground: ${primary};
            }
            .dark {
              --background: ${dBg};
              --foreground: ${dFg};
              --card: ${dCard};
              --card-foreground: ${dFg};
              --popover: ${dPopover};
              --popover-foreground: ${dFg};
              --sidebar: ${dSidebar};
              --sidebar-foreground: ${dFg};
              --sidebar-border: ${dBorder};
              --sidebar-primary: ${dPrimary};
              --sidebar-primary-foreground: ${dPrimaryFg};
              --sidebar-accent-foreground: ${dPrimary};
              --header: ${dHeader};
              --header-border: ${dBorder};
              --primary: ${dPrimary};
              --primary-foreground: ${dPrimaryFg};
              --ring: ${dPrimary};
              --accent: ${dAccent};
              --accent-foreground: ${dAccentFg};
              --muted-foreground: ${dMutedFg};
              --border: ${dBorder};
            }
          `

          // Store colors locally for immediate availability on reload
          localStorage.setItem("theme-primary", primary)
          localStorage.setItem("theme-accent", accent)
          localStorage.setItem("theme-dark-bg", dBg)
          localStorage.setItem("theme-dark-card", dCard)
          localStorage.setItem("theme-dark-primary", dPrimary)
        }

        // Apply custom logo if stored in config (prefer bgRemovedLogoUrl if available)
        const activeLogo = config.bgRemovedLogoUrl || config.logoUrl
        if (activeLogo) {
          localStorage.setItem("theme-logo", activeLogo)
        }

        // Store securityDisabled state
        if (typeof config.securityDisabled === "boolean") {
          localStorage.setItem("security-disabled", String(config.securityDisabled))
        }

        // Dispatch window event for live real-time synchronization across components
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("system-config-updated", { detail: config }))
        }

        setConfigLoaded(true)

        // Redirection checks: Only redirect if security is NOT disabled by test mode file
        if (config.tamperDetected && !config.securityDisabled) {
          // Lockdown / quarantine screen or static message
          if (pathname !== "/tamper") {
            router.replace("/tamper")
          }
          return
        }

        // Check logo & brand kit onboarding
        if (!config.onboarded) {
          if (pathname !== "/onboarding") {
            router.replace("/onboarding")
          }
          return
        }

        // Subscription check (Phase 2 Paywall)
        const sub = config.subscription
        const isSuspended = sub.status === "inactive" || sub.status === "suspended"
        
        if (isSuspended) {
          // If subscription is suspended or inactive, redirect to Paywall sales screen
          if (pathname !== "/paywall" && pathname !== "/onboarding" && pathname !== "/tamper") {
            router.replace("/paywall")
            return
          }
        }

        if (sub.plan === "free") {
          // Free plan user: can only access dashboard, settings, and support-tickets
          const allowedRoutes = [
            "/dashboard",
            "/dashboard/settings",
            "/dashboard/support-tickets",
            "/onboarding",
            "/paywall"
          ]
          const isAllowed = allowedRoutes.some(route => pathname === route || pathname === route + "/" || pathname.startsWith(route + "/"))
          // Extra check: exact /dashboard is allowed, but sub-routes under dashboard like /dashboard/orders are blocked
          if (pathname.startsWith("/dashboard")) {
            const isRootDashboard = pathname === "/dashboard" || pathname === "/dashboard/"
            const isSettingsOrSupport = pathname.startsWith("/dashboard/settings") || pathname.startsWith("/dashboard/support-tickets")
            if (!isRootDashboard && !isSettingsOrSupport) {
              router.replace("/paywall")
              return
            }
          }
        }
      } catch (err) {
        console.error("Failed to load SaaS system config:", err)
      }
    }

    loadConfig()
  }, [pathname, router])

  // 2. Global Fetch Interceptor for HMAC API Integrity (Phase 3)
  useEffect(() => {
    if (typeof window === "undefined" || (window as any).__fetchIntegrityPatched) return
    (window as any).__fetchIntegrityPatched = true

    const originalFetch = window.fetch
    window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url
      
      // Only sign requests to our own API
      if (url.startsWith("/api/") || url.startsWith(window.location.origin + "/api/")) {
        const timestamp = Date.now().toString()
        const nonce = Math.random().toString(36).substring(2, 15)
        const pathname = new URL(url, window.location.origin).pathname

        // HMAC-SHA256 calculation
        const message = `${timestamp}:${nonce}`
        const INTEGRITY_SECRET = "cicekana-erp-super-secure-integrity-key-2026"
        
        // Dynamic import CryptoJS or use SubtleCrypto
        let signature = ""
        try {
          const enc = new TextEncoder()
          const keyMaterial = await window.crypto.subtle.importKey(
            "raw",
            enc.encode(INTEGRITY_SECRET),
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["sign"]
          )
          const signatureBuffer = await window.crypto.subtle.sign(
            "HMAC",
            keyMaterial,
            enc.encode(message)
          )
          signature = Array.from(new Uint8Array(signatureBuffer))
            .map(b => b.toString(16).padStart(2, "0"))
            .join("")
        } catch (err) {
          console.error("SubtleCrypto signing failed", err)
        }

        // Apply headers
        init = init || {}
        init.headers = {
          ...init.headers,
          "x-api-integrity-timestamp": timestamp,
          "x-api-integrity-nonce": nonce,
          "x-api-integrity-signature": signature
        }
      }

      return originalFetch(input, init)
    }
  }, [])

  // 3. Phase 4: Tamper Detection (DevTools detection + Timing debugger check)
  useEffect(() => {
    if (typeof window === "undefined") return

    // Bypass anti-debugging controls on localhost/development or when test mode file exists
    const isSecurityDisabledLocally = localStorage.getItem("security-disabled") === "true"
    const isLocal = ["localhost", "127.0.0.1", "::1"].some(val => window.location.hostname.includes(val))
    if (isLocal || isSecurityDisabledLocally) return

    let tamperTriggered = false

    async function triggerTamperLockdown() {
      if (tamperTriggered) return
      
      // Re-verify if security disabled state has changed
      try {
        const res = await fetch("/api/system-config")
        if (res.ok) {
          const cfg = await res.json()
          if (cfg.securityDisabled) {
            localStorage.setItem("security-disabled", "true")
            return
          }
        }
      } catch (err) {
        // continue
      }

      tamperTriggered = true

      try {
        console.warn("[Tamper Detection] Security breach detected. Initiating lockdown...")
        await fetch("/api/system-config/tamper", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: "devtools_opened" })
        })
        window.location.href = "/tamper"
      } catch (err) {
        console.error("Failed to notify backend of security breach:", err)
      }
    }

    // A. Detect DevTools opening using timing debugger check
    const checkDebugger = () => {
      const start = Date.now()
      // eslint-disable-next-line no-debugger
      debugger
      const end = Date.now()
      if (end - start > 100) {
        // DevTools / debugger active
        triggerTamperLockdown()
      }
    }

    // B. Detect DevTools opening using window dimensions check (standard DevTools docking)
    const checkDevTools = () => {
      const threshold = 160
      const widthThreshold = window.outerWidth - window.innerWidth > threshold
      const heightThreshold = window.outerHeight - window.innerHeight > threshold
      
      if (widthThreshold || heightThreshold) {
        // Exclude startup loading states and filter small screens
        if (window.innerWidth > 400 && window.innerHeight > 400) {
          triggerTamperLockdown()
        }
      }
    }

    const interval = setInterval(() => {
      checkDebugger()
      checkDevTools()
    }, 1000)

    window.addEventListener("resize", checkDevTools)

    return () => {
      clearInterval(interval)
      window.removeEventListener("resize", checkDevTools)
    }
  }, [])

  return null
}
