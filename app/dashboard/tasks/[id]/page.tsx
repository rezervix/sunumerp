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
    if (status.includes("Tamamlandı")) return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
    if (status.includes("Bekliyor") || status.includes("Aşamasında")) return "bg-amber-500/10 text-amber-300 border border-amber-500/20"
    return "bg-white/5 text-zinc-300 border border-white/10"
  }, [task?.status])

  if (loading) {
    return <div className="p-8 text-xs text-zinc-500">Yükleniyor...</div>
  }

  if (!task) {
    return <div className="p-8 text-xs text-zinc-500">Görev bulunamadı.</div>
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1200px] mx-auto">
      <button onClick={() => router.back()} className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-emerald-400 transition">
        <ArrowLeft size={16} /> Geri dön
      </button>

      <div className="rounded-[20px] border border-white/[0.06] bg-[#111513]/90 p-6 shadow-xl text-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-400">Görev Detayı</p>
            <h1 className="text-xl sm:text-2xl font-semibold text-white mt-1">{task.title}</h1>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusTone}`}>{task.status || "Belirsiz"}</span>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3 text-xs text-zinc-400">
          <div className="rounded-xl bg-[#0d100e] border border-white/[0.06] p-3.5">
            <p className="text-[11px] uppercase tracking-wide text-zinc-500 font-medium">Öncelik</p>
            <p className="mt-1 font-medium text-white">{task.priority || "Normal"}</p>
          </div>
          <div className="rounded-xl bg-[#0d100e] border border-white/[0.06] p-3.5">
            <p className="text-[11px] uppercase tracking-wide text-zinc-500 font-medium">Son Tarih</p>
            <p className="mt-1 font-medium text-white font-mono">{task.dueDate ? new Date(task.dueDate).toLocaleDateString("tr-TR") : "Belirtilmedi"}</p>
          </div>
          <div className="rounded-xl bg-[#0d100e] border border-white/[0.06] p-3.5">
            <p className="text-[11px] uppercase tracking-wide text-zinc-500 font-medium">Müşteri</p>
            <p className="mt-1 font-medium text-white">{task.customer?.name || "—"}</p>
          </div>
        </div>

        {task.description && (
          <div className="mt-6 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <h2 className="text-xs font-semibold text-zinc-300">Açıklama</h2>
            <p className="mt-2 whitespace-pre-wrap text-xs text-zinc-400 leading-relaxed">{task.description}</p>
          </div>
        )}
      </div>

      <div className="rounded-[20px] border border-white/[0.06] bg-[#111513]/90 p-6 shadow-xl text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-400">
              <Bot size={18} />
              <h2 className="text-base font-semibold text-white">Müşteri Vizyonu & Geçmiş Revizeler</h2>
            </div>
            <p className="mt-1 text-xs text-zinc-400">AI asistanı görev bağlamını kullanarak müşteri vizyonu, riskler ve bir sonraki adımları özetler.</p>
          </div>
          <button
            onClick={handleCustomerVision}
            disabled={aiLoading}
            className="rounded-full bg-emerald-400 hover:bg-emerald-300 px-5 py-2 text-xs font-semibold text-black transition shadow-[0_0_15px_rgba(52,211,153,0.2)] shrink-0 disabled:opacity-50"
          >
            {aiLoading ? "Çalışıyor..." : "AI Analizi Oluştur"}
          </button>
        </div>

        {aiInsight ? (
          <div className="mt-5 space-y-4">
            <div className="rounded-xl border border-white/[0.06] bg-[#0d100e] p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <Sparkles size={16} className="text-emerald-400" />
                Özet
              </div>
              <p className="mt-2 text-xs text-zinc-300 leading-relaxed">{aiInsight.summary}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-white/[0.06] bg-[#0d100e] p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-white">
                  <CheckCircle2 size={16} className="text-emerald-400" />
                  Tercihler
                </div>
                <ul className="mt-2 space-y-1.5 text-xs text-zinc-400">
                  {(aiInsight.preferences || []).map((item: string, index: number) => <li key={index}>• {item}</li>)}
                </ul>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-[#0d100e] p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-white">
                  <AlertCircle size={16} className="text-amber-400" />
                  Riskler
                </div>
                <ul className="mt-2 space-y-1.5 text-xs text-zinc-400">
                  {(aiInsight.redFlags || []).map((item: string, index: number) => <li key={index}>• {item}</li>)}
                </ul>
              </div>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-[#0d100e] p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <MessageSquareText size={16} className="text-emerald-400" />
                Bir sonraki adım
              </div>
              <ul className="mt-2 space-y-1.5 text-xs text-zinc-400">
                {(aiInsight.nextActions || []).map((item: string, index: number) => <li key={index}>• {item}</li>)}
              </ul>
            </div>
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-dashed border-white/10 bg-[#0d100e]/50 p-4 text-xs text-zinc-500">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-zinc-400" />
              Henüz analiz yok. Butona basarak AI asistanı ile özet ve sonraki adımlar oluşturabilirsiniz.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
