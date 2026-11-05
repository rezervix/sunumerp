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
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6 rounded-[24px] bg-[#111513] border border-white/10 shadow-2xl text-white">
        <DialogHeader className="space-y-2 border-b border-white/[0.08] pb-4">
          <div className="flex items-center justify-between gap-2">
            <Badge variant="outline" className="text-xs uppercase tracking-wider font-semibold px-2.5 py-0.5 border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
              {item.entityType}
            </Badge>

            <span className="text-xs text-zinc-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              Otomatik Silinmeye: <strong className="text-amber-400">{daysLeft} Gün</strong>
            </span>
          </div>

          <DialogTitle className="text-lg font-bold text-white truncate">
            {item.title}
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-400">
            Kaydın Geri Dönüşüm Kutusu Snapshot Detayları ve ilişkili bağımlılık verileri.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-1">
          {/* Meta bilgileri */}
          <div className="grid grid-cols-2 gap-3 bg-white/[0.02] p-4 rounded-xl border border-white/10 text-xs">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-zinc-500">Silen Kullanıcı:</span>
              <span className="font-medium text-white truncate">{item.deletedByFullName}</span>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-zinc-500">Silinme Tarihi:</span>
              <span className="font-medium text-zinc-300">{deletedDate}</span>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-zinc-500">Son Kullanma:</span>
              <span className="font-medium text-zinc-300">{expiresDate}</span>
            </div>

            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-zinc-500">Orijinal ID:</span>
              <span className="font-mono text-[11px] text-zinc-400 truncate">{item.entityId}</span>
            </div>
          </div>

          {/* Karantinadaki Dosyalar */}
          {parsedFiles.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-blue-400" />
                Karantinadaki Dosyalar ({parsedFiles.length})
              </h4>
              <div className="bg-white/[0.02] border border-white/10 rounded-xl p-3 space-y-1.5">
                {parsedFiles.map((filePath, idx) => (
                  <div key={idx} className="text-xs font-mono text-zinc-300 truncate bg-black/40 p-2 rounded-lg border border-white/[0.06]">
                    {filePath}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* JSON Snapshot Viewer */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              Veri Snapshot (JSON Nesnesi)
            </h4>
            <pre className="bg-[#080A09] text-zinc-300 p-4 rounded-xl text-[11px] font-mono overflow-x-auto max-h-60 border border-white/10 leading-relaxed scrollbar-thin">
              {JSON.stringify(parsedPayload, null, 2)}
            </pre>
          </div>
        </div>

        <DialogFooter className="pt-4 border-t border-white/[0.08] gap-2 sm:gap-0">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onPurge(item.id)}
            disabled={loading}
            className="gap-1.5 bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            Kalıcı Olarak Sil
          </Button>

          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="border-white/10 bg-white/[0.03] text-zinc-400 hover:text-white cursor-pointer"
            >
              Kapat
            </Button>
            <Button
              size="sm"
              onClick={() => onRestore(item.id)}
              disabled={loading}
              className="gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold cursor-pointer shadow-[0_0_15px_rgba(52,211,153,0.3)]"
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
