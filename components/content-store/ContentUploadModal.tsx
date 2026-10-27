"use client"

import { useState, useRef, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Upload, X, File, Image, Video, CheckCircle, AlertCircle, Loader2, AlertTriangle, GitCompare } from "lucide-react"
import { toast } from "sonner"

interface Niche { id: string; name: string }
interface ContentUploadModalProps { open: boolean; onClose: () => void; onSuccess: () => void; niches: Niche[] }

interface UploadQueueItem {
  id: string
  file: File
  nicheId: string
  customNicheName?: string
  progress: number
  status: "pending" | "uploading" | "success" | "error" | "duplicate_warning"
  errorMsg?: string
  duplicateInfo?: { id: string; originalName: string; uploaderName: string; createdAt: string }
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return <Image size={18} className="text-blue-500" />
  if (mimeType.startsWith("video/")) return <Video size={18} className="text-purple-500" />
  return <File size={18} className="text-muted-foreground" />
}
function formatBytes(bytes: number) { if (bytes < 1024) return `${bytes} B`; if (bytes < 1048576) return `${(bytes/1024).toFixed(1)} KB`; return `${(bytes/1048576).toFixed(1)} MB` }

export function ContentUploadModal({ open, onClose, onSuccess, niches }: ContentUploadModalProps) {
  const [dragActive, setDragActive] = useState(false)
  const [queue, setQueue] = useState<UploadQueueItem[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [useBulkNiche, setUseBulkNiche] = useState(false)
  const [bulkNicheId, setBulkNicheId] = useState<string>("")
  const [bulkCustomNicheName, setBulkCustomNicheName] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) { setQueue([]); setIsUploading(false); setUseBulkNiche(false); setBulkNicheId(""); setBulkCustomNicheName("") }
    else { if (niches.length > 0) setBulkNicheId(niches[0].id); else setBulkNicheId("other") }
  }, [open, niches])

  const handleDrag = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); if (e.type === "dragenter" || e.type === "dragover") setDragActive(true); else if (e.type === "dragleave") setDragActive(false) }

  const addFilesToQueue = (files: FileList) => {
    const newItems: UploadQueueItem[] = Array.from(files).map(file => ({ id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`, file, nicheId: niches[0]?.id || "other", progress: 0, status: "pending" }))
    setQueue(prev => [...prev, ...newItems])
  }
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); if (e.dataTransfer.files?.[0]) addFilesToQueue(e.dataTransfer.files) }
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files?.[0]) addFilesToQueue(e.target.files) }
  const removeQueueItem = (id: string) => setQueue(prev => prev.filter(item => item.id !== id))
  const updateQueueItem = (id: string, updates: Partial<UploadQueueItem>) => setQueue(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item))

  const uploadSingleItem = async (item: UploadQueueItem, forceUpload = false) => {
    updateQueueItem(item.id, { status: "uploading", progress: 10 })
    const formData = new FormData()
    formData.append("file", item.file)
    const currentNicheId = useBulkNiche ? bulkNicheId : item.nicheId
    const currentCustomName = useBulkNiche ? bulkCustomNicheName : item.customNicheName
    formData.append("nicheId", currentNicheId)
    if (currentNicheId === "other" && currentCustomName) formData.append("nicheName", currentCustomName)
    if (forceUpload) {
      formData.append("force", "true")
      formData.append("forceUpload", "true")
    }

    try {
      const res = await fetch("/api/content-store/upload", { method: "POST", body: formData })
      const data = await res.json()
      if (res.status === 409 && data.duplicate) {
        const mappedInfo = data.original ? {
          id: data.original.id,
          originalName: data.original.originalName,
          uploaderName: data.original.uploadedBy,
          createdAt: data.original.createdAt
        } : data.existingContent

        updateQueueItem(item.id, { status: "duplicate_warning", duplicateInfo: mappedInfo })
        return
      }
      if (!res.ok) throw new Error(data.error || "Yükleme hatası")
      const msg = data.status === "pending_approval" ? "Onay kuyruğuna eklendi" : "Yüklendi"
      updateQueueItem(item.id, { status: "success", progress: 100, errorMsg: msg })
    } catch (err: any) {
      updateQueueItem(item.id, { status: "error", errorMsg: err.message })
    }
  }

  const handleUpload = async () => {
    if (queue.length === 0) return
    setIsUploading(true)
    for (const item of queue) {
      if (item.status === "success") continue
      await uploadSingleItem(item)
    }
    setIsUploading(false)
    const successCount = queue.filter(q => q.status === "success").length
    if (successCount > 0) { toast.success(`${successCount} dosya yüklendi`); onSuccess() }
  }

  const handleForceUpload = async (itemId: string) => {
    const item = queue.find(i => i.id === itemId)
    if (!item) return
    await uploadSingleItem(item, true)
    onSuccess()
  }

  const pendingCount = queue.filter(q => q.status === "pending" || q.status === "duplicate_warning").length
  const successCount = queue.filter(q => q.status === "success").length

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl overflow-y-auto max-h-[85vh] bg-background border border-border rounded-2xl shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">İçerik Mağazasına Dosya Yükle</DialogTitle>
          <DialogDescription>Görsel veya videolarınızı sürükleyip bırakarak yükleyebilirsiniz.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div onDragEnter={handleDrag} onDragOver={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${dragActive ? "border-primary bg-primary/5 text-primary scale-[0.99]" : "border-muted-foreground/30 hover:border-primary/50 text-muted-foreground"}`}
          >
            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} accept="image/*,video/*" />
            <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary"><Upload size={24} /></div>
            <p className="text-sm font-semibold">Tıklayın veya Dosyaları Buraya Sürükleyin</p>
            <p className="text-xs text-muted-foreground">Görseller ve Videolar (Max 100MB)</p>
          </div>

          {queue.length > 0 && (
            <div className="space-y-4">
              <div className="bg-muted/40 p-3 rounded-lg border border-border flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="bulkNiche" checked={useBulkNiche} onChange={e => setUseBulkNiche(e.target.checked)} className="rounded border-gray-300 text-primary focus:ring-primary size-4" />
                  <label htmlFor="bulkNiche" className="text-sm font-medium cursor-pointer">Seçilenlerin hepsini aynı nişe ata (Toplu Seçim)</label>
                </div>
                {useBulkNiche && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-6 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Toplu Niş Etiketi</label>
                      <select value={bulkNicheId} onChange={e => setBulkNicheId(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-primary">
                        {niches.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
                        <option value="other">Diğer (Yeni Niş)...</option>
                      </select>
                    </div>
                    {bulkNicheId === "other" && (
                      <div className="space-y-1 animate-in fade-in zoom-in-95 duration-200">
                        <label className="text-xs text-muted-foreground">Yeni Niş İsmi</label>
                        <input type="text" placeholder="Niş ismi girin..." value={bulkCustomNicheName} onChange={e => setBulkCustomNicheName(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-primary" />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="border border-border rounded-lg divide-y divide-border max-h-[35vh] overflow-y-auto">
                {queue.map(item => (
                  <div key={item.id} className="p-3">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {getFileIcon(item.file.type)}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{item.file.name}</p>
                          <p className="text-xs text-muted-foreground">{formatBytes(item.file.size)}</p>
                        </div>
                      </div>

                      {!useBulkNiche && item.status === "pending" && (
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="w-36">
                            <select value={item.nicheId} onChange={e => updateQueueItem(item.id, { nicheId: e.target.value })} className="flex h-8 w-full rounded-md border border-input bg-card px-2 py-0 text-xs shadow-xs focus:outline-none">
                              {niches.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
                              <option value="other">Diğer...</option>
                            </select>
                          </div>
                          {item.nicheId === "other" && (
                            <input type="text" placeholder="Yeni niş..." value={item.customNicheName || ""} onChange={e => updateQueueItem(item.id, { customNicheName: e.target.value })} className="h-8 w-28 rounded-md border border-input bg-card px-2 py-0 text-xs shadow-xs focus:outline-none" />
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-2 shrink-0">
                        {item.status === "uploading" && <div className="flex items-center gap-1.5 text-xs text-primary"><Loader2 size={14} className="animate-spin" /><span>{item.progress}%</span></div>}
                        {item.status === "success" && <div className="flex items-center gap-1 text-xs text-emerald-600"><CheckCircle size={16} /><span className="hidden md:inline">{item.errorMsg || "Yüklendi"}</span></div>}
                        {item.status === "error" && <div className="flex items-center gap-1 text-red-500" title={item.errorMsg}><AlertCircle size={16} /><span className="text-xs hidden md:inline">Hata</span></div>}
                        {item.status === "duplicate_warning" && <div className="flex items-center gap-1 text-amber-500"><AlertTriangle size={16} /></div>}
                        {!isUploading && item.status === "pending" && <button onClick={() => removeQueueItem(item.id)} className="size-7 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground transition-all"><X size={14} /></button>}
                      </div>
                    </div>

                    {/* Duplicate uyarısı */}
                    {item.status === "duplicate_warning" && item.duplicateInfo && (
                      <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg text-xs">
                        <div className="flex items-start gap-2">
                          <GitCompare size={14} className="text-amber-600 mt-0.5 shrink-0" />
                          <div className="flex-1">
                            <p className="font-semibold text-amber-800 dark:text-amber-200">Mükerrer Dosya Tespit Edildi</p>
                            <p className="text-amber-700 dark:text-amber-300 mt-0.5">
                              <span className="font-medium">{item.duplicateInfo.originalName}</span> adlı dosya zaten mağazada mevcut.
                              Yükleyen: {item.duplicateInfo.uploaderName} · {new Date(item.duplicateInfo.createdAt).toLocaleDateString("tr-TR")}
                            </p>
                            <div className="flex gap-2 mt-2">
                              <button onClick={() => handleForceUpload(item.id)} className="px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium">Yine de Yükle</button>
                              <button onClick={() => removeQueueItem(item.id)} className="px-3 py-1.5 border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50">Kaldır</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose} disabled={isUploading}>İptal</Button>
          <Button onClick={handleUpload} disabled={isUploading || pendingCount === 0}>
            {isUploading ? <><Loader2 size={16} className="animate-spin mr-1.5" />Yükleniyor ({successCount}/{queue.length})</> : "Yüklemeyi Başlat"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}