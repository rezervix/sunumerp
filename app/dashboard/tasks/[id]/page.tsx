"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeft, Bot, Sparkles, MessageSquare, CheckCircle2, Clock3, AlertCircle } from "lucide-react"

interface TaskDetail {
  id: string
  title: string
  description?: string | null
  status?: string | null
  priority?: string | null
  dueDate?: string | null
  customerId?: string | null
  customer?: { id: string; name?: string | null; company?: string | null }
}

export default function TaskDetailPage() {
  const params = useParams()
  const router = useRouter()
  const taskId = params?.id as string

  const [task, setTask] = useState<TaskDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiInsight, setAiInsight] = useState<any>(null)

  useEffect(() => {
    const loadTask = async () => {
      if (!taskId) return
      try {
        const res = await fetch(`/api/customers/relations?type=task&id=${taskId}`)
        if (!res.ok) throw new Error("Görev bulunamadı")
        const found = await res.json()
        if (found?.id) {
          setTask(found)
        }
      } catch {
        toast.error("Görev detayı yüklenemedi")
      } finally {
        setLoading(false)
      }
    }

    loadTask()
  }, [taskId])

  const handleCustomerVision = async () => {
    if (!task?.customerId) {
      toast.error("Bu göreve bağlı müşteri bulunamadı")
      return
    }

    setAiLoading(true)
    try {
      const res = await fetch("/api/ai/customer-vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: task.customerId,
          branchId: task.customer?.id ? undefined : undefined,
          text: `${task.title}\n\n${task.description || ""}`,
        }),
      })

      if (!res.ok) throw new Error("AI analizi oluşturulamadı")
      const data = await res.json()
      setAiInsight(data.insight)
      toast.success("Müşteri vizyonu oluşturuldu")
    } catch {
      toast.error("AI asistanı çalışamadı")
    } finally {
      setAiLoading(false)
    }
  }

  const statusTone = useMemo(() => {
    const status = task?.status || ""
    if (status.includes("Tamamlandı")) return "bg-emerald-100 text-emerald-700"
    if (status.includes("Bekliyor") || status.includes("Aşamasında")) return "bg-amber-100 text-amber-700"
    return "bg-slate-100 text-slate-700"
  }, [task?.status])

  if (loading) {
    return <div className="p-8 text-sm text-muted-foreground">Yükleniyor...</div>
  }

  if (!task) {
    return <div className="p-8 text-sm text-muted-foreground">Görev bulunamadı.</div>
  }

  return (
    <div className="space-y-6">
      <button onClick={() => router.back()} className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
        <ArrowLeft size={16} /> Geri dön
      </button>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Görev Detayı</p>
            <h1 className="text-2xl font-bold text-foreground">{task.title}</h1>
          </div>
          <span className={`rounded-full px-3 py-1 text-sm font-semibold ${statusTone}`}>{task.status || "Belirsiz"}</span>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3 text-sm text-muted-foreground">
          <div className="rounded-xl bg-muted/40 p-3">
            <p className="text-[11px] uppercase tracking-wide">Öncelik</p>
            <p className="mt-1 font-semibold text-foreground">{task.priority || "Normal"}</p>
          </div>
          <div className="rounded-xl bg-muted/40 p-3">
            <p className="text-[11px] uppercase tracking-wide">Son Tarih</p>
            <p className="mt-1 font-semibold text-foreground">{task.dueDate ? new Date(task.dueDate).toLocaleDateString("tr-TR") : "Belirtilmedi"}</p>
          </div>
          <div className="rounded-xl bg-muted/40 p-3">
            <p className="text-[11px] uppercase tracking-wide">Müşteri</p>
            <p className="mt-1 font-semibold text-foreground">{task.customer?.name || "—"}</p>
          </div>
        </div>

        {task.description && (
          <div className="mt-6 rounded-xl border border-border bg-background/50 p-4">
            <h2 className="text-sm font-semibold text-foreground">Açıklama</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{task.description}</p>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/8 to-transparent p-6 shadow-soft">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-primary">
              <Bot size={18} />
              <h2 className="text-lg font-semibold">Müşteri Vizyonu & Geçmiş Revizeler</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">AI asistanı görev bağlamını kullanarak müşteri vizyonu, riskler ve bir sonraki adımları özetler.</p>
          </div>
          <button onClick={handleCustomerVision} disabled={aiLoading} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            {aiLoading ? "Çalışıyor..." : "AI Analizi Oluştur"}
          </button>
        </div>

        {aiInsight ? (
          <div className="mt-5 space-y-4">
            <div className="rounded-xl border border-border bg-background/70 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Sparkles size={16} className="text-primary" />
                Özet
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{aiInsight.summary}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-border bg-background/70 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  Tercihler
                </div>
                <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                  {(aiInsight.preferences || []).map((item: string, index: number) => <li key={index}>• {item}</li>)}
                </ul>
              </div>
              <div className="rounded-xl border border-border bg-background/70 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <AlertCircle size={16} className="text-amber-600" />
                  Riskler
                </div>
                <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                  {(aiInsight.redFlags || []).map((item: string, index: number) => <li key={index}>• {item}</li>)}
                </ul>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-background/70 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <MessageSquare size={16} className="text-primary" />
                Bir sonraki adım
              </div>
              <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                {(aiInsight.nextActions || []).map((item: string, index: number) => <li key={index}>• {item}</li>)}
              </ul>
            </div>
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-dashed border-border bg-background/40 p-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Clock3 size={16} />
              Henüz analiz yok. Butona basarak AI asistanı ile özet ve sonraki adımlar oluşturabilirsiniz.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
