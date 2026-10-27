"use client"

import React, { useState, useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { LifeBuoy, X, PenTool, RotateCcw, Camera, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { getConsoleLogs, getNetworkLogs } from "@/lib/utils/log-capturer"

function getModuleName(path: string): string {
  if (path.startsWith("/dashboard/orders")) return "Sipariş Yönetimi"
  if (path.startsWith("/dashboard/b2b")) return "Mağaza Yönetimi"
  if (path.startsWith("/dashboard/customers")) return "Müşteri Yönetimi"
  if (path.startsWith("/dashboard/hr")) return "İnsan Kaynakları"
  if (path.startsWith("/dashboard/projects")) return "Proje Yönetimi"
  if (path.startsWith("/dashboard/leads")) return "Müşteri Adayı Yönetimi"
  if (path.startsWith("/dashboard/cargo")) return "Kargo Yönetimi"
  if (path.startsWith("/dashboard/files")) return "Dosya Depolama"
  if (path.startsWith("/dashboard/ajans-kutuphanesi")) return "Ajans Kütüphanesi"
  if (path.startsWith("/dashboard/icerik-magazasi")) return "İçerik Mağazası"
  if (path.startsWith("/dashboard/tasks")) return "Görev Yönetimi"
  if (path.startsWith("/dashboard/todos")) return "Yapılacaklar"
  if (path.startsWith("/dashboard/notes")) return "Notlarım"
  if (path.startsWith("/dashboard/hesaplama-araci")) return "Hesaplama Aracı"
  if (path.startsWith("/dashboard/finance")) return "Finans Yönetimi"
  if (path.startsWith("/dashboard/sosyal-medya")) return "Sosyal Medya"
  if (path.startsWith("/dashboard/icerik-takvimi")) return "İçerik Takvimi"
  if (path.startsWith("/dashboard/chat")) return "Mesajlaşma (Chat)"
  if (path.startsWith("/dashboard/announcements")) return "Duyurular"
  if (path.startsWith("/dashboard/settings")) return "Sistem Ayarları"
  if (path === "/dashboard") return "Dashboard Ana Sayfa"
  return "ERP Genel"
}

export function SupportWidget() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [capturing, setCapturing] = useState(false)
  const [screenshot, setScreenshot] = useState<string | null>(null)

  // Form Fields
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("ui_bug")
  const [priority, setPriority] = useState("medium")

  // Canvas Drawing
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const lastPos = useRef({ x: 0, y: 0 })

  // Trigger screenshot capture
  const handleOpenWidget = async () => {
    setIsOpen(true)
    setCapturing(true)
    setScreenshot(null)

    // Hide FAB momentarily so it is not in the screenshot
    const fab = document.getElementById("support-widget-fab")
    if (fab) fab.style.display = "none"

    try {
      const html2canvasPro = (await import("html2canvas-pro")).default
      // Capture whole body content
      const canvas = await html2canvasPro(document.body, {
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: null,
        ignoreElements: (element) => {
          // Ignore support modals or indicators
          return element.id === "support-widget-modal" || element.classList.contains("toast")
        }
      })

      const dataUrl = canvas.toDataURL("image/png")
      setScreenshot(dataUrl)
    } catch (e) {
      console.error("Screenshot capture failed:", e)
      toast.error("Ekran görüntüsü otomatik alınamadı. Manuel açıklamaya devam edebilirsiniz.")
    } finally {
      setCapturing(false)
      if (fab) fab.style.display = "flex"
    }
  }

  // Initialize Canvas Image
  useEffect(() => {
    if (!screenshot || !isOpen || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const img = new Image()
    img.src = screenshot
    img.onload = () => {
      // Draw screenshot to matches its native resolution
      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)
    }
  }, [screenshot, isOpen])

  const getCanvasMousePos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    
    // Check if touch or mouse event
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY

    // Calculate canvas coordinates based on element scaling
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    }
  }

  // Drawing Events
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (e.cancelable) e.preventDefault()
    setIsDrawing(true)
    const pos = getCanvasMousePos(e)
    lastPos.current = pos

    const ctx = canvasRef.current?.getContext("2d")
    if (ctx) {
      ctx.beginPath()
      ctx.moveTo(pos.x, pos.y)
    }
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    if (e.cancelable) e.preventDefault()
    const pos = getCanvasMousePos(e)

    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return

    ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = "#E2483E" // Red color marker
    ctx.lineWidth = Math.max(6, canvas.width / 150) // Adjust thickness depending on screen resolution
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.stroke()
    
    lastPos.current = pos
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const resetCanvas = () => {
    if (!screenshot || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const img = new Image()
    img.src = screenshot
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!description.trim()) {
      toast.error("Lütfen hata açıklamasını yazın.")
      return
    }

    setLoading(true)

    try {
      const formData = new FormData()
      formData.append("description", description)
      formData.append("title", title)
      formData.append("category", category)
      formData.append("priority", priority)
      formData.append("pageUrl", typeof window !== "undefined" ? window.location.href : pathname)
      formData.append("moduleName", getModuleName(pathname))

      // Collect system info
      const browserInfo = {
        userAgent: navigator.userAgent,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        viewportSize: `${window.innerWidth}x${window.innerHeight}`,
        devicePixelRatio: window.devicePixelRatio
      }
      formData.append("browserInfo", JSON.stringify(browserInfo))
      formData.append("appVersion", "1.0.0")

      // Collect logs from ring buffer
      formData.append("consoleLogs", JSON.stringify(getConsoleLogs()))
      formData.append("networkLogs", JSON.stringify(getNetworkLogs()))

      // Screenshot file if canvas drawn/exists
      if (canvasRef.current) {
        const drawBlob = await new Promise<Blob | null>((resolve) => {
          canvasRef.current?.toBlob((blob) => resolve(blob), "image/png", 0.9)
        })
        if (drawBlob) {
          formData.append("screenshot", drawBlob, "screenshot.png")
        }
      }

      const res = await fetch("/api/support-tickets", {
        method: "POST",
        body: formData
      })

      const data = await res.json()
      if (res.ok) {
        toast.success(`Hata bildiriminiz iletildi! Talep ID: #${data.ticketId.substring(0, 8)}`)
        // Clear fields
        setDescription("")
        setTitle("")
        setIsOpen(false)
      } else {
        toast.error(data.error || "Bildirim gönderilirken hata oluştu.")
      }
    } catch (err) {
      console.error(err)
      toast.error("Ağ bağlantı hatası oluştu.")
    } finally {
      setLoading(false)
    }
  }

  const consoleLogsCount = getConsoleLogs().filter(l => l.type === "error").length
  const failedRequestsCount = getNetworkLogs().length

  return (
    <>
      {/* Floating Action Button (FAB) */}
      <button
        id="support-widget-fab"
        onClick={handleOpenWidget}
        className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform duration-200 hover:scale-105 active:scale-95 focus:outline-none cursor-pointer"
        title="Destek Talebi / Hata Bildir"
      >
        <LifeBuoy size={24} className="animate-spin-slow" />
      </button>

      {/* Support Request Modal */}
      {isOpen && (
        <div
          id="support-widget-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
        >
          <div className="relative w-full max-w-3xl bg-card border border-border rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[90vh] tw-animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-muted/40">
              <div className="flex items-center gap-2">
                <LifeBuoy className="text-primary size-5" />
                <h3 className="text-md font-semibold text-foreground">Teknik Destek ve Hata Bildirimi</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-muted-foreground hover:text-foreground hover:bg-muted/80 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Title (Optional) */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-foreground">Kısa Başlık (Opsiyonel)</label>
                    <input
                      type="text"
                      className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-primary"
                      placeholder={`[${getModuleName(pathname)}] Hata bildirme`}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>

                  {/* Category */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-foreground">Hata Kategorisi</label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-primary cursor-pointer"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      <option value="ui_bug">Arayüz var ama çalışmıyor / Arayüz Bozuk</option>
                      <option value="backend_error">Sistem hata mesajı veriyor</option>
                      <option value="data_issue">Veriler hatalı / Gösterilmiyor</option>
                      <option value="performance">Çok yavaş çalışıyor</option>
                      <option value="missing_feature">Yeni özellik önerisi</option>
                      <option value="other">Diğer</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Priority */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-foreground">Öncelik Seviyesi</label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-primary cursor-pointer"
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                    >
                      <option value="low">Düşük</option>
                      <option value="medium">Orta (Varsayılan)</option>
                      <option value="high">Yüksek</option>
                      <option value="critical">🚨 Kritik (İşin durması / Sistem çökmesi)</option>
                    </select>
                  </div>

                  {/* Current Route Info Display */}
                  <div className="flex flex-col justify-end text-xs text-muted-foreground p-3 border border-border/60 bg-muted/20 rounded-md">
                    <div><span className="font-semibold text-foreground">Modül:</span> {getModuleName(pathname)}</div>
                    <div className="truncate"><span className="font-semibold text-foreground">Sayfa URL:</span> {pathname}</div>
                  </div>
                </div>

                {/* Description (Required) */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-foreground">Karşılaştığınız Sorunu Açıklayın *</label>
                  <textarea
                    rows={3}
                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-primary"
                    placeholder="Lütfen hatayı tetikleyen adımları veya hatayla ilgili detayları yazın..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                  />
                </div>

                {/* Screenshot & Drawing Tool */}
                {screenshot && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm font-medium text-foreground">
                      <span className="flex items-center gap-1.5">
                        <PenTool size={16} className="text-primary" />
                        Ekran Görüntüsü Marker (Kırmızı kalemle işaretleyebilirsiniz)
                      </span>
                      <button
                        type="button"
                        onClick={resetCanvas}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      >
                        <RotateCcw size={12} />
                        İşaretleri Temizle
                      </button>
                    </div>

                    <div className="border border-border rounded-lg overflow-hidden bg-muted/40 relative max-h-[300px] flex items-center justify-center">
                      <canvas
                        ref={canvasRef}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                        className="max-w-full max-h-[300px] object-contain cursor-crosshair"
                        style={{ touchAction: "none" }}
                      />
                    </div>
                  </div>
                )}

                {capturing && (
                  <div className="border border-dashed border-border rounded-lg p-8 flex flex-col items-center justify-center gap-2 text-muted-foreground bg-muted/10">
                    <Loader2 size={32} className="animate-spin text-primary" />
                    <span className="text-sm">Ekran görüntüsü alınıyor, lütfen bekleyin...</span>
                  </div>
                )}

                {!screenshot && !capturing && (
                  <div className="border border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center gap-2 text-muted-foreground bg-muted/10">
                    <Camera size={28} />
                    <span className="text-sm text-center">Ekran görüntüsü alınamadı. Manuel hata kaydı oluşturulabilir.</span>
                  </div>
                )}

                {/* Automatically Captured Info Disclosure */}
                <div className="rounded-lg border border-border/80 bg-muted/30 p-3 text-xs text-muted-foreground leading-normal space-y-1">
                  <p className="font-semibold text-foreground flex items-center gap-1">
                    ℹ️ Sistem Tarafından Otomatik Eklenecek Veriler:
                  </p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    <li>Kullanıcı arayüzü URL'i ve o an açık olan ERP modülü adı</li>
                    <li>Tarayıcı User-Agent, ekran çözünürlüğü ve pencere boyutları</li>
                    <li>
                      Ring-buffer'dan son 20 console.error hatası
                      {consoleLogsCount > 0 ? (
                        <span className="text-red-500 font-semibold ml-1">({consoleLogsCount} hata tespit edildi)</span>
                      ) : (
                        <span className="text-emerald-500 font-semibold ml-1">(Temiz)</span>
                      )}
                    </li>
                    <li>
                      Son 10 başarısız API network çağrısı (istek gövdeleri ve şifre/tokenlar maskelenmiştir)
                      {failedRequestsCount > 0 ? (
                        <span className="text-red-500 font-semibold ml-1">({failedRequestsCount} başarısız çağrı tespit edildi)</span>
                      ) : (
                        <span className="text-emerald-500 font-semibold ml-1">(Temiz)</span>
                      )}
                    </li>
                  </ul>
                </div>

                {/* Submit Action */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="flex h-10 items-center justify-center rounded-md border border-input bg-transparent px-4 py-2 text-sm font-medium shadow-xs hover:bg-muted focus-visible:outline-none cursor-pointer"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    disabled={loading || capturing}
                    className="flex h-10 items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground px-5 py-2 text-sm font-semibold shadow-md hover:bg-primary/95 active:scale-98 disabled:opacity-50 cursor-pointer transition-all"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Gönderiliyor...
                      </>
                    ) : (
                      "Destek Talebini Gönder"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
