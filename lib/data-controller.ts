import * as mockData from "./mock-data"

/**
 * Checks if the Demo/Mock Mode is active.
 * Demo Mode is enabled:
 * - If ENABLE_DEMO_MODE environment variable is "true"
 * - If NEXT_PUBLIC_ENABLE_DEMO_MODE environment variable is "true"
 * - If not explicitly set to "false" and running in development mode
 */
export function isDemoModeActive(): boolean {
  // Server-side environment checks
  const envDemo = process.env.ENABLE_DEMO_MODE
  const publicEnvDemo = process.env.NEXT_PUBLIC_ENABLE_DEMO_MODE
  const publicUseMock = process.env.NEXT_PUBLIC_USE_MOCK_DATA

  if (envDemo === "false" || publicEnvDemo === "false" || publicUseMock === "false") {
    return false
  }

  if (envDemo === "true" || publicEnvDemo === "true" || publicUseMock === "true") {
    return true
  }

  // Fallback to NODE_ENV
  return process.env.NODE_ENV === "development"
}

/**
 * Returns mock data for a given entity type if active
 */
export function getMockData(type: string, branchId?: string | null): any {
  switch (type) {
    case "customers":
      return mockData.mockCustomers
    case "orders":
      return mockData.mockOrders
    case "projects":
      return mockData.mockProjects
    case "chat_users":
      return mockData.mockUsers
    case "messages":
      return mockData.mockMessages
    case "calendar_events":
      return mockData.mockCalendarEvents
    case "personel_talepleri":
      return mockData.mockHRRequests
    case "stats":
      return mockData.getMockStats()
    case "leads":
      return mockData.mockLeads
    case "finance":
      return mockData.mockFinances
    case "cargo":
      return mockData.mockCargo
    case "products":
      return mockData.mockProducts
    default:
      return null
  }
}

/**
 * Helper to wrap database queries and automatically return mock data if demo mode is enabled
 */
export async function getMockDataOr<T>(type: string, realDataFetcher: () => Promise<T>, branchId?: string | null): Promise<T> {
  if (isDemoModeActive()) {
    const mock = getMockData(type, branchId)
    if (mock !== null) {
      return mock as T
    }
  }
  return await realDataFetcher()
}
