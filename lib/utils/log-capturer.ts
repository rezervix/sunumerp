// Client-side console and network request log capturer for Technical Support module.

export interface ConsoleLogEntry {
  type: "error" | "warn";
  message: string;
  timestamp: string;
}

export interface NetworkLogEntry {
  method: string;
  url: string;
  status: number;
  timestamp: string;
}

// Global memory buffer for console and network logs
let consoleBuffer: ConsoleLogEntry[] = []
const MAX_CONSOLE_LOGS = 50

let networkBuffer: NetworkLogEntry[] = []
const MAX_NETWORK_LOGS = 20

let listenersInitialized = false

export function addConsoleLog(type: "error" | "warn", message: string) {
  consoleBuffer.push({
    type,
    message,
    timestamp: new Date().toISOString()
  })
  if (consoleBuffer.length > MAX_CONSOLE_LOGS) {
    consoleBuffer.shift()
  }
}

export function addNetworkLog(method: string, url: string, status: number) {
  // Make sure to mask sensitive query parameters or URL parts
  let sanitizedUrl = url
  try {
    const urlObj = new URL(url, typeof window !== "undefined" ? window.location.origin : undefined)
    const sensitiveParams = ["token", "password", "key", "secret", "auth", "code"]
    sensitiveParams.forEach(param => {
      if (urlObj.searchParams.has(param)) {
        urlObj.searchParams.set(param, "[MASKED]")
      }
    })
    sanitizedUrl = urlObj.toString()
  } catch (e) {
    // URL parsing failed, fall back to string check
    if (url.includes("token=") || url.includes("password=")) {
      sanitizedUrl = url.split("?")[0] + "?[HAS_SENSITIVE_DATA_MASKED]"
    }
  }

  networkBuffer.push({
    method,
    url: sanitizedUrl,
    status,
    timestamp: new Date().toISOString()
  })
  if (networkBuffer.length > MAX_NETWORK_LOGS) {
    networkBuffer.shift()
  }
}

export function getConsoleLogs(): ConsoleLogEntry[] {
  return consoleBuffer
}

export function getNetworkLogs(): NetworkLogEntry[] {
  return networkBuffer
}

export function clearLogs() {
  consoleBuffer = []
  networkBuffer = []
}

/**
 * Initializes listeners for console.error, console.warn, global window errors,
 * unhandled rejections, and window.fetch to capture failures.
 */
export function initLogCapturer() {
  if (typeof window === "undefined" || listenersInitialized) {
    return
  }

  listenersInitialized = true

  // 1. Intercept console.error
  const originalConsoleError = console.error
  console.error = function (...args: any[]) {
    originalConsoleError.apply(console, args)
    try {
      const message = args.map(arg => {
        if (arg instanceof Error) {
          return arg.stack || arg.message
        }
        return typeof arg === "object" ? JSON.stringify(arg) : String(arg)
      }).join(" ")
      addConsoleLog("error", message)
    } catch (e) {
      addConsoleLog("error", "[Failed to parse console.error arguments]")
    }
  }

  // 2. Intercept console.warn
  const originalConsoleWarn = console.warn
  console.warn = function (...args: any[]) {
    originalConsoleWarn.apply(console, args)
    try {
      const message = args.map(arg => {
        if (arg instanceof Error) {
          return arg.stack || arg.message
        }
        return typeof arg === "object" ? JSON.stringify(arg) : String(arg)
      }).join(" ")
      addConsoleLog("warn", message)
    } catch (e) {
      addConsoleLog("warn", "[Failed to parse console.warn arguments]")
    }
  }

  // 3. Intercept window.onerror
  const originalOnError = window.onerror
  window.onerror = function (message, source, lineno, colno, error) {
    const errorMsg = `Global Error: ${String(message)} at ${String(source)}:${lineno}:${colno}`
    addConsoleLog("error", errorMsg)
    if (originalOnError) {
      return originalOnError.apply(window, [message, source, lineno, colno, error])
    }
    return false
  }

  // 4. Intercept unhandled rejections
  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason
    const message = `Unhandled Rejection: ${reason instanceof Error ? reason.message : String(reason)}`
    addConsoleLog("error", message)
  })

  // 5. Intercept window.fetch for network logs (capturing only 4xx and 5xx errors)
  const originalFetch = window.fetch
  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
    const method = init?.method || "GET"
    const url = typeof input === "string" ? input : (input as Request).url || String(input)

    try {
      const response = await originalFetch.apply(this, [input, init])
      if (response.status >= 400) {
        addNetworkLog(method, url, response.status)
      }
      return response
    } catch (err: any) {
      // Failed connection
      addNetworkLog(method, url, 0)
      throw err
    }
  }
}
