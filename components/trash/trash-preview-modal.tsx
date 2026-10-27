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
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6 rounded-2xl shadow-2xl">
        <DialogHeader className="space-y-2 border-b pb-4">
          <div className="flex items-center justify-between gap-2">
            <Badge variant="outline" className="text-xs uppercase tracking-wider font-semibold px-2.5 py-0.5 border-primary/30 text-primary">
              {item.entityType}
            </Badge>

            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              Otomatik Silinmeye: <strong className="text-foreground">{daysLeft} Gün</strong>
            </span>
          </div>

          <DialogTitle className="text-xl font-bold text-foreground truncate">
            {item.title}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Kaydın Geri Dönüşüm Kutusu Snapshot Detayları ve ilişkili bağımlılık verileri.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-1">
          {/* Meta bilgileri */}
          <div className="grid grid-cols-2 gap-3 bg-muted/40 p-3.5 rounded-xl border text-xs">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-primary shrink-0" />
              <span className="text-muted-foreground">Silen Kullanıcı:</span>
              <span className="font-medium text-foreground truncate">{item.deletedByFullName}</span>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary shrink-0" />
              <span className="text-muted-foreground">Silinme Tarihi:</span>
              <span className="font-medium text-foreground">{deletedDate}</span>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="text-muted-foreground">Son Kullanma:</span>
              <span className="font-medium text-foreground">{expiresDate}</span>
            </div>

            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary shrink-0" />
              <span className="text-muted-foreground">Orijinal ID:</span>
              <span className="font-mono text-[11px] text-muted-foreground truncate">{item.entityId}</span>
            </div>
          </div>

          {/* Karantinadaki Dosyalar */}
          {parsedFiles.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-blue-500" />
                Karantinadaki Dosyalar ({parsedFiles.length})
              </h4>
              <div className="bg-muted/30 border rounded-lg p-2.5 space-y-1">
                {parsedFiles.map((filePath, idx) => (
                  <div key={idx} className="text-xs font-mono text-muted-foreground truncate bg-background p-1.5 rounded border">
                    {filePath}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* JSON Snapshot Viewer */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-emerald-500" />
              Veri Snapshot (JSON Nesnesi)
            </h4>
            <pre className="bg-slate-950 text-slate-100 dark:bg-slate-900 p-3 rounded-xl text-[11px] font-mono overflow-x-auto max-h-60 border border-slate-800">
              {JSON.stringify(parsedPayload, null, 2)}
            </pre>
          </div>
        </div>

        <DialogFooter className="pt-4 border-t gap-2 sm:gap-0">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onPurge(item.id)}
            disabled={loading}
            className="gap-1.5"
          >
            <Trash2 className="w-4 h-4" />
            Kalıcı Olarak Sil
          </Button>

          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Kapat
            </Button>
            <Button
              size="sm"
              onClick={() => onRestore(item.id)}
              disabled={loading}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
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
