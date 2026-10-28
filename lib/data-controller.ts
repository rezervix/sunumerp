import * as mockData from "./mock-data"

/**
 * Checks if the Demo/Mock Mode is active.
 * For this Public Demo repo, Demo Mode is enabled by default so that
 * all visitors get a rich, vibrant, zero-configuration showcase.
 * It can only be disabled by setting DISABLE_DEMO_MODE="true" or ENABLE_DEMO_MODE="false".
 */
export function isDemoModeActive(): boolean {
  const envDemo = process.env.ENABLE_DEMO_MODE
  const publicEnvDemo = process.env.NEXT_PUBLIC_ENABLE_DEMO_MODE
  const publicUseMock = process.env.NEXT_PUBLIC_USE_MOCK_DATA
  const disableDemo = process.env.DISABLE_DEMO_MODE

  if (disableDemo === "true" || envDemo === "false" || publicEnvDemo === "false" || publicUseMock === "false") {
    return false
  }

  // Active by default for public showcase & demo
  return true
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
