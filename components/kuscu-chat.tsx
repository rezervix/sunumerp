"use client"

import { useState } from "react"
import Link from "next/link"
import { useAuth } from "@/lib/auth/context"
import { Send, X, ArrowUpRight, Loader2 } from "lucide-react"

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
          className="fixed bottom-6 right-18 z-50 flex items-center gap-2.5 bg-[#111513]/95 border border-emerald-500/30 text-zinc-200 rounded-full px-4 py-2 shadow-[0_0_25px_rgba(16,185,129,0.15)] hover:border-emerald-400/50 hover:text-white transition-all cursor-pointer backdrop-blur-xl"
        >
          {/* Glowing Emerald Orb */}
          <span className="relative flex size-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full size-2.5 bg-emerald-400 shadow-[0_0_10px_#34d399]" />
          </span>
          <span className="text-xs font-medium tracking-wide">Daron AMA AI</span>
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[92vw] flex flex-col glass-panel rounded-[20px] border border-white/[0.06] overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200 text-zinc-200">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-[#080A09]/80 border-b border-white/[0.06] shrink-0">
            <div className="flex items-center justify-center size-8 rounded-full bg-emerald-500/10 border border-emerald-500/25">
              <span className="size-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xs font-medium text-white leading-none truncate">Daron • Ask Me Anything</h3>
              <p className="text-[11px] text-zinc-400 mt-1 truncate">
                Stok, WMS & Maliyet AI Asistanı
              </p>
            </div>
            <Link
              href="/dashboard/stok-ai"
              onClick={() => setIsOpen(false)}
              className="text-[11px] bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-zinc-300 px-2.5 py-1 rounded-full flex items-center gap-1 transition-colors"
            >
              Tam Ekran <ArrowUpRight className="h-3 w-3" />
            </Link>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 hover:bg-white/[0.06] text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              title="Kapat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Mesaj Listesi */}
          <div className="p-3.5 max-h-[340px] overflow-y-auto space-y-3 bg-[#080A09]/40">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`rounded-2xl p-3 text-xs leading-relaxed ${
                  msg.role === "user"
                    ? "bg-emerald-400/15 text-emerald-200 border border-emerald-500/25 ml-8"
                    : "bg-[#111513] border border-white/[0.06] text-zinc-200 mr-4"
                }`}
              >
                {msg.intent && (
                  <div className="font-mono text-[10px] text-emerald-400 font-medium mb-1">
                    [{msg.intent}]
                  </div>
                )}
                <div>{msg.text}</div>
                {msg.rowsPreview && msg.rowsPreview.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-white/[0.06] space-y-1">
                    {msg.rowsPreview.map((r, i) => (
                      <div key={i} className="text-[11px] bg-white/[0.03] px-2 py-1 rounded font-mono truncate text-zinc-300">
                        {Object.values(r).slice(0, 3).join(" • ")}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-xs text-zinc-400 px-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />
                <span>Veritabanı sorgulanıyor...</span>
              </div>
            )}
          </div>

          {/* Hızlı Sorgu Önerileri */}
          <div className="px-3 py-2 bg-[#080A09]/60 border-t border-white/[0.06] flex gap-1.5 overflow-x-auto">
            {[
              "Kritik ROP stokları",
              "SKT & FEFO riskleri",
              "En çok satanlar & devir hızı",
              "Depo bazlı envanter değeri"
            ].map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(q)}
                className="shrink-0 text-[11px] bg-white/[0.03] hover:bg-emerald-400/15 text-zinc-300 hover:text-emerald-300 border border-white/[0.06] hover:border-emerald-500/25 px-2.5 py-1 rounded-full font-normal transition-colors cursor-pointer"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Giriş Alanı */}
          <div className="p-3 bg-[#111513] border-t border-white/[0.06] flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSend()}
              placeholder="Stok verilerini doğal dille sorun..."
              className="flex-1 text-xs glass-input px-3 py-2 outline-none"
            />
            <button
              onClick={() => handleSend()}
              disabled={loading}
              className="bg-[#34D399] text-[#061811] hover:bg-[#34D399]/90 p-2 rounded-full disabled:opacity-50 transition-all cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
