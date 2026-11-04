"use client"

import { useState } from "react"
import Link from "next/link"
import { useAuth } from "@/lib/auth/context"
import { Sparkles, Send, X, ArrowUpRight, Loader2 } from "lucide-react"

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  text: string
  intent?: string
  rowsPreview?: Array<Record<string, string | number>>
}

export function KuscuChat() {
  const { session } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-msg",
      role: "assistant",
      text: "Merhaba! Ben Daron (Ask Me Anything — AMA Stok, WMS & Tedarik Yapay Zekâ Asistanı). Bana doğal dille SKT/FEFO risklerini, kritik stokları (ROP), en çok satanları veya depo envanter değerlerini sorabilirsiniz."
    }
  ])

  if (!session) return null

  const handleSend = async (customQuery?: string) => {
    const q = (customQuery ?? input).trim()
    if (!q || loading) return
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      text: q
    }
    setMessages(prev => [...prev, userMsg])
    setInput("")
    setLoading(true)

    try {
      const res = await fetch("/api/inventory-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ama_query", question: q })
      })
      const json = await res.json()
      const result = json.data
      if (json.success && result) {
        const aiMsg: ChatMessage = {
          id: `a-${Date.now() + 1}`,
          role: "assistant",
          text: result.answerNarrative,
          intent: result.intentDetected,
          rowsPreview: (result.rows || []).slice(0, 3)
        }
        setMessages(prev => [...prev, aiMsg])
      } else {
        setMessages(prev => [
          ...prev,
          {
            id: `a-${Date.now() + 1}`,
            role: "assistant",
            text: "Veritabanı sorgusu tamamlanamadı, lütfen tekrar deneyin."
          }
        ])
      }
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: `a-${Date.now() + 1}`,
          role: "assistant",
          text: "Sunucu ile bağlantı kurulamadı."
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          title="Daron • Ask Me Anything (AMA) Stok & ERP AI Asistanı"
          className="fixed bottom-6 right-20 z-50 flex items-center justify-center gap-2 bg-indigo-600 text-white border border-indigo-500 p-3 sm:px-4 sm:py-3 rounded-full sm:rounded-2xl shadow-lg cursor-pointer transition-all hover:bg-indigo-700 hover:scale-105 active:scale-95 h-12 w-12 sm:h-auto sm:w-auto"
        >
          <Sparkles className="h-5 w-5 shrink-0" />
          <span className="text-sm font-semibold max-sm:hidden">Daron AMA AI</span>
          <span className="absolute -top-1 -right-1 size-3 rounded-full border-2 border-white bg-emerald-400" />
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[92vw] flex flex-col rounded-2xl shadow-2xl border border-slate-200 bg-white overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-slate-900 text-white shrink-0">
            <div className="flex items-center justify-center size-9 rounded-xl bg-indigo-600">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold leading-none">Daron • Ask Me Anything (AMA)</h3>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Canlı Veritabanı Stok, WMS & Maliyet AI Asistanı
              </p>
            </div>
            <Link
              href="/dashboard/stok-ai"
              onClick={() => setIsOpen(false)}
              className="text-[11px] bg-white/10 hover:bg-white/20 px-2 py-1 rounded flex items-center gap-1"
            >
              Tam Ekran <ArrowUpRight className="h-3 w-3" />
            </Link>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
              title="Kapat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Mesaj Listesi */}
          <div className="p-3.5 max-h-[340px] overflow-y-auto space-y-3 bg-slate-50">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`rounded-xl p-3 text-xs leading-relaxed ${
                  msg.role === "user"
                    ? "bg-indigo-600 text-white ml-8"
                    : "bg-white border border-slate-200 text-slate-800 mr-4 shadow-xs"
                }`}
              >
                {msg.intent && (
                  <div className="font-mono text-[10px] text-indigo-600 font-bold mb-1">
                    [{msg.intent}]
                  </div>
                )}
                <div>{msg.text}</div>
                {msg.rowsPreview && msg.rowsPreview.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-100 space-y-1">
                    {msg.rowsPreview.map((r, i) => (
                      <div key={i} className="text-[11px] bg-slate-50 px-2 py-1 rounded font-mono truncate">
                        {Object.values(r).slice(0, 3).join(" • ")}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-xs text-slate-500 px-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" />
                <span>Veritabanı sorgulanıyor...</span>
              </div>
            )}
          </div>

          {/* Hızlı Sorgu Önerileri */}
          <div className="px-3 py-2 bg-slate-100 border-t border-slate-200 flex gap-1.5 overflow-x-auto">
            {[
              "Kritik ROP stokları",
              "SKT & FEFO riskleri",
              "En çok satanlar & devir hızı",
              "Depo bazlı envanter değeri"
            ].map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(q)}
                className="shrink-0 text-[11px] bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-1 rounded-full font-medium"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Giriş Alanı */}
          <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSend()}
              placeholder="Stok verilerini doğal dille sorun..."
              className="flex-1 text-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={() => handleSend()}
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-lg disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
