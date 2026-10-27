"use client"

import { useEffect, useMemo, useState, type ChangeEvent } from "react"
import { useAuth } from "@/lib/auth/context"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { UploadCloud, FileText, CheckCircle2, Loader2 } from "lucide-react"

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

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    if (!file.name.toLowerCase().endsWith(".txt")) {
      toast.error("Lütfen yalnızca .txt uzantılı WhatsApp sohbet dosyası seçin.")
      return
    }

    const textContent = await file.text()
    setText(textContent)
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
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">AI Destekli Revizyon Optimizasyonu</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            WhatsApp metinlerini yükleyin, müşteri taleplerini ve red-flag noktalarını hızlıca çıkarın.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-2 text-sm text-primary">
            <FileText size={16} /> {currentBranch ? currentBranch.name : "Şube seçilmedi"}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-2 text-sm text-muted-foreground">
            <UploadCloud size={16} /> {fileName || ".txt dosyası seçin"}
          </span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <section className="space-y-4 rounded-3xl border border-border bg-white dark:bg-[#1f2428] p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-primary/10 p-3 text-primary">
              <UploadCloud size={18} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">WhatsApp Metni Yükle</h2>
              <p className="text-sm text-muted-foreground">Dosya seçin veya metni yapıştırın.</p>
            </div>
          </div>

          <div className="grid gap-4">
            <label className="block text-sm font-medium text-foreground">Müşteri / Proje Adı (opsiyonel)</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Müşteri adı veya proje başlığı"
              className="w-full rounded-2xl border border-border bg-muted/50 px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
            />

            <label className="block text-sm font-medium text-foreground">WhatsApp .txt İçeriği</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={12}
              placeholder="WhatsApp metnini buraya yapıştırın veya sağdan dosya seçin."
              className="w-full resize-none rounded-3xl border border-border bg-muted/50 px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
            />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label className="cursor-pointer rounded-3xl border border-border bg-muted/70 px-4 py-3 text-sm transition hover:bg-muted">
                Dosya seç (.txt)
                <input type="file" accept=".txt" className="hidden" onChange={handleFileChange} />
              </label>
              <Button onClick={handleSubmit} disabled={isSubmitting || !canUseAi}>
                {isSubmitting ? <><Loader2 size={16} className="mr-2 animate-spin" /> Analiz Et</> : "Analiz Et ve Kaydet"}
              </Button>
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-3xl border border-border bg-white dark:bg-[#1f2428] p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Son Analizler</h2>
              <p className="text-sm text-muted-foreground">En son revizyon analizlerinize hızlıca erişin.</p>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[220px] items-center justify-center text-muted-foreground">
              <Loader2 size={20} className="animate-spin" />
            </div>
          ) : analyses.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Burada kaydedilmiş herhangi bir analiz yok.
            </div>
          ) : (
            <div className="space-y-4">
              {analyses.map((analysis) => (
                <article key={analysis.id} className="rounded-3xl border border-border p-4 bg-muted/50">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-foreground">{analysis.customerName || "İsimsiz Müşteri"}</h3>
                      <p className="text-xs text-muted-foreground">{new Date(analysis.createdAt).toLocaleString("tr-TR")}</p>
                    </div>
                    {analysis.uploadedBy?.fullName ? (
                      <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-foreground">{analysis.uploadedBy.fullName}</span>
                    ) : null}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-white p-3 text-sm text-foreground shadow-sm">
                      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-2">Özet</div>
                      <p className="text-sm leading-6">{analysis.summary}</p>
                    </div>
                    <div className="space-y-3">
                      <div className="rounded-2xl bg-white p-3 text-sm shadow-sm">
                        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-2">Tercihler</div>
                        {analysis.preferences.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Belirtilen tercih yok.</p>
                        ) : (
                          <ul className="list-disc space-y-1 pl-5 text-sm text-foreground">
                            {analysis.preferences.map((item, idx) => (
                              <li key={idx}>{item}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div className="rounded-2xl bg-white p-3 text-sm shadow-sm">
                        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-2">Red Flag</div>
                        {analysis.redFlags.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Herhangi bir uyarı ifadesi bulunamadı.</p>
                        ) : (
                          <ul className="list-disc space-y-1 pl-5 text-sm text-foreground">
                            {analysis.redFlags.map((item, idx) => (
                              <li key={idx}>{item}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
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
