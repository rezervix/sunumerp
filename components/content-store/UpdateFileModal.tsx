"use client"

import { useState, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Upload, X, Loader2, RefreshCw } from "lucide-react"
import { toast } from "sonner"

interface UpdateFileModalProps {
  open: boolean
  onClose: () => void
  contentId: string
  contentName: string
  onSuccess: () => void
}

export function UpdateFileModal({
  open,
  onClose,
  contentId,
  contentName,
  onSuccess
}: UpdateFileModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [changeNote, setChangeNote] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files?.[0]) {
      setFile(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleUpload = async () => {
    if (!file) return
    setIsUploading(true)

    const formData = new FormData()
    formData.append("file", file)
    formData.append("updateContentId", contentId)
    formData.append("changeNote", changeNote)

    try {
      const res = await fetch("/api/content-store/upload", {
        method: "POST",
        body: formData
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Güncelleme hatası")

      toast.success("Dosya başarıyla güncellendi, yeni sürüm eklendi.")
      onSuccess()
      onClose()
      setFile(null)
      setChangeNote("")
    } catch (err: any) {
      toast.error(err.message || "Dosya güncellenirken hata oluştu")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md bg-background border border-border rounded-2xl shadow-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <RefreshCw className="text-primary size-5" />
            <DialogTitle className="text-lg font-bold">Dosyayı Güncelle</DialogTitle>
          </div>
          <DialogDescription>
            {contentName} içeriğinin yerine yeni bir dosya yükleyin. Mevcut dosya geçmişe kaydedilecektir.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {!file ? (
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                dragActive
                  ? "border-primary bg-primary/5 text-primary scale-[0.99]"
                  : "border-muted-foreground/30 hover:border-primary/50 text-muted-foreground"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
                accept="image/*,video/*"
              />
              <Upload size={24} className="text-muted-foreground" />
              <p className="text-sm font-semibold">Tıklayın veya Yeni Dosyayı Sürükleyin</p>
              <p className="text-xs text-muted-foreground">Görseller ve Videolar (Max 100MB)</p>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 border border-border rounded-xl bg-muted/20">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <button
                onClick={() => setFile(null)}
                className="size-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground"
              >
                <X size={16} />
              </button>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Revizyon / Değişiklik Notu
            </label>
            <textarea
              placeholder="Örn: Arka plan renkleri canlandırıldı, logo boyutu düzeltildi..."
              value={changeNote}
              onChange={(e) => setChangeNote(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-card focus:outline-none focus:ring-1 focus:ring-primary min-h-[80px] resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border pt-4 mt-2">
          <Button variant="outline" onClick={onClose} disabled={isUploading}>
            İptal
          </Button>
          <Button onClick={handleUpload} disabled={isUploading || !file}>
            {isUploading ? (
              <>
                <Loader2 size={16} className="animate-spin mr-1.5" />
                Yükleniyor...
              </>
            ) : (
              "Sürümü Güncelle"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
