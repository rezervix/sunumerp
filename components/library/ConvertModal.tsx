"use client"

import { useState, useEffect, useRef } from "react"
import { RefreshCw, X, ChevronRight, AlertCircle, CheckCircle, Loader2, Info, Sliders } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

const CONVERSION_RULES: Record<string, string[]> = {
  "image/jpeg": ["png", "webp", "avif", "gif", "bmp", "tiff"],
  "image/png": ["jpg", "webp", "avif", "gif", "bmp", "tiff"],
  "image/webp": ["jpg", "png", "avif"],
  "image/gif": ["jpg", "png", "webp"],
  "image/tiff": ["jpg", "png", "webp"],
  "image/heic": ["jpg", "png", "webp"],
  "image/bmp": ["jpg", "png", "webp"],
  "video/mp4": ["mov", "avi", "webm", "mkv", "mp3", "wav"],
  "video/quicktime": ["mp4", "avi", "webm", "mp3"],
  "video/x-msvideo": ["mp4", "webm", "mp3"],
  "video/webm": ["mp4", "mov", "mp3"],
  "video/x-matroska": ["mp4", "webm", "mp3"],
  "audio/mpeg": ["wav", "aac", "flac", "ogg", "m4a"],
  "audio/wav": ["mp3", "aac", "flac", "ogg"],
  "audio/flac": ["mp3", "wav", "aac"],
  "audio/aac": ["mp3", "wav", "flac"],
  "audio/ogg": ["mp3", "wav"],
  "application/pdf": ["docx", "xlsx", "txt"],
  "application/msword": ["pdf", "docx", "txt"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ["pdf", "txt"],
  "application/vnd.ms-excel": ["pdf", "xlsx", "csv"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ["pdf", "csv"],
  "application/vnd.ms-powerpoint": ["pdf"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ["pdf"],
}

const FORMAT_LABELS: Record<string, string> = {
  jpg: "JPEG", png: "PNG", webp: "WebP", avif: "AVIF",
  gif: "GIF", bmp: "BMP", tiff: "TIFF",
  mp4: "MP4 Video", mov: "MOV Video", avi: "AVI Video",
  webm: "WebM Video", mkv: "MKV Video",
  mp3: "MP3 Ses", wav: "WAV Ses", aac: "AAC Ses",
  flac: "FLAC (Kayıpsız)", ogg: "OGG Ses", m4a: "M4A Ses",
  pdf: "PDF Belgesi", docx: "Word Belgesi", xlsx: "Excel Tablosu",
  csv: "CSV Tablo", txt: "Düz Metin",
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

interface LibraryFile {
  id: string
  originalName: string
  mimeType: string
  sizeBytes: number
}

interface ConvertJob {
  id: string
  status: "queued" | "processing" | "completed" | "failed"
  progress: number
  targetFormat: string
  errorMessage?: string
  outputFile?: { id: string; originalName: string; sizeBytes: number }
}

interface ConvertModalProps {
  file: LibraryFile | null
  open: boolean
  onClose: () => void
  onSuccess?: (outputFileId: string) => void
}

export function ConvertModal({ file, open, onClose, onSuccess }: ConvertModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null)
  const [quality, setQuality] = useState(95)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [job, setJob] = useState<ConvertJob | null>(null)
  const [loading, setLoading] = useState(false)
  const sseRef = useRef<EventSource | null>(null)

  const allowedFormats = file ? (CONVERSION_RULES[file.mimeType] ?? []) : []
  const isImage = file?.mimeType.startsWith("image/")
  const isVideo = file?.mimeType.startsWith("video/")
  const isAudio = file?.mimeType.startsWith("audio/")

  // Dosya değiştiğinde state sıfırla
  useEffect(() => {
    if (!open) {
      setSelectedFormat(null)
      setJob(null)
      setShowAdvanced(false)
      sseRef.current?.close()
    }
  }, [open])

  const startConversion = async () => {
    if (!file || !selectedFormat) return
    setLoading(true)

    try {
      const options: Record<string, any> = {}
      if (isImage) options.quality = quality
      if (isVideo) options.crf = Math.round(51 - (quality / 100) * 41).toString()

      const res = await fetch("/api/ajans-kutuphanesi/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: file.id, targetFormat: selectedFormat, options }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? "Job oluşturulamadı")
      }

      const newJob = await res.json()
      setJob({ ...newJob, progress: 0 })
      setLoading(false)

      // SSE ile ilerlemeyi dinle
      const evtSource = new EventSource(`/api/ajans-kutuphanesi/convert/${newJob.id}`, {})
      sseRef.current = evtSource

      evtSource.onmessage = (e) => {
        const data = JSON.parse(e.data)
        setJob(data)
        if (data.status === "completed" || data.status === "failed") {
          evtSource.close()
          if (data.status === "completed" && data.outputFile) {
            onSuccess?.(data.outputFile.id)
          }
        }
      }

      evtSource.onerror = () => {
        evtSource.close()
        // Fallback: polling
        pollJob(newJob.id)
      }
    } catch (err: any) {
      setLoading(false)
      setJob((j) => j ? { ...j, status: "failed", errorMessage: err.message } : null)
    }
  }

  const pollJob = async (jobId: string) => {
    const poll = async () => {
      const res = await fetch(`/api/ajans-kutuphanesi/convert/${jobId}`)
      if (res.ok) {
        const data = await res.json()
        setJob(data)
        if (data.status !== "completed" && data.status !== "failed") {
          setTimeout(poll, 2000)
        } else if (data.status === "completed" && data.outputFile) {
          onSuccess?.(data.outputFile.id)
        }
      }
    }
    poll()
  }

  const handleClose = () => {
    sseRef.current?.close()
    onClose()
  }

  if (!file) return null

  const isProcessing = job && (job.status === "queued" || job.status === "processing")

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw size={18} className="text-primary" />
            Dosya Dönüştür
          </DialogTitle>
        </DialogHeader>

        {/* Kaynak dosya */}
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl border border-border">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{file.originalName}</p>
            <p className="text-caption mt-0.5">{formatBytes(file.sizeBytes)} · {file.mimeType}</p>
          </div>
          {selectedFormat && (
            <>
              <ChevronRight size={16} className="text-muted-foreground shrink-0" />
              <Badge variant="default" className="shrink-0 font-mono text-xs">
                .{selectedFormat}
              </Badge>
            </>
          )}
        </div>

        {!job ? (
          <>
            {/* Format seçimi */}
            {allowedFormats.length === 0 ? (
              <div className="flex items-center gap-2 text-muted-foreground py-4 justify-center">
                <AlertCircle size={16} />
                <span className="text-sm">Bu dosya türü için dönüşüm desteklenmiyor</span>
              </div>
            ) : (
              <div>
                <Label className="text-label text-muted-foreground mb-2 block">Hedef Format</Label>
                <div className="grid grid-cols-3 gap-2">
                  {allowedFormats.map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => setSelectedFormat(fmt)}
                      className={cn(
                        "px-3 py-2.5 rounded-xl border text-sm font-medium transition-all",
                        selectedFormat === fmt
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/50 hover:bg-muted/50 text-foreground"
                      )}
                    >
                      <span className="font-mono text-xs">.{fmt}</span>
                      <br />
                      <span className="text-[10px] text-muted-foreground font-normal">
                        {FORMAT_LABELS[fmt] ?? fmt.toUpperCase()}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Gelişmiş seçenekler */}
            {(isImage || isVideo || isAudio) && (
              <div>
                <button
                  onClick={() => setShowAdvanced((s) => !s)}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Sliders size={13} />
                  Kalite Ayarları
                  <ChevronRight size={12} className={cn("transition-transform", showAdvanced && "rotate-90")} />
                </button>

                {showAdvanced && (
                  <div className="mt-3 p-3 bg-muted/30 rounded-xl border border-border space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm">
                          {isImage ? "Görsel Kalitesi" : "Ses/Video Kalitesi"}
                        </Label>
                        <span className="text-sm font-mono text-primary">{quality}%</span>
                      </div>
                      <Slider
                        value={[quality]}
                        onValueChange={([v]) => setQuality(v)}
                        min={10}
                        max={100}
                        step={5}
                        className="w-full"
                      />
                      <div className="flex justify-between mt-1">
                        <span className="text-caption">Küçük boyut</span>
                        <span className="text-caption">Yüksek kalite</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 text-caption text-muted-foreground">
                      <Info size={12} className="mt-0.5 shrink-0" />
                      <span>Varsayılan: %95 (yüksek kalite). Orijinal dosya hiçbir koşulda değiştirilmez.</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={handleClose}>İptal</Button>
              <Button
                id="convert-start-btn"
                onClick={startConversion}
                disabled={!selectedFormat || loading}
                className="gap-2"
              >
                {loading
                  ? <><Loader2 size={14} className="animate-spin" /> Başlatılıyor...</>
                  : <><RefreshCw size={14} /> Dönüştür</>
                }
              </Button>
            </div>
          </>
        ) : (
          /* Job ilerleme */
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {job.status === "queued" && "Sırada bekleniyor..."}
                  {job.status === "processing" && "Dönüştürülüyor..."}
                  {job.status === "completed" && "Tamamlandı!"}
                  {job.status === "failed" && "Hata oluştu"}
                </span>
                <span className="font-mono text-primary">{job.progress}%</span>
              </div>
              <Progress
                value={job.progress}
                className={cn(
                  "h-2",
                  job.status === "failed" && "[&>div]:bg-destructive",
                  job.status === "completed" && "[&>div]:bg-green-500"
                )}
              />
            </div>

            {job.status === "completed" && job.outputFile && (
              <div className="flex items-center gap-3 p-3 bg-green-500/10 rounded-xl border border-green-500/20">
                <CheckCircle size={18} className="text-green-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">
                    Dönüşüm başarılı
                  </p>
                  <p className="text-caption truncate">{job.outputFile.originalName}</p>
                  <p className="text-caption">{formatBytes(job.outputFile.sizeBytes)}</p>
                </div>
              </div>
            )}

            {job.status === "failed" && (
              <div className="flex items-center gap-3 p-3 bg-destructive/10 rounded-xl border border-destructive/20">
                <AlertCircle size={18} className="text-destructive shrink-0" />
                <div>
                  <p className="text-sm font-medium text-destructive">Dönüşüm başarısız</p>
                  <p className="text-caption text-muted-foreground">{job.errorMessage}</p>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              {(job.status === "completed" || job.status === "failed") && (
                <Button variant="outline" onClick={handleClose}>Kapat</Button>
              )}
              {job.status === "failed" && (
                <Button
                  onClick={() => { setJob(null); setSelectedFormat(null) }}
                  className="gap-2"
                >
                  <RefreshCw size={14} /> Tekrar Dene
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
