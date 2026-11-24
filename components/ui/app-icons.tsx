import * as React from "react"

export type AppIconProps = React.SVGProps<SVGSVGElement> & {
  size?: number | string
}

function BaseSvg({
  size = 16,
  children,
  ...props
}: AppIconProps & { children: React.ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.85}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  )
}

export const IconCheck = (p: AppIconProps) => (
  <BaseSvg {...p}>
    <path d="M20 6 9 17l-5-5" />
  </BaseSvg>
)

export const IconX = (p: AppIconProps) => (
  <BaseSvg {...p}>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </BaseSvg>
)

export const IconChevronDown = (p: AppIconProps) => (
  <BaseSvg {...p}>
    <path d="m6 9 6 6 6-6" />
  </BaseSvg>
)

export const IconChevronUp = (p: AppIconProps) => (
  <BaseSvg {...p}>
    <path d="m18 15-6-6-6 6" />
  </BaseSvg>
)

export const IconChevronLeft = (p: AppIconProps) => (
  <BaseSvg {...p}>
    <path d="m15 18-6-6 6-6" />
  </BaseSvg>
)

export const IconChevronRight = (p: AppIconProps) => (
  <BaseSvg {...p}>
    <path d="m9 18 6-6-6-6" />
  </BaseSvg>
)

export const IconChevronsUpDown = (p: AppIconProps) => (
  <BaseSvg {...p}>
    <path d="m7 15 5 5 5-5" />
    <path d="m7 9 5-5 5 5" />
  </BaseSvg>
)

export const IconSearch = (p: AppIconProps) => (
  <BaseSvg {...p}>
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </BaseSvg>
)

export const IconSliders = (p: AppIconProps) => (
  <BaseSvg {...p}>
    <line x1="4" x2="4" y1="21" y2="14" />
    <line x1="4" x2="4" y1="10" y2="3" />
    <line x1="12" x2="12" y1="21" y2="12" />
    <line x1="12" x2="12" y1="8" y2="3" />
    <line x1="20" x2="20" y1="21" y2="16" />
    <line x1="20" x2="20" y1="12" y2="3" />
    <line x1="2" x2="6" y1="14" y2="14" />
    <line x1="10" x2="14" y1="8" y2="8" />
    <line x1="18" x2="22" y1="16" y2="16" />
  </BaseSvg>
)

export const IconLoader = ({ className = "", ...p }: AppIconProps) => (
  <BaseSvg className={`animate-spin ${className}`.trim()} {...p}>
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </BaseSvg>
)

export const IconMoreHorizontal = (p: AppIconProps) => (
  <BaseSvg {...p}>
    <circle cx="12" cy="12" r="1" />
    <circle cx="19" cy="12" r="1" />
    <circle cx="5" cy="12" r="1" />
  </BaseSvg>
)

export const IconPlus = (p: AppIconProps) => (
  <BaseSvg {...p}>
    <path d="M5 12h14" />
    <path d="M12 5v14" />
  </BaseSvg>
)

export const IconArrowDownLeft = (p: AppIconProps) => (
  <BaseSvg {...p}>
    <path d="M17 7 7 17" />
    <path d="M17 17H7V7" />
  </BaseSvg>
)

export const IconArrowUpRight = (p: AppIconProps) => (
  <BaseSvg {...p}>
    <path d="M7 7h10v10" />
    <path d="M7 17 17 7" />
  </BaseSvg>
)

export const IconArrowRight = (p: AppIconProps) => (
  <BaseSvg {...p}>
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </BaseSvg>
)

export const IconEye = (p: AppIconProps) => (
  <BaseSvg {...p}>
    <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
    <circle cx="12" cy="12" r="3" />
  </BaseSvg>
)

export const IconRefresh = (p: AppIconProps) => (
  <BaseSvg {...p}>
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
    <path d="M8 16H3v5" />
  </BaseSvg>
)

export const IconSparkles = (p: AppIconProps) => (
  <BaseSvg {...p}>
    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
  </BaseSvg>
)

export const IconBell = (p: AppIconProps) => (
  <BaseSvg {...p}>
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </BaseSvg>
)

export const IconSettings = (p: AppIconProps) => (
  <BaseSvg {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </BaseSvg>
)

export const IconMenu = (p: AppIconProps) => (
  <BaseSvg {...p}>
    <line x1="4" x2="20" y1="12" y2="12" />
    <line x1="4" x2="20" y1="6" y2="6" />
    <line x1="4" x2="20" y1="18" y2="18" />
  </BaseSvg>
)

export const IconLogOut = (p: AppIconProps) => (
  <BaseSvg {...p}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" x2="9" y1="12" y2="12" />
  </BaseSvg>
)

export const IconDashboard = (p: AppIconProps) => (
  <BaseSvg {...p}>
    <rect width="7" height="9" x="3" y="3" rx="1.5" />
    <rect width="7" height="5" x="14" y="3" rx="1.5" />
    <rect width="7" height="9" x="14" y="12" rx="1.5" />
    <rect width="7" height="5" x="3" y="16" rx="1.5" />
  </BaseSvg>
)

export const IconGlobe = (p: AppIconProps) => (
  <BaseSvg {...p}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
    <path d="M2 12h20" />
  </BaseSvg>
)

export const IconTruck = (p: AppIconProps) => (
  <BaseSvg {...p}>
    <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
    <path d="M15 18H9" />
    <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
    <circle cx="17" cy="18" r="2" />
    <circle cx="7" cy="18" r="2" />
  </BaseSvg>
)

export const IconFactory = (p: AppIconProps) => (
  <BaseSvg {...p}>
    <path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
  </BaseSvg>
)

export const IconShoppingBag = (p: AppIconProps) => (
  <BaseSvg {...p}>
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
    <path d="M3 6h18" />
    <path d="M16 10a4 4 0 0 1-8 0" />
  </BaseSvg>
)

export const IconCreditCard = (p: AppIconProps) => (
  <BaseSvg {...p}>
    <rect width="20" height="14" x="2" y="5" rx="2" />
    <line x1="2" x2="22" y1="10" y2="10" />
  </BaseSvg>
)

export const IconFolder = (p: AppIconProps) => (
  <BaseSvg {...p}>
    <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
  </BaseSvg>
)

export const IconMegaphone = (p: AppIconProps) => (
  <BaseSvg {...p}>
    <path d="m3 11 18-5v12L3 14v-3z" />
    <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
  </BaseSvg>
)

export const IconUsers = (p: AppIconProps) => (
  <BaseSvg {...p}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </BaseSvg>
)

export const IconMessageCircle = (p: AppIconProps) => (
  <BaseSvg {...p}>
    <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
  </BaseSvg>
)

export const IconShield = (p: AppIconProps) => (
  <BaseSvg {...p}>
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
  </BaseSvg>
)

export const IconBoxes = (p: AppIconProps) => (
  <BaseSvg {...p}>
    <path d="M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z" />
    <path d="m7 16.5-4.74-2.85" />
    <path d="m7 16.5 5-3" />
    <path d="M7 16.5v5.17" />
    <path d="M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z" />
    <path d="m17 16.5-5-3" />
    <path d="m17 16.5 4.74-2.85" />
    <path d="M17 16.5v5.17" />
    <path d="M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z" />
    <path d="M12 8 7.26 5.15" />
    <path d="m12 8 4.74-2.85" />
    <path d="M12 13.5V8" />
  </BaseSvg>
)

export const IconWarehouse = (p: AppIconProps) => (
  <BaseSvg {...p}>
    <path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z" />
    <path d="M6 18h12" />
    <path d="M6 14h12" />
    <rect width="12" height="12" x="6" y="10" />
  </BaseSvg>
)

export const IconAlertTriangle = (p: AppIconProps) => (
  <BaseSvg {...p}>
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </BaseSvg>
)

export const IconAlertCircle = (p: AppIconProps) => (
  <BaseSvg {...p}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" x2="12" y1="8" y2="12" />
    <line x1="12" x2="12.01" y1="16" y2="16" />
  </BaseSvg>
)

export const IconSend = (p: AppIconProps) => (
  <BaseSvg {...p}>
    <path d="m22 2-7 20-4-9-9-4Z" />
    <path d="M22 2 11 13" />
  </BaseSvg>
)

export const IconLifeBuoy = (p: AppIconProps) => (
  <BaseSvg {...p}>
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="4" />
    <line x1="4.93" x2="9.17" y1="4.93" y2="9.17" />
    <line x1="14.83" x2="19.07" y1="14.83" y2="19.07" />
    <line x1="14.83" x2="19.07" y1="9.17" y2="4.93" />
    <line x1="4.93" x2="9.17" y1="19.07" y2="14.83" />
  </BaseSvg>
)

export const IconQrCode = (p: AppIconProps) => (
  <BaseSvg {...p}>
    <rect width="5" height="5" x="3" y="3" rx="1" />
    <rect width="5" height="5" x="16" y="3" rx="1" />
    <rect width="5" height="5" x="3" y="16" rx="1" />
    <path d="M21 16h-3a2 2 0 0 0-2 2v3" />
    <path d="M21 21v.01" />
    <path d="M12 7v3a2 2 0 0 1-2 2H7" />
    <path d="M3 12h.01" />
    <path d="M12 3h.01" />
    <path d="M12 16v.01" />
    <path d="M16 12h1" />
    <path d="M21 12v.01" />
    <path d="M12 21v-1" />
  </BaseSvg>
)

export const IconTrash = (p: AppIconProps) => (
  <BaseSvg {...p}>
    <path d="M3 6h18" />
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
  </BaseSvg>
)

export const IconClock = (p: AppIconProps) => (
  <BaseSvg {...p}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </BaseSvg>
)

export const IconDollarSign = (p: AppIconProps) => (
  <BaseSvg {...p}>
    <line x1="12" x2="12" y1="2" y2="22" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </BaseSvg>
)

export const IconLayers = (p: AppIconProps) => (
  <BaseSvg {...p}>
    <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
    <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" />
    <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" />
  </BaseSvg>
)

export const IconFilter = (p: AppIconProps) => (
  <BaseSvg {...p}>
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </BaseSvg>
)

export const IconPackagePlus = (p: AppIconProps) => (
  <BaseSvg {...p}>
    <path d="M16 16h6" />
    <path d="M19 13v6" />
    <path d="M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14" />
    <path d="m7.5 4.27 9 5.15" />
    <polyline points="3.29 7 12 12 20.71 7" />
    <line x1="12" x2="12" y1="22" y2="12" />
  </BaseSvg>
)

export const IconZap = (p: AppIconProps) => (
  <BaseSvg {...p}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </BaseSvg>
)

export const IconDownload = (p: AppIconProps) => (
  <BaseSvg {...p}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" x2="12" y1="15" y2="3" />
  </BaseSvg>
)

export const IconFileText = (p: AppIconProps) => (
  <BaseSvg {...p}>
    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
    <path d="M14 2v4a2 2 0 0 0 2 2h4" />
    <path d="M10 9H8" />
    <path d="M16 13H8" />
    <path d="M16 17H8" />
  </BaseSvg>
)

export const IconHistory = (p: AppIconProps) => (
  <BaseSvg {...p}>
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M12 7v5l4 2" />
  </BaseSvg>
)
