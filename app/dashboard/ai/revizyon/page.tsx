"use client"

import React, { useEffect, useMemo, useState, useRef, type ChangeEvent } from "react"
import { useAuth } from "@/lib/auth/context"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Upload, FileText, CheckCircle2, Loader2, Sparkles, AlertCircle } from "lucide-react"
import { safeText, safeDate } from "@/lib/utils/safe-display"

type AnalysisRecord = {
  id: string
  branchId: string
  uploadedById: string
  customerName: string | null
  sourceText: string
  summary: string
  preferences: string[]
  redFlags: string[]
  createdAt: string
  uploadedBy?: { id: string; fullName: string }
}

export default function AiRevizyonPage() {
  const { currentBranch, hasPermission, isSuperAdmin, loading: authLoading } = useAuth()
  const [text, setText] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [fileName, setFileName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const dragCounter = useRef(0)

  const canUseAi = useMemo(() => {
    if (isSuperAdmin) return true
    return hasPermission("ai", "read") || hasPermission("ai", "upload")
  }, [hasPermission, isSuperAdmin])

  useEffect(() => {
    if (!authLoading && !canUseAi) {
      toast.error("Bu sayfaya erişim yetkiniz yok.")
    }
  }, [authLoading, canUseAi])

  useEffect(() => {
    if (!currentBranch) return
    loadAnalyses()
  }, [currentBranch])

  const loadAnalyses = async () => {
    if (!currentBranch) return
    setLoading(true)
    try {
      const res = await fetch(`/api/ai/revision-analysis?branchId=${currentBranch.id}`)
      if (!res.ok) throw new Error("Veri alınamadı")
      const data = await res.json()
      setAnalyses(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error(error)
      toast.error("AI analizleri yüklenemedi")
    } finally {
      setLoading(false)
    }
  }

  const handleFileProcess = async (file: File) => {
    setFileName(file.name)
    if (!file.name.toLowerCase().endsWith(".txt")) {
      toast.error("Lütfen yalnızca .txt uzantılı WhatsApp sohbet dosyası seçin.")
      return
    }

    const textContent = await file.text()
    setText(textContent)
    toast.success(`${file.name} başarıyla okundu.`)
  }

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    await handleFileProcess(file)
  }

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

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    dragCounter.current = 0
    if (e.dataTransfer.files?.length) {
      await handleFileProcess(e.dataTransfer.files[0])
    }
  }

  const handleSubmit = async () => {
    if (!currentBranch) return
    if (!text.trim()) {
      toast.error("Metin alanı boş olamaz")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/ai/revision-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId: currentBranch.id,
          customerName: customerName || undefined,
          text,
        }),
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        throw new Error(payload?.error || "Yükleme başarısız")
      }
      const record = await res.json()
      toast.success("Revizyon analizi kaydedildi")
      setCustomerName("")
      setFileName("")
      setText("")
      setAnalyses((prev) => [record, ...prev])
    } catch (error: any) {
      console.error(error)
      toast.error(error?.message || "İşlem sırasında hata oluştu")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between pb-4 border-b border-[--line]">
        <div>
          <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight text-[--text]">AI Destekli Revizyon Optimizasyonu</h1>
          <p className="text-sm text-[--text-muted] mt-1 max-w-2xl">
            WhatsApp metinlerini yükleyin, müşteri taleplerini, tercihlerini ve potansiyel red-flag uyarılarını saniyeler içinde çıkarın.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-[--brand-soft] border border-[--brand-line] px-3 py-1.5 text-xs text-[--brand] font-medium shadow-xs">
            <FileText size={14} /> {currentBranch ? currentBranch.name : "Şube seçilmedi"}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-white border border-[--line] px-3 py-1.5 text-xs text-[--text-2] font-mono shadow-xs">
            <Upload size={14} className="text-[--text-muted]" /> {fileName || ".txt dosyası bekliyor"}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Upload & Form Section */}
        <section className="space-y-5 rounded-[20px] border border-[--line] bg-white/80 backdrop-blur-xl p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-[--brand-soft] border border-[--brand-line] p-3 text-[--brand] shadow-sm">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[--navy]">WhatsApp Metni Yükle &amp; Analiz Et</h2>
              <p className="text-xs text-[--text-muted]">Metin dosyasını sürükleyip bırakın veya metni yapıştırın.</p>
            </div>
          </div>

          {/* Interactive Drag & Drop Area */}
          <div
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
              isDragging
                ? "border-[--brand] bg-[--brand-soft]/50 shadow-sm"
                : "border-[--line] bg-[--page] hover:border-[--brand] hover:bg-white"
            }`}
          >
            <div className="flex flex-col items-center gap-2">
              <div className="size-10 rounded-xl bg-[--brand-soft] border border-[--brand-line] flex items-center justify-center text-[--brand]">
                <Upload size={18} />
              </div>
              <p className="text-xs text-[--text] font-medium">
                {fileName ? fileName : "WhatsApp .txt sohbet dosyasını buraya sürükleyin"}
              </p>
              <label className="cursor-pointer text-xs font-semibold text-[--brand] hover:text-[--brand-hover] underline underline-offset-4">
                veya cihazdan dosya seçin
                <input type="file" accept=".txt" className="hidden" onChange={handleFileChange} />
              </label>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[--text-2]">Müşteri / Proje Adı (opsiyonel)</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Örn: Levent Loft - Revizyon Grubu"
                className="w-full rounded-xl border border-[--line] bg-white px-4 py-2.5 text-xs text-[--text] placeholder:text-[--text-muted] outline-none focus:border-[--brand] focus:ring-1 focus:ring-[--brand] shadow-sm transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[--text-2]">WhatsApp Metin İçeriği</label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={10}
                placeholder="WhatsApp metnini buraya yapıştırın veya yukarıdaki alandan dosya bırakın..."
                className="w-full resize-none rounded-xl border border-[--line] bg-white px-4 py-3 text-xs text-[--text] placeholder:text-[--text-muted] outline-none focus:border-[--brand] focus:ring-1 focus:ring-[--brand] leading-relaxed font-mono shadow-sm transition-all"
              />
            </div>

            <div className="flex items-center justify-end pt-1">
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !canUseAi}
                className="bg-gradient-to-r from-[--brand] to-[--blue] hover:opacity-90 text-white font-medium text-xs px-5 py-2.5 rounded-xl shadow-sm transition-all"
              >
                {isSubmitting ? (
                  <><Loader2 size={14} className="mr-2 animate-spin" /> AI Analiz Ediyor...</>
                ) : (
                  <><Sparkles size={14} className="mr-1.5" /> Analiz Et ve Kaydet</>
                )}
              </Button>
            </div>
          </div>
        </section>

        {/* Right Section: Past Analyses */}
        <section className="space-y-5 rounded-[20px] border border-[--line] bg-white/80 backdrop-blur-xl p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-[--ok-soft] border border-[--ok-soft] p-3 text-[--ok]">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[--navy]">Geçmiş Analizler</h2>
              <p className="text-xs text-[--text-muted]">Kayıtlı revizyon analizleri ve içgörüler.</p>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[220px] items-center justify-center text-[--text-muted]">
              <Loader2 size={22} className="animate-spin text-[--brand]" />
            </div>
          ) : analyses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[--line] p-8 text-center text-xs text-[--text-muted]">
              Kayıtlı herhangi bir analiz bulunmuyor.
            </div>
          ) : (
            <div className="space-y-4 max-h-[640px] overflow-y-auto pr-1">
              {analyses.map((analysis) => (
                <article key={analysis.id} className="rounded-2xl border border-[--line] p-4 bg-white hover:bg-[--brand-soft]/20 transition-all space-y-3 shadow-xs">
                  <div className="flex items-center justify-between gap-2 border-b border-[--line] pb-2">
                    <div>
                      <h3 className="text-sm font-semibold text-[--navy]">{safeText(analysis.customerName, "İsimsiz Müşteri / Sohbet")}</h3>
                      <p className="text-[10px] text-[--text-muted] font-mono mt-0.5">{safeDate(analysis.createdAt)}</p>
                    </div>
                    {analysis.uploadedBy?.fullName && (
                      <span className="rounded-full bg-[--muted-bg] border border-[--line] px-2.5 py-0.5 text-[10px] font-mono text-[--text-2]">
                        {analysis.uploadedBy.fullName}
                      </span>
                    )}
                  </div>

                  <div className="space-y-2.5">
                    {/* Özet */}
                    <div className="rounded-xl bg-[--page] border border-[--line] p-3 text-xs text-[--text]">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-[--brand] mb-1">Özet</div>
                      <p className="text-xs leading-relaxed text-[--text-2]">{analysis.summary}</p>
                    </div>

                    {/* Tercihler */}
                    {analysis.preferences?.length > 0 && (
                      <div className="rounded-xl bg-[--page] border border-[--line] p-3 text-xs text-[--text]">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-[--navy] mb-1">Müşteri Tercihleri</div>
                        <ul className="list-disc space-y-1 pl-4 text-xs text-[--text-2]">
                          {analysis.preferences.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Red Flags */}
                    {analysis.redFlags?.length > 0 && (
                      <div className="rounded-xl bg-[--bad-soft] border border-[--bad-soft] p-3 text-xs text-[--bad]">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-[--bad] mb-1 flex items-center gap-1">
                          <AlertCircle size={12} />
                          Risk &amp; Red Flag Uyarıları
                        </div>
                        <ul className="list-disc space-y-1 pl-4 text-xs text-[--bad]">
                          {analysis.redFlags.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
