"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  X, Download, ZoomIn, ZoomOut, RotateCw, ChevronLeft, ChevronRight,
  FileText, Music, Archive, File, ExternalLink, Info, Clock, HardDrive,
  Maximize2, Minimize2, Share2, Trash2, RefreshCw
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

interface LibraryFile {
  id: string
  originalName: string
  mimeType: string
  sizeBytes: number
  checksumSha256: string
  uploadedBy?: { fullName: string; avatarUrl?: string }
  createdAt: string
  updatedAt: string
  description?: string
}

interface FilePreviewModalProps {
  file: LibraryFile | null
  files?: LibraryFile[] // Gezinme için
  onClose: () => void
  onNext?: () => void
  onPrev?: () => void
  onDownload?: (file: LibraryFile) => void
  onDelete?: (file: LibraryFile) => void
  onConvert?: (file: LibraryFile) => void
  onShare?: (file: LibraryFile) => void
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function getFileCategory(mimeType: string) {
  if (mimeType.startsWith("image/")) return "image"
  if (mimeType.startsWith("video/")) return "video"
  if (mimeType.startsWith("audio/")) return "audio"
  if (mimeType === "application/pdf") return "pdf"
  if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("7z")) return "archive"
  return "other"
}

export function FilePreviewModal({
  file, onClose, onNext, onPrev, onDownload, onDelete, onConvert, onShare
}: FilePreviewModalProps) {
  const [imageZoom, setImageZoom] = useState(1)
  const [imageRotation, setImageRotation] = useState(0)
  const [showInfo, setShowInfo] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setImageZoom(1)
    setImageRotation(0)
  }, [file?.id])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      if (e.key === "ArrowRight") onNext?.()
      if (e.key === "ArrowLeft") onPrev?.()
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [onClose, onNext, onPrev])

  if (!file) return null

  const category = getFileCategory(file.mimeType)
  const previewUrl = `/api/ajans-kutuphanesi/files/${file.id}/preview`
  const downloadUrl = `/api/ajans-kutuphanesi/files/${file.id}/download`

  const handleDownload = () => {
    if (onDownload) {
      onDownload(file)
    } else {
      const a = document.createElement("a")
      a.href = downloadUrl
      a.download = file.originalName
      a.click()
    }
  }

  const renderPreview = () => {
    switch (category) {
      case "image":
        return (
          <div className="flex-1 flex items-center justify-center overflow-hidden bg-black/20 rounded-xl">
            <img
              src={previewUrl}
              alt={file.originalName}
              style={{
                transform: `scale(${imageZoom}) rotate(${imageRotation}deg)`,
                transition: "transform 0.2s ease",
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain",
              }}
              className="rounded"
            />
          </div>
        )

      case "video":
        return (
          <div className="flex-1 flex items-center justify-center bg-black rounded-xl overflow-hidden">
            <video
              src={previewUrl}
              controls
              className="max-h-full max-w-full"
              preload="metadata"
            />
          </div>
        )

      case "audio":
        return (
          <div className="flex-1 flex flex-col items-center justify-center gap-6">
            <div className="size-32 rounded-3xl bg-gradient-to-br from-pink-500/20 to-purple-600/20 border border-pink-500/20 flex items-center justify-center">
              <Music size={48} className="text-pink-400" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-lg">{file.originalName}</p>
              <p className="text-caption mt-1">{formatBytes(file.sizeBytes)}</p>
            </div>
            <audio
              src={previewUrl}
              controls
              className="w-full max-w-md"
              preload="metadata"
            />
          </div>
        )

      case "pdf":
        return (
          <div className="flex-1 rounded-xl overflow-hidden border border-border">
            <iframe
              src={`${previewUrl}#toolbar=1&navpanes=0`}
              className="w-full h-full"
              title={file.originalName}
            />
          </div>
        )

      default:
        return (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <div className="size-24 rounded-2xl bg-muted flex items-center justify-center">
              {category === "archive"
                ? <Archive size={36} className="text-yellow-500" />
                : <File size={36} className="text-muted-foreground" />
              }
            </div>
            <div className="text-center">
              <p className="font-semibold">{file.originalName}</p>
              <p className="text-caption mt-1">
                Bu dosya türü için önizleme desteklenmiyor
              </p>
            </div>
            <Button onClick={handleDownload} className="gap-2">
              <Download size={15} /> İndir
            </Button>
          </div>
        )
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch bg-black/80 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        ref={containerRef}
        className={cn(
          "relative flex flex-col bg-card text-foreground shadow-2xl transition-all duration-300",
          isFullscreen
            ? "w-full h-full"
            : "m-auto w-full max-w-5xl h-[90vh] rounded-2xl overflow-hidden"
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
          {/* Navigasyon */}
          {onPrev && (
            <button
              onClick={onPrev}
              className="size-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground"
            >
              <ChevronLeft size={16} />
            </button>
          )}
          {onNext && (
            <button
              onClick={onNext}
              className="size-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground"
            >
              <ChevronRight size={16} />
            </button>
          )}

          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{file.originalName}</p>
            <p className="text-caption">
              {formatBytes(file.sizeBytes)} · {file.mimeType}
            </p>
          </div>

          {/* Araçlar */}
          <div className="flex items-center gap-1">
            {category === "image" && (
              <>
                <button
                  onClick={() => setImageZoom((z) => Math.max(0.25, z - 0.25))}
                  className="size-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground"
                  title="Küçült"
                >
                  <ZoomOut size={15} />
                </button>
                <span className="text-xs text-muted-foreground w-10 text-center">
                  {Math.round(imageZoom * 100)}%
                </span>
                <button
                  onClick={() => setImageZoom((z) => Math.min(5, z + 0.25))}
                  className="size-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground"
                  title="Büyüt"
                >
                  <ZoomIn size={15} />
                </button>
                <button
                  onClick={() => setImageRotation((r) => r + 90)}
                  className="size-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground"
                  title="Döndür"
                >
                  <RotateCw size={15} />
                </button>
                <Separator orientation="vertical" className="h-5 mx-1" />
              </>
            )}

            <button
              onClick={() => setIsFullscreen((f) => !f)}
              className="size-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground"
              title="Tam Ekran"
            >
              {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>

            <button
              onClick={() => setShowInfo((s) => !s)}
              className={cn(
                "size-8 rounded-lg flex items-center justify-center transition-colors",
                showInfo
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-muted text-muted-foreground"
              )}
              title="Bilgi"
            >
              <Info size={15} />
            </button>

            {onConvert && (
              <button
                onClick={() => onConvert(file)}
                className="size-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground"
                title="Dönüştür"
              >
                <RefreshCw size={15} />
              </button>
            )}

            {onShare && (
              <button
                onClick={() => onShare(file)}
                className="size-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground"
                title="Paylaş"
              >
                <Share2 size={15} />
              </button>
            )}

            <button
              onClick={handleDownload}
              className="size-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground"
              title="İndir"
            >
              <Download size={15} />
            </button>

            {onDelete && (
              <button
                onClick={() => onDelete(file)}
                className="size-8 rounded-lg flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-destructive transition-colors text-muted-foreground"
                title="Sil"
              >
                <Trash2 size={15} />
              </button>
            )}

            <button
              onClick={onClose}
              className="size-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground ml-1"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* İçerik */}
        <div className="flex flex-1 overflow-hidden">
          {/* Preview alanı */}
          <div className="flex-1 p-4 flex flex-col overflow-hidden">
            {renderPreview()}
          </div>

          {/* Bilgi paneli */}
          {showInfo && (
            <div className="w-72 border-l border-border p-4 overflow-y-auto shrink-0 space-y-4">
              <h3 className="font-semibold text-sm">Dosya Bilgileri</h3>

              <div className="space-y-3">
                <div>
                  <p className="text-label text-muted-foreground mb-1">Ad</p>
                  <p className="text-sm break-all">{file.originalName}</p>
                </div>
                <div>
                  <p className="text-label text-muted-foreground mb-1">Tür</p>
                  <Badge variant="secondary" className="text-xs font-mono">{file.mimeType}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <HardDrive size={14} className="text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-label text-muted-foreground">Boyut</p>
                    <p className="text-sm">{formatBytes(file.sizeBytes)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-label text-muted-foreground">Yüklenme</p>
                    <p className="text-sm">{formatDate(file.createdAt)}</p>
                  </div>
                </div>
                {file.uploadedBy && (
                  <div>
                    <p className="text-label text-muted-foreground mb-1">Yükleyen</p>
                    <p className="text-sm">{file.uploadedBy.fullName}</p>
                  </div>
                )}
                {file.description && (
                  <div>
                    <p className="text-label text-muted-foreground mb-1">Açıklama</p>
                    <p className="text-sm text-muted-foreground">{file.description}</p>
                  </div>
                )}
                <div>
                  <p className="text-label text-muted-foreground mb-1">SHA-256</p>
                  <p className="text-xs font-mono break-all text-muted-foreground bg-muted p-2 rounded-lg">
                    {file.checksumSha256}
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  onClick={handleDownload}
                >
                  <Download size={13} /> İndir
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
