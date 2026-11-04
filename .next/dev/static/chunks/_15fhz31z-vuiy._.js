(()=>{"use strict";(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/components/providers/system-notification-provider.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "SystemNotificationProvider",
    ()=>SystemNotificationProvider,
    "useSystemNotification",
    ()=>useSystemNotification
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$notifications$2f$catalog$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/notifications/catalog.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$notifications$2f$sanitizer$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/notifications/sanitizer.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$notifications$2f$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/lib/notifications/service.ts [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$system$2d$banner$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/system-banner.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$system$2d$modal$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/system-modal.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/sonner/dist/index.mjs [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
;
;
;
function SystemNotificationProvider({ children }) {
    _s();
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].useEffect({
        "SystemNotificationProvider.useEffect": ()=>{
            if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
            ;
            let offlineBannerId = null;
            const handleOffline = {
                "SystemNotificationProvider.useEffect.handleOffline": ()=>{
                    offlineBannerId = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$notifications$2f$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["systemNotificationService"].showBanner({
                        id: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$notifications$2f$catalog$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["NOTIFICATION_CATALOG"].SYSTEM.INTERNET_DISCONNECTED.id,
                        category: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$notifications$2f$catalog$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["NOTIFICATION_CATALOG"].SYSTEM.INTERNET_DISCONNECTED.category,
                        title: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$notifications$2f$catalog$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["NOTIFICATION_CATALOG"].SYSTEM.INTERNET_DISCONNECTED.title,
                        message: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$notifications$2f$catalog$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["NOTIFICATION_CATALOG"].SYSTEM.INTERNET_DISCONNECTED.message
                    });
                }
            }["SystemNotificationProvider.useEffect.handleOffline"];
            const handleOnline = {
                "SystemNotificationProvider.useEffect.handleOnline": ()=>{
                    if (offlineBannerId) {
                        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$notifications$2f$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["systemNotificationService"].dismissBanner(offlineBannerId);
                        offlineBannerId = null;
                    }
                    const restoredDef = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$notifications$2f$catalog$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["NOTIFICATION_CATALOG"].SYSTEM.INTERNET_RESTORED;
                    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].success(restoredDef.message, {
                        description: restoredDef.title,
                        duration: restoredDef.autoCloseMs
                    });
                }
            }["SystemNotificationProvider.useEffect.handleOnline"];
            // Network connection speed listener
            const checkConnectionQuality = {
                "SystemNotificationProvider.useEffect.checkConnectionQuality": ()=>{
                    const conn = navigator.connection;
                    if (conn && (conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g')) {
                        const slowDef = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$notifications$2f$catalog$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["NOTIFICATION_CATALOG"].SYSTEM.SLOW_CONNECTION;
                        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].warning(slowDef.message, {
                            description: slowDef.title,
                            duration: slowDef.autoCloseMs
                        });
                    }
                }
            }["SystemNotificationProvider.useEffect.checkConnectionQuality"];
            window.addEventListener('offline', handleOffline);
            window.addEventListener('online', handleOnline);
            if (!navigator.onLine) {
                handleOffline();
            } else {
                checkConnectionQuality();
            }
            return ({
                "SystemNotificationProvider.useEffect": ()=>{
                    window.removeEventListener('offline', handleOffline);
                    window.removeEventListener('online', handleOnline);
                }
            })["SystemNotificationProvider.useEffect"];
        }
    }["SystemNotificationProvider.useEffect"], []);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$system$2d$banner$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SystemBanner"], {}, void 0, false, {
                fileName: "[project]/components/providers/system-notification-provider.tsx",
                lineNumber: 74,
                columnNumber: 7
            }, this),
            children,
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$system$2d$modal$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SystemModal"], {}, void 0, false, {
                fileName: "[project]/components/providers/system-notification-provider.tsx",
                lineNumber: 76,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/providers/system-notification-provider.tsx",
        lineNumber: 73,
        columnNumber: 5
    }, this);
}
_s(SystemNotificationProvider, "OD7bBpZva5O2jO+Puf00hKivP7c=");
_c = SystemNotificationProvider;
function useSystemNotification() {
    const notifySuccess = (title, message)=>{
        const sanitized = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$notifications$2f$sanitizer$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["sanitizeNotificationMessage"])(title, message);
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].success(sanitized.message, {
            description: sanitized.title,
            duration: 5000
        });
    };
    const notifyInfo = (title, message)=>{
        const sanitized = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$notifications$2f$sanitizer$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["sanitizeNotificationMessage"])(title, message);
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].info(sanitized.message, {
            description: sanitized.title,
            duration: 5000
        });
    };
    const notifyWarning = (title, message)=>{
        const sanitized = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$notifications$2f$sanitizer$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["sanitizeNotificationMessage"])(title, message);
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].warning(sanitized.message, {
            description: sanitized.title,
            duration: 5000
        });
    };
    const notifyError = (title, rawError)=>{
        const sanitized = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$notifications$2f$sanitizer$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["sanitizeNotificationMessage"])(title, rawError);
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error(sanitized.message, {
            description: sanitized.title,
            duration: 5000
        });
    };
    return {
        catalog: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$notifications$2f$catalog$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["NOTIFICATION_CATALOG"],
        notifySuccess,
        notifyInfo,
        notifyWarning,
        notifyError,
        showModal: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$notifications$2f$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["systemNotificationService"].showModal.bind(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$notifications$2f$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["systemNotificationService"]),
        showBanner: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$notifications$2f$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["systemNotificationService"].showBanner.bind(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$notifications$2f$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["systemNotificationService"]),
        closeModal: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$notifications$2f$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["systemNotificationService"].closeModal.bind(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$notifications$2f$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["systemNotificationService"]),
        dismissBanner: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$notifications$2f$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["systemNotificationService"].dismissBanner.bind(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$notifications$2f$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["systemNotificationService"]),
        triggerCatalogItem: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$notifications$2f$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["systemNotificationService"].triggerCatalogItem.bind(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$notifications$2f$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["systemNotificationService"])
    };
}
var _c;
__turbopack_context__.k.register(_c, "SystemNotificationProvider");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/saas-manager.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "SaasManager",
    ()=>SaasManager
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
"use client";
;
;
function SaasManager() {
    _s();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const pathname = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePathname"])();
    const [configLoaded, setConfigLoaded] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    // 1. Dynamic CSS Brand Kit & Redirection Logic
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "SaasManager.useEffect": ()=>{
            async function loadConfig() {
                if (pathname.startsWith("/api/")) return;
                try {
                    // Skip integrity headers check for config retrieval in bootstrap
                    const res = await fetch("/api/system-config");
                    if (!res.ok) return;
                    const config = await res.json();
                    // Apply theme colors
                    if (config.themeColors) {
                        const { primary, accent, primaryForeground, accentForeground, darkBackground, darkCard, darkPopover, darkSidebar, darkHeader, darkPrimary, darkPrimaryForeground, darkAccent, darkAccentForeground, darkForeground, darkMutedForeground, darkBorder } = config.themeColors;
                        const pFg = primaryForeground || "#FFFFFF";
                        const aFg = accentForeground || "#FFFFFF";
                        // Dark mode custom tokens derived from brand kit
                        const dBg = darkBackground || "#171310";
                        const dCard = darkCard || "#231C17";
                        const dPopover = darkPopover || "#2E261F";
                        const dSidebar = darkSidebar || "#1C1613";
                        const dHeader = darkHeader || dSidebar;
                        const dPrimary = darkPrimary || primary || "#E6923C";
                        const dPrimaryFg = darkPrimaryForeground || "#FFFFFF";
                        const dAccent = darkAccent || accent || "#E2534B";
                        const dAccentFg = darkAccentForeground || "#FFFFFF";
                        const dFg = darkForeground || "#F6F3F0";
                        const dMutedFg = darkMutedForeground || "#A89F95";
                        const dBorder = darkBorder || "rgba(248, 239, 226, 0.1)";
                        // Inject custom color styles
                        let styleEl = document.getElementById("dynamic-brand-kit");
                        if (!styleEl) {
                            styleEl = document.createElement("style");
                            styleEl.id = "dynamic-brand-kit";
                            document.head.appendChild(styleEl);
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
          `;
                        // Store colors locally for immediate availability on reload
                        localStorage.setItem("theme-primary", primary);
                        localStorage.setItem("theme-accent", accent);
                        localStorage.setItem("theme-dark-bg", dBg);
                        localStorage.setItem("theme-dark-card", dCard);
                        localStorage.setItem("theme-dark-primary", dPrimary);
                    }
                    // Apply custom logo if stored in config (prefer bgRemovedLogoUrl if available)
                    const activeLogo = config.bgRemovedLogoUrl || config.logoUrl;
                    if (activeLogo) {
                        localStorage.setItem("theme-logo", activeLogo);
                    }
                    // Store securityDisabled state
                    if (typeof config.securityDisabled === "boolean") {
                        localStorage.setItem("security-disabled", String(config.securityDisabled));
                    }
                    // Dispatch window event for live real-time synchronization across components
                    if ("TURBOPACK compile-time truthy", 1) {
                        window.dispatchEvent(new CustomEvent("system-config-updated", {
                            detail: config
                        }));
                    }
                    setConfigLoaded(true);
                    // Redirection checks: Only redirect if security is NOT disabled by test mode file
                    if (config.tamperDetected && !config.securityDisabled) {
                        // Lockdown / quarantine screen or static message
                        if (pathname !== "/tamper") {
                            router.replace("/tamper");
                        }
                        return;
                    }
                    // Check logo & brand kit onboarding
                    if (!config.onboarded) {
                        if (pathname !== "/onboarding") {
                            router.replace("/onboarding");
                        }
                        return;
                    }
                    // Subscription check (Phase 2 Paywall)
                    const sub = config.subscription;
                    const isSuspended = sub.status === "inactive" || sub.status === "suspended";
                    if (isSuspended) {
                        // If subscription is suspended or inactive, redirect to Paywall sales screen
                        if (pathname !== "/paywall" && pathname !== "/onboarding" && pathname !== "/tamper") {
                            router.replace("/paywall");
                            return;
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
                        ];
                        const isAllowed = allowedRoutes.some({
                            "SaasManager.useEffect.loadConfig.isAllowed": (route)=>pathname === route || pathname === route + "/" || pathname.startsWith(route + "/")
                        }["SaasManager.useEffect.loadConfig.isAllowed"]);
                        // Extra check: exact /dashboard is allowed, but sub-routes under dashboard like /dashboard/orders are blocked
                        if (pathname.startsWith("/dashboard")) {
                            const isRootDashboard = pathname === "/dashboard" || pathname === "/dashboard/";
                            const isSettingsOrSupport = pathname.startsWith("/dashboard/settings") || pathname.startsWith("/dashboard/support-tickets");
                            if (!isRootDashboard && !isSettingsOrSupport) {
                                router.replace("/paywall");
                                return;
                            }
                        }
                    }
                } catch (err) {
                    console.error("Failed to load SaaS system config:", err);
                }
            }
            loadConfig();
        }
    }["SaasManager.useEffect"], [
        pathname,
        router
    ]);
    // 2. Global Fetch Interceptor for HMAC API Integrity (Phase 3)
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "SaasManager.useEffect": ()=>{
            if (("TURBOPACK compile-time value", "object") === "undefined" || window.__fetchIntegrityPatched) return;
            window.__fetchIntegrityPatched = true;
            const originalFetch = window.fetch;
            window.fetch = ({
                "SaasManager.useEffect": async function(input, init) {
                    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
                    // Only sign requests to our own API
                    if (url.startsWith("/api/") || url.startsWith(window.location.origin + "/api/")) {
                        const timestamp = Date.now().toString();
                        const nonce = Math.random().toString(36).substring(2, 15);
                        const pathname = new URL(url, window.location.origin).pathname;
                        // HMAC-SHA256 calculation
                        const message = `${timestamp}:${nonce}`;
                        const INTEGRITY_SECRET = "cicekana-erp-super-secure-integrity-key-2026";
                        // Dynamic import CryptoJS or use SubtleCrypto
                        let signature = "";
                        try {
                            const enc = new TextEncoder();
                            const keyMaterial = await window.crypto.subtle.importKey("raw", enc.encode(INTEGRITY_SECRET), {
                                name: "HMAC",
                                hash: "SHA-256"
                            }, false, [
                                "sign"
                            ]);
                            const signatureBuffer = await window.crypto.subtle.sign("HMAC", keyMaterial, enc.encode(message));
                            signature = Array.from(new Uint8Array(signatureBuffer)).map({
                                "SaasManager.useEffect": (b)=>b.toString(16).padStart(2, "0")
                            }["SaasManager.useEffect"]).join("");
                        } catch (err) {
                            console.error("SubtleCrypto signing failed", err);
                        }
                        // Apply headers
                        init = init || {};
                        init.headers = {
                            ...init.headers,
                            "x-api-integrity-timestamp": timestamp,
                            "x-api-integrity-nonce": nonce,
                            "x-api-integrity-signature": signature
                        };
                    }
                    return originalFetch(input, init);
                }
            })["SaasManager.useEffect"];
        }
    }["SaasManager.useEffect"], []);
    // 3. Phase 4: Tamper Detection (DevTools detection + Timing debugger check)
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "SaasManager.useEffect": ()=>{
            if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
            ;
            // Bypass anti-debugging controls on localhost/development or when test mode file exists
            const isSecurityDisabledLocally = localStorage.getItem("security-disabled") === "true";
            const isLocal = [
                "localhost",
                "127.0.0.1",
                "::1"
            ].some({
                "SaasManager.useEffect.isLocal": (val)=>window.location.hostname.includes(val)
            }["SaasManager.useEffect.isLocal"]);
            if (isLocal || isSecurityDisabledLocally) return;
            let tamperTriggered = false;
            async function triggerTamperLockdown() {
                if (tamperTriggered) return;
                // Re-verify if security disabled state has changed
                try {
                    const res = await fetch("/api/system-config");
                    if (res.ok) {
                        const cfg = await res.json();
                        if (cfg.securityDisabled) {
                            localStorage.setItem("security-disabled", "true");
                            return;
                        }
                    }
                } catch (err) {
                // continue
                }
                tamperTriggered = true;
                try {
                    console.warn("[Tamper Detection] Security breach detected. Initiating lockdown...");
                    await fetch("/api/system-config/tamper", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            reason: "devtools_opened"
                        })
                    });
                    window.location.href = "/tamper";
                } catch (err) {
                    console.error("Failed to notify backend of security breach:", err);
                }
            }
            // A. Detect DevTools opening using timing debugger check
            const checkDebugger = {
                "SaasManager.useEffect.checkDebugger": ()=>{
                    const start = Date.now();
                    // eslint-disable-next-line no-debugger
                    debugger;
                    const end = Date.now();
                    if (end - start > 100) {
                        // DevTools / debugger active
                        triggerTamperLockdown();
                    }
                }
            }["SaasManager.useEffect.checkDebugger"];
            // B. Detect DevTools opening using window dimensions check (standard DevTools docking)
            const checkDevTools = {
                "SaasManager.useEffect.checkDevTools": ()=>{
                    const threshold = 160;
                    const widthThreshold = window.outerWidth - window.innerWidth > threshold;
                    const heightThreshold = window.outerHeight - window.innerHeight > threshold;
                    if (widthThreshold || heightThreshold) {
                        // Exclude startup loading states and filter small screens
                        if (window.innerWidth > 400 && window.innerHeight > 400) {
                            triggerTamperLockdown();
                        }
                    }
                }
            }["SaasManager.useEffect.checkDevTools"];
            const interval = setInterval({
                "SaasManager.useEffect.interval": ()=>{
                    checkDebugger();
                    checkDevTools();
                }
            }["SaasManager.useEffect.interval"], 1000);
            window.addEventListener("resize", checkDevTools);
            return ({
                "SaasManager.useEffect": ()=>{
                    clearInterval(interval);
                    window.removeEventListener("resize", checkDevTools);
                }
            })["SaasManager.useEffect"];
        }
    }["SaasManager.useEffect"], []);
    return null;
}
_s(SaasManager, "uMbkm/Fz+pXeyGKF+dTa68AIcaU=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePathname"]
    ];
});
_c = SaasManager;
var _c;
__turbopack_context__.k.register(_c, "SaasManager");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/theme-provider.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ThemeProvider",
    ()=>ThemeProvider
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$themes$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next-themes/dist/index.mjs [app-client] (ecmascript)");
'use client';
;
;
function ThemeProvider({ children, ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$themes$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ThemeProvider"], {
        ...props,
        children: children
    }, void 0, false, {
        fileName: "[project]/components/theme-provider.tsx",
        lineNumber: 10,
        columnNumber: 10
    }, this);
}
_c = ThemeProvider;
var _c;
__turbopack_context__.k.register(_c, "ThemeProvider");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/ui/sonner.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "SonnerToaster",
    ()=>Toaster,
    "Toaster",
    ()=>Toaster
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$themes$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next-themes/dist/index.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/sonner/dist/index.mjs [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
const Toaster = ({ ...props })=>{
    _s();
    const { theme = 'system' } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$themes$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTheme"])();
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Toaster"], {
        theme: theme,
        className: "toaster group",
        richColors: true,
        position: "top-right",
        duration: 5000,
        toastOptions: {
            className: 'font-sans font-medium text-sm shadow-xl border rounded-lg'
        },
        style: {
            '--normal-bg': 'var(--popover)',
            '--normal-text': 'var(--popover-foreground)',
            '--normal-border': 'var(--border)'
        },
        ...props
    }, void 0, false, {
        fileName: "[project]/components/ui/sonner.tsx",
        lineNumber: 10,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
_s(Toaster, "bbCbBsvL7+LiaR8ofHlkcwveh/Y=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$themes$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTheme"]
    ];
});
_c = Toaster;
;
var _c;
__turbopack_context__.k.register(_c, "Toaster");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/ui/system-banner.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "SystemBanner",
    ()=>SystemBanner
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$notifications$2f$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/lib/notifications/service.ts [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/utils.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
function SystemBanner() {
    _s();
    const [banners, setBanners] = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].useState([]);
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].useEffect({
        "SystemBanner.useEffect": ()=>{
            setBanners(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$notifications$2f$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["systemNotificationService"].getBanners());
            const unsubscribe = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$notifications$2f$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["systemNotificationService"].subscribe({
                "SystemBanner.useEffect.unsubscribe": ()=>{
                    setBanners([
                        ...__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$notifications$2f$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["systemNotificationService"].getBanners()
                    ]);
                }
            }["SystemBanner.useEffect.unsubscribe"]);
            return ({
                "SystemBanner.useEffect": ()=>{
                    unsubscribe();
                }
            })["SystemBanner.useEffect"];
        }
    }["SystemBanner.useEffect"], []);
    if (!banners.length) return null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "w-full flex flex-col gap-1 z-[90] sticky top-0 shadow-md transition-all",
        children: banners.map((banner)=>{
            const isSuccess = banner.category === 'SUCCESS';
            const isInfo = banner.category === 'INFO';
            const isWarning = banner.category === 'WARNING';
            const isError = banner.category === 'ERROR';
            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('w-full px-4 py-3 flex items-center justify-between text-sm font-medium transition-colors border-b', isSuccess && 'bg-emerald-600 text-white border-emerald-700 dark:bg-emerald-700', isInfo && 'bg-blue-600 text-white border-blue-700 dark:bg-blue-700', isWarning && 'bg-amber-500 text-slate-950 border-amber-600 dark:bg-amber-600 dark:text-white', isError && 'bg-rose-600 text-white border-rose-700 dark:bg-rose-700'),
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex items-center gap-3 max-w-7xl mx-auto w-full",
                    children: [
                        isSuccess && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CheckCircle2"], {
                            className: "h-5 w-5 shrink-0"
                        }, void 0, false, {
                            fileName: "[project]/components/ui/system-banner.tsx",
                            lineNumber: 43,
                            columnNumber: 29
                        }, this),
                        isInfo && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Info"], {
                            className: "h-5 w-5 shrink-0"
                        }, void 0, false, {
                            fileName: "[project]/components/ui/system-banner.tsx",
                            lineNumber: 44,
                            columnNumber: 26
                        }, this),
                        isWarning && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AlertTriangle"], {
                            className: "h-5 w-5 shrink-0"
                        }, void 0, false, {
                            fileName: "[project]/components/ui/system-banner.tsx",
                            lineNumber: 45,
                            columnNumber: 29
                        }, this),
                        isError && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AlertCircle"], {
                            className: "h-5 w-5 shrink-0"
                        }, void 0, false, {
                            fileName: "[project]/components/ui/system-banner.tsx",
                            lineNumber: 46,
                            columnNumber: 27
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex-1 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "font-semibold",
                                    children: banner.title
                                }, void 0, false, {
                                    fileName: "[project]/components/ui/system-banner.tsx",
                                    lineNumber: 49,
                                    columnNumber: 17
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "opacity-95 font-normal",
                                    children: banner.message
                                }, void 0, false, {
                                    fileName: "[project]/components/ui/system-banner.tsx",
                                    lineNumber: 50,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/ui/system-banner.tsx",
                            lineNumber: 48,
                            columnNumber: 15
                        }, this),
                        banner.actionLabel && banner.onAction && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: banner.onAction,
                            className: "px-3 py-1 text-xs font-semibold rounded bg-white/20 hover:bg-white/30 transition-colors shrink-0",
                            children: banner.actionLabel
                        }, void 0, false, {
                            fileName: "[project]/components/ui/system-banner.tsx",
                            lineNumber: 54,
                            columnNumber: 17
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: ()=>{
                                banner.onDismiss?.();
                                __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$notifications$2f$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["systemNotificationService"].dismissBanner(banner.id);
                            },
                            className: "p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors shrink-0",
                            "aria-label": "Kapat",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["X"], {
                                className: "h-4 w-4"
                            }, void 0, false, {
                                fileName: "[project]/components/ui/system-banner.tsx",
                                lineNumber: 70,
                                columnNumber: 17
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/components/ui/system-banner.tsx",
                            lineNumber: 62,
                            columnNumber: 15
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/ui/system-banner.tsx",
                    lineNumber: 42,
                    columnNumber: 13
                }, this)
            }, banner.id, false, {
                fileName: "[project]/components/ui/system-banner.tsx",
                lineNumber: 32,
                columnNumber: 11
            }, this);
        })
    }, void 0, false, {
        fileName: "[project]/components/ui/system-banner.tsx",
        lineNumber: 24,
        columnNumber: 5
    }, this);
}
_s(SystemBanner, "hrLvPCLPHM6cpg7gXxBBGT80Iz0=");
_c = SystemBanner;
var _c;
__turbopack_context__.k.register(_c, "SystemBanner");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/ui/system-modal.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "SystemModal",
    ()=>SystemModal
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$notifications$2f$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/lib/notifications/service.ts [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/utils.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
function SystemModal() {
    _s();
    const [activeModal, setActiveModal] = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].useState(null);
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].useEffect({
        "SystemModal.useEffect": ()=>{
            setActiveModal(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$notifications$2f$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["systemNotificationService"].getActiveModal());
            const unsubscribe = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$notifications$2f$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["systemNotificationService"].subscribe({
                "SystemModal.useEffect.unsubscribe": ()=>{
                    setActiveModal(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$notifications$2f$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["systemNotificationService"].getActiveModal());
                }
            }["SystemModal.useEffect.unsubscribe"]);
            return ({
                "SystemModal.useEffect": ()=>{
                    unsubscribe();
                }
            })["SystemModal.useEffect"];
        }
    }["SystemModal.useEffect"], []);
    if (!activeModal) return null;
    const isSuccess = activeModal.category === 'SUCCESS';
    const isInfo = activeModal.category === 'INFO';
    const isWarning = activeModal.category === 'WARNING';
    const isError = activeModal.category === 'ERROR';
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "relative w-full max-w-lg rounded-xl bg-background border border-border p-6 shadow-2xl transition-all",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex items-start gap-4",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('p-3 rounded-full shrink-0', isSuccess && 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', isInfo && 'bg-blue-500/10 text-blue-600 dark:text-blue-400', isWarning && 'bg-amber-500/10 text-amber-600 dark:text-amber-400', isError && 'bg-rose-500/10 text-rose-600 dark:text-rose-400'),
                            children: [
                                isSuccess && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CheckCircle2"], {
                                    className: "h-7 w-7"
                                }, void 0, false, {
                                    fileName: "[project]/components/ui/system-modal.tsx",
                                    lineNumber: 42,
                                    columnNumber: 27
                                }, this),
                                isInfo && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Info"], {
                                    className: "h-7 w-7"
                                }, void 0, false, {
                                    fileName: "[project]/components/ui/system-modal.tsx",
                                    lineNumber: 43,
                                    columnNumber: 24
                                }, this),
                                isWarning && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AlertTriangle"], {
                                    className: "h-7 w-7"
                                }, void 0, false, {
                                    fileName: "[project]/components/ui/system-modal.tsx",
                                    lineNumber: 44,
                                    columnNumber: 27
                                }, this),
                                isError && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AlertCircle"], {
                                    className: "h-7 w-7"
                                }, void 0, false, {
                                    fileName: "[project]/components/ui/system-modal.tsx",
                                    lineNumber: 45,
                                    columnNumber: 25
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/ui/system-modal.tsx",
                            lineNumber: 33,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex-1",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                    className: "text-lg font-semibold text-foreground",
                                    children: activeModal.title
                                }, void 0, false, {
                                    fileName: "[project]/components/ui/system-modal.tsx",
                                    lineNumber: 49,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "mt-2 text-sm text-muted-foreground leading-relaxed",
                                    children: activeModal.message
                                }, void 0, false, {
                                    fileName: "[project]/components/ui/system-modal.tsx",
                                    lineNumber: 50,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/ui/system-modal.tsx",
                            lineNumber: 48,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: ()=>{
                                activeModal.onCancel?.();
                                __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$notifications$2f$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["systemNotificationService"].closeModal();
                            },
                            className: "text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors",
                            "aria-label": "Kapat",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["X"], {
                                className: "h-5 w-5"
                            }, void 0, false, {
                                fileName: "[project]/components/ui/system-modal.tsx",
                                lineNumber: 61,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/components/ui/system-modal.tsx",
                            lineNumber: 53,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/ui/system-modal.tsx",
                    lineNumber: 32,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "mt-6 flex items-center justify-end gap-3",
                    children: [
                        activeModal.cancelText && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: ()=>{
                                activeModal.onCancel?.();
                                __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$notifications$2f$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["systemNotificationService"].closeModal();
                            },
                            className: "px-4 py-2 text-sm font-medium rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors",
                            children: activeModal.cancelText
                        }, void 0, false, {
                            fileName: "[project]/components/ui/system-modal.tsx",
                            lineNumber: 68,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: ()=>{
                                activeModal.onConfirm?.();
                                __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$notifications$2f$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["systemNotificationService"].closeModal();
                            },
                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('px-4 py-2 text-sm font-semibold rounded-md text-white shadow-sm transition-colors', isSuccess && 'bg-emerald-600 hover:bg-emerald-700', isInfo && 'bg-blue-600 hover:bg-blue-700', isWarning && 'bg-amber-600 hover:bg-amber-700', isError && 'bg-rose-600 hover:bg-rose-700'),
                            children: activeModal.confirmText || 'Tamam'
                        }, void 0, false, {
                            fileName: "[project]/components/ui/system-modal.tsx",
                            lineNumber: 79,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/ui/system-modal.tsx",
                    lineNumber: 66,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/components/ui/system-modal.tsx",
            lineNumber: 30,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/components/ui/system-modal.tsx",
        lineNumber: 29,
        columnNumber: 5
    }, this);
}
_s(SystemModal, "LG3fgg4wxD+jwLpUAdbt+HoUnsY=");
_c = SystemModal;
var _c;
__turbopack_context__.k.register(_c, "SystemModal");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/ui/toast.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Toast",
    ()=>Toast,
    "ToastAction",
    ()=>ToastAction,
    "ToastClose",
    ()=>ToastClose,
    "ToastDescription",
    ()=>ToastDescription,
    "ToastProvider",
    ()=>ToastProvider,
    "ToastTitle",
    ()=>ToastTitle,
    "ToastViewport",
    ()=>ToastViewport
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$toast$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@radix-ui/react-toast/dist/index.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$class$2d$variance$2d$authority$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/class-variance-authority/dist/index.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/utils.ts [app-client] (ecmascript)");
'use client';
;
;
;
;
;
;
const ToastProvider = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$toast$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Provider"];
const ToastViewport = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["forwardRef"](_c = ({ className, ...props }, ref)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$toast$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Viewport"], {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]', className),
        ...props
    }, void 0, false, {
        fileName: "[project]/components/ui/toast.tsx",
        lineNumber: 16,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0)));
_c1 = ToastViewport;
ToastViewport.displayName = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$toast$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Viewport"].displayName;
const toastVariants = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$class$2d$variance$2d$authority$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cva"])('group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full', {
    variants: {
        variant: {
            default: 'border bg-background text-foreground',
            destructive: 'destructive group border-destructive bg-destructive text-destructive-foreground'
        }
    },
    defaultVariants: {
        variant: 'default'
    }
});
const Toast = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["forwardRef"](_c2 = ({ className, variant, ...props }, ref)=>{
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$toast$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Root"], {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])(toastVariants({
            variant
        }), className),
        ...props
    }, void 0, false, {
        fileName: "[project]/components/ui/toast.tsx",
        lineNumber: 49,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
});
_c3 = Toast;
Toast.displayName = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$toast$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Root"].displayName;
const ToastAction = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["forwardRef"](_c4 = ({ className, ...props }, ref)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$toast$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Action"], {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-muted/40 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive', className),
        ...props
    }, void 0, false, {
        fileName: "[project]/components/ui/toast.tsx",
        lineNumber: 62,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0)));
_c5 = ToastAction;
ToastAction.displayName = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$toast$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Action"].displayName;
const ToastClose = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["forwardRef"](_c6 = ({ className, ...props }, ref)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$toast$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Close"], {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100 group-[.destructive]:text-red-300 group-[.destructive]:hover:text-red-50 group-[.destructive]:focus:ring-red-400 group-[.destructive]:focus:ring-offset-red-600', className),
        "toast-close": "",
        ...props,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["X"], {
            className: "h-4 w-4"
        }, void 0, false, {
            fileName: "[project]/components/ui/toast.tsx",
            lineNumber: 86,
            columnNumber: 5
        }, ("TURBOPACK compile-time value", void 0))
    }, void 0, false, {
        fileName: "[project]/components/ui/toast.tsx",
        lineNumber: 77,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0)));
_c7 = ToastClose;
ToastClose.displayName = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$toast$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Close"].displayName;
const ToastTitle = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["forwardRef"](_c8 = ({ className, ...props }, ref)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$toast$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Title"], {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('text-sm font-semibold', className),
        ...props
    }, void 0, false, {
        fileName: "[project]/components/ui/toast.tsx",
        lineNumber: 95,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0)));
_c9 = ToastTitle;
ToastTitle.displayName = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$toast$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Title"].displayName;
const ToastDescription = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["forwardRef"](_c10 = ({ className, ...props }, ref)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$toast$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Description"], {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('text-sm opacity-90', className),
        ...props
    }, void 0, false, {
        fileName: "[project]/components/ui/toast.tsx",
        lineNumber: 107,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0)));
_c11 = ToastDescription;
ToastDescription.displayName = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$toast$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Description"].displayName;
;
var _c, _c1, _c2, _c3, _c4, _c5, _c6, _c7, _c8, _c9, _c10, _c11;
__turbopack_context__.k.register(_c, "ToastViewport$React.forwardRef");
__turbopack_context__.k.register(_c1, "ToastViewport");
__turbopack_context__.k.register(_c2, "Toast$React.forwardRef");
__turbopack_context__.k.register(_c3, "Toast");
__turbopack_context__.k.register(_c4, "ToastAction$React.forwardRef");
__turbopack_context__.k.register(_c5, "ToastAction");
__turbopack_context__.k.register(_c6, "ToastClose$React.forwardRef");
__turbopack_context__.k.register(_c7, "ToastClose");
__turbopack_context__.k.register(_c8, "ToastTitle$React.forwardRef");
__turbopack_context__.k.register(_c9, "ToastTitle");
__turbopack_context__.k.register(_c10, "ToastDescription$React.forwardRef");
__turbopack_context__.k.register(_c11, "ToastDescription");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/ui/toaster.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Toaster",
    ()=>Toaster
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$hooks$2f$use$2d$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/hooks/use-toast.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$toast$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/toast.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
function Toaster() {
    _s();
    const { toasts } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$hooks$2f$use$2d$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useToast"])();
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$toast$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ToastProvider"], {
        children: [
            toasts.map(function({ id, title, description, action, ...props }) {
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$toast$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Toast"], {
                    ...props,
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "grid gap-1",
                            children: [
                                title && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$toast$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ToastTitle"], {
                                    children: title
                                }, void 0, false, {
                                    fileName: "[project]/components/ui/toaster.tsx",
                                    lineNumber: 22,
                                    columnNumber: 25
                                }, this),
                                description && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$toast$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ToastDescription"], {
                                    children: description
                                }, void 0, false, {
                                    fileName: "[project]/components/ui/toaster.tsx",
                                    lineNumber: 24,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/ui/toaster.tsx",
                            lineNumber: 21,
                            columnNumber: 13
                        }, this),
                        action,
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$toast$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ToastClose"], {}, void 0, false, {
                            fileName: "[project]/components/ui/toaster.tsx",
                            lineNumber: 28,
                            columnNumber: 13
                        }, this)
                    ]
                }, id, true, {
                    fileName: "[project]/components/ui/toaster.tsx",
                    lineNumber: 20,
                    columnNumber: 11
                }, this);
            }),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$toast$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ToastViewport"], {}, void 0, false, {
                fileName: "[project]/components/ui/toaster.tsx",
                lineNumber: 32,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/ui/toaster.tsx",
        lineNumber: 17,
        columnNumber: 5
    }, this);
}
_s(Toaster, "1YTCnXrq2qRowe0H/LBWLjtXoYc=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$hooks$2f$use$2d$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useToast"]
    ];
});
_c = Toaster;
var _c;
__turbopack_context__.k.register(_c, "Toaster");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/hooks/use-toast.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "reducer",
    ()=>reducer,
    "toast",
    ()=>toast,
    "useToast",
    ()=>useToast
]);
// Inspired by react-hot-toast library
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
'use client';
;
const TOAST_LIMIT = 1;
const TOAST_REMOVE_DELAY = 1000000;
const actionTypes = {
    ADD_TOAST: 'ADD_TOAST',
    UPDATE_TOAST: 'UPDATE_TOAST',
    DISMISS_TOAST: 'DISMISS_TOAST',
    REMOVE_TOAST: 'REMOVE_TOAST'
};
let count = 0;
function genId() {
    count = (count + 1) % Number.MAX_SAFE_INTEGER;
    return count.toString();
}
const toastTimeouts = new Map();
const addToRemoveQueue = (toastId)=>{
    if (toastTimeouts.has(toastId)) {
        return;
    }
    const timeout = setTimeout(()=>{
        toastTimeouts.delete(toastId);
        dispatch({
            type: 'REMOVE_TOAST',
            toastId: toastId
        });
    }, TOAST_REMOVE_DELAY);
    toastTimeouts.set(toastId, timeout);
};
const reducer = (state, action)=>{
    switch(action.type){
        case 'ADD_TOAST':
            return {
                ...state,
                toasts: [
                    action.toast,
                    ...state.toasts
                ].slice(0, TOAST_LIMIT)
            };
        case 'UPDATE_TOAST':
            return {
                ...state,
                toasts: state.toasts.map((t)=>t.id === action.toast.id ? {
                        ...t,
                        ...action.toast
                    } : t)
            };
        case 'DISMISS_TOAST':
            {
                const { toastId } = action;
                // ! Side effects ! - This could be extracted into a dismissToast() action,
                // but I'll keep it here for simplicity
                if (toastId) {
                    addToRemoveQueue(toastId);
                } else {
                    state.toasts.forEach((toast)=>{
                        addToRemoveQueue(toast.id);
                    });
                }
                return {
                    ...state,
                    toasts: state.toasts.map((t)=>t.id === toastId || toastId === undefined ? {
                            ...t,
                            open: false
                        } : t)
                };
            }
        case 'REMOVE_TOAST':
            if (action.toastId === undefined) {
                return {
                    ...state,
                    toasts: []
                };
            }
            return {
                ...state,
                toasts: state.toasts.filter((t)=>t.id !== action.toastId)
            };
    }
};
const listeners = [];
let memoryState = {
    toasts: []
};
function dispatch(action) {
    memoryState = reducer(memoryState, action);
    listeners.forEach((listener)=>{
        listener(memoryState);
    });
}
function toast({ ...props }) {
    const id = genId();
    const update = (props)=>dispatch({
            type: 'UPDATE_TOAST',
            toast: {
                ...props,
                id
            }
        });
    const dismiss = ()=>dispatch({
            type: 'DISMISS_TOAST',
            toastId: id
        });
    dispatch({
        type: 'ADD_TOAST',
        toast: {
            ...props,
            id,
            open: true,
            onOpenChange: (open)=>{
                if (!open) dismiss();
            }
        }
    });
    return {
        id: id,
        dismiss,
        update
    };
}
function useToast() {
    _s();
    const [state, setState] = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"](memoryState);
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"]({
        "useToast.useEffect": ()=>{
            listeners.push(setState);
            return ({
                "useToast.useEffect": ()=>{
                    const index = listeners.indexOf(setState);
                    if (index > -1) {
                        listeners.splice(index, 1);
                    }
                }
            })["useToast.useEffect"];
        }
    }["useToast.useEffect"], [
        state
    ]);
    return {
        ...state,
        toast,
        dismiss: (toastId)=>dispatch({
                type: 'DISMISS_TOAST',
                toastId
            })
    };
}
_s(useToast, "SPWE98mLGnlsnNfIwu/IAKTSZtk=");
;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/api/api-config.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * API Configuration
 * Centralized configuration for API base URL and other settings.
 */ // In client-side browser, always use relative URLs ('') so it works seamlessly on any domain/demo.
// On server-side, fallback to VERCEL_URL or localhost.
__turbopack_context__.s([
    "API_BASE",
    ()=>API_BASE,
    "BASE_URL",
    ()=>BASE_URL,
    "handleResponse",
    ()=>handleResponse
]);
const BASE_URL = ("TURBOPACK compile-time truthy", 1) ? '' : "TURBOPACK unreachable";
const API_BASE = `${BASE_URL}/api`;
async function handleResponse(res) {
    const contentType = res.headers.get("content-type");
    const isJson = contentType?.includes("application/json");
    if (!res.ok) {
        if (isJson) {
            const errorData = await res.json();
            throw new Error(errorData.error || `Request failed with status ${res.status}`);
        }
        const text = await res.text();
        console.error("Non-JSON error response:", text.substring(0, 200));
        throw new Error(`Server error: ${res.status} ${res.statusText}`);
    }
    if (!isJson) {
        const text = await res.text();
        console.error("Expected JSON but got:", text.substring(0, 200));
        throw new Error("Invalid response format from server (expected JSON)");
    }
    return await res.json();
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/auth/context.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AuthProvider",
    ()=>AuthProvider,
    "useAuth",
    ()=>useAuth
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2f$api$2d$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/api/api-config.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2f$permissions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/auth/permissions.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
"use client";
;
;
;
const AuthContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createContext"])(undefined);
function AuthProvider({ children }) {
    _s();
    const [session, setSession] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [currentBranch, setCurrentBranchState] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [userBranches, setUserBranches] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "AuthProvider.useEffect": ()=>{
            loadSession();
        }
    }["AuthProvider.useEffect"], []);
    const loadSession = async ()=>{
        try {
            const res = await fetch("/api/auth/me");
            const sessionData = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2f$api$2d$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["handleResponse"])(res);
            setSession(sessionData);
            const branches = sessionData.branches.map((b)=>b.branch);
            setUserBranches(branches);
            const storedBranch = localStorage.getItem("currentBranch");
            if (storedBranch) {
                setCurrentBranchState(JSON.parse(storedBranch));
            } else if (branches.length > 0) {
                setCurrentBranchState(branches[0]);
                localStorage.setItem("currentBranch", JSON.stringify(branches[0]));
            }
        } catch (error) {
            console.error("Error loading session:", error);
            setSession(null);
            setCurrentBranchState(null);
            setUserBranches([]);
            localStorage.removeItem("currentBranch");
            // Redirect to login if on dashboard
            if (("TURBOPACK compile-time value", "object") !== "undefined" && window.location.pathname.startsWith("/dashboard")) {
                window.location.href = "/";
            }
        } finally{
            setLoading(false);
        }
    };
    const login = async (username, password)=>{
        const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                username,
                password
            })
        });
        const sessionData = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2f$api$2d$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["handleResponse"])(res);
        setSession(sessionData);
        const branches = sessionData.branches.map((b)=>b.branch);
        setUserBranches(branches);
        if (branches.length > 0) {
            setCurrentBranchState(branches[0]);
            localStorage.setItem("currentBranch", JSON.stringify(branches[0]));
        }
    };
    const loginAsDemo = async ()=>{
        const res = await fetch("/api/auth/demo", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            }
        });
        const sessionData = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2f$api$2d$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["handleResponse"])(res);
        setSession(sessionData);
        const branches = sessionData.branches.map((b)=>b.branch);
        setUserBranches(branches);
        if (branches.length > 0) {
            setCurrentBranchState(branches[0]);
            localStorage.setItem("currentBranch", JSON.stringify(branches[0]));
        }
    };
    const logout = async ()=>{
        await fetch("/api/auth/logout", {
            method: "POST"
        });
        localStorage.removeItem("currentBranch");
        setSession(null);
        setCurrentBranchState(null);
        setUserBranches([]);
        window.location.href = "/?from=logout";
    };
    const setCurrentBranch = (branch)=>{
        setCurrentBranchState(branch);
        localStorage.setItem("currentBranch", JSON.stringify(branch));
    };
    const hasPermission = (resource, action)=>{
        // loading sirasinda false donme - henuz session gelmemis olabilir
        if (loading) return true;
        if (!session || !currentBranch) return false;
        const normalizedResource = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2f$permissions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["normalizePermissionResource"])(resource);
        const superAdmin = session.branches.find((ur)=>ur.role?.name === "Super Admin");
        if (superAdmin) return true;
        const branchRole = session.branches.find((ur)=>ur.branchId === currentBranch.id);
        if (!branchRole?.role) return false;
        const normalizedPermissions = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2f$permissions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["normalizePermissionsObject"])(branchRole.role.permissions);
        const permissions = normalizedPermissions[normalizedResource];
        return permissions ? permissions.includes(action) : false;
    };
    const isSuperAdmin = session?.branches.some((ur)=>ur.role?.name === "Super Admin") || false;
    const isPlatformDeveloper = session?.isPlatformDeveloper ?? (session?.user?.id === "local-debug-user" || false);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(AuthContext.Provider, {
        value: {
            session,
            currentBranch,
            setCurrentBranch,
            userBranches,
            loading,
            login,
            loginAsDemo,
            logout,
            hasPermission,
            isSuperAdmin,
            isPlatformDeveloper
        },
        children: children
    }, void 0, false, {
        fileName: "[project]/lib/auth/context.tsx",
        lineNumber: 140,
        columnNumber: 5
    }, this);
}
_s(AuthProvider, "9H0g5ZkDJiUEQ8H02A4+CC/WK4Q=");
_c = AuthProvider;
function useAuth() {
    _s1();
    const context = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useContext"])(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
_s1(useAuth, "b9L3QQ+jgeyIrH0NfHrJ8nn7VMU=");
var _c;
__turbopack_context__.k.register(_c, "AuthProvider");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/auth/permissions.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// Permission checking and authorization utilities
__turbopack_context__.s([
    "DEFAULT_ROLES",
    ()=>DEFAULT_ROLES,
    "RESOURCE_ALIASES",
    ()=>RESOURCE_ALIASES,
    "ROLE_HIERARCHY",
    ()=>ROLE_HIERARCHY,
    "canAccessBranch",
    ()=>canAccessBranch,
    "filterByBranchAccess",
    ()=>filterByBranchAccess,
    "getAccessibleBranches",
    ()=>getAccessibleBranches,
    "getBranchRole",
    ()=>getBranchRole,
    "hasPermission",
    ()=>hasPermission,
    "isBranchAdmin",
    ()=>isBranchAdmin,
    "isSuperAdmin",
    ()=>isSuperAdmin,
    "normalizePermissionResource",
    ()=>normalizePermissionResource,
    "normalizePermissionsObject",
    ()=>normalizePermissionsObject
]);
const ROLE_HIERARCHY = {
    "Super Admin": 5,
    "Branch Admin": 4,
    Employee: 3,
    "Field Staff": 2,
    Accountant: 2
};
const RESOURCE_ALIASES = {
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
    icerik_magazasi_yukle: "icerik_magazasi_yukle",
    icerik_magazasi_sil: "icerik_magazasi_sil",
    icerik_magazasi_onayla: "icerik_magazasi_onayla",
    icerik_magazasi_toplu: "icerik_magazasi_toplu",
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
    ekosistem: "ekosistem"
};
function normalizePermissionResource(resource) {
    return RESOURCE_ALIASES[resource] ?? resource;
}
function normalizePermissionsObject(permissions) {
    return Object.entries(permissions).reduce((acc, [key, value])=>{
        if (!value) return acc;
        const normalizedKey = normalizePermissionResource(key);
        if (!acc[normalizedKey]) {
            acc[normalizedKey] = value;
        } else {
            acc[normalizedKey] = Array.from(new Set([
                ...acc[normalizedKey],
                ...value
            ]));
        }
        return acc;
    }, {});
}
function hasPermission(userRoles, branchId, resource, action) {
    const normalizedResource = normalizePermissionResource(resource);
    // Super Admin has all permissions across all branches
    const superAdminRole = userRoles.find((ur)=>ur.role?.name === "Super Admin");
    if (superAdminRole) return true;
    // Check branch-specific permissions
    const branchRole = userRoles.find((ur)=>ur.branchId === branchId);
    if (!branchRole || !branchRole.role) return false;
    const permissions = normalizePermissionsObject(branchRole.role.permissions)[normalizedResource];
    if (!permissions) return false;
    return permissions.includes(action);
}
function canAccessBranch(userRoles, branchId) {
    // Super Admin can access all branches
    const superAdminRole = userRoles.find((ur)=>ur.role?.name === "Super Admin");
    if (superAdminRole) return true;
    // Check if user has any role in this branch
    return userRoles.some((ur)=>ur.branchId === branchId);
}
function getBranchRole(userRoles, branchId) {
    const branchRole = userRoles.find((ur)=>ur.branchId === branchId);
    return branchRole?.role || null;
}
function isSuperAdmin(userRoles) {
    return userRoles.some((ur)=>ur.role?.name === "Super Admin");
}
function isBranchAdmin(userRoles, branchId) {
    const role = getBranchRole(userRoles, branchId);
    return role?.name === "Branch Admin" || isSuperAdmin(userRoles);
}
function getAccessibleBranches(userRoles) {
    // Super Admin can access all branches - return special flag
    if (isSuperAdmin(userRoles)) {
        return [
            "*"
        ];
    }
    return userRoles.map((ur)=>ur.branchId);
}
function filterByBranchAccess(data, userRoles, currentBranchId) {
    // Super Admin sees all
    if (isSuperAdmin(userRoles)) {
        // If specific branch selected, filter to that branch
        if (currentBranchId) {
            return data.filter((item)=>item.branchId === currentBranchId);
        }
        return data;
    }
    const accessibleBranches = getAccessibleBranches(userRoles);
    // If specific branch selected, only show that branch
    if (currentBranchId) {
        return data.filter((item)=>item.branchId === currentBranchId && accessibleBranches.includes(item.branchId));
    }
    return data.filter((item)=>accessibleBranches.includes(item.branchId));
}
const DEFAULT_ROLES = {
    "Super Admin": {
        branches: [
            "create",
            "read",
            "update",
            "delete",
            "manage_all"
        ],
        users: [
            "create",
            "read",
            "update",
            "delete",
            "assign_roles"
        ],
        customers: [
            "create",
            "read",
            "update",
            "delete",
            "view_all_branches"
        ],
        leads: [
            "create",
            "read",
            "update",
            "delete",
            "view_all_branches"
        ],
        financial: [
            "create",
            "read",
            "update",
            "delete",
            "view_all_branches"
        ],
        orders: [
            "create",
            "read",
            "update",
            "delete",
            "approve",
            "view_all_branches"
        ],
        files: [
            "create",
            "read",
            "update",
            "delete",
            "view_all_branches"
        ],
        reports: [
            "view_all_branches"
        ],
        settings: [
            "manage_system",
            "manage_branches"
        ]
    },
    "Branch Admin": {
        branches: [
            "read",
            "update"
        ],
        users: [
            "create",
            "read",
            "update",
            "assign_roles"
        ],
        customers: [
            "create",
            "read",
            "update",
            "delete"
        ],
        leads: [
            "create",
            "read",
            "update",
            "delete",
            "assign"
        ],
        financial: [
            "create",
            "read",
            "update",
            "delete"
        ],
        orders: [
            "create",
            "read",
            "update",
            "approve"
        ],
        files: [
            "create",
            "read",
            "update"
        ],
        reports: [
            "view_branch"
        ],
        settings: [
            "manage_branch"
        ],
        takvim: [
            "read",
            "create"
        ],
        ai: [
            "read",
            "upload"
        ]
    },
    Employee: {
        branches: [
            "read"
        ],
        users: [
            "read"
        ],
        customers: [
            "create",
            "read",
            "update"
        ],
        leads: [
            "create",
            "read",
            "update"
        ],
        financial: [
            "read"
        ],
        orders: [
            "create",
            "read",
            "update"
        ],
        files: [
            "create",
            "read"
        ],
        reports: [
            "view_own"
        ],
        settings: [],
        takvim: [
            "read",
            "create"
        ],
        ai: [
            "read"
        ]
    },
    "Field Staff": {
        branches: [
            "read"
        ],
        users: [
            "read"
        ],
        customers: [
            "read",
            "update"
        ],
        leads: [
            "create",
            "read",
            "update"
        ],
        financial: [],
        orders: [
            "create",
            "read"
        ],
        files: [
            "create",
            "read"
        ],
        reports: [
            "view_own"
        ],
        settings: [],
        takvim: [
            "read"
        ],
        ai: [
            "read"
        ]
    },
    Accountant: {
        branches: [
            "read"
        ],
        users: [
            "read"
        ],
        customers: [
            "read"
        ],
        leads: [
            "read"
        ],
        financial: [
            "create",
            "read",
            "update",
            "delete"
        ],
        orders: [
            "read"
        ],
        files: [
            "read"
        ],
        reports: [
            "view_branch",
            "export"
        ],
        settings: [],
        takvim: [
            "read"
        ],
        ai: [
            "read"
        ]
    }
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/context/LanguageContext.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "LanguageProvider",
    ()=>LanguageProvider,
    "useLanguage",
    ()=>useLanguage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$i18n$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/lib/i18n/index.ts [app-client] (ecmascript) <locals>");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
"use client";
;
;
function getNestedValue(obj, path) {
    if (!obj || !path) return undefined;
    const parts = path.split(".");
    let curr = obj;
    for (const part of parts){
        if (curr && typeof curr === "object" && part in curr) {
            curr = curr[part];
        } else {
            return undefined;
        }
    }
    return typeof curr === "string" ? curr : undefined;
}
const LanguageContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createContext"])({
    locale: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$i18n$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["DEFAULT_LOCALE"],
    t: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$i18n$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["LOCALES"][__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$i18n$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["DEFAULT_LOCALE"]],
    setLocale: ()=>{},
    tText: (path, fallback)=>fallback || path
});
function LanguageProvider({ children }) {
    _s();
    const [locale, setLocaleState] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$i18n$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["DEFAULT_LOCALE"]);
    const [mounted, setMounted] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "LanguageProvider.useEffect": ()=>{
            // Read saved locale from localStorage
            try {
                const saved = localStorage.getItem(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$i18n$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["LOCALE_STORAGE_KEY"]);
                if (saved && saved in __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$i18n$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["LOCALES"]) {
                    setLocaleState(saved);
                }
            } catch  {
            // localStorage not available (SSR)
            }
            setMounted(true);
        }
    }["LanguageProvider.useEffect"], []);
    const setLocale = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "LanguageProvider.useCallback[setLocale]": (newLocale)=>{
            setLocaleState(newLocale);
            try {
                localStorage.setItem(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$i18n$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["LOCALE_STORAGE_KEY"], newLocale);
            } catch  {
            // localStorage not available
            }
        }
    }["LanguageProvider.useCallback[setLocale]"], []);
    // Prevent hydration mismatch by always starting with default
    const activeLocale = mounted ? locale : __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$i18n$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["DEFAULT_LOCALE"];
    const tText = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "LanguageProvider.useCallback[tText]": (path, fallback)=>{
            const val = getNestedValue(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$i18n$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["LOCALES"][activeLocale], path);
            if (val !== undefined) return val;
            const trVal = getNestedValue(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$i18n$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["LOCALES"][__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$i18n$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["DEFAULT_LOCALE"]], path);
            if (trVal !== undefined) return trVal;
            return fallback || path;
        }
    }["LanguageProvider.useCallback[tText]"], [
        activeLocale
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(LanguageContext.Provider, {
        value: {
            locale: activeLocale,
            t: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$i18n$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["LOCALES"][activeLocale],
            setLocale,
            tText
        },
        children: children
    }, void 0, false, {
        fileName: "[project]/lib/context/LanguageContext.tsx",
        lineNumber: 78,
        columnNumber: 5
    }, this);
}
_s(LanguageProvider, "WoKYiURT2W649f0D96IxhiIL/1I=");
_c = LanguageProvider;
function useLanguage() {
    _s1();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useContext"])(LanguageContext);
}
_s1(useLanguage, "gDsCjeeItUuvgOWf1v4qoK9RF6k=");
var _c;
__turbopack_context__.k.register(_c, "LanguageProvider");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/i18n/index.ts [app-client] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DEFAULT_LOCALE",
    ()=>DEFAULT_LOCALE,
    "LOCALES",
    ()=>LOCALES,
    "LOCALE_LABELS",
    ()=>LOCALE_LABELS,
    "LOCALE_STORAGE_KEY",
    ()=>LOCALE_STORAGE_KEY
]);
// i18n index - aggregates all locales and exports utilities
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$i18n$2f$locales$2f$tr$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/i18n/locales/tr.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$i18n$2f$locales$2f$en$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/i18n/locales/en.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$i18n$2f$locales$2f$es$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/i18n/locales/es.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$i18n$2f$locales$2f$it$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/i18n/locales/it.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$i18n$2f$locales$2f$fr$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/i18n/locales/fr.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$i18n$2f$locales$2f$de$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/i18n/locales/de.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$i18n$2f$locales$2f$ru$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/i18n/locales/ru.ts [app-client] (ecmascript)");
;
;
;
;
;
;
;
const LOCALES = {
    tr: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$i18n$2f$locales$2f$tr$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["tr"],
    en: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$i18n$2f$locales$2f$en$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["en"],
    es: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$i18n$2f$locales$2f$es$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["es"],
    it: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$i18n$2f$locales$2f$it$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["it"],
    fr: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$i18n$2f$locales$2f$fr$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["fr"],
    de: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$i18n$2f$locales$2f$de$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["de"],
    ru: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$i18n$2f$locales$2f$ru$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ru"]
};
const LOCALE_LABELS = {
    tr: {
        label: "Türkçe",
        flag: "🇹🇷"
    },
    en: {
        label: "English",
        flag: "🇬🇧"
    },
    es: {
        label: "Español",
        flag: "🇪🇸"
    },
    it: {
        label: "Italiano",
        flag: "🇮🇹"
    },
    fr: {
        label: "Français",
        flag: "🇫🇷"
    },
    de: {
        label: "Deutsch",
        flag: "🇩🇪"
    },
    ru: {
        label: "Русский",
        flag: "🇷🇺"
    }
};
const DEFAULT_LOCALE = "tr";
const LOCALE_STORAGE_KEY = "app-language";
;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/i18n/locales/de.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// Deutsch locale
__turbopack_context__.s([
    "de",
    ()=>de
]);
const de = {
    "language": "Language",
    "languageName": "Deutsch",
    "common": {
        "save": "Save",
        "cancel": "Cancel",
        "edit": "Edit",
        "delete": "Delete",
        "search": "Search...",
        "searchInSettings": "Search in settings...",
        "filter": "Filter",
        "loading": "Loading...",
        "saving": "Saving...",
        "status": "Status",
        "actions": "Actions",
        "confirm": "Confirm",
        "yes": "Yes",
        "no": "No",
        "success": "Success",
        "error": "Error",
        "warning": "Warning",
        "all": "All",
        "viewAll": "View All",
        "details": "Details",
        "add": "Add",
        "addNew": "Add New",
        "create": "Create",
        "description": "Description",
        "unsavedChanges": "Unsaved Changes Exist",
        "saveChanges": "Save Settings",
        "enterpriseVersion": "v1.0 Enterprise",
        "active": "Active",
        "inactive": "Inactive",
        "back": "Back",
        "close": "Close",
        "refresh": "Refresh",
        "copy": "Copy",
        "download": "Download",
        "date": "Date",
        "time": "Time",
        "type": "Type",
        "value": "Value",
        "metric": "Metric",
        "category": "Category",
        "amount": "Amount",
        "unknown": "Unknown",
        "noData": "No data found",
        "completed": "Completed",
        "pending": "Pending",
        "inProgress": "In Progress",
        "cancelled": "Cancelled",
        "high": "High",
        "medium": "Medium",
        "low": "Low"
    },
    "nav": {
        "dashboard": "Dashboard",
        "calendar": "Calendar",
        "orders": "Orders",
        "store": "Store",
        "customers": "Customers",
        "hr": "Human Resources",
        "staffRequests": "Staff Requests",
        "projects": "Projects",
        "leads": "Leads",
        "cargo": "Cargo",
        "files": "Files",
        "agencyLibrary": "Agency Library",
        "contentStore": "Content Store",
        "tasks": "Tasks",
        "personelDenetim": "Team Workload",
        "todos": "To-Do",
        "notes": "My Notes",
        "calculator": "Calculator",
        "finance": "Finance",
        "socialMedia": "Social Media",
        "contentCalendar": "Content Calendar",
        "branches": "Branches",
        "users": "Users",
        "chat": "Chat",
        "endOfDayReport": "End of Day Report",
        "customerRequests": "Customer Requests",
        "technicalSupport": "Technical Support",
        "announcements": "Announcements",
        "management": "Management",
        "communication": "Communication",
        "settings": "Settings",
        "logout": "Log Out",
        "expand": "Expand",
        "collapse": "Collapse",
        "managementPanel": "Management Panel",
        "superAdmin": "Super Admin",
        "user": "User"
    },
    "header": {
        "search": "Ara..."
    },
    "login": {
        "welcome": "Hoş geldiniz",
        "subtitle": "Devam etmek için hesabınıza giriş yapın",
        "managementPanel": "Yönetim Paneli",
        "manageFromOne": "İşletmenizi tek noktadan yönetin",
        "platformDesc": "CRM, proje yönetimi, İK, finans ve daha fazlasını entegre bir platformda takip edin.",
        "copyright": "© 2026 Tüm Hakları Saklıdır.",
        "features": {
            "customerMgmt": "Müşteri Yönetimi",
            "projectTracking": "Proje Takibi",
            "financeAnalysis": "Finans Analizi",
            "salesCrm": "Satış & CRM"
        },
        "form": {
            "username": "Kullanıcı Adı",
            "password": "Şifre",
            "submit": "Giriş Yap",
            "loading": "Giriş yapılıyor...",
            "forgotPassword": "Şifremi Unuttum"
        }
    },
    "settings": {
        "systemSettingsTitle": "Çiçekana ERP — Sistem Ayarları",
        "systemSettingsSubtitle": "Şirket yapılandırması, güvenlik politikaları, marka kiti ve modül parametrelerini merkezi olarak yönetin.",
        "tabs": {
            "company": {
                "label": "Genel Şirket Ayarları",
                "description": "Unvan, adres, vergi ve şube yapılandırması"
            },
            "profile": {
                "label": "Kişisel Profilim",
                "description": "Profil resmi, iletişim ve ad soyad bilgileri"
            },
            "security": {
                "label": "Güvenlik & Şifre Politikası",
                "description": "Şifre değiştirme, 2FA, IP ve oturum politikası"
            },
            "roles": {
                "label": "Kullanıcı & Rol Yönetimi",
                "description": "Şube ve kaynak bazlı yetki matrisi"
            },
            "theme": {
                "label": "Tema & Marka Kiti",
                "description": "Kurumsal logo, renk paleti ve karanlık mod"
            },
            "notifications": {
                "label": "Bildirim Tercihleri",
                "description": "E-posta, SMS, Push ve sesli uyarı kanalları"
            },
            "integrations": {
                "label": "Entegrasyonlar",
                "description": "E-Fatura, Kargo ve İyzico ödeme sistemleri"
            },
            "localization": {
                "label": "Yerelleştirme & KDV",
                "description": "Dil, para birimi, tarih formatı ve vergi oranları"
            },
            "numbering": {
                "label": "Doküman Numaralandırma",
                "description": "Fatura, sipariş ve proje numarası önekleri"
            },
            "workflows": {
                "label": "Onay Akışları",
                "description": "Limit bazlı onay mekanizmaları ve İK akışları"
            },
            "backup": {
                "label": "Yedekleme & Veri",
                "description": "Otomatik yedekleme sıklığı ve dışa aktarma"
            },
            "audit": {
                "label": "Denetim Kaydı (Audit Log)",
                "description": "Sistemdeki tüm değişikliklerin iz kayıtları"
            },
            "maintenance": {
                "label": "Sistem Bakım & Banner",
                "description": "Bakım modu ve duyuru görsel bannerı"
            },
            "danger": {
                "label": "Tehlikeli Bölge",
                "description": "Fabrika ayarlarına dönme ve demo veri araçları"
            }
        },
        "companySection": {
            "title": "Genel Şirket ve Şube Kimliği",
            "subtitle": "Çiçekana ERP üzerinde fatura, irsaliye ve resmi sözleşmelerde görüntülenecek kurumsal bilgileri girin.",
            "titleLabel": "Şirket Resmi Unvanı",
            "emailLabel": "E-posta Adresi",
            "taxOfficeLabel": "Vergi Dairesi",
            "taxNumberLabel": "Vergi Numarası (VKN)",
            "tradeRegLabel": "Ticaret Sicil No",
            "mersisLabel": "MERSİS Numarası",
            "addressLabel": "Genel Merkez Adresi",
            "multiBranchTitle": "Çoklu Şube / Depo Desteği",
            "multiBranchDesc": "Aktif edildiğinde veri izolasyonu ve şube bazlı yetki ayrıştırması uygulanır."
        },
        "profileSection": {
            "title": "Kişisel Profil Bilgileri",
            "subtitle": "Sistemde diğer kullanıcılara görüntülenecek ad soyad ve iletişim bilgilerinizi güncelleyin.",
            "selectAvatar": "Profil Fotoğrafı Seç",
            "avatarHint": "PNG, JPG veya WEBP formatında maksimum 5MB görsel.",
            "usernameDisabled": "Kullanıcı Adı (Değiştirilemez)",
            "fullName": "Ad Soyad",
            "email": "E-posta",
            "phone": "Telefon"
        },
        "securitySection": {
            "title": "Hesap Güvenliği & Parola Politikası",
            "subtitle": "Şifre yenileme, minimum uzunluk ve iki faktörlü doğrulama (2FA) kurallarını belirleyin.",
            "currentPassword": "Mevcut Şifre",
            "newPassword": "Yeni Şifre",
            "confirmPassword": "Yeni Şifre (Tekrar)",
            "changeBtn": "Şifreyi Değiştir",
            "minPasswordLength": "Minimum Şifre Uzunluğu",
            "twoFactorAuth": "İki Faktörlü Doğrulama (2FA)",
            "twoFactorDesc": "Girişlerde SMS / Authenticator kod onayını zorunlu tut."
        },
        "rolesSection": {
            "title": "Kullanıcı Rol ve Yetki Yönetimi",
            "subtitle": "Şube ve kaynak bazlı yetki matrisini (RBAC) yapılandırın.",
            "superAdminRole": "Süper Yönetici",
            "branchManagerRole": "Şube Müdürü",
            "staffRole": "Personel"
        },
        "themeSection": {
            "title": "Marka Kiti ve Görsel Tema Engine",
            "subtitle": "Logonuzu yükleyin ve kurumsal renk paletinizi otomatik çıkartın.",
            "brandLogo": "Kurumsal Logo",
            "primaryColor": "Ana Vurgu Rengi",
            "accentColor": "İkincil Renk"
        },
        "notificationsSection": {
            "title": "Sistem ve İşlem Bildirim Tercihleri",
            "subtitle": "E-posta, SMS ve Push bildirim kanallarını yapılandırın.",
            "emailNotifs": "E-posta Bildirimleri",
            "smsNotifs": "SMS Bildirimleri",
            "pushNotifs": "Push Bildirimleri"
        },
        "integrationsSection": {
            "title": "Üçüncü Taraf Entegrasyonlar",
            "subtitle": "E-Fatura, Kargo entegrasyonu ve İyzico ödeme altyapısı.",
            "efatura": "E-Fatura Entegrasyonu",
            "cargoApi": "Kargo API Bağlantısı",
            "iyzico": "İyzico Ödeme Altyapısı"
        },
        "localizationSection": {
            "title": "Yerelleştirme, Para Birimi ve KDV",
            "subtitle": "Sistem varsayılan dili, finansal para birimi ve vergi oranlarını belirleyin.",
            "systemLanguage": "Sistem Dili",
            "currency": "Para Birimi",
            "kdvRate": "Varsayılan KDV Oranı (%)"
        },
        "numberingSection": {
            "title": "Doküman Numaralandırma Şablonları",
            "subtitle": "Fatura, sipariş ve proje numarası önekleri ve sayaç ayarları.",
            "invoicePrefix": "Fatura Öneki",
            "orderPrefix": "Sipariş Öneki",
            "projectPrefix": "Proje Öneki"
        },
        "workflowsSection": {
            "title": "Kurumsal Onay Akışları",
            "subtitle": "Limit bazlı harcama ve izin onay hiyerarşisi.",
            "expenseLimit": "Otomatik Onay Limiti (TL)"
        },
        "backupSection": {
            "title": "Veri Yedekleme ve Dışa Aktarma",
            "subtitle": "Veritabanı otomatik yedekleme periyotları.",
            "autoBackup": "Otomatik Günlük Yedekleme",
            "downloadBackup": "Veritabanı Yedeği İndir"
        },
        "auditSection": {
            "title": "Sistem Denetim Kayıtları (Audit Log)",
            "subtitle": "Sistemde gerçekleştirilen tüm kritik işlemlerin log geçmişi.",
            "user": "Kullanıcı",
            "action": "İşlem",
            "ipAddress": "IP Adresi",
            "date": "Tarih",
            "noLogs": "Henüz denetim kaydı bulunmuyor."
        },
        "maintenanceSection": {
            "title": "Sistem Bakım Modu & Banner",
            "subtitle": "Sistemi bakıma alın veya tüm kullanıcılara duyuru bannerı gösterin.",
            "maintenanceMode": "Bakım Modu Aktif",
            "bannerText": "Duyuru Banner Metni"
        },
        "dangerSection": {
            "title": "Tehlikeli Bölge ve Test Araçları",
            "subtitle": "Fabrika ayarlarına sıfırlama ve demo veri yönetimi.",
            "loadDemoTitle": "Mevcut Şubeye Demo Veri Yükle",
            "clearDemoTitle": "Tüm Demo Verilerini Temizle",
            "resetSystemTitle": "Sistemi Fabrika Ayarlarına Sıfırla"
        },
        "title": "Ayarlar",
        "subtitle": "Hesap bilgilerinizi ve güvenlik ayarlarınızı yönetin",
        "personalInfo": "Kişisel Bilgiler",
        "personalInfoDesc": "Ad soyad, e-posta ve telefon bilgilerinizi güncelleyin",
        "username": "Kullanıcı Adı (değiştirilemez)",
        "profilePhoto": "Profil Fotoğrafı",
        "selectPhoto": "Fotoğraf Seç",
        "fullName": "Ad Soyad",
        "email": "E-posta",
        "phone": "Telefon",
        "saveInfo": "Bilgileri Kaydet",
        "saving": "Kaydediliyor...",
        "success": "Başarılı",
        "error": "Hata",
        "infoUpdated": "Bilgiler güncellendi!",
        "changePassword": "Şifre Değiştir",
        "changePasswordDesc": "Hesap güvenliğiniz için düzenli olarak şifre değiştirin",
        "currentPassword": "Mevcut Şifre",
        "newPassword": "Yeni Şifre",
        "newPasswordRepeat": "Yeni Şifre (Tekrar)",
        "changePasswordBtn": "Şifreyi Değiştir",
        "changing": "Değiştiriliyor...",
        "passwordChanged": "Şifre başarıyla değiştirildi!",
        "fillAllFields": "Tüm alanları doldurun",
        "passwordsNotMatch": "Yeni şifreler eşleşmiyor",
        "passwordTooShort": "Şifre en az 6 karakter olmalıdır",
        "languageTitle": "Dil Ayarları",
        "languageDesc": "Panel arayüzünün dilini seçin",
        "selectLanguage": "Dil Seçin",
        "languageSaved": "Dil tercihi kaydedildi",
        "devTools": "Eğitim ve Test Araçları",
        "devToolsDesc": "Sistemi test etmek ve personele eğitim vermek için demo verileri yönetin.",
        "loadDemo": "Mevcut Şubeye Demo Veri Yükle",
        "clearDemo": "Tüm Demo Verilerini Temizle",
        "processing": "İşlem Yapılıyor...",
        "clearing": "Temizleniyor..."
    },
    "dashboard": {
        "title": "Dashboard",
        "subtitle": "Overview of your business metrics",
        "totalCustomers": "Total Customers",
        "activeProjects": "Active Projects",
        "leads": "Leads",
        "monthlyIncome": "Monthly Income",
        "monthlyExpense": "Monthly Expense",
        "netProfitLoss": "Net Profit / Loss",
        "incomeExpenseAnalysis": "Income / Expense Analysis",
        "expenseDistribution": "Expense Distribution",
        "thisMonth": "This month",
        "income": "Income",
        "expense": "Expense",
        "general": "General",
        "recentActivities": "Recent Activities",
        "noActivities": "No activities yet",
        "activitiesHint": "Events will be displayed here",
        "report": "Report",
        "downloadReport": "Download Report",
        "reportModalTitle": "Download Report",
        "reportModalSubtitle": "Download summary report in PDF / CSV format",
        "reportModalDesc": "Performance, customer, and financial summary data for your branch will be downloaded in Excel-compatible CSV format."
    }
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/i18n/locales/en.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// English locale
__turbopack_context__.s([
    "en",
    ()=>en
]);
const en = {
    "language": "Language",
    "languageName": "English",
    "common": {
        "save": "Save",
        "cancel": "Cancel",
        "edit": "Edit",
        "delete": "Delete",
        "search": "Search...",
        "searchInSettings": "Search in settings...",
        "filter": "Filter",
        "loading": "Loading...",
        "saving": "Saving...",
        "status": "Status",
        "actions": "Actions",
        "confirm": "Confirm",
        "yes": "Yes",
        "no": "No",
        "success": "Success",
        "error": "Error",
        "warning": "Warning",
        "all": "All",
        "viewAll": "View All",
        "details": "Details",
        "add": "Add",
        "addNew": "Add New",
        "create": "Create",
        "description": "Description",
        "unsavedChanges": "Unsaved Changes Exist",
        "saveChanges": "Save Settings",
        "enterpriseVersion": "v1.0 Enterprise",
        "active": "Active",
        "inactive": "Inactive",
        "back": "Back",
        "close": "Close",
        "refresh": "Refresh",
        "copy": "Copy",
        "download": "Download",
        "date": "Date",
        "time": "Time",
        "type": "Type",
        "value": "Value",
        "metric": "Metric",
        "category": "Category",
        "amount": "Amount",
        "unknown": "Unknown",
        "noData": "No data found",
        "completed": "Completed",
        "pending": "Pending",
        "inProgress": "In Progress",
        "cancelled": "Cancelled",
        "high": "High",
        "medium": "Medium",
        "low": "Low"
    },
    "nav": {
        "dashboard": "Dashboard",
        "calendar": "Calendar",
        "orders": "Orders",
        "store": "Store",
        "customers": "Customers",
        "hr": "Human Resources",
        "staffRequests": "Staff Requests",
        "projects": "Projects",
        "leads": "Leads",
        "cargo": "Cargo",
        "files": "Files",
        "agencyLibrary": "Agency Library",
        "contentStore": "Content Store",
        "tasks": "Tasks",
        "personelDenetim": "Team Workload",
        "todos": "To-Do",
        "notes": "My Notes",
        "calculator": "Calculator",
        "finance": "Finance",
        "socialMedia": "Social Media",
        "contentCalendar": "Content Calendar",
        "inventory": "Inventory & Matrix",
        "wms": "WMS Warehouse Ops",
        "wmsMobile": "WMS Mobile Terminal",
        "procurement": "Smart Procurement & ROP",
        "omnichannel": "Omnichannel & E-Waybill",
        "inventoryAi": "Inventory AI & Foresight",
        "ecosystem": "API, Plugins & SaaS",
        "branches": "Branches",
        "users": "Users",
        "chat": "Chat",
        "endOfDayReport": "End of Day Report",
        "customerRequests": "Customer Requests",
        "technicalSupport": "Technical Support",
        "announcements": "Announcements",
        "management": "Management",
        "communication": "Communication",
        "settings": "Settings",
        "logout": "Log Out",
        "expand": "Expand",
        "collapse": "Collapse",
        "managementPanel": "Management Panel",
        "superAdmin": "Super Admin",
        "user": "User"
    },
    "header": {
        "search": "Ara..."
    },
    "login": {
        "welcome": "Hoş geldiniz",
        "subtitle": "Devam etmek için hesabınıza giriş yapın",
        "managementPanel": "Yönetim Paneli",
        "manageFromOne": "İşletmenizi tek noktadan yönetin",
        "platformDesc": "CRM, proje yönetimi, İK, finans ve daha fazlasını entegre bir platformda takip edin.",
        "copyright": "© 2026 Tüm Hakları Saklıdır.",
        "features": {
            "customerMgmt": "Müşteri Yönetimi",
            "projectTracking": "Proje Takibi",
            "financeAnalysis": "Finans Analizi",
            "salesCrm": "Satış & CRM"
        },
        "form": {
            "username": "Kullanıcı Adı",
            "password": "Şifre",
            "submit": "Giriş Yap",
            "loading": "Giriş yapılıyor...",
            "forgotPassword": "Şifremi Unuttum"
        }
    },
    "settings": {
        "systemSettingsTitle": "Çiçekana ERP — Sistem Ayarları",
        "systemSettingsSubtitle": "Şirket yapılandırması, güvenlik politikaları, marka kiti ve modül parametrelerini merkezi olarak yönetin.",
        "tabs": {
            "company": {
                "label": "Genel Şirket Ayarları",
                "description": "Unvan, adres, vergi ve şube yapılandırması"
            },
            "profile": {
                "label": "Kişisel Profilim",
                "description": "Profil resmi, iletişim ve ad soyad bilgileri"
            },
            "security": {
                "label": "Güvenlik & Şifre Politikası",
                "description": "Şifre değiştirme, 2FA, IP ve oturum politikası"
            },
            "roles": {
                "label": "Kullanıcı & Rol Yönetimi",
                "description": "Şube ve kaynak bazlı yetki matrisi"
            },
            "theme": {
                "label": "Tema & Marka Kiti",
                "description": "Kurumsal logo, renk paleti ve karanlık mod"
            },
            "notifications": {
                "label": "Bildirim Tercihleri",
                "description": "E-posta, SMS, Push ve sesli uyarı kanalları"
            },
            "integrations": {
                "label": "Entegrasyonlar",
                "description": "E-Fatura, Kargo ve İyzico ödeme sistemleri"
            },
            "localization": {
                "label": "Yerelleştirme & KDV",
                "description": "Dil, para birimi, tarih formatı ve vergi oranları"
            },
            "numbering": {
                "label": "Doküman Numaralandırma",
                "description": "Fatura, sipariş ve proje numarası önekleri"
            },
            "workflows": {
                "label": "Onay Akışları",
                "description": "Limit bazlı onay mekanizmaları ve İK akışları"
            },
            "backup": {
                "label": "Yedekleme & Veri",
                "description": "Otomatik yedekleme sıklığı ve dışa aktarma"
            },
            "audit": {
                "label": "Denetim Kaydı (Audit Log)",
                "description": "Sistemdeki tüm değişikliklerin iz kayıtları"
            },
            "maintenance": {
                "label": "Sistem Bakım & Banner",
                "description": "Bakım modu ve duyuru görsel bannerı"
            },
            "danger": {
                "label": "Tehlikeli Bölge",
                "description": "Fabrika ayarlarına dönme ve demo veri araçları"
            }
        },
        "companySection": {
            "title": "Genel Şirket ve Şube Kimliği",
            "subtitle": "Çiçekana ERP üzerinde fatura, irsaliye ve resmi sözleşmelerde görüntülenecek kurumsal bilgileri girin.",
            "titleLabel": "Şirket Resmi Unvanı",
            "emailLabel": "E-posta Adresi",
            "taxOfficeLabel": "Vergi Dairesi",
            "taxNumberLabel": "Vergi Numarası (VKN)",
            "tradeRegLabel": "Ticaret Sicil No",
            "mersisLabel": "MERSİS Numarası",
            "addressLabel": "Genel Merkez Adresi",
            "multiBranchTitle": "Çoklu Şube / Depo Desteği",
            "multiBranchDesc": "Aktif edildiğinde veri izolasyonu ve şube bazlı yetki ayrıştırması uygulanır."
        },
        "profileSection": {
            "title": "Kişisel Profil Bilgileri",
            "subtitle": "Sistemde diğer kullanıcılara görüntülenecek ad soyad ve iletişim bilgilerinizi güncelleyin.",
            "selectAvatar": "Profil Fotoğrafı Seç",
            "avatarHint": "PNG, JPG veya WEBP formatında maksimum 5MB görsel.",
            "usernameDisabled": "Kullanıcı Adı (Değiştirilemez)",
            "fullName": "Ad Soyad",
            "email": "E-posta",
            "phone": "Telefon"
        },
        "securitySection": {
            "title": "Hesap Güvenliği & Parola Politikası",
            "subtitle": "Şifre yenileme, minimum uzunluk ve iki faktörlü doğrulama (2FA) kurallarını belirleyin.",
            "currentPassword": "Mevcut Şifre",
            "newPassword": "Yeni Şifre",
            "confirmPassword": "Yeni Şifre (Tekrar)",
            "changeBtn": "Şifreyi Değiştir",
            "minPasswordLength": "Minimum Şifre Uzunluğu",
            "twoFactorAuth": "İki Faktörlü Doğrulama (2FA)",
            "twoFactorDesc": "Girişlerde SMS / Authenticator kod onayını zorunlu tut."
        },
        "rolesSection": {
            "title": "Kullanıcı Rol ve Yetki Yönetimi",
            "subtitle": "Şube ve kaynak bazlı yetki matrisini (RBAC) yapılandırın.",
            "superAdminRole": "Süper Yönetici",
            "branchManagerRole": "Şube Müdürü",
            "staffRole": "Personel"
        },
        "themeSection": {
            "title": "Marka Kiti ve Görsel Tema Engine",
            "subtitle": "Logonuzu yükleyin ve kurumsal renk paletinizi otomatik çıkartın.",
            "brandLogo": "Kurumsal Logo",
            "primaryColor": "Ana Vurgu Rengi",
            "accentColor": "İkincil Renk"
        },
        "notificationsSection": {
            "title": "Sistem ve İşlem Bildirim Tercihleri",
            "subtitle": "E-posta, SMS ve Push bildirim kanallarını yapılandırın.",
            "emailNotifs": "E-posta Bildirimleri",
            "smsNotifs": "SMS Bildirimleri",
            "pushNotifs": "Push Bildirimleri"
        },
        "integrationsSection": {
            "title": "Üçüncü Taraf Entegrasyonlar",
            "subtitle": "E-Fatura, Kargo entegrasyonu ve İyzico ödeme altyapısı.",
            "efatura": "E-Fatura Entegrasyonu",
            "cargoApi": "Kargo API Bağlantısı",
            "iyzico": "İyzico Ödeme Altyapısı"
        },
        "localizationSection": {
            "title": "Yerelleştirme, Para Birimi ve KDV",
            "subtitle": "Sistem varsayılan dili, finansal para birimi ve vergi oranlarını belirleyin.",
            "systemLanguage": "Sistem Dili",
            "currency": "Para Birimi",
            "kdvRate": "Varsayılan KDV Oranı (%)"
        },
        "numberingSection": {
            "title": "Doküman Numaralandırma Şablonları",
            "subtitle": "Fatura, sipariş ve proje numarası önekleri ve sayaç ayarları.",
            "invoicePrefix": "Fatura Öneki",
            "orderPrefix": "Sipariş Öneki",
            "projectPrefix": "Proje Öneki"
        },
        "workflowsSection": {
            "title": "Kurumsal Onay Akışları",
            "subtitle": "Limit bazlı harcama ve izin onay hiyerarşisi.",
            "expenseLimit": "Otomatik Onay Limiti (TL)"
        },
        "backupSection": {
            "title": "Veri Yedekleme ve Dışa Aktarma",
            "subtitle": "Veritabanı otomatik yedekleme periyotları.",
            "autoBackup": "Otomatik Günlük Yedekleme",
            "downloadBackup": "Veritabanı Yedeği İndir"
        },
        "auditSection": {
            "title": "Sistem Denetim Kayıtları (Audit Log)",
            "subtitle": "Sistemde gerçekleştirilen tüm kritik işlemlerin log geçmişi.",
            "user": "Kullanıcı",
            "action": "İşlem",
            "ipAddress": "IP Adresi",
            "date": "Tarih",
            "noLogs": "Henüz denetim kaydı bulunmuyor."
        },
        "maintenanceSection": {
            "title": "Sistem Bakım Modu & Banner",
            "subtitle": "Sistemi bakıma alın veya tüm kullanıcılara duyuru bannerı gösterin.",
            "maintenanceMode": "Bakım Modu Aktif",
            "bannerText": "Duyuru Banner Metni"
        },
        "dangerSection": {
            "title": "Tehlikeli Bölge ve Test Araçları",
            "subtitle": "Fabrika ayarlarına sıfırlama ve demo veri yönetimi.",
            "loadDemoTitle": "Mevcut Şubeye Demo Veri Yükle",
            "clearDemoTitle": "Tüm Demo Verilerini Temizle",
            "resetSystemTitle": "Sistemi Fabrika Ayarlarına Sıfırla"
        },
        "title": "Ayarlar",
        "subtitle": "Hesap bilgilerinizi ve güvenlik ayarlarınızı yönetin",
        "personalInfo": "Kişisel Bilgiler",
        "personalInfoDesc": "Ad soyad, e-posta ve telefon bilgilerinizi güncelleyin",
        "username": "Kullanıcı Adı (değiştirilemez)",
        "profilePhoto": "Profil Fotoğrafı",
        "selectPhoto": "Fotoğraf Seç",
        "fullName": "Ad Soyad",
        "email": "E-posta",
        "phone": "Telefon",
        "saveInfo": "Bilgileri Kaydet",
        "saving": "Kaydediliyor...",
        "success": "Başarılı",
        "error": "Hata",
        "infoUpdated": "Bilgiler güncellendi!",
        "changePassword": "Şifre Değiştir",
        "changePasswordDesc": "Hesap güvenliğiniz için düzenli olarak şifre değiştirin",
        "currentPassword": "Mevcut Şifre",
        "newPassword": "Yeni Şifre",
        "newPasswordRepeat": "Yeni Şifre (Tekrar)",
        "changePasswordBtn": "Şifreyi Değiştir",
        "changing": "Değiştiriliyor...",
        "passwordChanged": "Şifre başarıyla değiştirildi!",
        "fillAllFields": "Tüm alanları doldurun",
        "passwordsNotMatch": "Yeni şifreler eşleşmiyor",
        "passwordTooShort": "Şifre en az 6 karakter olmalıdır",
        "languageTitle": "Dil Ayarları",
        "languageDesc": "Panel arayüzünün dilini seçin",
        "selectLanguage": "Dil Seçin",
        "languageSaved": "Dil tercihi kaydedildi",
        "devTools": "Eğitim ve Test Araçları",
        "devToolsDesc": "Sistemi test etmek ve personele eğitim vermek için demo verileri yönetin.",
        "loadDemo": "Mevcut Şubeye Demo Veri Yükle",
        "clearDemo": "Tüm Demo Verilerini Temizle",
        "processing": "İşlem Yapılıyor...",
        "clearing": "Temizleniyor..."
    },
    "dashboard": {
        "title": "Dashboard",
        "subtitle": "Overview of your business metrics",
        "totalCustomers": "Total Customers",
        "activeProjects": "Active Projects",
        "leads": "Leads",
        "monthlyIncome": "Monthly Income",
        "monthlyExpense": "Monthly Expense",
        "netProfitLoss": "Net Profit / Loss",
        "incomeExpenseAnalysis": "Income / Expense Analysis",
        "expenseDistribution": "Expense Distribution",
        "thisMonth": "This month",
        "income": "Income",
        "expense": "Expense",
        "general": "General",
        "recentActivities": "Recent Activities",
        "noActivities": "No activities yet",
        "activitiesHint": "Events will be displayed here",
        "report": "Report",
        "downloadReport": "Download Report",
        "reportModalTitle": "Download Report",
        "reportModalSubtitle": "Download summary report in PDF / CSV format",
        "reportModalDesc": "Performance, customer, and financial summary data for your branch will be downloaded in Excel-compatible CSV format."
    }
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/i18n/locales/es.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// Español locale
__turbopack_context__.s([
    "es",
    ()=>es
]);
const es = {
    "language": "Language",
    "languageName": "Español",
    "common": {
        "save": "Save",
        "cancel": "Cancel",
        "edit": "Edit",
        "delete": "Delete",
        "search": "Search...",
        "searchInSettings": "Search in settings...",
        "filter": "Filter",
        "loading": "Loading...",
        "saving": "Saving...",
        "status": "Status",
        "actions": "Actions",
        "confirm": "Confirm",
        "yes": "Yes",
        "no": "No",
        "success": "Success",
        "error": "Error",
        "warning": "Warning",
        "all": "All",
        "viewAll": "View All",
        "details": "Details",
        "add": "Add",
        "addNew": "Add New",
        "create": "Create",
        "description": "Description",
        "unsavedChanges": "Unsaved Changes Exist",
        "saveChanges": "Save Settings",
        "enterpriseVersion": "v1.0 Enterprise",
        "active": "Active",
        "inactive": "Inactive",
        "back": "Back",
        "close": "Close",
        "refresh": "Refresh",
        "copy": "Copy",
        "download": "Download",
        "date": "Date",
        "time": "Time",
        "type": "Type",
        "value": "Value",
        "metric": "Metric",
        "category": "Category",
        "amount": "Amount",
        "unknown": "Unknown",
        "noData": "No data found",
        "completed": "Completed",
        "pending": "Pending",
        "inProgress": "In Progress",
        "cancelled": "Cancelled",
        "high": "High",
        "medium": "Medium",
        "low": "Low"
    },
    "nav": {
        "dashboard": "Dashboard",
        "calendar": "Calendar",
        "orders": "Orders",
        "store": "Store",
        "customers": "Customers",
        "hr": "Human Resources",
        "staffRequests": "Staff Requests",
        "projects": "Projects",
        "leads": "Leads",
        "cargo": "Cargo",
        "files": "Files",
        "agencyLibrary": "Agency Library",
        "contentStore": "Content Store",
        "tasks": "Tasks",
        "personelDenetim": "Team Workload",
        "todos": "To-Do",
        "notes": "My Notes",
        "calculator": "Calculator",
        "finance": "Finance",
        "socialMedia": "Social Media",
        "contentCalendar": "Content Calendar",
        "branches": "Branches",
        "users": "Users",
        "chat": "Chat",
        "endOfDayReport": "End of Day Report",
        "customerRequests": "Customer Requests",
        "technicalSupport": "Technical Support",
        "announcements": "Announcements",
        "management": "Management",
        "communication": "Communication",
        "settings": "Settings",
        "logout": "Log Out",
        "expand": "Expand",
        "collapse": "Collapse",
        "managementPanel": "Management Panel",
        "superAdmin": "Super Admin",
        "user": "User"
    },
    "header": {
        "search": "Ara..."
    },
    "login": {
        "welcome": "Hoş geldiniz",
        "subtitle": "Devam etmek için hesabınıza giriş yapın",
        "managementPanel": "Yönetim Paneli",
        "manageFromOne": "İşletmenizi tek noktadan yönetin",
        "platformDesc": "CRM, proje yönetimi, İK, finans ve daha fazlasını entegre bir platformda takip edin.",
        "copyright": "© 2026 Tüm Hakları Saklıdır.",
        "features": {
            "customerMgmt": "Müşteri Yönetimi",
            "projectTracking": "Proje Takibi",
            "financeAnalysis": "Finans Analizi",
            "salesCrm": "Satış & CRM"
        },
        "form": {
            "username": "Kullanıcı Adı",
            "password": "Şifre",
            "submit": "Giriş Yap",
            "loading": "Giriş yapılıyor...",
            "forgotPassword": "Şifremi Unuttum"
        }
    },
    "settings": {
        "systemSettingsTitle": "Çiçekana ERP — Sistem Ayarları",
        "systemSettingsSubtitle": "Şirket yapılandırması, güvenlik politikaları, marka kiti ve modül parametrelerini merkezi olarak yönetin.",
        "tabs": {
            "company": {
                "label": "Genel Şirket Ayarları",
                "description": "Unvan, adres, vergi ve şube yapılandırması"
            },
            "profile": {
                "label": "Kişisel Profilim",
                "description": "Profil resmi, iletişim ve ad soyad bilgileri"
            },
            "security": {
                "label": "Güvenlik & Şifre Politikası",
                "description": "Şifre değiştirme, 2FA, IP ve oturum politikası"
            },
            "roles": {
                "label": "Kullanıcı & Rol Yönetimi",
                "description": "Şube ve kaynak bazlı yetki matrisi"
            },
            "theme": {
                "label": "Tema & Marka Kiti",
                "description": "Kurumsal logo, renk paleti ve karanlık mod"
            },
            "notifications": {
                "label": "Bildirim Tercihleri",
                "description": "E-posta, SMS, Push ve sesli uyarı kanalları"
            },
            "integrations": {
                "label": "Entegrasyonlar",
                "description": "E-Fatura, Kargo ve İyzico ödeme sistemleri"
            },
            "localization": {
                "label": "Yerelleştirme & KDV",
                "description": "Dil, para birimi, tarih formatı ve vergi oranları"
            },
            "numbering": {
                "label": "Doküman Numaralandırma",
                "description": "Fatura, sipariş ve proje numarası önekleri"
            },
            "workflows": {
                "label": "Onay Akışları",
                "description": "Limit bazlı onay mekanizmaları ve İK akışları"
            },
            "backup": {
                "label": "Yedekleme & Veri",
                "description": "Otomatik yedekleme sıklığı ve dışa aktarma"
            },
            "audit": {
                "label": "Denetim Kaydı (Audit Log)",
                "description": "Sistemdeki tüm değişikliklerin iz kayıtları"
            },
            "maintenance": {
                "label": "Sistem Bakım & Banner",
                "description": "Bakım modu ve duyuru görsel bannerı"
            },
            "danger": {
                "label": "Tehlikeli Bölge",
                "description": "Fabrika ayarlarına dönme ve demo veri araçları"
            }
        },
        "companySection": {
            "title": "Genel Şirket ve Şube Kimliği",
            "subtitle": "Çiçekana ERP üzerinde fatura, irsaliye ve resmi sözleşmelerde görüntülenecek kurumsal bilgileri girin.",
            "titleLabel": "Şirket Resmi Unvanı",
            "emailLabel": "E-posta Adresi",
            "taxOfficeLabel": "Vergi Dairesi",
            "taxNumberLabel": "Vergi Numarası (VKN)",
            "tradeRegLabel": "Ticaret Sicil No",
            "mersisLabel": "MERSİS Numarası",
            "addressLabel": "Genel Merkez Adresi",
            "multiBranchTitle": "Çoklu Şube / Depo Desteği",
            "multiBranchDesc": "Aktif edildiğinde veri izolasyonu ve şube bazlı yetki ayrıştırması uygulanır."
        },
        "profileSection": {
            "title": "Kişisel Profil Bilgileri",
            "subtitle": "Sistemde diğer kullanıcılara görüntülenecek ad soyad ve iletişim bilgilerinizi güncelleyin.",
            "selectAvatar": "Profil Fotoğrafı Seç",
            "avatarHint": "PNG, JPG veya WEBP formatında maksimum 5MB görsel.",
            "usernameDisabled": "Kullanıcı Adı (Değiştirilemez)",
            "fullName": "Ad Soyad",
            "email": "E-posta",
            "phone": "Telefon"
        },
        "securitySection": {
            "title": "Hesap Güvenliği & Parola Politikası",
            "subtitle": "Şifre yenileme, minimum uzunluk ve iki faktörlü doğrulama (2FA) kurallarını belirleyin.",
            "currentPassword": "Mevcut Şifre",
            "newPassword": "Yeni Şifre",
            "confirmPassword": "Yeni Şifre (Tekrar)",
            "changeBtn": "Şifreyi Değiştir",
            "minPasswordLength": "Minimum Şifre Uzunluğu",
            "twoFactorAuth": "İki Faktörlü Doğrulama (2FA)",
            "twoFactorDesc": "Girişlerde SMS / Authenticator kod onayını zorunlu tut."
        },
        "rolesSection": {
            "title": "Kullanıcı Rol ve Yetki Yönetimi",
            "subtitle": "Şube ve kaynak bazlı yetki matrisini (RBAC) yapılandırın.",
            "superAdminRole": "Süper Yönetici",
            "branchManagerRole": "Şube Müdürü",
            "staffRole": "Personel"
        },
        "themeSection": {
            "title": "Marka Kiti ve Görsel Tema Engine",
            "subtitle": "Logonuzu yükleyin ve kurumsal renk paletinizi otomatik çıkartın.",
            "brandLogo": "Kurumsal Logo",
            "primaryColor": "Ana Vurgu Rengi",
            "accentColor": "İkincil Renk"
        },
        "notificationsSection": {
            "title": "Sistem ve İşlem Bildirim Tercihleri",
            "subtitle": "E-posta, SMS ve Push bildirim kanallarını yapılandırın.",
            "emailNotifs": "E-posta Bildirimleri",
            "smsNotifs": "SMS Bildirimleri",
            "pushNotifs": "Push Bildirimleri"
        },
        "integrationsSection": {
            "title": "Üçüncü Taraf Entegrasyonlar",
            "subtitle": "E-Fatura, Kargo entegrasyonu ve İyzico ödeme altyapısı.",
            "efatura": "E-Fatura Entegrasyonu",
            "cargoApi": "Kargo API Bağlantısı",
            "iyzico": "İyzico Ödeme Altyapısı"
        },
        "localizationSection": {
            "title": "Yerelleştirme, Para Birimi ve KDV",
            "subtitle": "Sistem varsayılan dili, finansal para birimi ve vergi oranlarını belirleyin.",
            "systemLanguage": "Sistem Dili",
            "currency": "Para Birimi",
            "kdvRate": "Varsayılan KDV Oranı (%)"
        },
        "numberingSection": {
            "title": "Doküman Numaralandırma Şablonları",
            "subtitle": "Fatura, sipariş ve proje numarası önekleri ve sayaç ayarları.",
            "invoicePrefix": "Fatura Öneki",
            "orderPrefix": "Sipariş Öneki",
            "projectPrefix": "Proje Öneki"
        },
        "workflowsSection": {
            "title": "Kurumsal Onay Akışları",
            "subtitle": "Limit bazlı harcama ve izin onay hiyerarşisi.",
            "expenseLimit": "Otomatik Onay Limiti (TL)"
        },
        "backupSection": {
            "title": "Veri Yedekleme ve Dışa Aktarma",
            "subtitle": "Veritabanı otomatik yedekleme periyotları.",
            "autoBackup": "Otomatik Günlük Yedekleme",
            "downloadBackup": "Veritabanı Yedeği İndir"
        },
        "auditSection": {
            "title": "Sistem Denetim Kayıtları (Audit Log)",
            "subtitle": "Sistemde gerçekleştirilen tüm kritik işlemlerin log geçmişi.",
            "user": "Kullanıcı",
            "action": "İşlem",
            "ipAddress": "IP Adresi",
            "date": "Tarih",
            "noLogs": "Henüz denetim kaydı bulunmuyor."
        },
        "maintenanceSection": {
            "title": "Sistem Bakım Modu & Banner",
            "subtitle": "Sistemi bakıma alın veya tüm kullanıcılara duyuru bannerı gösterin.",
            "maintenanceMode": "Bakım Modu Aktif",
            "bannerText": "Duyuru Banner Metni"
        },
        "dangerSection": {
            "title": "Tehlikeli Bölge ve Test Araçları",
            "subtitle": "Fabrika ayarlarına sıfırlama ve demo veri yönetimi.",
            "loadDemoTitle": "Mevcut Şubeye Demo Veri Yükle",
            "clearDemoTitle": "Tüm Demo Verilerini Temizle",
            "resetSystemTitle": "Sistemi Fabrika Ayarlarına Sıfırla"
        },
        "title": "Ayarlar",
        "subtitle": "Hesap bilgilerinizi ve güvenlik ayarlarınızı yönetin",
        "personalInfo": "Kişisel Bilgiler",
        "personalInfoDesc": "Ad soyad, e-posta ve telefon bilgilerinizi güncelleyin",
        "username": "Kullanıcı Adı (değiştirilemez)",
        "profilePhoto": "Profil Fotoğrafı",
        "selectPhoto": "Fotoğraf Seç",
        "fullName": "Ad Soyad",
        "email": "E-posta",
        "phone": "Telefon",
        "saveInfo": "Bilgileri Kaydet",
        "saving": "Kaydediliyor...",
        "success": "Başarılı",
        "error": "Hata",
        "infoUpdated": "Bilgiler güncellendi!",
        "changePassword": "Şifre Değiştir",
        "changePasswordDesc": "Hesap güvenliğiniz için düzenli olarak şifre değiştirin",
        "currentPassword": "Mevcut Şifre",
        "newPassword": "Yeni Şifre",
        "newPasswordRepeat": "Yeni Şifre (Tekrar)",
        "changePasswordBtn": "Şifreyi Değiştir",
        "changing": "Değiştiriliyor...",
        "passwordChanged": "Şifre başarıyla değiştirildi!",
        "fillAllFields": "Tüm alanları doldurun",
        "passwordsNotMatch": "Yeni şifreler eşleşmiyor",
        "passwordTooShort": "Şifre en az 6 karakter olmalıdır",
        "languageTitle": "Dil Ayarları",
        "languageDesc": "Panel arayüzünün dilini seçin",
        "selectLanguage": "Dil Seçin",
        "languageSaved": "Dil tercihi kaydedildi",
        "devTools": "Eğitim ve Test Araçları",
        "devToolsDesc": "Sistemi test etmek ve personele eğitim vermek için demo verileri yönetin.",
        "loadDemo": "Mevcut Şubeye Demo Veri Yükle",
        "clearDemo": "Tüm Demo Verilerini Temizle",
        "processing": "İşlem Yapılıyor...",
        "clearing": "Temizleniyor..."
    },
    "dashboard": {
        "title": "Dashboard",
        "subtitle": "Overview of your business metrics",
        "totalCustomers": "Total Customers",
        "activeProjects": "Active Projects",
        "leads": "Leads",
        "monthlyIncome": "Monthly Income",
        "monthlyExpense": "Monthly Expense",
        "netProfitLoss": "Net Profit / Loss",
        "incomeExpenseAnalysis": "Income / Expense Analysis",
        "expenseDistribution": "Expense Distribution",
        "thisMonth": "This month",
        "income": "Income",
        "expense": "Expense",
        "general": "General",
        "recentActivities": "Recent Activities",
        "noActivities": "No activities yet",
        "activitiesHint": "Events will be displayed here",
        "report": "Report",
        "downloadReport": "Download Report",
        "reportModalTitle": "Download Report",
        "reportModalSubtitle": "Download summary report in PDF / CSV format",
        "reportModalDesc": "Performance, customer, and financial summary data for your branch will be downloaded in Excel-compatible CSV format."
    }
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/i18n/locales/fr.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// Français locale
__turbopack_context__.s([
    "fr",
    ()=>fr
]);
const fr = {
    "language": "Language",
    "languageName": "Français",
    "common": {
        "save": "Save",
        "cancel": "Cancel",
        "edit": "Edit",
        "delete": "Delete",
        "search": "Search...",
        "searchInSettings": "Search in settings...",
        "filter": "Filter",
        "loading": "Loading...",
        "saving": "Saving...",
        "status": "Status",
        "actions": "Actions",
        "confirm": "Confirm",
        "yes": "Yes",
        "no": "No",
        "success": "Success",
        "error": "Error",
        "warning": "Warning",
        "all": "All",
        "viewAll": "View All",
        "details": "Details",
        "add": "Add",
        "addNew": "Add New",
        "create": "Create",
        "description": "Description",
        "unsavedChanges": "Unsaved Changes Exist",
        "saveChanges": "Save Settings",
        "enterpriseVersion": "v1.0 Enterprise",
        "active": "Active",
        "inactive": "Inactive",
        "back": "Back",
        "close": "Close",
        "refresh": "Refresh",
        "copy": "Copy",
        "download": "Download",
        "date": "Date",
        "time": "Time",
        "type": "Type",
        "value": "Value",
        "metric": "Metric",
        "category": "Category",
        "amount": "Amount",
        "unknown": "Unknown",
        "noData": "No data found",
        "completed": "Completed",
        "pending": "Pending",
        "inProgress": "In Progress",
        "cancelled": "Cancelled",
        "high": "High",
        "medium": "Medium",
        "low": "Low"
    },
    "nav": {
        "dashboard": "Dashboard",
        "calendar": "Calendar",
        "orders": "Orders",
        "store": "Store",
        "customers": "Customers",
        "hr": "Human Resources",
        "staffRequests": "Staff Requests",
        "projects": "Projects",
        "leads": "Leads",
        "cargo": "Cargo",
        "files": "Files",
        "agencyLibrary": "Agency Library",
        "contentStore": "Content Store",
        "tasks": "Tasks",
        "personelDenetim": "Team Workload",
        "todos": "To-Do",
        "notes": "My Notes",
        "calculator": "Calculator",
        "finance": "Finance",
        "socialMedia": "Social Media",
        "contentCalendar": "Content Calendar",
        "branches": "Branches",
        "users": "Users",
        "chat": "Chat",
        "endOfDayReport": "End of Day Report",
        "customerRequests": "Customer Requests",
        "technicalSupport": "Technical Support",
        "announcements": "Announcements",
        "management": "Management",
        "communication": "Communication",
        "settings": "Settings",
        "logout": "Log Out",
        "expand": "Expand",
        "collapse": "Collapse",
        "managementPanel": "Management Panel",
        "superAdmin": "Super Admin",
        "user": "User"
    },
    "header": {
        "search": "Ara..."
    },
    "login": {
        "welcome": "Hoş geldiniz",
        "subtitle": "Devam etmek için hesabınıza giriş yapın",
        "managementPanel": "Yönetim Paneli",
        "manageFromOne": "İşletmenizi tek noktadan yönetin",
        "platformDesc": "CRM, proje yönetimi, İK, finans ve daha fazlasını entegre bir platformda takip edin.",
        "copyright": "© 2026 Tüm Hakları Saklıdır.",
        "features": {
            "customerMgmt": "Müşteri Yönetimi",
            "projectTracking": "Proje Takibi",
            "financeAnalysis": "Finans Analizi",
            "salesCrm": "Satış & CRM"
        },
        "form": {
            "username": "Kullanıcı Adı",
            "password": "Şifre",
            "submit": "Giriş Yap",
            "loading": "Giriş yapılıyor...",
            "forgotPassword": "Şifremi Unuttum"
        }
    },
    "settings": {
        "systemSettingsTitle": "Çiçekana ERP — Sistem Ayarları",
        "systemSettingsSubtitle": "Şirket yapılandırması, güvenlik politikaları, marka kiti ve modül parametrelerini merkezi olarak yönetin.",
        "tabs": {
            "company": {
                "label": "Genel Şirket Ayarları",
                "description": "Unvan, adres, vergi ve şube yapılandırması"
            },
            "profile": {
                "label": "Kişisel Profilim",
                "description": "Profil resmi, iletişim ve ad soyad bilgileri"
            },
            "security": {
                "label": "Güvenlik & Şifre Politikası",
                "description": "Şifre değiştirme, 2FA, IP ve oturum politikası"
            },
            "roles": {
                "label": "Kullanıcı & Rol Yönetimi",
                "description": "Şube ve kaynak bazlı yetki matrisi"
            },
            "theme": {
                "label": "Tema & Marka Kiti",
                "description": "Kurumsal logo, renk paleti ve karanlık mod"
            },
            "notifications": {
                "label": "Bildirim Tercihleri",
                "description": "E-posta, SMS, Push ve sesli uyarı kanalları"
            },
            "integrations": {
                "label": "Entegrasyonlar",
                "description": "E-Fatura, Kargo ve İyzico ödeme sistemleri"
            },
            "localization": {
                "label": "Yerelleştirme & KDV",
                "description": "Dil, para birimi, tarih formatı ve vergi oranları"
            },
            "numbering": {
                "label": "Doküman Numaralandırma",
                "description": "Fatura, sipariş ve proje numarası önekleri"
            },
            "workflows": {
                "label": "Onay Akışları",
                "description": "Limit bazlı onay mekanizmaları ve İK akışları"
            },
            "backup": {
                "label": "Yedekleme & Veri",
                "description": "Otomatik yedekleme sıklığı ve dışa aktarma"
            },
            "audit": {
                "label": "Denetim Kaydı (Audit Log)",
                "description": "Sistemdeki tüm değişikliklerin iz kayıtları"
            },
            "maintenance": {
                "label": "Sistem Bakım & Banner",
                "description": "Bakım modu ve duyuru görsel bannerı"
            },
            "danger": {
                "label": "Tehlikeli Bölge",
                "description": "Fabrika ayarlarına dönme ve demo veri araçları"
            }
        },
        "companySection": {
            "title": "Genel Şirket ve Şube Kimliği",
            "subtitle": "Çiçekana ERP üzerinde fatura, irsaliye ve resmi sözleşmelerde görüntülenecek kurumsal bilgileri girin.",
            "titleLabel": "Şirket Resmi Unvanı",
            "emailLabel": "E-posta Adresi",
            "taxOfficeLabel": "Vergi Dairesi",
            "taxNumberLabel": "Vergi Numarası (VKN)",
            "tradeRegLabel": "Ticaret Sicil No",
            "mersisLabel": "MERSİS Numarası",
            "addressLabel": "Genel Merkez Adresi",
            "multiBranchTitle": "Çoklu Şube / Depo Desteği",
            "multiBranchDesc": "Aktif edildiğinde veri izolasyonu ve şube bazlı yetki ayrıştırması uygulanır."
        },
        "profileSection": {
            "title": "Kişisel Profil Bilgileri",
            "subtitle": "Sistemde diğer kullanıcılara görüntülenecek ad soyad ve iletişim bilgilerinizi güncelleyin.",
            "selectAvatar": "Profil Fotoğrafı Seç",
            "avatarHint": "PNG, JPG veya WEBP formatında maksimum 5MB görsel.",
            "usernameDisabled": "Kullanıcı Adı (Değiştirilemez)",
            "fullName": "Ad Soyad",
            "email": "E-posta",
            "phone": "Telefon"
        },
        "securitySection": {
            "title": "Hesap Güvenliği & Parola Politikası",
            "subtitle": "Şifre yenileme, minimum uzunluk ve iki faktörlü doğrulama (2FA) kurallarını belirleyin.",
            "currentPassword": "Mevcut Şifre",
            "newPassword": "Yeni Şifre",
            "confirmPassword": "Yeni Şifre (Tekrar)",
            "changeBtn": "Şifreyi Değiştir",
            "minPasswordLength": "Minimum Şifre Uzunluğu",
            "twoFactorAuth": "İki Faktörlü Doğrulama (2FA)",
            "twoFactorDesc": "Girişlerde SMS / Authenticator kod onayını zorunlu tut."
        },
        "rolesSection": {
            "title": "Kullanıcı Rol ve Yetki Yönetimi",
            "subtitle": "Şube ve kaynak bazlı yetki matrisini (RBAC) yapılandırın.",
            "superAdminRole": "Süper Yönetici",
            "branchManagerRole": "Şube Müdürü",
            "staffRole": "Personel"
        },
        "themeSection": {
            "title": "Marka Kiti ve Görsel Tema Engine",
            "subtitle": "Logonuzu yükleyin ve kurumsal renk paletinizi otomatik çıkartın.",
            "brandLogo": "Kurumsal Logo",
            "primaryColor": "Ana Vurgu Rengi",
            "accentColor": "İkincil Renk"
        },
        "notificationsSection": {
            "title": "Sistem ve İşlem Bildirim Tercihleri",
            "subtitle": "E-posta, SMS ve Push bildirim kanallarını yapılandırın.",
            "emailNotifs": "E-posta Bildirimleri",
            "smsNotifs": "SMS Bildirimleri",
            "pushNotifs": "Push Bildirimleri"
        },
        "integrationsSection": {
            "title": "Üçüncü Taraf Entegrasyonlar",
            "subtitle": "E-Fatura, Kargo entegrasyonu ve İyzico ödeme altyapısı.",
            "efatura": "E-Fatura Entegrasyonu",
            "cargoApi": "Kargo API Bağlantısı",
            "iyzico": "İyzico Ödeme Altyapısı"
        },
        "localizationSection": {
            "title": "Yerelleştirme, Para Birimi ve KDV",
            "subtitle": "Sistem varsayılan dili, finansal para birimi ve vergi oranlarını belirleyin.",
            "systemLanguage": "Sistem Dili",
            "currency": "Para Birimi",
            "kdvRate": "Varsayılan KDV Oranı (%)"
        },
        "numberingSection": {
            "title": "Doküman Numaralandırma Şablonları",
            "subtitle": "Fatura, sipariş ve proje numarası önekleri ve sayaç ayarları.",
            "invoicePrefix": "Fatura Öneki",
            "orderPrefix": "Sipariş Öneki",
            "projectPrefix": "Proje Öneki"
        },
        "workflowsSection": {
            "title": "Kurumsal Onay Akışları",
            "subtitle": "Limit bazlı harcama ve izin onay hiyerarşisi.",
            "expenseLimit": "Otomatik Onay Limiti (TL)"
        },
        "backupSection": {
            "title": "Veri Yedekleme ve Dışa Aktarma",
            "subtitle": "Veritabanı otomatik yedekleme periyotları.",
            "autoBackup": "Otomatik Günlük Yedekleme",
            "downloadBackup": "Veritabanı Yedeği İndir"
        },
        "auditSection": {
            "title": "Sistem Denetim Kayıtları (Audit Log)",
            "subtitle": "Sistemde gerçekleştirilen tüm kritik işlemlerin log geçmişi.",
            "user": "Kullanıcı",
            "action": "İşlem",
            "ipAddress": "IP Adresi",
            "date": "Tarih",
            "noLogs": "Henüz denetim kaydı bulunmuyor."
        },
        "maintenanceSection": {
            "title": "Sistem Bakım Modu & Banner",
            "subtitle": "Sistemi bakıma alın veya tüm kullanıcılara duyuru bannerı gösterin.",
            "maintenanceMode": "Bakım Modu Aktif",
            "bannerText": "Duyuru Banner Metni"
        },
        "dangerSection": {
            "title": "Tehlikeli Bölge ve Test Araçları",
            "subtitle": "Fabrika ayarlarına sıfırlama ve demo veri yönetimi.",
            "loadDemoTitle": "Mevcut Şubeye Demo Veri Yükle",
            "clearDemoTitle": "Tüm Demo Verilerini Temizle",
            "resetSystemTitle": "Sistemi Fabrika Ayarlarına Sıfırla"
        },
        "title": "Ayarlar",
        "subtitle": "Hesap bilgilerinizi ve güvenlik ayarlarınızı yönetin",
        "personalInfo": "Kişisel Bilgiler",
        "personalInfoDesc": "Ad soyad, e-posta ve telefon bilgilerinizi güncelleyin",
        "username": "Kullanıcı Adı (değiştirilemez)",
        "profilePhoto": "Profil Fotoğrafı",
        "selectPhoto": "Fotoğraf Seç",
        "fullName": "Ad Soyad",
        "email": "E-posta",
        "phone": "Telefon",
        "saveInfo": "Bilgileri Kaydet",
        "saving": "Kaydediliyor...",
        "success": "Başarılı",
        "error": "Hata",
        "infoUpdated": "Bilgiler güncellendi!",
        "changePassword": "Şifre Değiştir",
        "changePasswordDesc": "Hesap güvenliğiniz için düzenli olarak şifre değiştirin",
        "currentPassword": "Mevcut Şifre",
        "newPassword": "Yeni Şifre",
        "newPasswordRepeat": "Yeni Şifre (Tekrar)",
        "changePasswordBtn": "Şifreyi Değiştir",
        "changing": "Değiştiriliyor...",
        "passwordChanged": "Şifre başarıyla değiştirildi!",
        "fillAllFields": "Tüm alanları doldurun",
        "passwordsNotMatch": "Yeni şifreler eşleşmiyor",
        "passwordTooShort": "Şifre en az 6 karakter olmalıdır",
        "languageTitle": "Dil Ayarları",
        "languageDesc": "Panel arayüzünün dilini seçin",
        "selectLanguage": "Dil Seçin",
        "languageSaved": "Dil tercihi kaydedildi",
        "devTools": "Eğitim ve Test Araçları",
        "devToolsDesc": "Sistemi test etmek ve personele eğitim vermek için demo verileri yönetin.",
        "loadDemo": "Mevcut Şubeye Demo Veri Yükle",
        "clearDemo": "Tüm Demo Verilerini Temizle",
        "processing": "İşlem Yapılıyor...",
        "clearing": "Temizleniyor..."
    },
    "dashboard": {
        "title": "Dashboard",
        "subtitle": "Overview of your business metrics",
        "totalCustomers": "Total Customers",
        "activeProjects": "Active Projects",
        "leads": "Leads",
        "monthlyIncome": "Monthly Income",
        "monthlyExpense": "Monthly Expense",
        "netProfitLoss": "Net Profit / Loss",
        "incomeExpenseAnalysis": "Income / Expense Analysis",
        "expenseDistribution": "Expense Distribution",
        "thisMonth": "This month",
        "income": "Income",
        "expense": "Expense",
        "general": "General",
        "recentActivities": "Recent Activities",
        "noActivities": "No activities yet",
        "activitiesHint": "Events will be displayed here",
        "report": "Report",
        "downloadReport": "Download Report",
        "reportModalTitle": "Download Report",
        "reportModalSubtitle": "Download summary report in PDF / CSV format",
        "reportModalDesc": "Performance, customer, and financial summary data for your branch will be downloaded in Excel-compatible CSV format."
    }
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/i18n/locales/it.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// Italiano locale
__turbopack_context__.s([
    "it",
    ()=>it
]);
const it = {
    "language": "Language",
    "languageName": "Italiano",
    "common": {
        "save": "Save",
        "cancel": "Cancel",
        "edit": "Edit",
        "delete": "Delete",
        "search": "Search...",
        "searchInSettings": "Search in settings...",
        "filter": "Filter",
        "loading": "Loading...",
        "saving": "Saving...",
        "status": "Status",
        "actions": "Actions",
        "confirm": "Confirm",
        "yes": "Yes",
        "no": "No",
        "success": "Success",
        "error": "Error",
        "warning": "Warning",
        "all": "All",
        "viewAll": "View All",
        "details": "Details",
        "add": "Add",
        "addNew": "Add New",
        "create": "Create",
        "description": "Description",
        "unsavedChanges": "Unsaved Changes Exist",
        "saveChanges": "Save Settings",
        "enterpriseVersion": "v1.0 Enterprise",
        "active": "Active",
        "inactive": "Inactive",
        "back": "Back",
        "close": "Close",
        "refresh": "Refresh",
        "copy": "Copy",
        "download": "Download",
        "date": "Date",
        "time": "Time",
        "type": "Type",
        "value": "Value",
        "metric": "Metric",
        "category": "Category",
        "amount": "Amount",
        "unknown": "Unknown",
        "noData": "No data found",
        "completed": "Completed",
        "pending": "Pending",
        "inProgress": "In Progress",
        "cancelled": "Cancelled",
        "high": "High",
        "medium": "Medium",
        "low": "Low"
    },
    "nav": {
        "dashboard": "Dashboard",
        "calendar": "Calendar",
        "orders": "Orders",
        "store": "Store",
        "customers": "Customers",
        "hr": "Human Resources",
        "staffRequests": "Staff Requests",
        "projects": "Projects",
        "leads": "Leads",
        "cargo": "Cargo",
        "files": "Files",
        "agencyLibrary": "Agency Library",
        "contentStore": "Content Store",
        "tasks": "Tasks",
        "personelDenetim": "Team Workload",
        "todos": "To-Do",
        "notes": "My Notes",
        "calculator": "Calculator",
        "finance": "Finance",
        "socialMedia": "Social Media",
        "contentCalendar": "Content Calendar",
        "branches": "Branches",
        "users": "Users",
        "chat": "Chat",
        "endOfDayReport": "End of Day Report",
        "customerRequests": "Customer Requests",
        "technicalSupport": "Technical Support",
        "announcements": "Announcements",
        "management": "Management",
        "communication": "Communication",
        "settings": "Settings",
        "logout": "Log Out",
        "expand": "Expand",
        "collapse": "Collapse",
        "managementPanel": "Management Panel",
        "superAdmin": "Super Admin",
        "user": "User"
    },
    "header": {
        "search": "Ara..."
    },
    "login": {
        "welcome": "Hoş geldiniz",
        "subtitle": "Devam etmek için hesabınıza giriş yapın",
        "managementPanel": "Yönetim Paneli",
        "manageFromOne": "İşletmenizi tek noktadan yönetin",
        "platformDesc": "CRM, proje yönetimi, İK, finans ve daha fazlasını entegre bir platformda takip edin.",
        "copyright": "© 2026 Tüm Hakları Saklıdır.",
        "features": {
            "customerMgmt": "Müşteri Yönetimi",
            "projectTracking": "Proje Takibi",
            "financeAnalysis": "Finans Analizi",
            "salesCrm": "Satış & CRM"
        },
        "form": {
            "username": "Kullanıcı Adı",
            "password": "Şifre",
            "submit": "Giriş Yap",
            "loading": "Giriş yapılıyor...",
            "forgotPassword": "Şifremi Unuttum"
        }
    },
    "settings": {
        "systemSettingsTitle": "Çiçekana ERP — Sistem Ayarları",
        "systemSettingsSubtitle": "Şirket yapılandırması, güvenlik politikaları, marka kiti ve modül parametrelerini merkezi olarak yönetin.",
        "tabs": {
            "company": {
                "label": "Genel Şirket Ayarları",
                "description": "Unvan, adres, vergi ve şube yapılandırması"
            },
            "profile": {
                "label": "Kişisel Profilim",
                "description": "Profil resmi, iletişim ve ad soyad bilgileri"
            },
            "security": {
                "label": "Güvenlik & Şifre Politikası",
                "description": "Şifre değiştirme, 2FA, IP ve oturum politikası"
            },
            "roles": {
                "label": "Kullanıcı & Rol Yönetimi",
                "description": "Şube ve kaynak bazlı yetki matrisi"
            },
            "theme": {
                "label": "Tema & Marka Kiti",
                "description": "Kurumsal logo, renk paleti ve karanlık mod"
            },
            "notifications": {
                "label": "Bildirim Tercihleri",
                "description": "E-posta, SMS, Push ve sesli uyarı kanalları"
            },
            "integrations": {
                "label": "Entegrasyonlar",
                "description": "E-Fatura, Kargo ve İyzico ödeme sistemleri"
            },
            "localization": {
                "label": "Yerelleştirme & KDV",
                "description": "Dil, para birimi, tarih formatı ve vergi oranları"
            },
            "numbering": {
                "label": "Doküman Numaralandırma",
                "description": "Fatura, sipariş ve proje numarası önekleri"
            },
            "workflows": {
                "label": "Onay Akışları",
                "description": "Limit bazlı onay mekanizmaları ve İK akışları"
            },
            "backup": {
                "label": "Yedekleme & Veri",
                "description": "Otomatik yedekleme sıklığı ve dışa aktarma"
            },
            "audit": {
                "label": "Denetim Kaydı (Audit Log)",
                "description": "Sistemdeki tüm değişikliklerin iz kayıtları"
            },
            "maintenance": {
                "label": "Sistem Bakım & Banner",
                "description": "Bakım modu ve duyuru görsel bannerı"
            },
            "danger": {
                "label": "Tehlikeli Bölge",
                "description": "Fabrika ayarlarına dönme ve demo veri araçları"
            }
        },
        "companySection": {
            "title": "Genel Şirket ve Şube Kimliği",
            "subtitle": "Çiçekana ERP üzerinde fatura, irsaliye ve resmi sözleşmelerde görüntülenecek kurumsal bilgileri girin.",
            "titleLabel": "Şirket Resmi Unvanı",
            "emailLabel": "E-posta Adresi",
            "taxOfficeLabel": "Vergi Dairesi",
            "taxNumberLabel": "Vergi Numarası (VKN)",
            "tradeRegLabel": "Ticaret Sicil No",
            "mersisLabel": "MERSİS Numarası",
            "addressLabel": "Genel Merkez Adresi",
            "multiBranchTitle": "Çoklu Şube / Depo Desteği",
            "multiBranchDesc": "Aktif edildiğinde veri izolasyonu ve şube bazlı yetki ayrıştırması uygulanır."
        },
        "profileSection": {
            "title": "Kişisel Profil Bilgileri",
            "subtitle": "Sistemde diğer kullanıcılara görüntülenecek ad soyad ve iletişim bilgilerinizi güncelleyin.",
            "selectAvatar": "Profil Fotoğrafı Seç",
            "avatarHint": "PNG, JPG veya WEBP formatında maksimum 5MB görsel.",
            "usernameDisabled": "Kullanıcı Adı (Değiştirilemez)",
            "fullName": "Ad Soyad",
            "email": "E-posta",
            "phone": "Telefon"
        },
        "securitySection": {
            "title": "Hesap Güvenliği & Parola Politikası",
            "subtitle": "Şifre yenileme, minimum uzunluk ve iki faktörlü doğrulama (2FA) kurallarını belirleyin.",
            "currentPassword": "Mevcut Şifre",
            "newPassword": "Yeni Şifre",
            "confirmPassword": "Yeni Şifre (Tekrar)",
            "changeBtn": "Şifreyi Değiştir",
            "minPasswordLength": "Minimum Şifre Uzunluğu",
            "twoFactorAuth": "İki Faktörlü Doğrulama (2FA)",
            "twoFactorDesc": "Girişlerde SMS / Authenticator kod onayını zorunlu tut."
        },
        "rolesSection": {
            "title": "Kullanıcı Rol ve Yetki Yönetimi",
            "subtitle": "Şube ve kaynak bazlı yetki matrisini (RBAC) yapılandırın.",
            "superAdminRole": "Süper Yönetici",
            "branchManagerRole": "Şube Müdürü",
            "staffRole": "Personel"
        },
        "themeSection": {
            "title": "Marka Kiti ve Görsel Tema Engine",
            "subtitle": "Logonuzu yükleyin ve kurumsal renk paletinizi otomatik çıkartın.",
            "brandLogo": "Kurumsal Logo",
            "primaryColor": "Ana Vurgu Rengi",
            "accentColor": "İkincil Renk"
        },
        "notificationsSection": {
            "title": "Sistem ve İşlem Bildirim Tercihleri",
            "subtitle": "E-posta, SMS ve Push bildirim kanallarını yapılandırın.",
            "emailNotifs": "E-posta Bildirimleri",
            "smsNotifs": "SMS Bildirimleri",
            "pushNotifs": "Push Bildirimleri"
        },
        "integrationsSection": {
            "title": "Üçüncü Taraf Entegrasyonlar",
            "subtitle": "E-Fatura, Kargo entegrasyonu ve İyzico ödeme altyapısı.",
            "efatura": "E-Fatura Entegrasyonu",
            "cargoApi": "Kargo API Bağlantısı",
            "iyzico": "İyzico Ödeme Altyapısı"
        },
        "localizationSection": {
            "title": "Yerelleştirme, Para Birimi ve KDV",
            "subtitle": "Sistem varsayılan dili, finansal para birimi ve vergi oranlarını belirleyin.",
            "systemLanguage": "Sistem Dili",
            "currency": "Para Birimi",
            "kdvRate": "Varsayılan KDV Oranı (%)"
        },
        "numberingSection": {
            "title": "Doküman Numaralandırma Şablonları",
            "subtitle": "Fatura, sipariş ve proje numarası önekleri ve sayaç ayarları.",
            "invoicePrefix": "Fatura Öneki",
            "orderPrefix": "Sipariş Öneki",
            "projectPrefix": "Proje Öneki"
        },
        "workflowsSection": {
            "title": "Kurumsal Onay Akışları",
            "subtitle": "Limit bazlı harcama ve izin onay hiyerarşisi.",
            "expenseLimit": "Otomatik Onay Limiti (TL)"
        },
        "backupSection": {
            "title": "Veri Yedekleme ve Dışa Aktarma",
            "subtitle": "Veritabanı otomatik yedekleme periyotları.",
            "autoBackup": "Otomatik Günlük Yedekleme",
            "downloadBackup": "Veritabanı Yedeği İndir"
        },
        "auditSection": {
            "title": "Sistem Denetim Kayıtları (Audit Log)",
            "subtitle": "Sistemde gerçekleştirilen tüm kritik işlemlerin log geçmişi.",
            "user": "Kullanıcı",
            "action": "İşlem",
            "ipAddress": "IP Adresi",
            "date": "Tarih",
            "noLogs": "Henüz denetim kaydı bulunmuyor."
        },
        "maintenanceSection": {
            "title": "Sistem Bakım Modu & Banner",
            "subtitle": "Sistemi bakıma alın veya tüm kullanıcılara duyuru bannerı gösterin.",
            "maintenanceMode": "Bakım Modu Aktif",
            "bannerText": "Duyuru Banner Metni"
        },
        "dangerSection": {
            "title": "Tehlikeli Bölge ve Test Araçları",
            "subtitle": "Fabrika ayarlarına sıfırlama ve demo veri yönetimi.",
            "loadDemoTitle": "Mevcut Şubeye Demo Veri Yükle",
            "clearDemoTitle": "Tüm Demo Verilerini Temizle",
            "resetSystemTitle": "Sistemi Fabrika Ayarlarına Sıfırla"
        },
        "title": "Ayarlar",
        "subtitle": "Hesap bilgilerinizi ve güvenlik ayarlarınızı yönetin",
        "personalInfo": "Kişisel Bilgiler",
        "personalInfoDesc": "Ad soyad, e-posta ve telefon bilgilerinizi güncelleyin",
        "username": "Kullanıcı Adı (değiştirilemez)",
        "profilePhoto": "Profil Fotoğrafı",
        "selectPhoto": "Fotoğraf Seç",
        "fullName": "Ad Soyad",
        "email": "E-posta",
        "phone": "Telefon",
        "saveInfo": "Bilgileri Kaydet",
        "saving": "Kaydediliyor...",
        "success": "Başarılı",
        "error": "Hata",
        "infoUpdated": "Bilgiler güncellendi!",
        "changePassword": "Şifre Değiştir",
        "changePasswordDesc": "Hesap güvenliğiniz için düzenli olarak şifre değiştirin",
        "currentPassword": "Mevcut Şifre",
        "newPassword": "Yeni Şifre",
        "newPasswordRepeat": "Yeni Şifre (Tekrar)",
        "changePasswordBtn": "Şifreyi Değiştir",
        "changing": "Değiştiriliyor...",
        "passwordChanged": "Şifre başarıyla değiştirildi!",
        "fillAllFields": "Tüm alanları doldurun",
        "passwordsNotMatch": "Yeni şifreler eşleşmiyor",
        "passwordTooShort": "Şifre en az 6 karakter olmalıdır",
        "languageTitle": "Dil Ayarları",
        "languageDesc": "Panel arayüzünün dilini seçin",
        "selectLanguage": "Dil Seçin",
        "languageSaved": "Dil tercihi kaydedildi",
        "devTools": "Eğitim ve Test Araçları",
        "devToolsDesc": "Sistemi test etmek ve personele eğitim vermek için demo verileri yönetin.",
        "loadDemo": "Mevcut Şubeye Demo Veri Yükle",
        "clearDemo": "Tüm Demo Verilerini Temizle",
        "processing": "İşlem Yapılıyor...",
        "clearing": "Temizleniyor..."
    },
    "dashboard": {
        "title": "Dashboard",
        "subtitle": "Overview of your business metrics",
        "totalCustomers": "Total Customers",
        "activeProjects": "Active Projects",
        "leads": "Leads",
        "monthlyIncome": "Monthly Income",
        "monthlyExpense": "Monthly Expense",
        "netProfitLoss": "Net Profit / Loss",
        "incomeExpenseAnalysis": "Income / Expense Analysis",
        "expenseDistribution": "Expense Distribution",
        "thisMonth": "This month",
        "income": "Income",
        "expense": "Expense",
        "general": "General",
        "recentActivities": "Recent Activities",
        "noActivities": "No activities yet",
        "activitiesHint": "Events will be displayed here",
        "report": "Report",
        "downloadReport": "Download Report",
        "reportModalTitle": "Download Report",
        "reportModalSubtitle": "Download summary report in PDF / CSV format",
        "reportModalDesc": "Performance, customer, and financial summary data for your branch will be downloaded in Excel-compatible CSV format."
    }
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/i18n/locales/ru.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// Russian locale
__turbopack_context__.s([
    "ru",
    ()=>ru
]);
const ru = {
    "language": "Язык",
    "languageName": "Русский",
    "common": {
        "save": "Сохранить",
        "cancel": "Отмена",
        "edit": "Редактировать",
        "delete": "Удалить",
        "search": "Поиск...",
        "searchInSettings": "Поиск в настройках...",
        "filter": "Фильтр",
        "loading": "Загрузка...",
        "saving": "Сохранение...",
        "status": "Статус",
        "actions": "Действия",
        "confirm": "Подтвердить",
        "yes": "Да",
        "no": "Нет",
        "success": "Успешно",
        "error": "Ошибка",
        "warning": "Предупреждение",
        "all": "Все",
        "viewAll": "Посмотреть все",
        "details": "Детали",
        "add": "Добавить",
        "addNew": "Добавить новую",
        "create": "Создать",
        "description": "Описание",
        "unsavedChanges": "Есть несохраненные изменения",
        "saveChanges": "Сохранить настройки",
        "enterpriseVersion": "v1.0 Корпоративная",
        "active": "Активен",
        "inactive": "Неактивен",
        "back": "Назад",
        "close": "Закрыть",
        "refresh": "Обновить",
        "copy": "Копировать",
        "download": "Скачать",
        "date": "Дата",
        "time": "Время",
        "type": "Тип",
        "value": "Значение",
        "metric": "Метрика",
        "category": "Категория",
        "amount": "Сумма",
        "unknown": "Неизвестно",
        "noData": "Данные не найдены",
        "completed": "Завершено",
        "pending": "В ожидании",
        "inProgress": "В процессе",
        "cancelled": "Отменено",
        "high": "Высокий",
        "medium": "Средний",
        "low": "Низкий"
    },
    "nav": {
        "dashboard": "Панель управления",
        "calendar": "Календарь",
        "orders": "Заказы",
        "store": "Магазин",
        "customers": "Клиенты",
        "hr": "Кадры (HR)",
        "staffRequests": "Запросы персонала",
        "projects": "Проекты",
        "leads": "Лиды",
        "cargo": "Доставка",
        "files": "Файлы",
        "agencyLibrary": "Библиотека агентства",
        "contentStore": "Магазин контента",
        "tasks": "Задачи",
        "personelDenetim": "Загрузка команды",
        "todos": "Список дел",
        "notes": "Мои заметки",
        "calculator": "Калькулятор",
        "finance": "Финансы",
        "socialMedia": "Социальные сети",
        "contentCalendar": "Контент-календарь",
        "branches": "Филиалы",
        "users": "Пользователи",
        "chat": "Чаты",
        "endOfDayReport": "Отчет за день",
        "customerRequests": "Запросы клиентов",
        "technicalSupport": "Техподдержка",
        "announcements": "Объявления",
        "management": "Управление",
        "communication": "Связь",
        "settings": "Настройки",
        "logout": "Выйти",
        "expand": "Развернуть",
        "collapse": "Свернуть",
        "managementPanel": "Панель управления",
        "superAdmin": "Супер-администратор",
        "user": "Пользователь"
    },
    "header": {
        "search": "Ara..."
    },
    "login": {
        "welcome": "Hoş geldiniz",
        "subtitle": "Devam etmek için hesabınıza giriş yapın",
        "managementPanel": "Yönetim Paneli",
        "manageFromOne": "İşletmenizi tek noktadan yönetin",
        "platformDesc": "CRM, proje yönetimi, İK, finans ve daha fazlasını entegre bir platformda takip edin.",
        "copyright": "© 2026 Tüm Hakları Saklıdır.",
        "features": {
            "customerMgmt": "Müşteri Yönetimi",
            "projectTracking": "Proje Takibi",
            "financeAnalysis": "Finans Analizi",
            "salesCrm": "Satış & CRM"
        },
        "form": {
            "username": "Kullanıcı Adı",
            "password": "Şifre",
            "submit": "Giriş Yap",
            "loading": "Giriş yapılıyor...",
            "forgotPassword": "Şifremi Unuttum"
        }
    },
    "settings": {
        "systemSettingsTitle": "Çiçekana ERP — Sistem Ayarları",
        "systemSettingsSubtitle": "Şirket yapılandırması, güvenlik politikaları, marka kiti ve modül parametrelerini merkezi olarak yönetin.",
        "tabs": {
            "company": {
                "label": "Genel Şirket Ayarları",
                "description": "Unvan, adres, vergi ve şube yapılandırması"
            },
            "profile": {
                "label": "Kişisel Profilim",
                "description": "Profil resmi, iletişim ve ad soyad bilgileri"
            },
            "security": {
                "label": "Güvenlik & Şifre Politikası",
                "description": "Şifre değiştirme, 2FA, IP ve oturum politikası"
            },
            "roles": {
                "label": "Kullanıcı & Rol Yönetimi",
                "description": "Şube ve kaynak bazlı yetki matrisi"
            },
            "theme": {
                "label": "Tema & Marka Kiti",
                "description": "Kurumsal logo, renk paleti ve karanlık mod"
            },
            "notifications": {
                "label": "Bildirim Tercihleri",
                "description": "E-posta, SMS, Push ve sesli uyarı kanalları"
            },
            "integrations": {
                "label": "Entegrasyonlar",
                "description": "E-Fatura, Kargo ve İyzico ödeme sistemleri"
            },
            "localization": {
                "label": "Yerelleştirme & KDV",
                "description": "Dil, para birimi, tarih formatı ve vergi oranları"
            },
            "numbering": {
                "label": "Doküman Numaralandırma",
                "description": "Fatura, sipariş ve proje numarası önekleri"
            },
            "workflows": {
                "label": "Onay Akışları",
                "description": "Limit bazlı onay mekanizmaları ve İK akışları"
            },
            "backup": {
                "label": "Yedekleme & Veri",
                "description": "Otomatik yedekleme sıklığı ve dışa aktarma"
            },
            "audit": {
                "label": "Denetim Kaydı (Audit Log)",
                "description": "Sistemdeki tüm değişikliklerin iz kayıtları"
            },
            "maintenance": {
                "label": "Sistem Bakım & Banner",
                "description": "Bakım modu ve duyuru görsel bannerı"
            },
            "danger": {
                "label": "Tehlikeli Bölge",
                "description": "Fabrika ayarlarına dönme ve demo veri araçları"
            }
        },
        "companySection": {
            "title": "Genel Şirket ve Şube Kimliği",
            "subtitle": "Çiçekana ERP üzerinde fatura, irsaliye ve resmi sözleşmelerde görüntülenecek kurumsal bilgileri girin.",
            "titleLabel": "Şirket Resmi Unvanı",
            "emailLabel": "E-posta Adresi",
            "taxOfficeLabel": "Vergi Dairesi",
            "taxNumberLabel": "Vergi Numarası (VKN)",
            "tradeRegLabel": "Ticaret Sicil No",
            "mersisLabel": "MERSİS Numarası",
            "addressLabel": "Genel Merkez Adresi",
            "multiBranchTitle": "Çoklu Şube / Depo Desteği",
            "multiBranchDesc": "Aktif edildiğinde veri izolasyonu ve şube bazlı yetki ayrıştırması uygulanır."
        },
        "profileSection": {
            "title": "Kişisel Profil Bilgileri",
            "subtitle": "Sistemde diğer kullanıcılara görüntülenecek ad soyad ve iletişim bilgilerinizi güncelleyin.",
            "selectAvatar": "Profil Fotoğrafı Seç",
            "avatarHint": "PNG, JPG veya WEBP formatında maksimum 5MB görsel.",
            "usernameDisabled": "Kullanıcı Adı (Değiştirilemez)",
            "fullName": "Ad Soyad",
            "email": "E-posta",
            "phone": "Telefon"
        },
        "securitySection": {
            "title": "Hesap Güvenliği & Parola Politikası",
            "subtitle": "Şifre yenileme, minimum uzunluk ve iki faktörlü doğrulama (2FA) kurallarını belirleyin.",
            "currentPassword": "Mevcut Şifre",
            "newPassword": "Yeni Şifre",
            "confirmPassword": "Yeni Şifre (Tekrar)",
            "changeBtn": "Şifreyi Değiştir",
            "minPasswordLength": "Minimum Şifre Uzunluğu",
            "twoFactorAuth": "İki Faktörlü Doğrulama (2FA)",
            "twoFactorDesc": "Girişlerde SMS / Authenticator kod onayını zorunlu tut."
        },
        "rolesSection": {
            "title": "Kullanıcı Rol ve Yetki Yönetimi",
            "subtitle": "Şube ve kaynak bazlı yetki matrisini (RBAC) yapılandırın.",
            "superAdminRole": "Süper Yönetici",
            "branchManagerRole": "Şube Müdürü",
            "staffRole": "Personel"
        },
        "themeSection": {
            "title": "Marka Kiti ve Görsel Tema Engine",
            "subtitle": "Logonuzu yükleyin ve kurumsal renk paletinizi otomatik çıkartın.",
            "brandLogo": "Kurumsal Logo",
            "primaryColor": "Ana Vurgu Rengi",
            "accentColor": "İkincil Renk"
        },
        "notificationsSection": {
            "title": "Sistem ve İşlem Bildirim Tercihleri",
            "subtitle": "E-posta, SMS ve Push bildirim kanallarını yapılandırın.",
            "emailNotifs": "E-posta Bildirimleri",
            "smsNotifs": "SMS Bildirimleri",
            "pushNotifs": "Push Bildirimleri"
        },
        "integrationsSection": {
            "title": "Üçüncü Taraf Entegrasyonlar",
            "subtitle": "E-Fatura, Kargo entegrasyonu ve İyzico ödeme altyapısı.",
            "efatura": "E-Fatura Entegrasyonu",
            "cargoApi": "Kargo API Bağlantısı",
            "iyzico": "İyzico Ödeme Altyapısı"
        },
        "localizationSection": {
            "title": "Yerelleştirme, Para Birimi ve KDV",
            "subtitle": "Sistem varsayılan dili, finansal para birimi ve vergi oranlarını belirleyin.",
            "systemLanguage": "Sistem Dili",
            "currency": "Para Birimi",
            "kdvRate": "Varsayılan KDV Oranı (%)"
        },
        "numberingSection": {
            "title": "Doküman Numaralandırma Şablonları",
            "subtitle": "Fatura, sipariş ve proje numarası önekleri ve sayaç ayarları.",
            "invoicePrefix": "Fatura Öneki",
            "orderPrefix": "Sipariş Öneki",
            "projectPrefix": "Proje Öneki"
        },
        "workflowsSection": {
            "title": "Kurumsal Onay Akışları",
            "subtitle": "Limit bazlı harcama ve izin onay hiyerarşisi.",
            "expenseLimit": "Otomatik Onay Limiti (TL)"
        },
        "backupSection": {
            "title": "Veri Yedekleme ve Dışa Aktarma",
            "subtitle": "Veritabanı otomatik yedekleme periyotları.",
            "autoBackup": "Otomatik Günlük Yedekleme",
            "downloadBackup": "Veritabanı Yedeği İndir"
        },
        "auditSection": {
            "title": "Sistem Denetim Kayıtları (Audit Log)",
            "subtitle": "Sistemde gerçekleştirilen tüm kritik işlemlerin log geçmişi.",
            "user": "Kullanıcı",
            "action": "İşlem",
            "ipAddress": "IP Adresi",
            "date": "Tarih",
            "noLogs": "Henüz denetim kaydı bulunmuyor."
        },
        "maintenanceSection": {
            "title": "Sistem Bakım Modu & Banner",
            "subtitle": "Sistemi bakıma alın veya tüm kullanıcılara duyuru bannerı gösterin.",
            "maintenanceMode": "Bakım Modu Aktif",
            "bannerText": "Duyuru Banner Metni"
        },
        "dangerSection": {
            "title": "Tehlikeli Bölge ve Test Araçları",
            "subtitle": "Fabrika ayarlarına sıfırlama ve demo veri yönetimi.",
            "loadDemoTitle": "Mevcut Şubeye Demo Veri Yükle",
            "clearDemoTitle": "Tüm Demo Verilerini Temizle",
            "resetSystemTitle": "Sistemi Fabrika Ayarlarına Sıfırla"
        },
        "title": "Ayarlar",
        "subtitle": "Hesap bilgilerinizi ve güvenlik ayarlarınızı yönetin",
        "personalInfo": "Kişisel Bilgiler",
        "personalInfoDesc": "Ad soyad, e-posta ve telefon bilgilerinizi güncelleyin",
        "username": "Kullanıcı Adı (değiştirilemez)",
        "profilePhoto": "Profil Fotoğrafı",
        "selectPhoto": "Fotoğraf Seç",
        "fullName": "Ad Soyad",
        "email": "E-posta",
        "phone": "Telefon",
        "saveInfo": "Bilgileri Kaydet",
        "saving": "Kaydediliyor...",
        "success": "Başarılı",
        "error": "Hata",
        "infoUpdated": "Bilgiler güncellendi!",
        "changePassword": "Şifre Değiştir",
        "changePasswordDesc": "Hesap güvenliğiniz için düzenli olarak şifre değiştirin",
        "currentPassword": "Mevcut Şifre",
        "newPassword": "Yeni Şifre",
        "newPasswordRepeat": "Yeni Şifre (Tekrar)",
        "changePasswordBtn": "Şifreyi Değiştir",
        "changing": "Değiştiriliyor...",
        "passwordChanged": "Şifre başarıyla değiştirildi!",
        "fillAllFields": "Tüm alanları doldurun",
        "passwordsNotMatch": "Yeni şifreler eşleşmiyor",
        "passwordTooShort": "Şifre en az 6 karakter olmalıdır",
        "languageTitle": "Dil Ayarları",
        "languageDesc": "Panel arayüzünün dilini seçin",
        "selectLanguage": "Dil Seçin",
        "languageSaved": "Dil tercihi kaydedildi",
        "devTools": "Eğitim ve Test Araçları",
        "devToolsDesc": "Sistemi test etmek ve personele eğitim vermek için demo verileri yönetin.",
        "loadDemo": "Mevcut Şubeye Demo Veri Yükle",
        "clearDemo": "Tüm Demo Verilerini Temizle",
        "processing": "İşlem Yapılıyor...",
        "clearing": "Temizleniyor..."
    },
    "dashboard": {
        "title": "Панель управления",
        "subtitle": "Общий обзор бизнеса и метрики в реальном времени",
        "totalCustomers": "Всего клиентов",
        "activeProjects": "Активные проекты",
        "leads": "Потенциальные клиенты",
        "monthlyIncome": "Ежемесячный доход",
        "monthlyExpense": "Ежемесячный расход",
        "netProfitLoss": "Чистая прибыль / убыток",
        "incomeExpenseAnalysis": "Анализ доходов и расходов",
        "expenseDistribution": "Распределение расходов",
        "thisMonth": "В этом месяце",
        "income": "Доход",
        "expense": "Расход",
        "general": "Общие",
        "recentActivities": "Последняя активность",
        "noActivities": "Пока нет активности",
        "activitiesHint": "События будут отображаться здесь",
        "report": "Отчет",
        "downloadReport": "Скачать отчет",
        "reportModalTitle": "Скачать отчет",
        "reportModalSubtitle": "Скачать сводный отчет в формате PDF / CSV",
        "reportModalDesc": "Сводные данные о производительности, клиентах и финансах вашего филиала будут скачаны в формате CSV, совместимом с Excel."
    }
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/i18n/locales/tr.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// Turkish locale
__turbopack_context__.s([
    "tr",
    ()=>tr
]);
const tr = {
    "language": "Dil",
    "languageName": "Türkçe",
    "common": {
        "save": "Kaydet",
        "cancel": "İptal Et",
        "edit": "Düzenle",
        "delete": "Sil",
        "search": "Ara...",
        "searchInSettings": "Ayarlarda ara...",
        "filter": "Filtrele",
        "loading": "Yükleniyor...",
        "saving": "Kaydediliyor...",
        "status": "Durum",
        "actions": "İşlemler",
        "confirm": "Onayla",
        "yes": "Evet",
        "no": "Hayır",
        "success": "Başarılı",
        "error": "Hata",
        "warning": "Uyarı",
        "all": "Tümü",
        "viewAll": "Tümünü Gör",
        "details": "Detaylar",
        "add": "Ekle",
        "addNew": "Yeni Ekle",
        "create": "Oluştur",
        "description": "Açıklama",
        "unsavedChanges": "Kaydedilmemiş Değişiklikler Var",
        "saveChanges": "Ayarları Kaydet",
        "enterpriseVersion": "v1.0 Kurumsal",
        "active": "Aktif",
        "inactive": "Pasif",
        "back": "Geri",
        "close": "Kapat",
        "refresh": "Yenile",
        "copy": "Kopyala",
        "download": "İndir",
        "date": "Tarih",
        "time": "Zaman",
        "type": "Tür",
        "value": "Değer",
        "metric": "Metrik",
        "category": "Kategori",
        "amount": "Tutar",
        "unknown": "Bilinmiyor",
        "noData": "Veri bulunamadı",
        "completed": "Tamamlandı",
        "pending": "Bekliyor",
        "inProgress": "Devam Ediyor",
        "cancelled": "İptal Edildi",
        "high": "Yüksek",
        "medium": "Orta",
        "low": "Düşük"
    },
    "nav": {
        "dashboard": "Dashboard",
        "calendar": "Takvim",
        "orders": "Siparişler",
        "store": "Mağaza",
        "customers": "Müşteriler",
        "hr": "İnsan Kaynakları",
        "staffRequests": "Personel Talepleri",
        "projects": "Projeler",
        "leads": "Potansiyeller",
        "cargo": "Kargo",
        "files": "Dosyalar",
        "agencyLibrary": "Ajans Kütüphanesi",
        "contentStore": "İçerik Mağazası",
        "tasks": "Görevler",
        "personelDenetim": "Ekip Yük Durumu",
        "todos": "Yapılacaklar",
        "notes": "Notlarım",
        "calculator": "Hesaplama Aracı",
        "finance": "Finans",
        "socialMedia": "Sosyal Medya",
        "contentCalendar": "İçerik Takvimi",
        "inventory": "Stok & Varyant Matrix",
        "wms": "WMS Depo Yönetimi",
        "wmsMobile": "WMS Mobil Terminal",
        "procurement": "Akıllı Satın Alma & ROP",
        "omnichannel": "Omnichannel & E-İrsaliye",
        "inventoryAi": "Stok AI & Foresight",
        "ecosystem": "API, Eklentiler & SaaS",
        "branches": "Şubeler",
        "users": "Kullanıcılar",
        "chat": "Mesajlaşma",
        "endOfDayReport": "Gün Sonu Raporu",
        "customerRequests": "Müşteri Talepleri",
        "technicalSupport": "Teknik Destek",
        "announcements": "Duyurular",
        "management": "Yönetim",
        "communication": "İletişim",
        "settings": "Ayarlar",
        "logout": "Çıkış Yap",
        "expand": "Genişlet",
        "collapse": "Daralt",
        "managementPanel": "Yönetim Paneli",
        "superAdmin": "Süper Yönetici",
        "user": "Kullanıcı"
    },
    "header": {
        "search": "Ara..."
    },
    "login": {
        "welcome": "Hoş geldiniz",
        "subtitle": "Devam etmek için hesabınıza giriş yapın",
        "managementPanel": "Yönetim Paneli",
        "manageFromOne": "İşletmenizi tek noktadan yönetin",
        "platformDesc": "CRM, proje yönetimi, İK, finans ve daha fazlasını entegre bir platformda takip edin.",
        "copyright": "© 2026 Tüm Hakları Saklıdır.",
        "features": {
            "customerMgmt": "Müşteri Yönetimi",
            "projectTracking": "Proje Takibi",
            "financeAnalysis": "Finans Analizi",
            "salesCrm": "Satış & CRM"
        },
        "form": {
            "username": "Kullanıcı Adı",
            "password": "Şifre",
            "submit": "Giriş Yap",
            "loading": "Giriş yapılıyor...",
            "forgotPassword": "Şifremi Unuttum"
        }
    },
    "settings": {
        "systemSettingsTitle": "Çiçekana ERP — Sistem Ayarları",
        "systemSettingsSubtitle": "Şirket yapılandırması, güvenlik politikaları, marka kiti ve modül parametrelerini merkezi olarak yönetin.",
        "tabs": {
            "company": {
                "label": "Genel Şirket Ayarları",
                "description": "Unvan, adres, vergi ve şube yapılandırması"
            },
            "profile": {
                "label": "Kişisel Profilim",
                "description": "Profil resmi, iletişim ve ad soyad bilgileri"
            },
            "security": {
                "label": "Güvenlik & Şifre Politikası",
                "description": "Şifre değiştirme, 2FA, IP ve oturum politikası"
            },
            "roles": {
                "label": "Kullanıcı & Rol Yönetimi",
                "description": "Şube ve kaynak bazlı yetki matrisi"
            },
            "theme": {
                "label": "Tema & Marka Kiti",
                "description": "Kurumsal logo, renk paleti ve karanlık mod"
            },
            "notifications": {
                "label": "Bildirim Tercihleri",
                "description": "E-posta, SMS, Push ve sesli uyarı kanalları"
            },
            "integrations": {
                "label": "Entegrasyonlar",
                "description": "E-Fatura, Kargo ve İyzico ödeme sistemleri"
            },
            "localization": {
                "label": "Yerelleştirme & KDV",
                "description": "Dil, para birimi, tarih formatı ve vergi oranları"
            },
            "numbering": {
                "label": "Doküman Numaralandırma",
                "description": "Fatura, sipariş ve proje numarası önekleri"
            },
            "workflows": {
                "label": "Onay Akışları",
                "description": "Limit bazlı onay mekanizmaları ve İK akışları"
            },
            "backup": {
                "label": "Yedekleme & Veri",
                "description": "Otomatik yedekleme sıklığı ve dışa aktarma"
            },
            "audit": {
                "label": "Denetim Kaydı (Audit Log)",
                "description": "Sistemdeki tüm değişikliklerin iz kayıtları"
            },
            "maintenance": {
                "label": "Sistem Bakım & Banner",
                "description": "Bakım modu ve duyuru görsel bannerı"
            },
            "danger": {
                "label": "Tehlikeli Bölge",
                "description": "Fabrika ayarlarına dönme ve demo veri araçları"
            }
        },
        "companySection": {
            "title": "Genel Şirket ve Şube Kimliği",
            "subtitle": "Çiçekana ERP üzerinde fatura, irsaliye ve resmi sözleşmelerde görüntülenecek kurumsal bilgileri girin.",
            "titleLabel": "Şirket Resmi Unvanı",
            "emailLabel": "E-posta Adresi",
            "taxOfficeLabel": "Vergi Dairesi",
            "taxNumberLabel": "Vergi Numarası (VKN)",
            "tradeRegLabel": "Ticaret Sicil No",
            "mersisLabel": "MERSİS Numarası",
            "addressLabel": "Genel Merkez Adresi",
            "multiBranchTitle": "Çoklu Şube / Depo Desteği",
            "multiBranchDesc": "Aktif edildiğinde veri izolasyonu ve şube bazlı yetki ayrıştırması uygulanır."
        },
        "profileSection": {
            "title": "Kişisel Profil Bilgileri",
            "subtitle": "Sistemde diğer kullanıcılara görüntülenecek ad soyad ve iletişim bilgilerinizi güncelleyin.",
            "selectAvatar": "Profil Fotoğrafı Seç",
            "avatarHint": "PNG, JPG veya WEBP formatında maksimum 5MB görsel.",
            "usernameDisabled": "Kullanıcı Adı (Değiştirilemez)",
            "fullName": "Ad Soyad",
            "email": "E-posta",
            "phone": "Telefon"
        },
        "securitySection": {
            "title": "Hesap Güvenliği & Parola Politikası",
            "subtitle": "Şifre yenileme, minimum uzunluk ve iki faktörlü doğrulama (2FA) kurallarını belirleyin.",
            "currentPassword": "Mevcut Şifre",
            "newPassword": "Yeni Şifre",
            "confirmPassword": "Yeni Şifre (Tekrar)",
            "changeBtn": "Şifreyi Değiştir",
            "minPasswordLength": "Minimum Şifre Uzunluğu",
            "twoFactorAuth": "İki Faktörlü Doğrulama (2FA)",
            "twoFactorDesc": "Girişlerde SMS / Authenticator kod onayını zorunlu tut."
        },
        "rolesSection": {
            "title": "Kullanıcı Rol ve Yetki Yönetimi",
            "subtitle": "Şube ve kaynak bazlı yetki matrisini (RBAC) yapılandırın.",
            "superAdminRole": "Süper Yönetici",
            "branchManagerRole": "Şube Müdürü",
            "staffRole": "Personel"
        },
        "themeSection": {
            "title": "Marka Kiti ve Görsel Tema Engine",
            "subtitle": "Logonuzu yükleyin ve kurumsal renk paletinizi otomatik çıkartın.",
            "brandLogo": "Kurumsal Logo",
            "primaryColor": "Ana Vurgu Rengi",
            "accentColor": "İkincil Renk"
        },
        "notificationsSection": {
            "title": "Sistem ve İşlem Bildirim Tercihleri",
            "subtitle": "E-posta, SMS ve Push bildirim kanallarını yapılandırın.",
            "emailNotifs": "E-posta Bildirimleri",
            "smsNotifs": "SMS Bildirimleri",
            "pushNotifs": "Push Bildirimleri"
        },
        "integrationsSection": {
            "title": "Üçüncü Taraf Entegrasyonlar",
            "subtitle": "E-Fatura, Kargo entegrasyonu ve İyzico ödeme altyapısı.",
            "efatura": "E-Fatura Entegrasyonu",
            "cargoApi": "Kargo API Bağlantısı",
            "iyzico": "İyzico Ödeme Altyapısı"
        },
        "localizationSection": {
            "title": "Yerelleştirme, Para Birimi ve KDV",
            "subtitle": "Sistem varsayılan dili, finansal para birimi ve vergi oranlarını belirleyin.",
            "systemLanguage": "Sistem Dili",
            "currency": "Para Birimi",
            "kdvRate": "Varsayılan KDV Oranı (%)"
        },
        "numberingSection": {
            "title": "Doküman Numaralandırma Şablonları",
            "subtitle": "Fatura, sipariş ve proje numarası önekleri ve sayaç ayarları.",
            "invoicePrefix": "Fatura Öneki",
            "orderPrefix": "Sipariş Öneki",
            "projectPrefix": "Proje Öneki"
        },
        "workflowsSection": {
            "title": "Kurumsal Onay Akışları",
            "subtitle": "Limit bazlı harcama ve izin onay hiyerarşisi.",
            "expenseLimit": "Otomatik Onay Limiti (TL)"
        },
        "backupSection": {
            "title": "Veri Yedekleme ve Dışa Aktarma",
            "subtitle": "Veritabanı otomatik yedekleme periyotları.",
            "autoBackup": "Otomatik Günlük Yedekleme",
            "downloadBackup": "Veritabanı Yedeği İndir"
        },
        "auditSection": {
            "title": "Sistem Denetim Kayıtları (Audit Log)",
            "subtitle": "Sistemde gerçekleştirilen tüm kritik işlemlerin log geçmişi.",
            "user": "Kullanıcı",
            "action": "İşlem",
            "ipAddress": "IP Adresi",
            "date": "Tarih",
            "noLogs": "Henüz denetim kaydı bulunmuyor."
        },
        "maintenanceSection": {
            "title": "Sistem Bakım Modu & Banner",
            "subtitle": "Sistemi bakıma alın veya tüm kullanıcılara duyuru bannerı gösterin.",
            "maintenanceMode": "Bakım Modu Aktif",
            "bannerText": "Duyuru Banner Metni"
        },
        "dangerSection": {
            "title": "Tehlikeli Bölge ve Test Araçları",
            "subtitle": "Fabrika ayarlarına sıfırlama ve demo veri yönetimi.",
            "loadDemoTitle": "Mevcut Şubeye Demo Veri Yükle",
            "clearDemoTitle": "Tüm Demo Verilerini Temizle",
            "resetSystemTitle": "Sistemi Fabrika Ayarlarına Sıfırla"
        },
        "title": "Ayarlar",
        "subtitle": "Hesap bilgilerinizi ve güvenlik ayarlarınızı yönetin",
        "personalInfo": "Kişisel Bilgiler",
        "personalInfoDesc": "Ad soyad, e-posta ve telefon bilgilerinizi güncelleyin",
        "username": "Kullanıcı Adı (değiştirilemez)",
        "profilePhoto": "Profil Fotoğrafı",
        "selectPhoto": "Fotoğraf Seç",
        "fullName": "Ad Soyad",
        "email": "E-posta",
        "phone": "Telefon",
        "saveInfo": "Bilgileri Kaydet",
        "saving": "Kaydediliyor...",
        "success": "Başarılı",
        "error": "Hata",
        "infoUpdated": "Bilgiler güncellendi!",
        "changePassword": "Şifre Değiştir",
        "changePasswordDesc": "Hesap güvenliğiniz için düzenli olarak şifre değiştirin",
        "currentPassword": "Mevcut Şifre",
        "newPassword": "Yeni Şifre",
        "newPasswordRepeat": "Yeni Şifre (Tekrar)",
        "changePasswordBtn": "Şifreyi Değiştir",
        "changing": "Değiştiriliyor...",
        "passwordChanged": "Şifre başarıyla değiştirildi!",
        "fillAllFields": "Tüm alanları doldurun",
        "passwordsNotMatch": "Yeni şifreler eşleşmiyor",
        "passwordTooShort": "Şifre en az 6 karakter olmalıdır",
        "languageTitle": "Dil Ayarları",
        "languageDesc": "Panel arayüzünün dilini seçin",
        "selectLanguage": "Dil Seçin",
        "languageSaved": "Dil tercihi kaydedildi",
        "devTools": "Eğitim ve Test Araçları",
        "devToolsDesc": "Sistemi test etmek ve personele eğitim vermek için demo verileri yönetin.",
        "loadDemo": "Mevcut Şubeye Demo Veri Yükle",
        "clearDemo": "Tüm Demo Verilerini Temizle",
        "processing": "İşlem Yapılıyor...",
        "clearing": "Temizleniyor..."
    },
    "dashboard": {
        "title": "Gösterge Paneli",
        "subtitle": "İşletme verilerinize genel bakış",
        "totalCustomers": "Toplam Müşteri",
        "activeProjects": "Aktif Projeler",
        "leads": "Potansiyeller",
        "monthlyIncome": "Aylık Gelir",
        "monthlyExpense": "Aylık Gider",
        "netProfitLoss": "Net Kâr/Zarar",
        "incomeExpenseAnalysis": "Gelir / Gider Analizi",
        "expenseDistribution": "Harcama Dağılımı",
        "thisMonth": "Bu ay",
        "income": "Gelir",
        "expense": "Gider",
        "general": "Genel",
        "recentActivities": "Son Aktiviteler",
        "noActivities": "Henüz aktivite yok",
        "activitiesHint": "Etkinlikler burada görüntülenecektir",
        "report": "Rapor",
        "downloadReport": "Rapor İndir",
        "reportModalTitle": "Rapor İndir",
        "reportModalSubtitle": "PDF / CSV formatında özet rapor indirin",
        "reportModalDesc": "Şubenize ait performans, müşteri ve finansal özet verileri Excel uyumlu CSV formatında indirilecektir."
    }
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/notifications/catalog.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Çiçekana ERP — Müşteri Dostu Bildirim (Microcopy) Kataloğu
 * Bu katalog, sistemdeki tüm bildirim durumlarını, görsel tipleri (SUCCESS, INFO, WARNING, ERROR)
 * ve gösterim biçimlerini (Toast, Modal, Banner) merkezi olarak tanımlar.
 */ __turbopack_context__.s([
    "NOTIFICATION_CATALOG",
    ()=>NOTIFICATION_CATALOG
]);
const NOTIFICATION_CATALOG = {
    // 1. GENEL SİSTEM & ALTYAPI BİLDİRİMLERİ
    SYSTEM: {
        INTERNET_DISCONNECTED: {
            id: 'system_internet_disconnected',
            category: 'ERROR',
            type: 'BANNER',
            title: 'İnternet Bağlantısı Kesildi',
            message: 'Çevrimdışı moddasınız. Yaptığınız değişiklikler bağlantı sağlandığında senkronize edilecektir.'
        },
        INTERNET_RESTORED: {
            id: 'system_internet_restored',
            category: 'SUCCESS',
            type: 'TOAST',
            title: 'Bağlantı Yeniden Sağlandı',
            message: 'İnternet Bağlantısı Yeniden Sağlandı. Çevrimdışı verileriniz başarıyla güncellendi.',
            autoCloseMs: 5000
        },
        SLOW_CONNECTION: {
            id: 'system_slow_connection',
            category: 'WARNING',
            type: 'TOAST',
            title: 'Zayıf İnternet Bağlantısı',
            message: 'Zayıf İnternet Bağlantısı. İşleminiz normalden biraz daha uzun sürebilir, lütfen bekleyin.',
            autoCloseMs: 5000
        },
        SESSION_TIMEOUT: {
            id: 'system_session_timeout',
            category: 'WARNING',
            type: 'MODAL',
            title: 'Oturum Süresi Doldu',
            message: 'Güvenliğiniz İçin Oturumunuz Sona Erdi. Lütfen devam etmek için yeniden giriş yapın.'
        },
        NEW_VERSION_RELEASE: {
            id: 'system_new_version_release',
            category: 'INFO',
            type: 'BANNER',
            title: 'Yeni Sürüm Kullanılabilir',
            message: "Çiçekana ERP'nin Yeni Sürümü Hazır! Yeni özellikleri kullanmak için uygulamayı şimdi yeniden başlatabilirsiniz."
        },
        GENERIC_ERROR: {
            id: 'system_generic_error',
            category: 'ERROR',
            type: 'TOAST',
            title: 'İşlem Başarısız Oldu',
            message: 'Talebiniz şu anda gerçekleştirilemedi. Sistem kayıtları teknik ekibimize iletildi, lütfen kısa bir süre sonra tekrar deneyin.',
            autoCloseMs: 5000
        }
    },
    // MODÜL 1: Yapay Zekâ Destekli WhatsApp CRM & Müşteri Hizmetleri
    WHATSAPP_AI_CRM: {
        AI_ENABLED: {
            id: 'wa_ai_enabled',
            category: 'SUCCESS',
            type: 'TOAST',
            title: 'Yapay Zekâ Aktif',
            message: 'Müşteri için Yapay Zekâ yanıt sistemi aktif edildi.',
            autoCloseMs: 5000
        },
        AI_DISABLED: {
            id: 'wa_ai_disabled',
            category: 'WARNING',
            type: 'TOAST',
            title: 'Yapay Zekâ Durduruldu',
            message: 'Yapay Zekâ yanıt sistemi durduruldu. Mesajlar manuel modda.',
            autoCloseMs: 5000
        },
        ESCALATION_HUMAN: (customerName)=>({
                id: 'wa_escalation_human',
                category: 'INFO',
                type: 'TOAST',
                title: 'Temsilci Desteği Talebi',
                message: `${customerName} temsilci desteği talep ediyor. Sohbet canlı bir temsilciye devredildi.`,
                autoCloseMs: 5000,
                audioAlert: true
            }),
        SHADOW_MODE_DRAFT: (customerName)=>({
                id: 'wa_shadow_mode_draft',
                category: 'INFO',
                type: 'TOAST',
                title: 'Yapay Zekâ Taslağı Hazır',
                message: `Yapay Zekâ ${customerName} için bir yanıt taslağı hazırladı. Onaylamak için sohbet penceresini inceleyebilirsiniz.`,
                autoCloseMs: 5000
            }),
        MISSING_KNOWLEDGE_BASE: {
            id: 'wa_missing_knowledge_base',
            category: 'WARNING',
            type: 'TOAST',
            title: 'Bilgi Tabanı Eksik',
            message: 'Aradığınız soruya ait doküman bilgi tabanında bulunamadı. Lütfen ilgili dokümanı Ajans Kütüphanesine yükleyin.',
            autoCloseMs: 5000
        }
    },
    // MODÜL 2: WhatsApp Sohbet ve Medya Entegrasyonu
    WHATSAPP_MEDIA: {
        CHAT_IMPORT_SUCCESS: (count)=>({
                id: 'wa_import_success',
                category: 'SUCCESS',
                type: 'TOAST',
                title: 'Sohbet Geçmişi Yüklendi',
                message: `Sohbet Geçmişi Yüklendi. Toplam ${count} adet mesaj ve medya başarıyla içe aktarıldı.`,
                autoCloseMs: 5000
            }),
        DUPLICATE_IMPORT: {
            id: 'wa_duplicate_import',
            category: 'WARNING',
            type: 'TOAST',
            title: 'Mükerrer Yükleme Atlandı',
            message: 'Bu sohbet yedeği daha önce sisteme yüklenmiş. Mükerrer kayıt oluşturulmaması için işlem atlandı.',
            autoCloseMs: 5000
        },
        UNSUPPORTED_OR_CORRUPT_ZIP: {
            id: 'wa_corrupt_zip',
            category: 'ERROR',
            type: 'TOAST',
            title: 'Sohbet Yedeği Okunamadı',
            message: "Sohbet Yedeği Okunamadı. Lütfen WhatsApp'tan dışa aktardığınız geçerli bir .zip dosyası seçtiğinizden emin olun.",
            autoCloseMs: 5000
        },
        LARGE_VIDEO_PROCESSING: {
            id: 'wa_large_video',
            category: 'INFO',
            type: 'TOAST',
            title: 'Video İşleniyor',
            message: 'Videonuz işleniyor. Yükleme tamamlandığında sohbet ekranında oynatılabilir olacaktır.',
            autoCloseMs: 5000
        }
    },
    // MODÜL 3: Night Scan Engine (Potansiyel Müşteri Keşif Robotu)
    NIGHT_SCAN: {
        SCAN_STARTED: {
            id: 'night_scan_started',
            category: 'INFO',
            type: 'TOAST',
            title: 'Gece Taraması Başlatıldı',
            message: 'Sektörel gece taraması başlatıldı. Yeni müşteri adayları taranıyor...',
            autoCloseMs: 5000
        },
        SCAN_COMPLETED: (leadCount)=>({
                id: 'night_scan_completed',
                category: 'SUCCESS',
                type: 'TOAST',
                title: 'Gece Taraması Bitti!',
                message: `Gece Taraması Bitti! Aranan kritere uygun ${leadCount} adet yeni potansiyel müşteri adayı (Lead) CRM panelinize eklendi.`,
                autoCloseMs: 5000
            }),
        NO_DATA_FOUND: {
            id: 'night_scan_no_data',
            category: 'WARNING',
            type: 'TOAST',
            title: 'Yeni İşletme Kaydı Bulunamadı',
            message: 'Belirtilen konum ve sektör kriterlerinde yeni bir işletme kaydına rastlanmadı. Kriterleri genişletmeyi deneyebilirsiniz.',
            autoCloseMs: 5000
        }
    },
    // MODÜL 4: CRM ve Satış Boru Hattı (Leads)
    CRM: {
        OVERDUE_FOLLOW_UP: (companyName)=>({
                id: 'crm_overdue_followup',
                category: 'ERROR',
                type: 'TOAST',
                title: 'Müşteri Takip Zamanı!',
                message: `Müşteri Takip Zamanı! ${companyName} ile yapacağınız görüşme saati geçti.`,
                autoCloseMs: 5000,
                audioAlert: true
            }),
        OPPORTUNITY_WON: (companyName)=>({
                id: 'crm_opp_won',
                category: 'SUCCESS',
                type: 'TOAST',
                title: 'Fırsat Kazanıldı!',
                message: `Tebrikler! ${companyName} fırsatı 'Kazanıldı' olarak işaretlendi.`,
                autoCloseMs: 5000
            }),
        MISSING_CUSTOMER_INFO: {
            id: 'crm_missing_info',
            category: 'WARNING',
            type: 'TOAST',
            title: 'Müşteri Bilgisi Eksik',
            message: 'Lütfen teklif oluşturmadan önce müşteri kartındaki Vergi/İletişim bilgilerini tamamlayın.',
            autoCloseMs: 5000
        }
    },
    // MODÜL 5: Ajans Kütüphanesi ve Dosya/Medya Dönüştürme
    LIBRARY: {
        UPLOAD_PAUSED: {
            id: 'lib_upload_paused',
            category: 'WARNING',
            type: 'TOAST',
            title: 'Yükleme Duraklatıldı',
            message: 'Dosya yüklemesi internet bağlantısı nedeniyle duraklatıldı. Bağlantı sağlandığında otomatik devam edecek.',
            autoCloseMs: 5000
        },
        UPLOAD_SUCCESS: (fileName)=>({
                id: 'lib_upload_success',
                category: 'SUCCESS',
                type: 'TOAST',
                title: 'Dosya Yüklendi',
                message: `${fileName} kütüphaneye başarıyla yüklendi.`,
                autoCloseMs: 5000
            }),
        CONVERTING_PROGRESS: (fileName, progressPercent)=>({
                id: 'lib_converting_progress',
                category: 'INFO',
                type: 'TOAST',
                title: 'Medya Dönüştürülüyor',
                message: `${fileName} PDF/WebP formatına dönüştürülüyor... (%${progressPercent})`,
                autoCloseMs: 3000
            }),
        CONVERSION_FINISHED: {
            id: 'lib_conversion_finished',
            category: 'SUCCESS',
            type: 'TOAST',
            title: 'Dönüştürme Tamamlandı',
            message: 'Dönüştürme Tamamlandı. Dosyanız önizlemeye hazır.',
            autoCloseMs: 5000
        },
        INVALID_MIME_FORMAT: {
            id: 'lib_invalid_format',
            category: 'ERROR',
            type: 'TOAST',
            title: 'Desteklenmeyen Dosya Formatı',
            message: 'Desteklenmeyen Dosya Formatı. Lütfen geçerli bir görsel, video veya doküman dosyası seçin.',
            autoCloseMs: 5000
        },
        CONCURRENCY_LIMIT: {
            id: 'lib_concurrency_limit',
            category: 'WARNING',
            type: 'TOAST',
            title: 'İşlem Limiti Aşımı',
            message: 'Şu anda devam eden 3 adet dönüştürme işleminiz var. Lütfen mevcut işlemlerin bitmesini bekleyin.',
            autoCloseMs: 5000
        }
    },
    // MODÜL 6: Sosyal Medya İçerik Takvimi
    SOCIAL_MEDIA: {
        SENT_FOR_APPROVAL: {
            id: 'social_sent_approval',
            category: 'SUCCESS',
            type: 'TOAST',
            title: 'Onay Bağlantısı İletildi',
            message: 'İçerik onay bağlantısı müşteriye başarıyla iletildi.',
            autoCloseMs: 5000
        },
        REVISION_REQUESTED: (brandName, title, clientNote)=>({
                id: 'social_revision_req',
                category: 'ERROR',
                type: 'BANNER',
                title: 'Revizyon Talebi',
                message: `${brandName} ${title} için revizyon talep etti! Not: '${clientNote}'`
            }),
        APPROVED_BY_CLIENT: (brandName)=>({
                id: 'social_approved',
                category: 'SUCCESS',
                type: 'TOAST',
                title: 'İçerik Onaylandı',
                message: `${brandName} içeriği onayladı! Paylaşım takvime sabitlendi.`,
                autoCloseMs: 5000
            }),
        MISSING_EDITOR: {
            id: 'social_missing_editor',
            category: 'WARNING',
            type: 'TOAST',
            title: 'Editör Ataması Eksik',
            message: "İçeriği 'Kurgu Aşamasında' durumuna çekebilmek için lütfen bir Editör atayın.",
            autoCloseMs: 5000
        }
    },
    // MODÜL 7: Şubeli B2B Mağaza & Stok Talepleri
    B2B: {
        STOCK_REQUEST_APPROVED: (branchName)=>({
                id: 'b2b_stock_approved',
                category: 'SUCCESS',
                type: 'TOAST',
                title: 'Stok İstek Onayı',
                message: `${branchName} tarafından iletilen stok talebi merkez tarafından onaylandı.`,
                autoCloseMs: 5000
            }),
        CARGO_TRACKING_UPDATE: (orderNo, trackingNo)=>({
                id: 'b2b_cargo_update',
                category: 'INFO',
                type: 'TOAST',
                title: 'Kargo Takip Güncellemesi',
                message: `${orderNo} numaralı gönderiniz kargoya verildi. Takip No: ${trackingNo}`,
                autoCloseMs: 5000
            }),
        INSUFFICIENT_STOCK: (availableStock)=>({
                id: 'b2b_insufficient_stock',
                category: 'ERROR',
                type: 'TOAST',
                title: 'Yetersiz Stok',
                message: `Talep edilen miktarda ürün merkez depoda bulunmamaktadır. Mevcut stok: ${availableStock} adet.`,
                autoCloseMs: 5000
            })
    },
    // MODÜL 8: Akıllı Bütçelendirme & Fiyatlandırma Motoru
    PRICING: {
        NEGATIVE_PROFITABILITY_MODAL: (lossPercentage)=>({
                id: 'pricing_negative_profit',
                category: 'ERROR',
                type: 'MODAL',
                title: 'Kârlılık Uyarısı!',
                message: `Kârlılık Uyarısı! Girdiğiniz maliyetler ve indirimler sonucunda bu satıştan kâr elde edemiyorsunuz (%${lossPercentage} Zarar).`
            }),
        SIMULATION_SAVED: {
            id: 'pricing_sim_saved',
            category: 'SUCCESS',
            type: 'TOAST',
            title: 'Simülasyon Kaydedildi',
            message: 'Fiyatlandırma simülasyonu arşivinize eklendi.',
            autoCloseMs: 5000
        }
    },
    // MODÜL 9: İş, Görev ve Süre Takip (Timesheets)
    TIMESHEETS: {
        TIMER_STARTED: (taskName)=>({
                id: 'time_started',
                category: 'SUCCESS',
                type: 'TOAST',
                title: 'Süreç Başlatıldı',
                message: `Süreç Başlatıldı: '${taskName}' için kronometre çalışıyor.`,
                autoCloseMs: 5000
            }),
        TIMER_PAUSED: (elapsedText)=>({
                id: 'time_paused',
                category: 'INFO',
                type: 'TOAST',
                title: 'Sayaç Duraklatıldı',
                message: `Sayaç Duraklatıldı. Geçen süre: ${elapsedText}.`,
                autoCloseMs: 5000
            }),
        OVERDUE_TASK: (taskName)=>({
                id: 'time_overdue_task',
                category: 'ERROR',
                type: 'TOAST',
                title: 'Geciken Görev!',
                message: `Geciken Görev! Bitiş tarihi geçen '${taskName}' göreviniz öncelikli listeye taşındı.`,
                autoCloseMs: 5000
            }),
        FORGOTTEN_TIMER_ALERT: (taskName)=>({
                id: 'time_forgotten_alert',
                category: 'WARNING',
                type: 'TOAST',
                title: 'Sayaç Hatırlatması',
                message: `Sayaç 4 saattir kesintisiz çalışıyor. Halen '${taskName}' üzerinde mi çalışıyorsunuz?`,
                autoCloseMs: 5000
            })
    },
    // MODÜL 10: İnsan Kaynakları & AI CV Parser
    HR: {
        CV_PARSED_SUCCESS: {
            id: 'hr_cv_parsed',
            category: 'SUCCESS',
            type: 'TOAST',
            title: 'CV Okundu',
            message: 'Özgeçmiş Yapay Zekâ Tarafından Okundu. Aday bilgileri forma otomatik aktarıldı.',
            autoCloseMs: 5000
        },
        UNREADABLE_CV_PDF: {
            id: 'hr_unreadable_pdf',
            category: 'WARNING',
            type: 'TOAST',
            title: 'PDF Okunamadı',
            message: 'Yüklenen PDF formatı okunamadı. Lütfen bilgileri manuel girin veya farklı bir özgeçmiş yükleyin.',
            autoCloseMs: 5000
        }
    },
    // MODÜL 11: Yönetim, Destek & Güvenlik
    MANAGEMENT: {
        EOD_REPORT_SUBMITTED: {
            id: 'mgmt_eod_submitted',
            category: 'SUCCESS',
            type: 'TOAST',
            title: 'Rapor İletildi',
            message: 'Gün Sonu Raporunuz yöneticinize başarıyla iletildi. İyi istirahatler!',
            autoCloseMs: 5000
        },
        SUPPORT_TICKET_SENT: (ticketNo)=>({
                id: 'mgmt_support_sent',
                category: 'SUCCESS',
                type: 'TOAST',
                title: 'Hata Bildirimi Alındı',
                message: `Hata Bildirimi Alındı. Ekran görüntünüz ve sistem loglarınız teknik ekibe iletildi. Bilet No: #${ticketNo}`,
                autoCloseMs: 5000
            }),
        UNAUTHORIZED_ACCESS: {
            id: 'mgmt_unauthorized',
            category: 'ERROR',
            type: 'TOAST',
            title: 'Erişim Engellendi',
            message: 'Erişim Engellendi. Bu işlemi gerçekleştirmek için yetkiniz bulunmamaktadır. Lütfen yöneticinizle iletişime geçin.',
            autoCloseMs: 5000
        },
        TRASH_CONFIRMATION_MODAL: (itemName)=>({
                id: 'mgmt_trash_confirm',
                category: 'WARNING',
                type: 'MODAL',
                title: 'Çöp Kutusu Onayı',
                message: `${itemName} çöp kutusuna taşınacak. 30 gün boyunca istediğiniz zaman geri yükleyebilirsiniz. Onaylıyor musunuz?`
            })
    }
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/notifications/sanitizer.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Çiçekana ERP — Müşteri Koruması ve Hata Dönüştürme Motoru (Error Sanitizer)
 *
 * KRİTİK KURAL: Geliştirici/Sistem dili YASAKTIR.
 * Kullanıcının önüne 500 Internal Server Error, NullPointer, Database connection failed vb.
 * teknik terimler düşürülmez.
 *
 * Bu motor, teknik hataları arayüzde filtreler, kibar ve çözüm odaklı Türkçe bildirimlere
 * dönüştürür ve arka planda sistem log servisine iletir.
 */ __turbopack_context__.s([
    "sanitizeNotificationMessage",
    ()=>sanitizeNotificationMessage
]);
// Yasaklı geliştirici/sistem kelime ve kalıpları
const TECHNICAL_TERMS_REGEX = [
    /500\s*(Internal Server Error)?/i,
    /Unhandled\s*Rejection/i,
    /NullPointer(Exception)?/i,
    /Path\s*Traversal\s*Error/i,
    /Database\s*connection\s*(failed|refused|error)?/i,
    /FFmpeg\s*process\s*(killed|failed|error)?/i,
    /Checksum\s*Mismatch/i,
    /SQL\s*(Query|Exception|Error|Syntax)/i,
    /PrismaClient[A-Za-z]*/i,
    /ECONNREFUSED/i,
    /ENOSPC/i,
    /TypeError:/i,
    /SyntaxError:/i,
    /ReferenceError:/i,
    /fetch\s*failed/i,
    /NetworkError/i,
    /HTTP\s*[45]\d\d/i
];
function sanitizeNotificationMessage(rawTitle, rawMessage) {
    const messageStr = rawMessage instanceof Error ? rawMessage.message : typeof rawMessage === 'string' ? rawMessage : JSON.stringify(rawMessage || '');
    const titleStr = rawTitle || '';
    const combinedText = `${titleStr} ${messageStr}`;
    // Yasaklı teknik terim kontrolü
    const containsTechnicalTerm = TECHNICAL_TERMS_REGEX.some((pattern)=>pattern.test(combinedText));
    if (containsTechnicalTerm || messageStr.includes('{"error"') || messageStr.includes('stack')) {
        // Arka plana sessiz log gönder
        sendSilentErrorTelemetry(combinedText, titleStr, messageStr);
        return {
            title: 'İşlem Tamamlanamadı',
            message: 'Talebiniz şu anda gerçekleştirilemedi. Sistem kayıtlarımız teknik ekibimize iletildi, lütfen kısa bir süre sonra tekrar deneyin.',
            isSanitized: true,
            originalError: messageStr
        };
    }
    return {
        title: titleStr || 'Bilgilendirme',
        message: messageStr || 'İşleminiz güncellendi.',
        isSanitized: false
    };
}
/**
 * Arka plana sessiz hata logu gönderir (Sistem Logları İzolasyonu).
 */ function sendSilentErrorTelemetry(fullContext, title, originalMessage) {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    try {
        const payload = {
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent,
            title,
            originalMessage,
            context: fullContext
        };
        // sendBeacon veya fetch ile sessizce ilet
        if (navigator.sendBeacon) {
            navigator.sendBeacon('/api/notifications/log', JSON.stringify(payload));
        } else {
            fetch('/api/notifications/log', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            }).catch(()=>{});
        }
    } catch  {
    // İzolasyon gereği kullanıcıya veya konsola hata yansıtma
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/notifications/service.ts [app-client] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "systemNotificationService",
    ()=>systemNotificationService
]);
/**
 * Çiçekana ERP — Unified Notification Service & Helper Hooks
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$notifications$2f$catalog$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/notifications/catalog.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$notifications$2f$sanitizer$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/notifications/sanitizer.ts [app-client] (ecmascript)");
;
;
class NotificationService {
    activeBanners = [];
    activeModal = null;
    listeners = new Set();
    subscribe(listener) {
        this.listeners.add(listener);
        return ()=>this.listeners.delete(listener);
    }
    notify() {
        this.listeners.forEach((l)=>l());
    }
    // --- Banner API ---
    showBanner(banner) {
        const id = banner.id || `banner_${Date.now()}`;
        this.activeBanners = this.activeBanners.filter((b)=>b.id !== id);
        this.activeBanners.unshift({
            ...banner,
            id
        });
        this.notify();
        return id;
    }
    dismissBanner(id) {
        this.activeBanners = this.activeBanners.filter((b)=>b.id !== id);
        this.notify();
    }
    getBanners() {
        return this.activeBanners;
    }
    // --- Modal API ---
    showModal(modal) {
        const id = modal.id || `modal_${Date.now()}`;
        this.activeModal = {
            ...modal,
            id
        };
        this.notify();
        return id;
    }
    closeModal() {
        this.activeModal = null;
        this.notify();
    }
    getActiveModal() {
        return this.activeModal;
    }
    // --- Audio Feedback ---
    playAudioAlert() {
        if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
        ;
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5 note
            gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.25);
        } catch  {
        // Audio context might be restricted before user interaction
        }
    }
    // --- Catalog Trigger Helper ---
    triggerCatalogItem(definition) {
        if (definition.audioAlert) {
            this.playAudioAlert();
        }
        if (definition.type === 'BANNER') {
            return this.showBanner({
                id: definition.id,
                category: definition.category,
                title: definition.title,
                message: definition.message
            });
        }
        if (definition.type === 'MODAL') {
            return this.showModal({
                id: definition.id,
                category: definition.category,
                title: definition.title,
                message: definition.message
            });
        }
        // Default TOAST return payload
        return {
            id: definition.id,
            category: definition.category,
            title: definition.title,
            message: definition.message,
            autoCloseMs: definition.autoCloseMs || 5000
        };
    }
}
const systemNotificationService = new NotificationService();
;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/utils.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "cn",
    ()=>cn
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/clsx/dist/clsx.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/tailwind-merge/dist/bundle-mjs.mjs [app-client] (ecmascript)");
;
;
function cn(...inputs) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["twMerge"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["clsx"])(inputs));
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);})()

//# sourceMappingURL=_15fhz31z-vuiy._.js.map