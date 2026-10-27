"use client"

import { useState, useCallback, useRef } from "react"
import { useLanguage } from "@/lib/context/LanguageContext"
import { toast } from "sonner"
import {
  Library, Star, Trash2, Clock, ChevronRight, Home,
  RefreshCw, Activity
} from "lucide-react"
import { useAuth } from "@/lib/auth/context"
import { FileGrid } from "@/components/library/FileGrid"
import { FolderTree } from "@/components/library/FolderTree"
import { DropZone } from "@/components/library/DropZone"
import { FilePreviewModal } from "@/components/library/FilePreviewModal"
import { ConvertModal } from "@/components/library/ConvertModal"
import { DiskUsageBar } from "@/components/library/DiskUsageBar"
import { WelcomeAlert } from "@/components/library/WelcomeAlert"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

type ViewSection = "all" | "starred" | "trash" | "recent"

interface LibraryFile {
  id: string
  originalName: string
  mimeType: string
  sizeBytes: number
  isStarred: boolean
  isTrashed: boolean
  checksumSha256: string
  createdAt: string
  updatedAt: string
  uploadedBy?: { fullName: string; avatarUrl?: string }
  description?: string
}

const SECTION_LABELS: Record<ViewSection, string> = {
  all: "Tüm Dosyalar",
  starred: "Yıldızlılar",
  trash: "Çöp Kutusu",
  recent: "Son Kullanılanlar",
}

export default function AjansKutuphanesiPage() {
  const { t, tText } = useLanguage()
  const { currentBranch } = useAuth()
  const branchId = currentBranch?.id ?? ""

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>()
  const [section, setSection] = useState<ViewSection>("all")
  const [breadcrumb, setBreadcrumb] = useState<{ id: string; name: string }[]>([])
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([])
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  // Modal state'leri
  const [previewFile, setPreviewFile] = useState<LibraryFile | null>(null)
  const [convertFile, setConvertFile] = useState<LibraryFile | null>(null)
  const [convertOpen, setConvertOpen] = useState(false)

  const refresh = useCallback(() => setRefreshTrigger((t) => t + 1), [])

  const handleFolderOpen = (folderId: string) => {
    // Breadcrumb için klasör adını fetch et
    fetch(`/api/ajans-kutuphanesi/folders?branchId=${branchId}`)
      .then((r) => r.json())
      .then((folders: any[]) => {
        const folder = folders.find((f: any) => f.id === folderId)
        if (folder) {
          setBreadcrumb((prev) => [...prev, { id: folderId, name: folder.name }])
        }
      })
    setCurrentFolderId(folderId)
  }

  const handleBreadcrumbNav = (index: number) => {
    if (index === -1) {
      // Kök
      setCurrentFolderId(undefined)
      setBreadcrumb([])
    } else {
      setCurrentFolderId(breadcrumb[index].id)
      setBreadcrumb((prev) => prev.slice(0, index + 1))
    }
  }

  const handleConvertSuccess = () => {
    refresh()
  }

  if (!branchId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Lütfen bir şube seçin.</p>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] -m-4 lg:-m-6 overflow-hidden rounded-xl border border-border shadow-sm bg-card">

      {/* ── Sol Panel (Sidebar) ── */}
      <aside className="hidden lg:flex flex-col w-56 xl:w-64 shrink-0 border-r border-border bg-card">
        {/* Başlık */}
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-border">
          <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Library size={16} className="text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground leading-tight">Ajans Kütüphanesi</p>
            <div className="flex items-center gap-1.5">
              <p className="text-caption text-muted-foreground">Dosya Yönetimi</p>
              {process.env.NODE_ENV !== "production" && (
                <span className="inline-flex items-center size-2 rounded-full bg-emerald-500 animate-pulse" title="Geliştirici Esneklik Protokolü Aktif (Yerel JSON DB / Araç Simülasyonu)" />
              )}
            </div>
          </div>
        </div>

        {/* Hızlı erişim */}
        <div className="px-3 py-2 space-y-0.5 border-b border-border">
          {(
            [
              { key: "all", icon: Home, label: "Tüm Dosyalar" },
              { key: "recent", icon: Clock, label: "Son Kullanılanlar" },
              { key: "starred", icon: Star, label: "Yıldızlılar" },
              { key: "trash", icon: Trash2, label: "Çöp Kutusu" },
            ] as { key: ViewSection; icon: any; label: string }[]
          ).map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => {
                setSection(key)
                setCurrentFolderId(undefined)
                setBreadcrumb([])
              }}
              className={cn(
                "w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm transition-all",
                section === key
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-muted hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <Icon size={14} className="shrink-0" />
              {label}
            </button>
          ))}
        </div>

        {/* Klasör ağacı */}
        <div className="flex-1 overflow-hidden">
          <FolderTree
            branchId={branchId}
            currentFolderId={currentFolderId}
            onFolderSelect={(id) => {
              setCurrentFolderId(id)
              setSection("all")
              if (!id) setBreadcrumb([])
            }}
            onRefresh={refresh}
          />
        </div>

        {/* Disk kullanımı */}
        <DiskUsageBar branchId={branchId} refreshTrigger={refreshTrigger} />
      </aside>

      {/* ── Ana İçerik ── */}
      <main className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Üst çubuk */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0 bg-card">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1 flex-1 min-w-0 overflow-hidden">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-1 text-muted-foreground hover:text-foreground mr-1 rounded-lg hover:bg-muted shrink-0 flex items-center justify-center"
              title="Klasör Ağacı"
            >
              <span className="material-symbols-outlined text-[20px]">menu</span>
            </button>
            <button
              onClick={() => { setSection("all"); setCurrentFolderId(undefined); setBreadcrumb([]) }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0 flex items-center gap-1"
            >
              <Library size={14} />
              <span className="hidden sm:inline">Kütüphane</span>
            </button>

            {section !== "all" && (
              <>
                <ChevronRight size={12} className="text-muted-foreground shrink-0" />
                <span className="text-sm font-medium text-foreground shrink-0">
                  {SECTION_LABELS[section]}
                </span>
              </>
            )}

            {breadcrumb.map((crumb, idx) => (
              <span key={crumb.id} className="flex items-center gap-1 min-w-0">
                <ChevronRight size={12} className="text-muted-foreground shrink-0" />
                <button
                  onClick={() => handleBreadcrumbNav(idx)}
                  className="text-sm hover:text-primary transition-colors truncate max-w-32"
                >
                  {crumb.name}
                </button>
              </span>
            ))}
          </div>

          {/* Sağ araçlar */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={refresh}
              className="size-8 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground transition-all"
              title="Yenile"
            >
              <RefreshCw size={14} />
            </button>
            <Separator orientation="vertical" className="h-5" />
            <DropZone
              branchId={branchId}
              folderId={currentFolderId}
              onUploadComplete={refresh}
            />
          </div>
        </div>

        {/* Dosya içerik alanı */}
        <div className="flex-1 overflow-hidden">
          <FileGrid
            branchId={branchId}
            folderId={section === "all" ? currentFolderId : undefined}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onFilePreview={(file) => setPreviewFile(file as LibraryFile)}
            onFileConvert={(file) => { setConvertFile(file as LibraryFile); setConvertOpen(true) }}
            onFileShare={(file) => {
              const shareUrl = `${window.location.origin}/api/ajans-kutuphanesi/files/${file.id}/download`
              navigator.clipboard.writeText(shareUrl)
                .then(() => {
                  toast.success("Dosya indirme bağlantısı panoya kopyalandı!")
                })
                .catch(() => {
                  toast.error("Bağlantı kopyalanamadı.")
                })
            }}
            onFolderOpen={handleFolderOpen}
            onSelectionChange={setSelectedFileIds}
            refreshTrigger={refreshTrigger}
          />
        </div>

        <WelcomeAlert className="mx-4 mb-4 shrink-0" />
      </main>

      {/* ── Modaller ── */}
      <FilePreviewModal
        file={previewFile}
        onClose={() => setPreviewFile(null)}
        onConvert={(file) => {
          setPreviewFile(null)
          setConvertFile(file as LibraryFile)
          setConvertOpen(true)
        }}
        onDelete={async (file) => {
          await fetch(`/api/ajans-kutuphanesi/files/${file.id}`, { method: "DELETE" })
          setPreviewFile(null)
          refresh()
        }}
      />

      <ConvertModal
        file={convertFile}
        open={convertOpen}
        onClose={() => { setConvertOpen(false); setConvertFile(null) }}
        onSuccess={handleConvertSuccess}
      />

      {/* ── Mobil Sol Panel (Drawer) ── */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setIsMobileSidebarOpen(false)}>
          <aside className="w-64 bg-card h-full flex flex-col border-r border-border animate-in slide-in-from-left duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Library size={16} className="text-primary" />
                <span className="text-sm font-bold text-foreground">Kütüphane</span>
              </div>
              <button onClick={() => setIsMobileSidebarOpen(false)} className="text-muted-foreground hover:text-foreground">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="px-3 py-2 space-y-0.5 border-b border-border">
              {(
                [
                  { key: "all", icon: Home, label: "Tüm Dosyalar" },
                  { key: "recent", icon: Clock, label: "Son Kullanılanlar" },
                  { key: "starred", icon: Star, label: "Yıldızlılar" },
                  { key: "trash", icon: Trash2, label: "Çöp Kutusu" },
                ] as { key: ViewSection; icon: any; label: string }[]
              ).map(({ key, icon: Icon, label }) => (
                <button
                  key={key}
                  onClick={() => {
                    setSection(key)
                    setCurrentFolderId(undefined)
                    setBreadcrumb([])
                    setIsMobileSidebarOpen(false)
                  }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm transition-all text-left",
                    section === key
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "text-sidebar-muted hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                >
                  <Icon size={14} className="shrink-0" />
                  {label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-hidden">
              <FolderTree
                branchId={branchId}
                currentFolderId={currentFolderId}
                onFolderSelect={(id) => {
                  setCurrentFolderId(id)
                  setSection("all")
                  if (!id) setBreadcrumb([])
                  setIsMobileSidebarOpen(false)
                }}
                onRefresh={refresh}
              />
            </div>

            <DiskUsageBar branchId={branchId} refreshTrigger={refreshTrigger} />
          </aside>
        </div>
      )}
    </div>
  )
}
