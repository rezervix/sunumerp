"use client"

import { useState, useEffect } from "react"
import { isDemoModeActive, getMockData } from "@/lib/data-controller"

/**
 * React Hook for client-side components to query the Demo Mode state and retrieve mock data.
 * Mark the parent component or file with "use client" when using this.
 */
export function useMockData<T>(type: string, fallbackData: T): {
  isDemo: boolean
  data: T
  loading: boolean
} {
  const [isDemo, setIsDemo] = useState(false)
  const [data, setData] = useState<T>(fallbackData)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Client-side demo mode check
    const active = isDemoModeActive()
    setIsDemo(active)

    if (active) {
      const mock = getMockData(type)
      if (mock !== null) {
        setData(mock as T)
      }
    } else {
      setData(fallbackData)
    }
    setLoading(false)
  }, [type, fallbackData])

  return { isDemo, data, loading }
}
