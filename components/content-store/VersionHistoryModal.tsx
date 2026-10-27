"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2, Download, History, RotateCcw, MessageSquare, Calendar, User } from "lucide-react"
import { toast } from "sonner"

interface Version {
  id: string
  versionNumber: number
  url: string
  fileHash: string
  fileSize: number
  uploadedBy: {
    fullName: string
  }
  changeNote?: string
  createdAt: string
}

interface VersionHistoryModalProps {
  open: boolean
  onClose: () => void
  contentId: string
  contentName: string
  canApproveOrDelete: boolean
  onSuccess: () => void
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function VersionHistoryModal({
  open,
  onClose,
  contentId,
  contentName,
  canApproveOrDelete,
  onSuccess
}: VersionHistoryModalProps) {
  const [loading, setLoading] = useState(true)
  const [versions, setVersions] = useState<Version[]>([])
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  const fetchVersions = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/content-store/versions?contentStoreId=${contentId}`)
      if (!res.ok) throw new Error("Versiyon geçmişi çekilemedi")
      const data = await res.json()
      setVersions(data.versions || [])
    } catch (err: any) {
      toast.error(err.message || "Versiyonlar yüklenirken hata oluştu")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open && contentId) {
      fetchVersions()
    }
  }, [open, contentId])

  const handleRollback = async (version: Version) => {
    if (!confirm(`v${version.versionNumber} sürümünü güncel sürüm yapmak istediğinize emin misiniz?`)) return

    setActionLoadingId(version.id)
    try {
      const res = await fetch("/api/content-store/versions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentStoreId: contentId,
          versionId: version.id
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Geri döndürme başarısız")

      toast.success(data.message || "Versiyon başarıyla geri döndürüldü.")
      onSuccess()
      onClose()
    } catch (err: any) {
      toast.error(err.message || "İşlem sırasında hata oluştu")
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleDownload = (version: Version) => {
    const url = `/api/content-store/download/${contentId}?versionId=${version.id}`
    const link = document.createElement("a")
    link.href = url
    link.download = `${contentName}_v${version.versionNumber}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success("Eski versiyon indirilmesi başlatıldı.")
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-xl bg-background border border-border rounded-2xl shadow-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <History className="text-primary size-5" />
            <DialogTitle className="text-lg font-bold">Versiyon Geçmişi</DialogTitle>
          </div>
          <DialogDescription className="truncate">
            {contentName} içeriğine ait geçmiş sürümler.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 max-h-[50vh] overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
              <Loader2 className="animate-spin text-primary size-8" />
              <span className="text-xs">Versiyonlar yükleniyor...</span>
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Bu içeriğe ait eski bir versiyon bulunamadı. Güncel sürüm aktif.
            </div>
          ) : (
            <div className="space-y-3">
              {versions.map((version) => (
                <div
                  key={version.id}
                  className="flex flex-col p-3 rounded-lg border border-border bg-muted/20 gap-2 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                      v{version.versionNumber}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatBytes(version.fileSize)}
                    </span>
                  </div>

                  {version.changeNote && (
                    <div className="flex items-start gap-1.5 text-xs text-foreground bg-card p-2 rounded border border-border">
                      <MessageSquare className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
                      <span className="italic">{version.changeNote}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <User className="size-3" />
                      {version.uploadedBy.fullName}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="size-3" />
                      {new Date(version.createdAt).toLocaleDateString("tr-TR", {
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </span>
                  </div>

                  <div className="flex gap-2 justify-end mt-2 pt-2 border-t border-border/50">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownload(version)}
                      className="h-8 text-xs gap-1.5"
                    >
                      <Download className="size-3.5" />
                      İndir
                    </Button>

                    {canApproveOrDelete && (
                      <Button
                        size="sm"
                        onClick={() => handleRollback(version)}
                        disabled={actionLoadingId !== null}
                        className="h-8 text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
                      >
                        {actionLoadingId === version.id ? (
                          <Loader2 className="animate-spin size-3.5" />
                        ) : (
                          <RotateCcw className="size-3.5" />
                        )}
                        Sürümü Geri Getir (v{version.versionNumber})
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={onClose}>
            Kapat
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
