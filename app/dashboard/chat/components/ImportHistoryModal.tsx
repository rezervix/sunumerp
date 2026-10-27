"use client"

/**
 * ImportHistoryModal.tsx
 *
 * WhatsApp geçmişini mevcut bir sohbete içe aktarmak için 3 adımlı modal.
 *  Adım 1 — Dosya yükleme + ön izleme isteği
 *  Adım 2 — Özet gösterimi + bilinmeyen gönderen eşleştirme + onay
 *  Adım 3 — İlerleme + tamamlandı
 */

import { useState, useCallback, useRef, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Upload,
  FileArchive,
  Users,
  AlertTriangle,
  CheckCircle2,
  X,
  ChevronRight,
  Info,
  MessageSquare,
  Image,
  SkipForward,
} from "lucide-react"
import { toast } from "sonner"

// ─── Tipler ────────────────────────────────────────────────────

interface ErpUser {
  id: string
  fullName: string
  avatarUrl?: string | null
}

interface PreviewResult {
  messageCount: number
  systemMessageCount: number
  mediaCount: number
  dateFrom: string | null
  dateTo: string | null
  unknownSenders: string[]
  allSenders: string[]
  parseErrors: Array<{ line: number; raw: string; reason: string }>
  detectedFormat: string
}

interface ImportHistoryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  conversationId: string
  conversationName?: string
  erpUsers?: ErpUser[]
}

type Step = "upload" | "preview" | "importing" | "done"

// ─── Yardımcı formatlar ─────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

// ─── Modal ──────────────────────────────────────────────────

export default function ImportHistoryModal({
  open,
  onOpenChange,
  conversationId,
  conversationName,
  erpUsers: initialErpUsers,
}: ImportHistoryModalProps) {
  const [erpUsers, setErpUsers] = useState<ErpUser[]>(initialErpUsers || [])
  const [step, setStep] = useState<Step>("upload")
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null)
  const [senderMappings, setSenderMappings] = useState<Record<string, string>>({})
  const [progress, setProgress] = useState(0)
  const [progressLabel, setProgressLabel] = useState("")
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors: number } | null>(null)
  const [showErrors, setShowErrors] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  // ERP kullanıcılarını çek
  useEffect(() => {
    if (open && !initialErpUsers) {
      fetch("/api/chat/users")
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => setErpUsers(data))
        .catch(() => {})
    }
  }, [open, initialErpUsers])

  // SSE dinleyici — import sırasında progress güncellemesi
  useEffect(() => {
    if (step !== "importing") return
    const es = new EventSource(`/api/chat/sse?conversationId=${conversationId}`)
    eventSourceRef.current = es

    es.addEventListener("import_progress", (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data)
        if (data.conversationId !== conversationId) return
        const pct = Math.round((data.done / data.total) * 100)
        setProgress(pct)
        setProgressLabel(
          `${data.done.toLocaleString("tr-TR")} / ${data.total.toLocaleString("tr-TR")} mesaj`
        )
      } catch {}
    })

    return () => {
      es.close()
      eventSourceRef.current = null
    }
  }, [step, conversationId])

  const resetState = () => {
    setStep("upload")
    setFile(null)
    setPreviewResult(null)
    setSenderMappings({})
    setProgress(0)
    setProgressLabel("")
    setImportResult(null)
    setShowErrors(false)
    setIsLoadingPreview(false)
  }

  const handleClose = () => {
    if (step === "importing") return // Import devam ederken kapatma
    resetState()
    onOpenChange(false)
  }

  // ── Dosya seçimi ──────────────────────────────────────────
  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped && dropped.name.endsWith(".zip")) {
      setFile(dropped)
    } else {
      toast.error("Lütfen geçerli bir .zip dosyası seçin")
    }
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected && selected.name.endsWith(".zip")) {
      setFile(selected)
    } else if (selected) {
      toast.error("Lütfen geçerli bir .zip dosyası seçin")
    }
  }

  // ── Ön izleme isteği ──────────────────────────────────────
  const handlePreview = async () => {
    if (!file) return
    setIsLoadingPreview(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("conversationId", conversationId)
      fd.append("preview", "true")
      fd.append("senderMappings", "{}")

      const res = await fetch("/api/chat/import", { method: "POST", body: fd })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? "Ön izleme hatası")
        return
      }
      const data: PreviewResult = await res.json()
      setPreviewResult(data)

      // Gönderenlerin varsayılan eşleşmesi: tek kullanıcılı ERP'de otomatik doldur
      if (data.allSenders.length === 1 && erpUsers.length > 0) {
        setSenderMappings({ [data.allSenders[0]]: erpUsers[0].id })
      }
      setStep("preview")
    } catch (e) {
      toast.error("Bağlantı hatası")
    } finally {
      setIsLoadingPreview(false)
    }
  }

  // ── İçe aktar ─────────────────────────────────────────────
  const handleImport = async () => {
    if (!file || !previewResult) return
    setStep("importing")
    setProgress(0)
    setProgressLabel("Hazırlanıyor...")

    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("conversationId", conversationId)
      fd.append("preview", "false")
      fd.append("senderMappings", JSON.stringify(senderMappings))

      const res = await fetch("/api/chat/import", { method: "POST", body: fd })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? "İçe aktarma hatası")
        setStep("preview")
        return
      }

      setImportResult(data)
      setProgress(100)
      setStep("done")
    } catch {
      toast.error("Bağlantı hatası")
      setStep("preview")
    }
  }

  // ── Gönderen eşleştirme değişimi ──────────────────────────
  const handleSenderMap = (senderName: string, erpUserId: string) => {
    setSenderMappings((prev) => ({
      ...prev,
      [senderName]: erpUserId === "__skip__" ? "" : erpUserId,
    }))
  }

  // ─── Render ─────────────────────────────────────────────────

  const renderUploadStep = () => (
    <div className="space-y-5">
      {/* Uyarı */}
      <Alert className="border-amber-500/30 bg-amber-500/5">
        <Info className="h-4 w-4 text-amber-500" />
        <AlertDescription className="text-sm text-muted-foreground">
          WhatsApp, dışa aktarımda genellikle <strong>son 10.000 mesaj</strong> veya belirli
          bir tarih aralığını içerir. Eski sohbetlerin tamamı için birden fazla dışa aktarım
          gerekebilir.
        </AlertDescription>
      </Alert>

      {/* Drag & Drop Alanı */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleFileDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed
          p-10 cursor-pointer transition-all duration-200
          ${isDragging ? "border-primary bg-primary/5 scale-[1.01]" : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30"}
        `}
      >
        <div className={`p-4 rounded-full transition-colors ${isDragging ? "bg-primary/10" : "bg-muted"}`}>
          <FileArchive className={`h-8 w-8 ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
        </div>
        {file ? (
          <div className="text-center">
            <p className="font-medium text-sm">{file.name}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        ) : (
          <div className="text-center">
            <p className="font-medium text-sm">Zip dosyasını sürükleyin veya tıklayın</p>
            <p className="text-xs text-muted-foreground mt-1">.zip formatı desteklenir</p>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".zip"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Nasıl export alınır */}
      <div className="rounded-lg bg-muted/40 p-4 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          WhatsApp'tan dışa aktarım nasıl yapılır?
        </p>
        <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
          <li>WhatsApp'ta ilgili sohbeti açın</li>
          <li>⋮ menüsü → <strong>Daha fazla</strong> → <strong>Sohbeti dışa aktar</strong></li>
          <li><strong>Medya dahil</strong> seçeneğini seçin (isteğe bağlı)</li>
          <li>Oluşturulan .zip dosyasını buraya yükleyin</li>
        </ol>
      </div>

      <Button
        className="w-full"
        disabled={!file || isLoadingPreview}
        onClick={handlePreview}
      >
        {isLoadingPreview ? (
          <span className="flex items-center gap-2">
            <span className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
            Analiz ediliyor...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <ChevronRight className="h-4 w-4" />
            Dosyayı Analiz Et
          </span>
        )}
      </Button>
    </div>
  )

  const renderPreviewStep = () => {
    if (!previewResult) return null
    const hasUnknown = previewResult.unknownSenders.length > 0

    return (
      <div className="space-y-5">
        {/* Özet */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-muted/40 p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <MessageSquare className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{previewResult.messageCount.toLocaleString("tr-TR")}</p>
              <p className="text-xs text-muted-foreground">Mesaj</p>
            </div>
          </div>
          <div className="rounded-lg bg-muted/40 p-4 flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Image className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{previewResult.mediaCount.toLocaleString("tr-TR")}</p>
              <p className="text-xs text-muted-foreground">Medya</p>
            </div>
          </div>
        </div>

        {/* Tarih aralığı */}
        <div className="rounded-lg bg-muted/40 px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Tarih aralığı</span>
          <span className="text-sm font-medium">
            {formatDate(previewResult.dateFrom)} — {formatDate(previewResult.dateTo)}
          </span>
        </div>

        {/* Format */}
        <div className="flex items-center justify-between rounded-lg bg-muted/40 px-4 py-3">
          <span className="text-sm text-muted-foreground">Tespit edilen format</span>
          <Badge variant="secondary" className="font-mono text-xs">
            {previewResult.detectedFormat}
          </Badge>
        </div>

        {/* Gönderen eşleştirme */}
        {hasUnknown && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-amber-500" />
              <p className="text-sm font-medium">Gönderen Eşleştirme</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Aşağıdaki WhatsApp kullanıcıları ERP'de tanımlı değil. Her birini mevcut bir
              ERP kullanıcısıyla eşleştirin (eşleştirilmeyenler sizin adınıza görünür).
            </p>
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {previewResult.unknownSenders.map((sender) => (
                <div
                  key={sender}
                  className="flex items-center justify-between gap-3 rounded-lg bg-muted/30 px-3 py-2"
                >
                  <span className="text-sm font-medium truncate max-w-[45%]">{sender}</span>
                  <Select
                    value={senderMappings[sender] || "__skip__"}
                    onValueChange={(v) => handleSenderMap(sender, v)}
                  >
                    <SelectTrigger className="h-8 text-xs w-52">
                      <SelectValue placeholder="ERP kullanıcısı seç" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__skip__">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <SkipForward className="h-3 w-3" />
                          Benim adıma kaydet
                        </span>
                      </SelectItem>
                      {erpUsers.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Parse hataları */}
        {previewResult.parseErrors.length > 0 && (
          <div>
            <button
              className="flex items-center gap-2 text-sm text-amber-500 hover:underline"
              onClick={() => setShowErrors((v) => !v)}
            >
              <AlertTriangle className="h-4 w-4" />
              {previewResult.parseErrors.length} satır parse edilemedi
              <span className="text-xs text-muted-foreground">({showErrors ? "gizle" : "göster"})</span>
            </button>
            {showErrors && (
              <div className="mt-2 max-h-32 overflow-y-auto rounded-lg bg-destructive/5 p-3 space-y-1">
                {previewResult.parseErrors.map((e) => (
                  <div key={e.line} className="text-xs text-muted-foreground">
                    <span className="font-mono text-destructive">Satır {e.line}:</span>{" "}
                    {e.reason} — <span className="opacity-60 truncate">{e.raw.slice(0, 60)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Butonlar */}
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => setStep("upload")}>
            Geri
          </Button>
          <Button className="flex-1" onClick={handleImport}>
            <Upload className="h-4 w-4 mr-2" />
            İçe Aktar
          </Button>
        </div>
      </div>
    )
  }

  const renderImportingStep = () => (
    <div className="space-y-6 py-4">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="p-5 bg-primary/10 rounded-full">
            <Upload className="h-8 w-8 text-primary animate-bounce" />
          </div>
        </div>
        <div className="text-center">
          <p className="font-medium">İçe Aktarılıyor...</p>
          <p className="text-sm text-muted-foreground mt-1">{progressLabel}</p>
        </div>
      </div>
      <Progress value={progress} className="h-2" />
      <p className="text-center text-sm font-medium">{progress}%</p>
      <p className="text-center text-xs text-muted-foreground">
        Bu işlem dosya boyutuna göre birkaç dakika sürebilir. Lütfen pencereyi kapatmayın.
      </p>
    </div>
  )

  const renderDoneStep = () => (
    <div className="space-y-6 py-4">
      <div className="flex flex-col items-center gap-4">
        <div className="p-5 bg-green-500/10 rounded-full">
          <CheckCircle2 className="h-8 w-8 text-green-500" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-lg">İçe Aktarma Tamamlandı!</p>
          <p className="text-sm text-muted-foreground mt-1">
            Mesajlar sohbete kronolojik olarak eklendi.
          </p>
        </div>
      </div>

      {importResult && (
        <div className="rounded-xl bg-muted/40 p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">İçe aktarılan</span>
            <span className="font-semibold text-green-500">
              {importResult.imported.toLocaleString("tr-TR")} mesaj
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Atlanan (tekrar)</span>
            <span className="font-medium">{importResult.skipped.toLocaleString("tr-TR")}</span>
          </div>
          {importResult.errors > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Parse hatası</span>
              <span className="font-medium text-amber-500">{importResult.errors}</span>
            </div>
          )}
        </div>
      )}

      <Button className="w-full" onClick={handleClose}>
        Kapat
      </Button>
    </div>
  )

  const stepTitles: Record<Step, string> = {
    upload: "WhatsApp Geçmişini İçe Aktar",
    preview: "İçe Aktarma Önizlemesi",
    importing: "İçe Aktarılıyor",
    done: "Tamamlandı",
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-base font-bold">{stepTitles[step]}</span>
            {conversationName && (
              <Badge variant="outline" className="text-xs font-normal max-w-[150px] truncate">
                {conversationName}
              </Badge>
            )}
          </DialogTitle>
          {step === "upload" && (
            <DialogDescription>
              WhatsApp'tan dışa aktardığınız (.zip) dosyayı yükleyerek bu sohbetin
              geçmişini ERP'ye taşıyın.
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="mt-2">
          {step === "upload" && renderUploadStep()}
          {step === "preview" && renderPreviewStep()}
          {step === "importing" && renderImportingStep()}
          {step === "done" && renderDoneStep()}
        </div>
      </DialogContent>
    </Dialog>
  )
}
