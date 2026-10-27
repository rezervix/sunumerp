"use client"

import { useState, useEffect } from "react"
import {
  FolderOpen, Folder, ChevronRight, ChevronDown,
  Plus, Star, Trash2, MoreHorizontal, FolderPlus
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface LibraryFolder {
  id: string
  name: string
  parentFolderId: string | null
  isStarred: boolean
  _count: { files: number; childFolders: number }
}

interface FolderTreeProps {
  branchId: string
  currentFolderId?: string
  onFolderSelect: (folderId?: string) => void
  onRefresh?: () => void
}

interface FolderNodeProps {
  folder: LibraryFolder
  allFolders: LibraryFolder[]
  depth: number
  currentFolderId?: string
  onSelect: (id: string) => void
  onRename: (folder: LibraryFolder) => void
  onDelete: (folder: LibraryFolder) => void
  onStar: (folder: LibraryFolder) => void
  onNewFolder: (parentId: string) => void
}

function FolderNode({
  folder, allFolders, depth, currentFolderId,
  onSelect, onRename, onDelete, onStar, onNewFolder
}: FolderNodeProps) {
  const [expanded, setExpanded] = useState(false)
  const children = allFolders.filter((f) => f.parentFolderId === folder.id)
  const isActive = currentFolderId === folder.id
  const hasChildren = children.length > 0 || folder._count.childFolders > 0

  return (
    <div>
      <div
        className={cn(
          "group flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer transition-all text-sm select-none",
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
            : "hover:bg-sidebar-accent/50 text-sidebar-muted hover:text-sidebar-foreground"
        )}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={() => onSelect(folder.id)}
      >
        {/* Genişlet/daralt */}
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded((p) => !p) }}
          className="shrink-0 size-4 flex items-center justify-center text-muted-foreground hover:text-foreground"
        >
          {hasChildren
            ? expanded
              ? <ChevronDown size={12} />
              : <ChevronRight size={12} />
            : <span className="size-3" />
          }
        </button>

        {/* İkon */}
        {isActive || expanded
          ? <FolderOpen size={15} className="shrink-0 text-primary" />
          : <Folder size={15} className="shrink-0" />
        }

        {/* İsim */}
        <span className="flex-1 truncate text-xs">{folder.name}</span>

        {/* Yıldız */}
        {folder.isStarred && (
          <Star size={10} className="shrink-0 text-yellow-500 fill-yellow-500" />
        )}

        {/* Menü */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className="shrink-0 size-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted text-muted-foreground"
            >
              <MoreHorizontal size={12} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => onNewFolder(folder.id)}>
              <FolderPlus size={13} className="mr-2" /> Alt Klasör
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onRename(folder)}>
              Yeniden Adlandır
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onStar(folder)}>
              {folder.isStarred ? "Yıldızı Kaldır" : "Yıldızla"}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(folder)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 size={13} className="mr-2" /> Sil
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Alt klasörler */}
      {expanded && children.length > 0 && (
        <div>
          {children.map((child) => (
            <FolderNode
              key={child.id}
              folder={child}
              allFolders={allFolders}
              depth={depth + 1}
              currentFolderId={currentFolderId}
              onSelect={onSelect}
              onRename={onRename}
              onDelete={onDelete}
              onStar={onStar}
              onNewFolder={onNewFolder}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function FolderTree({ branchId, currentFolderId, onFolderSelect, onRefresh }: FolderTreeProps) {
  const [folders, setFolders] = useState<LibraryFolder[]>([])
  const [loading, setLoading] = useState(true)
  const [newFolderOpen, setNewFolderOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [newFolderParentId, setNewFolderParentId] = useState<string | undefined>()
  const [renameOpen, setRenameOpen] = useState(false)
  const [renameTarget, setRenameTarget] = useState<LibraryFolder | null>(null)
  const [renameName, setRenameName] = useState("")

  const fetchFolders = async () => {
    try {
      const res = await fetch(`/api/ajans-kutuphanesi/folders?branchId=${branchId}`)
      if (res.ok) {
        const data = await res.json()
        setFolders(data)
      }
    } catch (err) {
      console.error("Klasörler yüklenemedi:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchFolders() }, [branchId])

  const handleNewFolder = async () => {
    if (!newFolderName.trim()) return
    try {
      const res = await fetch("/api/ajans-kutuphanesi/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newFolderName.trim(), branchId, parentFolderId: newFolderParentId }),
      })
      if (res.ok) {
        setNewFolderName("")
        setNewFolderOpen(false)
        await fetchFolders()
        onRefresh?.()
      }
    } catch (err) { console.error(err) }
  }

  const handleRename = async () => {
    if (!renameTarget || !renameName.trim()) return
    try {
      await fetch(`/api/ajans-kutuphanesi/folders/${renameTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: renameName.trim() }),
      })
      setRenameOpen(false)
      setRenameTarget(null)
      await fetchFolders()
      onRefresh?.()
    } catch (err) { console.error(err) }
  }

  const handleDelete = async (folder: LibraryFolder) => {
    if (!confirm(`"${folder.name}" klasörünü çöp kutusuna taşımak istediğinizden emin misiniz?`)) return
    try {
      await fetch(`/api/ajans-kutuphanesi/folders/${folder.id}`, { method: "DELETE" })
      if (currentFolderId === folder.id) onFolderSelect(undefined)
      await fetchFolders()
      onRefresh?.()
    } catch (err) { console.error(err) }
  }

  const handleStar = async (folder: LibraryFolder) => {
    try {
      await fetch(`/api/ajans-kutuphanesi/folders/${folder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isStarred: !folder.isStarred }),
      })
      await fetchFolders()
    } catch (err) { console.error(err) }
  }

  const rootFolders = folders.filter((f) => !f.parentFolderId)

  return (
    <div className="flex flex-col h-full">
      {/* Başlık */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-label text-muted-foreground">Klasörler</span>
        <Button
          id="library-new-folder-btn"
          variant="ghost"
          size="icon"
          className="size-6"
          onClick={() => { setNewFolderParentId(undefined); setNewFolderOpen(true) }}
          title="Yeni Klasör"
        >
          <Plus size={14} />
        </Button>
      </div>

      {/* Kök: Tüm Dosyalar */}
      <div className="px-2 py-1">
        <button
          onClick={() => onFolderSelect(undefined)}
          className={cn(
            "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all",
            !currentFolderId
              ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
              : "text-sidebar-muted hover:bg-sidebar-accent/50"
          )}
        >
          <FolderOpen size={14} className="shrink-0" />
          <span>Tüm Dosyalar</span>
        </button>
      </div>

      {/* Klasör ağacı */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
        {loading ? (
          <div className="px-3 py-4 text-center text-caption">Yükleniyor...</div>
        ) : rootFolders.length === 0 ? (
          <div className="px-3 py-4 text-center text-caption">Henüz klasör yok</div>
        ) : (
          rootFolders.map((folder) => (
            <FolderNode
              key={folder.id}
              folder={folder}
              allFolders={folders}
              depth={0}
              currentFolderId={currentFolderId}
              onSelect={onFolderSelect}
              onRename={(f) => { setRenameTarget(f); setRenameName(f.name); setRenameOpen(true) }}
              onDelete={handleDelete}
              onStar={handleStar}
              onNewFolder={(pid) => { setNewFolderParentId(pid); setNewFolderOpen(true) }}
            />
          ))
        )}
      </div>

      {/* Yeni Klasör Dialog */}
      <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Yeni Klasör</DialogTitle>
          </DialogHeader>
          <Input
            id="new-folder-name"
            placeholder="Klasör adı"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleNewFolder()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewFolderOpen(false)}>İptal</Button>
            <Button onClick={handleNewFolder} disabled={!newFolderName.trim()}>Oluştur</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Yeniden Adlandır Dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Yeniden Adlandır</DialogTitle>
          </DialogHeader>
          <Input
            id="rename-folder-name"
            placeholder="Yeni isim"
            value={renameName}
            onChange={(e) => setRenameName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleRename()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>İptal</Button>
            <Button onClick={handleRename} disabled={!renameName.trim()}>Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
