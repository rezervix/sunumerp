"use client"

import { useState, useEffect } from "react"
import {
  LayoutGrid, List, Search, Filter, Star, Trash2, Download,
  RefreshCw, CheckSquare, Square, MoreHorizontal, Eye,
  FolderOpen, File, Image, Video, Music, FileText, Archive,
  Copy, Move, SortAsc, SortDesc, Grid2X2, X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

interface LibraryFile {
  id: string
  originalName: string
  mimeType: string
  sizeBytes: number
  isStarred: boolean
  isTrashed: boolean
  createdAt: string
  uploadedBy?: { fullName: string }
  _count?: { fileVersions: number; derivedFiles: number }
  contentCalendar?: { id: string; title: string }
}

interface LibraryFolder {
  id: string
  name: string
  isStarred: boolean
  _count: { files: number; childFolders: number }
}

interface FileGridProps {
  branchId: string
  folderId?: string
  viewMode: "grid" | "list"
  onViewModeChange: (mode: "grid" | "list") => void
  onFilePreview: (file: LibraryFile) => void
  onFileConvert: (file: LibraryFile) => void
  onFileShare: (file: LibraryFile) => void
  onFolderOpen: (folderId: string) => void
  onSelectionChange: (fileIds: string[]) => void
  refreshTrigger?: number
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("tr-TR", {
    day: "2-digit", month: "short", year: "numeric"
  })
}

function getFileIcon(mimeType: string, size = 24) {
  const cls = `shrink-0`
  if (mimeType.startsWith("image/")) return <Image size={size} className={cn(cls, "text-blue-400")} />
  if (mimeType.startsWith("video/")) return <Video size={size} className={cn(cls, "text-purple-400")} />
  if (mimeType.startsWith("audio/")) return <Music size={size} className={cn(cls, "text-pink-400")} />
  if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("7z"))
    return <Archive size={size} className={cn(cls, "text-yellow-400")} />
  if (mimeType.includes("pdf") || mimeType.includes("word") || mimeType.includes("sheet") || mimeType.includes("presentation"))
    return <FileText size={size} className={cn(cls, "text-red-400")} />
  return <File size={size} className={cn(cls, "text-muted-foreground")} />
}

function getFileColor(mimeType: string) {
  if (mimeType.startsWith("image/")) return "from-blue-500/20 to-cyan-500/10 border-blue-500/20"
  if (mimeType.startsWith("video/")) return "from-purple-500/20 to-violet-500/10 border-purple-500/20"
  if (mimeType.startsWith("audio/")) return "from-pink-500/20 to-rose-500/10 border-pink-500/20"
  if (mimeType.includes("zip") || mimeType.includes("rar")) return "from-yellow-500/20 to-orange-500/10 border-yellow-500/20"
  if (mimeType.includes("pdf") || mimeType.includes("word") || mimeType.includes("sheet"))
    return "from-red-500/20 to-orange-500/10 border-red-500/20"
  return "from-muted/50 to-muted/30 border-border"
}

const MIME_CATEGORIES = [
  { label: "Tümü", value: "" },
  { label: "Görseller", value: "image" },
  { label: "Videolar", value: "video" },
  { label: "Sesler", value: "audio" },
  { label: "Belgeler", value: "document" },
  { label: "Arşivler", value: "archive" },
]

const SORT_OPTIONS = [
  { label: "Yükleme Tarihi", value: "createdAt" },
  { label: "Ad", value: "originalName" },
  { label: "Boyut", value: "sizeBytes" },
]

export function FileGrid({
  branchId, folderId, viewMode, onViewModeChange,
  onFilePreview, onFileConvert, onFileShare, onFolderOpen,
  onSelectionChange, refreshTrigger
}: FileGridProps) {
  const [files, setFiles] = useState<LibraryFile[]>([])
  const [folders, setFolders] = useState<LibraryFolder[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [mimeCategory, setMimeCategory] = useState("")
  const [sortBy, setSortBy] = useState("createdAt")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        branchId,
        page: page.toString(),
        limit: "48",
        sortBy,
        sortDir,
        ...(folderId ? { folderId } : {}),
        ...(search ? { search } : {}),
        ...(mimeCategory ? { mimeCategory } : {}),
      })
      const res = await fetch(`/api/ajans-kutuphanesi/files?${params}`)
      if (res.ok) {
        const data = await res.json()
        setFiles(data.files)
        setFolders(data.folders)
        setTotalPages(data.totalPages)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setPage(1)
    setSelectedIds(new Set())
  }, [branchId, folderId, search, mimeCategory, sortBy, sortDir, refreshTrigger])

  useEffect(() => { fetchData() }, [branchId, folderId, search, mimeCategory, sortBy, sortDir, page, refreshTrigger])

  useEffect(() => {
    onSelectionChange(Array.from(selectedIds))
  }, [selectedIds])

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const selectAll = () => {
    if (selectedIds.size === files.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(files.map((f) => f.id)))
    }
  }

  const handleStar = async (file: LibraryFile) => {
    await fetch(`/api/ajans-kutuphanesi/files/${file.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isStarred: !file.isStarred }),
    })
    fetchData()
  }

  const handleDelete = async (file: LibraryFile) => {
    if (!confirm(`"${file.originalName}" çöp kutusuna taşınacak. Devam edilsin mi?`)) return
    await fetch(`/api/ajans-kutuphanesi/files/${file.id}`, { method: "DELETE" })
    fetchData()
  }

  const handleDownload = (file: LibraryFile) => {
    const a = document.createElement("a")
    a.href = `/api/ajans-kutuphanesi/files/${file.id}/download`
    a.download = file.originalName
    a.click()
  }

  const renderFileCard = (file: LibraryFile) => {
    const isSelected = selectedIds.has(file.id)
    const isImage = file.mimeType.startsWith("image/")

    if (viewMode === "grid") {
      return (
        <div
          key={file.id}
          className={cn(
            "group relative flex flex-col bg-card border rounded-xl overflow-hidden transition-all duration-200 cursor-pointer",
            "hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5",
            isSelected && "ring-2 ring-primary border-primary"
          )}
          onDoubleClick={() => onFilePreview(file)}
        >
          {/* Seçim checkbox */}
          <div
            className="absolute top-2 left-2 z-10"
            onClick={(e) => { e.stopPropagation(); toggleSelect(file.id) }}
          >
            <div className={cn(
              "size-5 rounded flex items-center justify-center transition-opacity",
              isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}>
              <Checkbox
                checked={isSelected}
                className="bg-card border-border shadow-sm"
              />
            </div>
          </div>

          {/* Yıldız */}
          <button
            className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => { e.stopPropagation(); handleStar(file) }}
          >
            <Star
              size={14}
              className={cn(
                "transition-colors",
                file.isStarred ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground"
              )}
            />
          </button>

          {/* Önizleme alanı */}
          <div
            className={cn(
              "h-36 flex items-center justify-center bg-gradient-to-br border-b",
              getFileColor(file.mimeType)
            )}
            onClick={() => onFilePreview(file)}
          >
            {isImage ? (
              <img
                src={`/api/ajans-kutuphanesi/files/${file.id}/preview`}
                alt={file.originalName}
                className="h-full w-full object-cover"
                loading="lazy"
                onError={(e) => {
                  const t = e.target as HTMLImageElement
                  t.style.display = "none"
                  t.parentElement!.appendChild(
                    Object.assign(document.createElement("div"), {
                      className: "flex items-center justify-center w-full h-full",
                    })
                  )
                }}
              />
            ) : (
              getFileIcon(file.mimeType, 36)
            )}
          </div>

          {/* Bilgi */}
          <div className="p-2.5" onClick={() => onFilePreview(file)}>
            <p className="text-sm font-medium truncate" title={file.originalName}>
              {file.originalName}
            </p>
            {file.contentCalendar && (
              <span className="mt-1 text-[9px] bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 font-semibold border border-sky-100 dark:border-sky-900/35 rounded px-1.5 py-0.5 inline-block truncate max-w-full text-left" title={file.contentCalendar.title}>
                📅 {file.contentCalendar.title}
              </span>
            )}
            <div className="flex items-center justify-between mt-1">
              <span className="text-caption">{formatBytes(file.sizeBytes)}</span>
              <span className="text-caption">{formatDate(file.createdAt)}</span>
            </div>
          </div>

          {/* Menü */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="absolute bottom-2 right-2 size-6 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted text-muted-foreground"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal size={13} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => onFilePreview(file)}>
                <Eye size={13} className="mr-2" /> Önizle
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDownload(file)}>
                <Download size={13} className="mr-2" /> İndir
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onFileConvert(file)}>
                <RefreshCw size={13} className="mr-2" /> Dönüştür
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onFileShare(file)}>
                Paylaş
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleStar(file)}>
                <Star size={13} className="mr-2" />
                {file.isStarred ? "Yıldızı Kaldır" : "Yıldızla"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleDelete(file)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 size={13} className="mr-2" /> Çöpe Taşı
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )
    }

    // Liste görünümü
    return (
      <div
        key={file.id}
        className={cn(
          "group flex items-center gap-3 px-4 py-2.5 border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer",
          isSelected && "bg-primary/5"
        )}
      >
        <div onClick={(e) => { e.stopPropagation(); toggleSelect(file.id) }}>
          <Checkbox checked={isSelected} className={cn(!isSelected && "opacity-0 group-hover:opacity-100")} />
        </div>

        <div
          className="size-8 rounded-lg flex items-center justify-center bg-muted shrink-0"
          onClick={() => onFilePreview(file)}
        >
          {file.mimeType.startsWith("image/") ? (
            <img
              src={`/api/ajans-kutuphanesi/files/${file.id}/preview`}
              className="size-8 rounded-lg object-cover"
              loading="lazy"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
              alt=""
            />
          ) : (
            getFileIcon(file.mimeType, 16)
          )}
        </div>

        <div className="flex-1 min-w-0" onClick={() => onFilePreview(file)}>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium truncate">{file.originalName}</p>
            {file.contentCalendar && (
              <span className="text-[9px] bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 font-semibold border border-sky-100 dark:border-sky-900/35 rounded px-1 py-0">
                📅 {file.contentCalendar.title}
              </span>
            )}
          </div>
          <p className="text-caption">{file.uploadedBy?.fullName}</p>
        </div>

        <div className="hidden md:flex items-center gap-6 shrink-0 text-sm text-muted-foreground">
          <span className="w-20 text-right">{formatBytes(file.sizeBytes)}</span>
          <span className="w-28 text-right">{formatDate(file.createdAt)}</span>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onFilePreview(file)}
            className="size-7 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground"
          >
            <Eye size={14} />
          </button>
          <button
            onClick={() => handleDownload(file)}
            className="size-7 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground"
          >
            <Download size={14} />
          </button>
          <button
            onClick={() => handleStar(file)}
            className="size-7 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground"
          >
            <Star size={14} className={cn(file.isStarred && "text-yellow-400 fill-yellow-400")} />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="size-7 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground">
                <MoreHorizontal size={14} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => onFileConvert(file)}>
                <RefreshCw size={13} className="mr-2" /> Dönüştür
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onFileShare(file)}>Paylaş</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleDelete(file)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 size={13} className="mr-2" /> Çöpe Taşı
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    )
  }

  const renderFolder = (folder: LibraryFolder) => {
    if (viewMode === "grid") {
      return (
        <div
          key={folder.id}
          className="group relative flex flex-col bg-card border border-border rounded-xl p-3 cursor-pointer transition-all hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5"
          onDoubleClick={() => onFolderOpen(folder.id)}
        >
          <div className="flex items-center gap-2.5 mb-2">
            <div className="size-9 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
              <FolderOpen size={20} className="text-amber-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{folder.name}</p>
              <p className="text-caption">
                {folder._count.files} dosya · {folder._count.childFolders} klasör
              </p>
            </div>
          </div>
          {folder.isStarred && (
            <Star size={10} className="absolute top-2 right-2 text-yellow-400 fill-yellow-400" />
          )}
        </div>
      )
    }
    return (
      <div
        key={folder.id}
        className="flex items-center gap-3 px-4 py-2.5 border-b border-border hover:bg-muted/30 transition-colors cursor-pointer"
        onDoubleClick={() => onFolderOpen(folder.id)}
      >
        <div className="size-8 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
          <FolderOpen size={16} className="text-amber-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{folder.name}</p>
          <p className="text-caption">{folder._count.files} dosya</p>
        </div>
        <span className="text-caption text-muted-foreground">Klasör</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Araç çubuğu */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0 flex-wrap">
        {/* Arama */}
        <div className="flex items-center gap-2 flex-1 min-w-40 bg-muted/50 border border-border rounded-lg px-3 py-1.5">
          <Search size={14} className="text-muted-foreground shrink-0" />
          <input
            className="flex-1 bg-transparent text-sm outline-none placeholder-muted-foreground"
            placeholder="Dosya ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            id="library-search-input"
          />
          {search && (
            <button onClick={() => setSearch("")}>
              <X size={12} className="text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Kategori filtresi */}
        <div className="flex items-center gap-1">
          {MIME_CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setMimeCategory(cat.value)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-medium transition-all",
                mimeCategory === cat.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 ml-auto">
          {/* Sıralama */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 h-8">
                {sortDir === "asc" ? <SortAsc size={13} /> : <SortDesc size={13} />}
                <span className="hidden sm:inline">Sırala</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {SORT_OPTIONS.map((opt) => (
                <DropdownMenuItem
                  key={opt.value}
                  onClick={() => {
                    if (sortBy === opt.value) setSortDir((d) => d === "asc" ? "desc" : "asc")
                    else { setSortBy(opt.value); setSortDir("desc") }
                  }}
                  className={cn(sortBy === opt.value && "font-medium text-primary")}
                >
                  {sortBy === opt.value && (
                    sortDir === "asc" ? <SortAsc size={12} className="mr-2" /> : <SortDesc size={12} className="mr-2" />
                  )}
                  {opt.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Görünüm modu */}
          <div className="flex items-center border border-border rounded-lg overflow-hidden">
            <button
              id="library-grid-view-btn"
              onClick={() => onViewModeChange("grid")}
              className={cn(
                "px-2 py-1.5 transition-colors",
                viewMode === "grid" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"
              )}
            >
              <Grid2X2 size={14} />
            </button>
            <button
              id="library-list-view-btn"
              onClick={() => onViewModeChange("list")}
              className={cn(
                "px-2 py-1.5 transition-colors",
                viewMode === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"
              )}
            >
              <List size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Toplu seçim toolbar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 bg-primary/5 border-b border-primary/20 shrink-0">
          <button onClick={selectAll} className="flex items-center gap-2 text-sm font-medium text-primary">
            <CheckSquare size={14} />
            {selectedIds.size} seçili
          </button>
          <div className="flex items-center gap-1 ml-auto">
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1.5"
              onClick={() => {
                const ids = Array.from(selectedIds)
                // ZIP indirme
                fetch("/api/ajans-kutuphanesi/download-zip", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ fileIds: ids, branchId }),
                }).then(async (r) => {
                  if (r.ok) {
                    const blob = await r.blob()
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement("a")
                    a.href = url
                    a.download = "ajans-kutuphanesi.zip"
                    a.click()
                    URL.revokeObjectURL(url)
                  }
                })
              }}
            >
              <Download size={12} /> ZIP İndir
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={async () => {
                if (!confirm(`${selectedIds.size} dosyayı çöpe taşımak istediğinizden emin misiniz?`)) return
                for (const id of selectedIds) {
                  await fetch(`/api/ajans-kutuphanesi/files/${id}`, { method: "DELETE" })
                }
                setSelectedIds(new Set())
                fetchData()
              }}
            >
              <Trash2 size={12} /> Çöpe Taşı
            </Button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="ml-2 text-muted-foreground hover:text-foreground"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* İçerik */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="flex flex-col items-center gap-3">
              <div className="size-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <p className="text-caption">Yükleniyor...</p>
            </div>
          </div>
        ) : files.length === 0 && folders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4 text-center px-8">
            <div className="size-16 rounded-2xl bg-muted flex items-center justify-center">
              <FolderOpen size={28} className="text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">Bu klasörde dosya yok</p>
              <p className="text-caption mt-1">Dosya yüklemek için "Dosya Yükle" butonuna tıklayın veya sürükleyip bırakın</p>
            </div>
          </div>
        ) : (
          <div className={cn(
            viewMode === "grid"
              ? "p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3"
              : "divide-y divide-border"
          )}>
            {folders.map(renderFolder)}
            {files.map(renderFileCard)}
          </div>
        )}
      </div>

      {/* Sayfalama */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 p-3 border-t border-border shrink-0">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            Önceki
          </Button>
          <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
            Sonraki
          </Button>
        </div>
      )}
    </div>
  )
}
