"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeft, Bot, Sparkles, MessageSquareText, CheckCircle2, Clock, AlertCircle } from "lucide-react"

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
    if (status.includes("Tamamlandı")) return "bg-[--ok-soft] text-[--ok] border border-[--ok]/20"
    if (status.includes("Bekliyor") || status.includes("Aşamasında")) return "bg-[--warn-soft] text-[--warn] border border-[--warn]/20"
    return "bg-[--muted-bg] text-[--text-muted] border border-[--line]"
  }, [task?.status])

  if (loading) {
    return <div className="p-8 text-xs text-[--text-muted]">Yükleniyor...</div>
  }

  if (!task) {
    return <div className="p-8 text-xs text-[--text-muted]">Görev bulunamadı.</div>
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1200px] mx-auto">
      <button onClick={() => router.back()} className="inline-flex items-center gap-2 text-xs font-semibold text-[--text-muted] hover:text-[--brand] transition cursor-pointer">
        <ArrowLeft size={16} /> Geri dön
      </button>

      <div className="rounded-[20px] border border-[--line] bg-white/80 backdrop-blur-xl p-6 shadow-sm text-[--text]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[--brand]">Görev Detayı</p>
            <h1 className="text-xl sm:text-2xl font-semibold text-[--text] mt-1">{task.title}</h1>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusTone}`}>{task.status || "Belirsiz"}</span>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3 text-xs text-[--text-muted]">
          <div className="rounded-xl bg-[--page] border border-[--line] p-3.5">
            <p className="text-[11px] uppercase tracking-wide text-[--text-muted] font-medium">Öncelik</p>
            <p className="mt-1 font-medium text-[--text]">{task.priority || "Normal"}</p>
          </div>
          <div className="rounded-xl bg-[--page] border border-[--line] p-3.5">
            <p className="text-[11px] uppercase tracking-wide text-[--text-muted] font-medium">Son Tarih</p>
            <p className="mt-1 font-medium text-[--text] font-mono">{task.dueDate ? new Date(task.dueDate).toLocaleDateString("tr-TR") : "Belirtilmedi"}</p>
          </div>
          <div className="rounded-xl bg-[--page] border border-[--line] p-3.5">
            <p className="text-[11px] uppercase tracking-wide text-[--text-muted] font-medium">Müşteri</p>
            <p className="mt-1 font-medium text-[--text]">{task.customer?.name || "—"}</p>
          </div>
        </div>

        {task.description && (
          <div className="mt-6 rounded-xl border border-[--line] bg-[--page] p-4">
            <h2 className="text-xs font-semibold text-[--text]">Açıklama</h2>
            <p className="mt-2 whitespace-pre-wrap text-xs text-[--text-2] leading-relaxed">{task.description}</p>
          </div>
        )}
      </div>

      <div className="rounded-[20px] border border-[--line] bg-white/80 backdrop-blur-xl p-6 shadow-sm text-[--text]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[--brand]">
              <Bot size={18} />
              <h2 className="text-base font-semibold text-[--text]">Müşteri Vizyonu & Geçmiş Revizeler</h2>
            </div>
            <p className="mt-1 text-xs text-[--text-muted]">AI asistanı görev bağlamını kullanarak müşteri vizyonu, riskler ve bir sonraki adımları özetler.</p>
          </div>
          <button
            onClick={handleCustomerVision}
            disabled={aiLoading}
            className="rounded-full bg-gradient-to-r from-[--brand] to-[--blue] hover:from-[--brand-hover] hover:to-[--brand] px-5 py-2 text-xs font-medium text-[var(--text)] transition shadow-sm shrink-0 disabled:opacity-50 cursor-pointer"
          >
            {aiLoading ? "Çalışıyor..." : "AI Analizi Oluştur"}
          </button>
        </div>

        {aiInsight ? (
          <div className="mt-5 space-y-4">
            <div className="rounded-xl border border-[--line] bg-[--page] p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-[--text]">
                <Sparkles size={16} className="text-[--brand]" />
                Özet
              </div>
              <p className="mt-2 text-xs text-[--text-2] leading-relaxed">{aiInsight.summary}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-[--line] bg-[--page] p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-[--text]">
                  <CheckCircle2 size={16} className="text-[--ok]" />
                  Tercihler
                </div>
                <ul className="mt-2 space-y-1.5 text-xs text-[--text-2]">
                  {(aiInsight.preferences || []).map((item: string, index: number) => <li key={index}>• {item}</li>)}
                </ul>
              </div>
              <div className="rounded-xl border border-[--line] bg-[--page] p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-[--text]">
                  <AlertCircle size={16} className="text-[--warn]" />
                  Riskler
                </div>
                <ul className="mt-2 space-y-1.5 text-xs text-[--text-2]">
                  {(aiInsight.redFlags || []).map((item: string, index: number) => <li key={index}>• {item}</li>)}
                </ul>
              </div>
            </div>
            <div className="rounded-xl border border-[--line] bg-[--page] p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-[--text]">
                <MessageSquareText size={16} className="text-[--brand]" />
                Bir sonraki adım
              </div>
              <ul className="mt-2 space-y-1.5 text-xs text-[--text-2]">
                {(aiInsight.nextActions || []).map((item: string, index: number) => <li key={index}>• {item}</li>)}
              </ul>
            </div>
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-dashed border-[--line] bg-[--page]/50 p-4 text-xs text-[--text-muted]">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-[--text-muted]" />
              Henüz analiz yok. Butona basarak AI asistanı ile özet ve sonraki adımlar oluşturabilirsiniz.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
