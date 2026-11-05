"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Upload, X, File, Image, Video, Music, FileText, Archive, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"

const CHUNK_SIZE = 5 * 1024 * 1024 // 5MB per chunk

interface UploadFile {
  id: string
  file: File
  status: "pending" | "uploading" | "done" | "error"
  progress: number
  error?: string
  uploadId?: string
}

interface DropZoneProps {
  branchId: string
  folderId?: string
  onUploadComplete?: () => void
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return <Image size={16} className="text-blue-500" />
  if (mimeType.startsWith("video/")) return <Video size={16} className="text-purple-500" />
  if (mimeType.startsWith("audio/")) return <Music size={16} className="text-pink-500" />
  if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("7z"))
    return <Archive size={16} className="text-yellow-500" />
  if (mimeType.includes("pdf") || mimeType.includes("word") || mimeType.includes("sheet"))
    return <FileText size={16} className="text-red-500" />
  return <File size={16} className="text-muted-foreground" />
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

async function uploadFileChunked(
  file: File,
  branchId: string,
  folderId: string | undefined,
  contentCalendarId: string | undefined,
  onProgress: (progress: number, uploadId: string) => void
): Promise<void> {
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE)

  // 1. Upload başlat
  const initRes = await fetch(`/api/ajans-kutuphanesi/upload?action=init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: file.name,
      mimeType: file.type,
      fileSize: file.size,
      totalChunks,
      folderId,
    }),
  })

  if (!initRes.ok) {
    const err = await initRes.json()
    throw new Error(err.error ?? "Upload başlatılamadı")
  }

  const { uploadId } = await initRes.json()
  onProgress(5, uploadId)

  // 2. Chunk'ları yükle
  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE
    const end = Math.min(start + CHUNK_SIZE, file.size)
    const chunk = file.slice(start, end)

    let retries = 3
    while (retries > 0) {
      try {
        const chunkRes = await fetch(
          `/api/ajans-kutuphanesi/upload/${uploadId}/chunk?index=${i}`,
          { method: "POST", body: chunk }
        )
        if (!chunkRes.ok) throw new Error(`Chunk ${i} yükleme hatası`)
        break
      } catch (err) {
        retries--
        if (retries === 0) throw err
        await new Promise((r) => setTimeout(r, 1000)) // 1s bekle ve tekrar dene
      }
    }

    const progress = 5 + Math.round(((i + 1) / totalChunks) * 85)
    onProgress(progress, uploadId)
  }

  // 3. Birleştir
  const completeRes = await fetch(`/api/ajans-kutuphanesi/upload?action=complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      uploadId,
      fileName: file.name,
      mimeType: file.type,
      totalChunks,
      folderId,
      branchId,
      contentCalendarId: contentCalendarId || undefined,
    }),
  })

  if (!completeRes.ok) {
    const err = await completeRes.json()
    throw new Error(err.error ?? "Dosya birleştirilemedi")
  }

  onProgress(100, uploadId)
}

export function DropZone({ branchId, folderId, onUploadComplete }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploads, setUploads] = useState<UploadFile[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragCounter = useRef(0)
  const [contentCalendars, setContentCalendars] = useState<Array<{ id: string; title: string }>>([])
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>("")

  useEffect(() => {
    if (branchId) {
      fetch(`/api/content-calendar?branchId=${branchId}`)
        .then((res) => res.json())
        .then((data) => {
          setContentCalendars(Array.isArray(data) ? data : [])
        })
        .catch(() => {})
    }
  }, [branchId])

  const updateUpload = useCallback((id: string, updates: Partial<UploadFile>) => {
    setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, ...updates } : u)))
  }, [])

  const startUpload = useCallback(
    async (uploadFile: UploadFile) => {
      updateUpload(uploadFile.id, { status: "uploading" })
      try {
        await uploadFileChunked(
          uploadFile.file,
          branchId,
          folderId,
          selectedCalendarId || undefined,
          (progress, uploadId) => {
            updateUpload(uploadFile.id, { progress, uploadId })
          }
        )
        updateUpload(uploadFile.id, { status: "done", progress: 100 })
        onUploadComplete?.()
      } catch (err: any) {
        updateUpload(uploadFile.id, { status: "error", error: err.message })
      }
    },
    [branchId, folderId, onUploadComplete, updateUpload, selectedCalendarId]
  )

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const newUploads: UploadFile[] = Array.from(files).map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        status: "pending",
        progress: 0,
      }))

      setUploads((prev) => [...prev, ...newUploads])
      setIsOpen(true)

      // Sırayla yükle
      newUploads.forEach((u) => startUpload(u))
    },
    [startUpload]
  )

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current++
    if (e.dataTransfer.items?.length) setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current--
    if (dragCounter.current === 0) setIsDragging(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    dragCounter.current = 0
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      addFiles(e.target.files)
      e.target.value = ""
    }
  }

  const removeUpload = (id: string) => {
    setUploads((prev) => prev.filter((u) => u.id !== id))
  }

  const clearDone = () => {
    setUploads((prev) => prev.filter((u) => u.status !== "done"))
    if (uploads.filter((u) => u.status !== "done").length === 0) setIsOpen(false)
  }

  const allDone = uploads.length > 0 && uploads.every((u) => u.status === "done" || u.status === "error")
  const hasErrors = uploads.some((u) => u.status === "error")

  return (
    <>
      {/* Drag overlay — tüm sayfa */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className="fixed inset-0 z-0 pointer-events-none"
        aria-hidden
      />

      {isDragging && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-[#080A09]/80 backdrop-blur-md transition-all" />
          <div className="relative flex flex-col items-center gap-4 bg-[#111513] rounded-[24px] p-12 shadow-[0_0_50px_rgba(16,185,129,0.15)] border-2 border-dashed border-emerald-500/50 bg-emerald-500/5">
            <div className="size-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.25)] animate-pulse">
              <Upload size={32} />
            </div>
            <div className="text-center space-y-1">
              <p className="text-base font-medium text-white">Dosyaları buraya bırakın</p>
              <p className="text-xs text-zinc-400">Çoklu dosya yükleme ve chunked aktarım destekleniyor</p>
            </div>
          </div>
        </div>
      )}

      {/* Yükleme butonları */}
      <div className="flex items-center gap-2">
        {contentCalendars.length > 0 && (
          <select
            value={selectedCalendarId}
            onChange={(e) => setSelectedCalendarId(e.target.value)}
            className="rounded-xl border border-white/[0.08] bg-[#111513] px-3 py-1.5 text-xs outline-none focus:border-emerald-500/50 max-w-[200px] truncate text-zinc-200"
          >
            <option value="">İçerik Takvimi İlişkisi (Yok)</option>
            {contentCalendars.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        )}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileInput}
        />
        <Button
          id="library-upload-btn"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          className="gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.25)] transition-all"
        >
          <Upload size={14} />
          Dosya Yükle
        </Button>
      </div>

      {/* Upload panel */}
      {isOpen && uploads.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50 w-96 bg-[#111513]/95 backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
            <div className="flex items-center gap-2">
              {allDone && !hasErrors ? (
                <CheckCircle size={16} className="text-emerald-400" />
              ) : hasErrors ? (
                <AlertCircle size={16} className="text-rose-400" />
              ) : (
                <Loader2 size={16} className="text-emerald-400 animate-spin" />
              )}
              <span className="text-xs font-semibold text-white">
                {allDone
                  ? hasErrors ? "Bazı dosyalar yüklenemedi" : "Tüm yüklemeler tamamlandı"
                  : `${uploads.filter((u) => u.status === "done").length}/${uploads.length} yüklendi`}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {allDone && (
                <button
                  onClick={clearDone}
                  className="text-xs text-zinc-400 hover:text-white transition-colors px-2 py-1 rounded"
                >
                  Temizle
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="size-6 rounded-md flex items-center justify-center hover:bg-white/[0.08] transition-colors text-zinc-400"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Upload listesi */}
          <div className="max-h-80 overflow-y-auto divide-y divide-border">
            {uploads.map((u) => (
              <div key={u.id} className="flex items-start gap-3 px-4 py-3">
                <div className="mt-0.5 shrink-0">
                  {getFileIcon(u.file.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{u.file.name}</p>
                  <p className="text-caption">{formatBytes(u.file.size)}</p>
                  {u.status === "uploading" && (
                    <div className="mt-1.5">
                      <Progress value={u.progress} className="h-1.5" />
                      <p className="text-caption mt-0.5">{u.progress}%</p>
                    </div>
                  )}
                  {u.status === "error" && (
                    <p className="text-caption text-destructive mt-0.5">{u.error}</p>
                  )}
                </div>
                <div className="shrink-0 mt-0.5">
                  {u.status === "done" && <CheckCircle size={16} className="text-green-500" />}
                  {u.status === "uploading" && <Loader2 size={16} className="text-primary animate-spin" />}
                  {u.status === "error" && <AlertCircle size={16} className="text-destructive" />}
                  {(u.status === "pending" || u.status === "error") && (
                    <button
                      onClick={() => removeUpload(u.id)}
                      className="size-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
