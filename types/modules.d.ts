// Global ambient type declarations for Sunum ERP
import * as React from 'react'

declare module 'sonner' {
  export interface ToastClassnames {
    toast?: string
    title?: string
    description?: string
    loader?: string
    closeButton?: string
    cancelButton?: string
    actionButton?: string
    success?: string
    error?: string
    info?: string
    warning?: string
  }

  export interface ToastOptions {
    description?: React.ReactNode
    duration?: number
    dismissible?: boolean
    action?: {
      label: string
      onClick: (event: React.MouseEvent<HTMLButtonElement>) => void
    }
    cancel?: {
      label: string
      onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void
    }
    id?: string | number
    important?: boolean
    className?: string
    style?: React.CSSProperties
    classNames?: ToastClassnames
    onDismiss?: (toast: any) => void
    onAutoClose?: (toast: any) => void
    [key: string]: any
  }

  export interface ToastFunction {
    (message: React.ReactNode, data?: ToastOptions): string | number
    message(message: React.ReactNode, data?: ToastOptions): string | number
    success(message: React.ReactNode, data?: ToastOptions): string | number
    info(message: React.ReactNode, data?: ToastOptions): string | number
    warning(message: React.ReactNode, data?: ToastOptions): string | number
    error(message: React.ReactNode, data?: ToastOptions): string | number
    custom(jsx: (id: number | string) => React.ReactElement, data?: ToastOptions): string | number
    loading(message: React.ReactNode, data?: ToastOptions): string | number
    promise<T>(
      promise: Promise<T> | (() => Promise<T>),
      data?: {
        loading?: React.ReactNode
        success?: React.ReactNode | ((data: T) => React.ReactNode)
        error?: React.ReactNode | ((error: any) => React.ReactNode)
        description?: React.ReactNode | ((data: any) => React.ReactNode)
        finally?: () => void | Promise<void>
      }
    ): string | number
    dismiss(id?: string | number): string | number
  }

  export const toast: ToastFunction
  export const Toaster: React.FC<any>
}

declare module 'next/server' {
  export class NextResponse<Body = unknown> extends Response {
    [key: string]: any
    static json<T = any>(body: T, init?: ResponseInit): NextResponse<T>
    static redirect(url: string | URL, init?: number | ResponseInit): NextResponse
    static rewrite(destination: string | URL, init?: ResponseInit): NextResponse
    static next(init?: any): NextResponse
  }

  export class NextRequest extends Request {
    [key: string]: any
    nextUrl: URL
    cookies: any
    ip?: string
    geo?: any
  }
}

declare module 'lucide-react' {
  export interface LucideProps extends React.SVGProps<SVGSVGElement> {
    size?: string | number
    color?: string
    strokeWidth?: string | number
    className?: string
    absoluteStrokeWidth?: boolean
  }

  export type LucideIcon = React.ForwardRefExoticComponent<
    LucideProps & React.RefAttributes<SVGSVGElement>
  >

  export const createLucideIcon: (iconName: string, iconNode: any[]) => LucideIcon

  export const Webhook: LucideIcon
  export const Puzzle: LucideIcon
  export const DatabaseZap: LucideIcon
  export const GraduationCap: LucideIcon
  export const ShieldCheck: LucideIcon
  export const KeyRound: LucideIcon
  export const CheckCircle2: LucideIcon
  export const Play: LucideIcon
  export const ArrowRight: LucideIcon
  export const Cpu: LucideIcon
  export const Layers: LucideIcon
  export const Terminal: LucideIcon
  export const Sparkles: LucideIcon
  export const RefreshCw: LucideIcon
  export const Boxes: LucideIcon
  export const Warehouse: LucideIcon
  export const Smartphone: LucideIcon
  export const ShoppingCart: LucideIcon
  export const Globe: LucideIcon
  export const Split: LucideIcon
  export const RotateCcw: LucideIcon
  export const Truck: LucideIcon
  export const FileText: LucideIcon
  export const QrCode: LucideIcon
  export const Store: LucideIcon
  export const ShoppingBag: LucideIcon
  export const Plus: LucideIcon
  export const Search: LucideIcon
  export const Scale: LucideIcon
  export const Calculator: LucideIcon
  export const Barcode: LucideIcon
  export const MapPin: LucideIcon
  export const ClipboardCheck: LucideIcon
  export const PackageCheck: LucideIcon
  export const Eye: LucideIcon
  export const EyeOff: LucideIcon
  export const Compass: LucideIcon
  export const Box: LucideIcon
  export const Wifi: LucideIcon
  export const WifiOff: LucideIcon
  export const Radio: LucideIcon
  export const Database: LucideIcon
  export const PackagePlus: LucideIcon
  export const AlertCircle: LucideIcon
  export const BellRing: LucideIcon
  export const Handshake: LucideIcon
  export const TrendingUp: LucideIcon
  export const Clock: LucideIcon
  export const FileCheck2: LucideIcon
  export const BrainCircuit: LucideIcon
  export const MessageSquareText: LucideIcon
  export const Send: LucideIcon
  export const BarChart3: LucideIcon
  export const Zap: LucideIcon
  export const X: LucideIcon
  export const ArrowUpRight: LucideIcon
  export const GitBranch: LucideIcon
  export const ShieldAlert: LucideIcon
  export const FileSpreadsheet: LucideIcon
  export const ChevronRight: LucideIcon
  export const ChevronLeft: LucideIcon
  export const ChevronDown: LucideIcon
  export const ChevronUp: LucideIcon
  export const AlertTriangle: LucideIcon
  export const LayoutDashboard: LucideIcon
  export const Users: LucideIcon
  export const UserCheck: LucideIcon
  export const FolderOpen: LucideIcon
  export const CheckSquare: LucideIcon
  export const StickyNote: LucideIcon
  export const CreditCard: LucideIcon
  export const Megaphone: LucideIcon
  export const Building2: LucideIcon
  export const Shield: LucideIcon
  export const MessageCircle: LucideIcon
  export const Bell: LucideIcon
  export const Settings: LucideIcon
  export const LogOut: LucideIcon
  export const Menu: LucideIcon
  export const PanelLeftClose: LucideIcon
  export const PanelLeftOpen: LucideIcon
  export const CalendarDays: LucideIcon
  export const Library: LucideIcon
  export const Images: LucideIcon
  export const CalendarCheck2: LucideIcon
  export const ClipboardList: LucideIcon
  export const LifeBuoy: LucideIcon
  export const HelpCircle: LucideIcon
  export const Trash2: LucideIcon
  export const MoreHorizontal: LucideIcon
  export const MoreVertical: LucideIcon
  export const Download: LucideIcon
  export const Upload: LucideIcon
  export const Trash: LucideIcon
  export const Edit: LucideIcon
  export const Copy: LucideIcon
  export const Check: LucideIcon
  export const ExternalLink: LucideIcon
  export const Filter: LucideIcon
  export const Sun: LucideIcon
  export const Moon: LucideIcon
  export const User: LucideIcon
  export const Phone: LucideIcon
  export const Mail: LucideIcon
  export const Lock: LucideIcon
  export const Unlock: LucideIcon
  export const Info: LucideIcon
  export const Loader2: LucideIcon
  export const ArrowDownLeft: LucideIcon
  export const History: LucideIcon
  export const Calendar: LucideIcon
  export const DollarSign: LucideIcon
  export const ArrowDownToLine: LucideIcon
  export const Save: LucideIcon
  export const Thermometer: LucideIcon
  export const Weight: LucideIcon
  export const Maximize2: LucideIcon
  export const ArrowLeft: LucideIcon
  export const SlidersHorizontal: LucideIcon
  export const ScanLine: LucideIcon
  export const Camera: LucideIcon
  export const Package: LucideIcon
  export const MinusCircle: LucideIcon
  export const Building: LucideIcon
  export const TrendingDown: LucideIcon
  export const Key: LucideIcon
  export const Server: LucideIcon
  export const Flame: LucideIcon
  export const Award: LucideIcon
  export const File: LucideIcon
  export const Folder: LucideIcon
  export const UploadCloud: LucideIcon
  export const Star: LucideIcon
  export const List: LucideIcon
  export const Edit3: LucideIcon
  export const Grid3X3: LucideIcon
  export const Grid: LucideIcon
  export const XCircle: LucideIcon
  export const CheckCircle: LucideIcon
  export const Square: LucideIcon
  export const BarChart2: LucideIcon
  export const Home: LucideIcon
  export const Activity: LucideIcon
  export const Tag: LucideIcon
  export const Share2: LucideIcon
  export const Video: LucideIcon
  export const PlayCircle: LucideIcon
  export const HardDrive: LucideIcon
  export const Grid2X2: LucideIcon
  export const Music: LucideIcon
  export const Archive: LucideIcon
  export const SortAsc: LucideIcon
  export const SortDesc: LucideIcon
  export const Move: LucideIcon
  export const Image: LucideIcon
  export const Instagram: LucideIcon
  export const Youtube: LucideIcon
  export const Facebook: LucideIcon
  export const Linkedin: LucideIcon
  export const Columns3: LucideIcon
  export const Film: LucideIcon
  export const LayoutGrid: LucideIcon
  export const FileArchive: LucideIcon
  export const MessageSquare: LucideIcon
  export const SkipForward: LucideIcon
  export const Wrench: LucideIcon
  export const Inbox: LucideIcon
  export const Paperclip: LucideIcon
  export const Pause: LucideIcon
  export const UserMinus: LucideIcon
  export const ArrowRightLeft: LucideIcon
  export const Wallet: LucideIcon
  export const Laptop: LucideIcon
  export const FolderClosed: LucideIcon
  export const ThumbsUp: LucideIcon
  export const ThumbsDown: LucideIcon
  export const Palette: LucideIcon
  export const Hash: LucideIcon
  export const GitPullRequest: LucideIcon
  export const CheckIcon: LucideIcon
  export const ChevronDownIcon: LucideIcon
  export const ChevronUpIcon: LucideIcon
  export const XIcon: LucideIcon
  export const PanelLeftIcon: LucideIcon
  export const Loader2Icon: LucideIcon
  export const Smile: LucideIcon
  export const GitCompare: LucideIcon
  export const Sliders: LucideIcon
  export const ZoomIn: LucideIcon
  export const ZoomOut: LucideIcon
  export const RotateCw: LucideIcon
  export const Minimize2: LucideIcon
  export const FolderPlus: LucideIcon

  export const icons: Record<string, LucideIcon>
}

declare module 'jspdf' {
  const jsPDF: any
  export default jsPDF
  export { jsPDF }
}

declare module 'tailwind-merge' {
  export function twMerge(...classLists: any[]): string
}

declare module '@google/generative-ai' {
  export class GoogleGenerativeAI {
    constructor(apiKey: string)
    getGenerativeModel(config: { model: string; [key: string]: any }): any
  }
}

