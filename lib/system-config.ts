import fs from "fs"
import path from "path"

export interface SubscriptionConfig {
  plan: "free" | "pro" | "enterprise"
  status: "active" | "inactive" | "suspended"
  expiresAt: string // ISO Date String
  iyzicoSubscriptionId?: string
}

export interface CompanyConfig {
  title: string
  taxOffice: string
  taxNumber: string
  tradeRegisterNo?: string
  mersisNo?: string
  address: string
  phone: string
  email: string
  website?: string
  multiBranchEnabled: boolean
}

export interface SecurityConfig {
  minLength: number
  requireNumbers: boolean
  requireSymbols: boolean
  requireUppercase: boolean
  sessionTimeoutMinutes: number
  maxLoginAttempts: number
  twoFactorAuthEnabled: boolean
  allowedIpAddresses: string
}

export interface NotificationsConfig {
  emailNotificationsEnabled: boolean
  smsNotificationsEnabled: boolean
  pushNotificationsEnabled: boolean
  soundAlertsEnabled: boolean
}

export interface IntegrationsConfig {
  efaturaProvider: string
  efaturaApiKey: string
  kargoProvider: string
  kargoApiKey: string
  iyzicoApiKey: string
  iyzicoSecretKey: string
}

export interface LocalizationConfig {
  defaultLocale: string
  defaultCurrency: string
  dateFormat: string
  defaultVatRate: number
}

export interface BackupConfig {
  autoBackupInterval: "daily" | "weekly" | "monthly" | "disabled"
  lastBackupAt?: string
}

export interface DocumentNumberingConfig {
  invoicePrefix: string
  invoiceNextNumber: number
  orderPrefix: string
  orderNextNumber: number
  projectPrefix: string
  projectNextNumber: number
}

export interface WorkflowsConfig {
  orderApprovalThreshold: number
  hrLeaveApprovalRequired: boolean
}

export interface ModuleSettingsConfig {
  crmAutoAssignLeads: boolean
  stockLowThreshold: number
}

export interface SystemMaintenanceConfig {
  maintenanceMode: boolean
  announcementBannerText: string
  showAnnouncementBanner: boolean
}

export interface SystemConfig {
  onboarded: boolean
  eulaApproved: boolean
  logoUrl?: string // Base64 or local storage path
  bgRemovedLogoUrl?: string // Background removed transparent PNG
  themeColors?: {
    primary: string // HEX color
    primaryForeground?: string // Readable text color (#FFFFFF or #0F172A)
    accent: string  // Accent color
    accentForeground?: string // Readable accent text color

    // Custom Dark Theme Palette (Generated from Brand Logo)
    darkBackground?: string
    darkCard?: string
    darkPopover?: string
    darkSidebar?: string
    darkHeader?: string
    darkPrimary?: string
    darkPrimaryForeground?: string
    darkAccent?: string
    darkAccentForeground?: string
    darkForeground?: string
    darkMutedForeground?: string
    darkBorder?: string
  }
  subscription: SubscriptionConfig
  tamperDetected: boolean
  securityDisabled?: boolean
  company?: CompanyConfig
  security?: SecurityConfig
  notifications?: NotificationsConfig
  integrations?: IntegrationsConfig
  localization?: LocalizationConfig
  backup?: BackupConfig
  documentNumbering?: DocumentNumberingConfig
  workflows?: WorkflowsConfig
  moduleSettings?: ModuleSettingsConfig
  systemMaintenance?: SystemMaintenanceConfig
}

function getConfigPath(): string {
  if (process.env.ELECTRON_USER_DATA_PATH) {
    return path.join(process.env.ELECTRON_USER_DATA_PATH, "system_config.json")
  }
  return path.join(process.cwd(), "storage", "system_config.json")
}

const CONFIG_PATH = getConfigPath()

/**
 * Checks if the test mode bypass file exists.
 * When ANY of these files exist (e.g. storage/TEST_MODE), security protection & tamper quarantine is DISABLED.
 * When the file is DELETED, security protection is RE-ENABLED automatically.
 */
export function isSecurityDisabled(): boolean {
  try {
    const flagPaths = [
      path.join(process.cwd(), "storage", "TEST_MODE"),
      path.join(process.cwd(), "storage", "disable_security.flag"),
      path.join(process.cwd(), "TEST_MODE")
    ]
    return flagPaths.some(filePath => fs.existsSync(filePath))
  } catch {
    return false
  }
}

const DEFAULT_CONFIG: SystemConfig = {
  onboarded: false,
  eulaApproved: true,
  logoUrl: undefined,
  bgRemovedLogoUrl: undefined,
  company: {
    title: "Çiçekana ERP",
    taxOffice: "",
    taxNumber: "",
    tradeRegisterNo: "",
    mersisNo: "",
    address: "",
    phone: "",
    email: "",
    website: "",
    multiBranchEnabled: true
  },
  themeColors: {
    primary: "#D37112",
    primaryForeground: "#FFFFFF",
    accent: "#D32F28",
    accentForeground: "#FFFFFF",
    darkBackground: "#171310",
    darkCard: "#231C17",
    darkPopover: "#2E261F",
    darkSidebar: "#1C1613",
    darkHeader: "#1C1613",
    darkPrimary: "#E6923C",
    darkPrimaryForeground: "#FFFFFF",
    darkAccent: "#E2534B",
    darkAccentForeground: "#FFFFFF",
    darkForeground: "#F6F3F0",
    darkMutedForeground: "#A89F95",
    darkBorder: "rgba(211, 113, 18, 0.15)"
  },
  subscription: {
    plan: "free",
    status: "inactive", // inactive by default until paywall selection
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year placeholder
  },
  tamperDetected: false,
  securityDisabled: false
}

export function getSystemConfig(): SystemConfig {
  try {
    const disabled = isSecurityDisabled()
    if (!fs.existsSync(CONFIG_PATH)) {
      const dir = path.dirname(CONFIG_PATH)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      const initialConfig = { ...DEFAULT_CONFIG, tamperDetected: false }
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(initialConfig, null, 2), "utf8")
      return { ...initialConfig, securityDisabled: disabled }
    }
    const content = fs.readFileSync(CONFIG_PATH, "utf8")
    const parsed = JSON.parse(content)
    
    // If security is disabled by test file, force tamperDetected to false
    if (disabled) {
      parsed.tamperDetected = false
    }

    const merged = {
      ...DEFAULT_CONFIG,
      ...parsed,
      company: { ...DEFAULT_CONFIG.company, ...(parsed.company || {}) },
      subscription: { ...DEFAULT_CONFIG.subscription, ...(parsed.subscription || {}) },
      themeColors: { ...DEFAULT_CONFIG.themeColors, ...(parsed.themeColors || {}) },
      securityDisabled: disabled
    }
    return merged
  } catch (err) {
    console.error("[SystemConfig] Error reading config file, returning default:", err)
    return { ...DEFAULT_CONFIG, securityDisabled: isSecurityDisabled() }
  }
}

export function saveSystemConfig(config: Partial<SystemConfig>): SystemConfig {
  try {
    const current = getSystemConfig()
    const updated = {
      ...current,
      ...config,
      company: config.company ? { ...current.company, ...config.company } : current.company,
      subscription: config.subscription ? { ...current.subscription, ...config.subscription } : current.subscription,
      themeColors: config.themeColors ? { ...current.themeColors, ...config.themeColors } : current.themeColors,
      securityDisabled: isSecurityDisabled()
    }
    const dir = path.dirname(CONFIG_PATH)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(updated, null, 2), "utf8")
    return updated
  } catch (err) {
    console.error("[SystemConfig] Error writing config file:", err)
    throw err
  }
}

export function resetSystemConfig(): SystemConfig {
  try {
    const disabled = isSecurityDisabled()
    const resetConfig: SystemConfig = {
      ...DEFAULT_CONFIG,
      securityDisabled: disabled
    }
    const dir = path.dirname(CONFIG_PATH)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(resetConfig, null, 2), "utf8")
    return resetConfig
  } catch (err) {
    console.error("[SystemConfig] Error resetting config file:", err)
    throw err
  }
}

