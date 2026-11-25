"use client"

import React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, User, FileText, RefreshCw, Trash2, Clock, HardDrive } from "lucide-react"

export interface TrashItemData {
  id: string
  entityType: string
  entityId: string
  title: string
  payload: string
  filePaths: string | null
  deletedByUserId: string
  deletedByFullName: string
  deletedAt: string
  expiresAt: string
  status: string
  user?: {
    id: string
    fullName: string
    username: string
    avatarUrl?: string | null
  }
}

interface TrashPreviewModalProps {
  item: TrashItemData | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onRestore: (id: string) => void
  onPurge: (id: string) => void
  loading?: boolean
}

export function TrashPreviewModal({
  item,
  open,
  onOpenChange,
  onRestore,
  onPurge,
  loading = false,
}: TrashPreviewModalProps) {
  if (!item) return null

  let parsedPayload: any = {}
  try {
    parsedPayload = JSON.parse(item.payload)
  } catch (e) {
    parsedPayload = item.payload
  }

  let parsedFiles: string[] = []
  if (item.filePaths) {
    try {
      parsedFiles = JSON.parse(item.filePaths)
    } catch (e) {}
  }

  const deletedDate = new Date(item.deletedAt).toLocaleString("tr-TR")
  const expiresDate = new Date(item.expiresAt).toLocaleDateString("tr-TR")

  // Kalan gün hesabı
  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(item.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6 rounded-[24px] bg-[white] border border-[--line] shadow-2xl text-[var(--text)]">
        <DialogHeader className="space-y-2 border-b border-[--line] pb-4">
          <div className="flex items-center justify-between gap-2">
            <Badge variant="outline" className="text-xs uppercase tracking-wider font-semibold px-2.5 py-0.5 border-[--brand-line] text-[--brand] bg-[--brand]/10">
              {item.entityType}
            </Badge>

            <span className="text-xs text-[var(--text-muted)] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[var(--warn)]" />
              Otomatik Silinmeye: <strong className="text-[var(--warn)]">{daysLeft} Gün</strong>
            </span>
          </div>

          <DialogTitle className="text-lg font-bold text-[var(--text)] truncate">
            {item.title}
          </DialogTitle>
          <DialogDescription className="text-xs text-[var(--text-muted)]">
            Kaydın Geri Dönüşüm Kutusu Snapshot Detayları ve ilişkili bağımlılık verileri.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-1">
          {/* Meta bilgileri */}
          <div className="grid grid-cols-2 gap-3 bg-[--page] p-4 rounded-xl border border-[--line] text-xs">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-[--brand] shrink-0" />
              <span className="text-[var(--text-muted)]">Silen Kullanıcı:</span>
              <span className="font-medium text-[var(--text)] truncate">{item.deletedByFullName}</span>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[--brand] shrink-0" />
              <span className="text-[var(--text-muted)]">Silinme Tarihi:</span>
              <span className="font-medium text-[var(--text-2)]">{deletedDate}</span>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[var(--warn)] shrink-0" />
              <span className="text-[var(--text-muted)]">Son Kullanma:</span>
              <span className="font-medium text-[var(--text-2)]">{expiresDate}</span>
            </div>

            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[--brand] shrink-0" />
              <span className="text-[var(--text-muted)]">Orijinal ID:</span>
              <span className="font-mono text-[11px] text-[var(--text-muted)] truncate">{item.entityId}</span>
            </div>
          </div>

          {/* Karantinadaki Dosyalar */}
          {parsedFiles.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-semibold text-[var(--text)] flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-blue-400" />
                Karantinadaki Dosyalar ({parsedFiles.length})
              </h4>
              <div className="bg-[--page] border border-[--line] rounded-xl p-3 space-y-1.5">
                {parsedFiles.map((filePath, idx) => (
                  <div key={idx} className="text-xs font-mono text-[var(--text-2)] truncate bg-[var(--muted-bg)] p-2 rounded-lg border border-[--line]">
                    {filePath}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* JSON Snapshot Viewer */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-semibold text-[var(--text)] flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[--brand]" />
              Veri Snapshot (JSON Nesnesi)
            </h4>
            <pre className="bg-[#F6F8FB] text-[var(--text-2)] p-4 rounded-xl text-[11px] font-mono overflow-x-auto max-h-60 border border-[--line] leading-relaxed scrollbar-thin">
              {JSON.stringify(parsedPayload, null, 2)}
            </pre>
          </div>
        </div>

        <DialogFooter className="pt-4 border-t border-[--line] gap-2 sm:gap-0">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onPurge(item.id)}
            disabled={loading}
            className="gap-1.5 bg-[var(--bad-soft)] text-red-400 border border-[var(--bad-line)] hover:bg-red-500/30 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            Kalıcı Olarak Sil
          </Button>

          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="border-[--line] bg-white text-[var(--text-muted)] hover:text-[var(--brand)] cursor-pointer"
            >
              Kapat
            </Button>
            <Button
              size="sm"
              onClick={() => onRestore(item.id)}
              disabled={loading}
              className="gap-1.5 bg-gradient-to-r from-[--brand] to-[--blue] hover:from-[--brand-hover] hover:to-[--brand] text-white shadow-sm font-semibold cursor-pointer shadow-[0_0_15px_rgba(52,211,153,0.3)]"
            >
              <RefreshCw className="w-4 h-4" />
              Geri Yükle
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
