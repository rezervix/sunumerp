"use client"

import { useState, useEffect } from "react"
import { MoreVertical, Download, Trash2, Video as VideoIcon, File as FileIcon, ExternalLink, CheckSquare, Square, Clock, XCircle, RefreshCw, History, CheckCircle, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { VersionHistoryModal } from "@/components/content-store/VersionHistoryModal"
import { UpdateFileModal } from "@/components/content-store/UpdateFileModal"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface Niche {
  id: string
  name: string
}

export interface ContentItem {
  id: string
  originalName: string
  mimeType: string
  sizeBytes: number
  type: "IMAGE" | "VIDEO" | "OTHER" | string
  niche: Niche
  uploadedBy: { id: string; fullName: string }
  approvedBy?: { id: string; fullName: string } | null
  createdAt: string
  status: string
  rejectionReason?: string | null
  currentVersionNumber?: number
  viewCount?: number
  downloadCount?: number
  duplicateOfContentId?: string | null
}

interface ContentCardProps {
  item: ContentItem
  onDelete: (id: string) => void
  onAction: (id: string, action: string, extra?: any) => void
  canDelete?: boolean
  canUpload?: boolean
  canApprove?: boolean
  canBulkActions?: boolean
  currentUserId?: string
  isSelected?: boolean
  onToggleSelect?: (id: string) => void
  onStatusChange?: () => void
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function ContentCard({
  item,
  onDelete,
  onAction,
  canDelete = false,
  canUpload = false,
  canApprove = false,
  canBulkActions = false,
  currentUserId,
  isSelected = false,
  onToggleSelect,
  onStatusChange
}: ContentCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [showVersionModal, setShowVersionModal] = useState(false)
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState("")

  const downloadUrl = `/api/content-store/download/${item.id}`
  const previewUrl = `/api/content-store/download/${item.id}?inline=true`

  useEffect(() => {
    const logView = async () => {
      try {
        await fetch("/api/content-store/analytics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contentStoreId: item.id,
            eventType: "view"
          })
        })
      } catch (e) {
        console.error("View logging failed:", e)
      }
    }
    logView()
  }, [item.id])

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation()
    const link = document.createElement("a")
    link.href = downloadUrl
    link.download = item.originalName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success("İndirme işlemi başlatıldı.")
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowMenu(false)
    if (confirm("Bu icerigi silmek istediginize emin misiniz? Bu islem geri alinamaz.")) {
      onDelete(item.id)
    }
  }

  const handleApprove = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowMenu(false)
    onAction(item.id, "approve")
  }

  const handleRejectSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!rejectReason.trim()) {
      toast.error("Red gerekcesi zorunludur")
      return
    }
    onAction(item.id, "reject", { rejectionReason: rejectReason.trim() })
    setShowRejectModal(false)
    setRejectReason("")
  }

  const handleResubmit = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowMenu(false)
    onAction(item.id, "resubmit")
  }

  const isOwner = item.uploadedBy.id === currentUserId
  const isRejectedAndOwner = item.status === "rejected" && isOwner
  const versionNum = item.currentVersionNumber || 1

  return (
    <>
      <div
        className={`group relative flex flex-col rounded-xl border bg-card text-card-foreground shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md overflow-hidden ${
          isSelected ? "border-primary ring-2 ring-primary/20" : "border-border"
        }`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false)
          setShowMenu(false)
        }}
      >
        {/* Selection Checkbox */}
        {canBulkActions && onToggleSelect && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleSelect(item.id)
            }}
            className="absolute top-2 left-2 z-30 p-0.5 rounded text-white drop-shadow animate-in fade-in duration-200"
          >
            {isSelected ? (
              <CheckSquare size={20} className="text-primary fill-primary" />
            ) : (
              <Square size={20} className="text-white/80 drop-shadow" />
            )}
          </button>
        )}

        {/* Media Preview Container */}
        <div className="relative aspect-video w-full bg-muted flex items-center justify-center overflow-hidden">
          {item.type === "IMAGE" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt={item.originalName}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : item.type === "VIDEO" ? (
            isHovered ? (
              <video
                src={previewUrl}
                className="h-full w-full object-cover"
                muted
                autoPlay
                loop
                playsInline
              />
            ) : (
              <div className="relative h-full w-full flex items-center justify-center bg-black/80">
                <VideoIcon size={32} className="text-white/60" />
                <span className="absolute bottom-2 right-2 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded font-mono">
                  VIDEO
                </span>
              </div>
            )
          ) : (
            <div className="flex flex-col items-center gap-2">
              <FileIcon size={32} className="text-muted-foreground" />
              <span className="text-xs font-mono text-muted-foreground truncate max-w-40 px-2">
                {item.mimeType}
              </span>
            </div>
          )}

          {/* Niche Badge */}
          <span className="absolute top-2 right-2 inline-flex items-center rounded-full bg-black/60 backdrop-blur-xs px-2.5 py-0.5 text-xs font-semibold text-white border border-white/10">
            {item.niche.name}
          </span>

          {/* Status Badges */}
          {item.status !== "approved" && (
            <div className="absolute top-2 left-2 ml-10 inline-flex gap-1 z-10">
              {item.status === "pending_approval" && (
                <span className="inline-flex items-center gap-1 rounded bg-amber-500/90 text-white px-1.5 py-0.5 text-[10px] font-bold uppercase shadow">
                  <Clock size={10} />
                  Bekliyor
                </span>
              )}
              {item.status === "rejected" && (
                <span
                  className="inline-flex items-center gap-1 rounded bg-red-500/90 text-white px-1.5 py-0.5 text-[10px] font-bold uppercase shadow cursor-help"
                  title={`Red Nedeni: ${item.rejectionReason || "Belirtilmemiş"}`}
                >
                  <XCircle size={10} />
                  Reddedildi
                </span>
              )}
            </div>
          )}

          {/* Duplicate Indicator */}
          {item.duplicateOfContentId && (
            <span
              className="absolute bottom-2 left-2 z-10 size-6 bg-amber-500 text-white border border-white/20 rounded-full flex items-center justify-center shadow"
              title="Mükerrer dosya (Yeni kayıt olarak yüklendi)"
            >
              <AlertTriangle size={12} />
            </span>
          )}

          {/* Version Indicator */}
          {versionNum > 1 && (
            <span className="absolute bottom-2 right-2 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded font-mono">
              v{versionNum}
            </span>
          )}

          {/* Fast Hover Action Overlay */}
          {isHovered && (
            <div className="absolute inset-0 bg-black/45 backdrop-blur-xs flex items-center justify-center gap-2 animate-in fade-in duration-200">
              <button
                onClick={handleDownload}
                className="bg-white hover:bg-neutral-100 text-neutral-900 rounded-lg p-2.5 shadow-lg flex items-center gap-1.5 text-sm font-semibold transition-all hover:scale-105"
              >
                <Download size={15} />
                İndir
              </button>
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-black/60 hover:bg-black/80 text-white border border-white/20 rounded-lg p-2.5 shadow-lg flex items-center justify-center transition-all hover:scale-105"
                title="Yeni Sekmede Aç"
              >
                <ExternalLink size={15} />
              </a>
            </div>
          )}
        </div>

        {/* Card Info Section */}
        <div className="flex flex-col flex-1 p-3">
          {item.status === "rejected" && item.rejectionReason && (
            <div className="mb-2 p-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg text-xs text-red-700 dark:text-red-300 animate-in slide-in-from-top-1">
              <span className="font-semibold">Red Gerekçesi:</span> {item.rejectionReason}
              {isRejectedAndOwner && (
                <button
                  onClick={handleResubmit}
                  className="ml-2 underline font-semibold text-red-600 hover:text-red-700 block mt-1"
                >
                  Yeniden Onaya Gönder
                </button>
              )}
            </div>
          )}

          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h5 className="font-bold text-sm text-foreground truncate" title={item.originalName}>
                {item.originalName}
              </h5>
              <p className="text-[11px] text-muted-foreground mt-0.5 flex flex-wrap items-center gap-1">
                <span>{formatBytes(item.sizeBytes)}</span>
                <span>•</span>
                <span className="truncate">Yükleyen: {item.uploadedBy.fullName}</span>
              </p>
              {((item.viewCount || 0) + (item.downloadCount || 0)) > 0 && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  {item.viewCount || 0} görüntülenme · {item.downloadCount || 0} indirme
                </p>
              )}
            </div>

            {/* Three-Dot Menu */}
            <div className="relative shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowMenu(!showMenu)
                }}
                className="size-8 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <MoreVertical size={16} />
              </button>

              {showMenu && (
                <div className="absolute right-0 bottom-full mb-1 z-20 w-44 rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in slide-in-from-bottom-1 duration-150">
                  {/* Approval Actions */}
                  {canApprove && item.status === "pending_approval" && (
                    <>
                      <button
                        onClick={handleApprove}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs hover:bg-emerald-500/10 text-emerald-600 text-left transition-colors font-semibold"
                      >
                        <CheckCircle size={13} />
                        Onayla
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setShowRejectModal(true)
                          setShowMenu(false)
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs hover:bg-red-500/10 text-red-600 text-left transition-colors font-semibold"
                      >
                        <XCircle size={13} />
                        Reddet
                      </button>
                      <div className="my-1 border-t border-border" />
                    </>
                  )}

                  {/* Update file version */}
                  {canUpload && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowUpdateModal(true)
                        setShowMenu(false)
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs hover:bg-muted text-left transition-colors"
                    >
                      <RefreshCw size={13} />
                      Dosyayı Güncelle
                    </button>
                  )}

                  {/* Versions history */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowVersionModal(true)
                      setShowMenu(false)
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs hover:bg-muted text-left transition-colors"
                  >
                    <History size={13} />
                    Versiyon Geçmişi ({versionNum})
                  </button>

                  <div className="my-1 border-t border-border" />

                  <button
                    onClick={handleDownload}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs hover:bg-muted text-left transition-colors"
                  >
                    <Download size={13} />
                    İndir
                  </button>

                  {canDelete && (
                    <button
                      onClick={handleDeleteClick}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs hover:bg-red-500/10 text-red-500 text-left transition-colors font-medium"
                    >
                      <Trash2 size={13} />
                      Sil
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
          <DialogContent className="max-w-md bg-background border border-border rounded-2xl shadow-xl">
            <DialogHeader>
              <DialogTitle className="text-red-500 font-bold">İçeriği Reddet</DialogTitle>
              <DialogDescription>
                Bu içeriği reddetmek için gerekçe belirtmeniz zorunludur.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleRejectSubmit} className="space-y-4 py-2">
              <textarea
                placeholder="Örn: Görsel kalitesi yetersiz, niş ile uyuşmuyor..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-card focus:outline-none focus:ring-1 focus:ring-red-500 min-h-[100px] resize-none"
                required
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowRejectModal(false)}>
                  İptal
                </Button>
                <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white">
                  Reddet
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Version History Modal */}
      {showVersionModal && (
        <VersionHistoryModal
          open={showVersionModal}
          onClose={() => setShowVersionModal(false)}
          contentId={item.id}
          contentName={item.originalName}
          canApproveOrDelete={canApprove || canDelete}
          onSuccess={() => onStatusChange?.()}
        />
      )}

      {/* Update File Modal */}
      {showUpdateModal && (
        <UpdateFileModal
          open={showUpdateModal}
          onClose={() => setShowUpdateModal(false)}
          contentId={item.id}
          contentName={item.originalName}
          onSuccess={() => onStatusChange?.()}
        />
      )}
    </>
  )
}
