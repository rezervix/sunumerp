"use client"

import { useState } from "react"
import Link from "next/link"
import { useAuth } from "@/lib/auth/context"
import {
  IconArrowUpRight,
  IconLoader,
  IconSend,
  IconSparkles,
  IconX,
} from "@/components/ui/app-icons"
import { safeText } from "@/lib/utils/safe-display"

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  text: string
  intent?: string
  rowsPreview?: Array<Record<string, string | number>>
}

/**
 * Faz 3 Yüzen Asistan Butonu:
 * Küçük, beyaz cam, mavi ince kenarlık, hafif gölge. Adı aynen "Daron AMA AI".
 */
export function KuscuChat() {
  const { session } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-msg",
      role: "assistant",
      text: "Merhaba! Ben Daron AMA AI. Bana doğal dille SKT/FEFO risklerini, kritik stokları (ROP), en çok satanları veya depo envanter değerlerini sorabilirsiniz.",
    },
  ])

  if (!session) return null

  const handleSend = async (customQuery?: string) => {
    const q = (customQuery ?? input).trim()
    if (!q || loading) return
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      text: q,
    }
    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setLoading(true)

    try {
      const res = await fetch("/api/inventory-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ama_query", question: q }),
      })
      const json = await res.json()
      const result = json.data
      if (json.success && result) {
        const aiMsg: ChatMessage = {
          id: `a-${Date.now() + 1}`,
          role: "assistant",
          text: safeText(
            result.answerNarrative,
            "Analiz tamamlandı, sonuçlar aşağıda listelenmiştir."
          ),
          intent: result.intentDetected ? String(result.intentDetected) : undefined,
          rowsPreview: Array.isArray(result.rows) ? result.rows.slice(0, 3) : [],
        }
        setMessages((prev) => [...prev, aiMsg])
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now() + 1}`,
            role: "assistant",
            text: "Veritabanı sorgusu tamamlanamadı, lütfen tekrar deneyin.",
          },
        ])
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now() + 1}`,
          role: "assistant",
          text: "Sunucu ile bağlantı kurulamadı.",
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          title="Daron AMA AI — Doğal Dil Stok & ERP Asistanı"
          className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 bg-[var(--muted-bg)] backdrop-blur-xl border border-[var(--brand-line)] text-[var(--navy)] hover:text-[var(--brand)] hover:border-[var(--brand)] rounded-full px-3.5 py-2 shadow-[var(--shadow-card)] transition-all duration-150 ease-out cursor-pointer"
        >
          <span className="size-2 rounded-full bg-[var(--brand)] shrink-0" />
          <span className="text-xs font-medium tracking-tight">Daron AMA AI</span>
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-5 right-5 z-50 w-[372px] max-w-[calc(100vw-2rem)] flex flex-col bg-[var(--bg)] border border-[var(--line)] rounded-[20px] shadow-[var(--shadow-modal)] overflow-hidden animate-in slide-in-from-bottom-3 fade-in duration-200 text-[var(--text)]">
          {/* Header */}
          <div className="flex items-center gap-2.5 px-4 py-3 bg-[var(--page)]/80 border-b border-[var(--line-soft)] shrink-0">
            <div className="flex items-center justify-center size-7 rounded-full bg-[var(--brand-soft)] text-[var(--brand)] border border-[var(--brand-line)]">
              <IconSparkles size={14} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xs font-semibold text-[var(--navy)] leading-none truncate">
                Daron AMA AI
              </h3>
              <p className="text-[11px] text-[var(--text-muted)] mt-1 truncate">
                Stok, WMS &amp; Tedarik Asistanı
              </p>
            </div>
            <Link
              href="/dashboard/stok-ai"
              onClick={() => setIsOpen(false)}
              className="text-[11px] bg-[var(--bg)] hover:bg-[var(--brand-soft)] border border-[var(--line)] hover:border-[var(--brand-line)] text-[var(--text-2)] hover:text-[var(--brand)] px-2.5 py-1 rounded-full inline-flex items-center gap-1 transition-colors"
            >
              Rapor <IconArrowUpRight size={12} />
            </Link>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1.5 hover:bg-[var(--muted-bg)] text-[var(--text-muted)] hover:text-[var(--text)] rounded-full transition-colors cursor-pointer"
              title="Kapat"
              aria-label="Kapat"
            >
              <IconX size={14} />
            </button>
          </div>

          {/* Mesaj Listesi */}
          <div className="p-3.5 max-h-[320px] overflow-y-auto space-y-2.5 bg-[var(--bg)]">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`rounded-2xl p-3 text-xs leading-relaxed ${ msg.role === "user" ? "bg-[var(--brand-soft)] text-[var(--navy)] border border-[var(--brand-line)] ml-8" : "bg-[var(--page)] border border-[var(--line-soft)] text-[var(--text)] mr-4" }`}
              >
                {msg.intent && (
                  <div className="font-mono text-[10px] text-[var(--brand)] font-medium mb-1">
                    [{msg.intent}]
                  </div>
                )}
                <div>{msg.text}</div>
                {msg.rowsPreview && msg.rowsPreview.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-[var(--line)] space-y-1">
                    {msg.rowsPreview.map((r, i) => (
                      <div
                        key={i}
                        className="text-[11px] bg-[var(--bg)] px-2 py-1 rounded-md border border-[var(--line-soft)] font-mono truncate text-[var(--text-2)]"
                      >
                        {Object.values(r)
                          .slice(0, 3)
                          .map((v) => safeText(v))
                          .join(" • ")}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] px-2">
                <IconLoader size={14} className="text-[var(--brand)]" />
                <span>Veritabanı sorgulanıyor...</span>
              </div>
            )}
          </div>

          {/* Hızlı Sorgu Önerileri */}
          <div className="px-3 py-2 bg-[var(--page)]/60 border-t border-[var(--line-soft)] flex gap-1.5 overflow-x-auto">
            {[
              "Kritik ROP stokları",
              "SKT & FEFO riskleri",
              "En çok satanlar",
              "Depo envanter değeri",
            ].map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => handleSend(q)}
                className="shrink-0 text-[11px] bg-[var(--bg)] hover:bg-[var(--brand-soft)] text-[var(--text-2)] hover:text-[var(--brand)] border border-[var(--line)] hover:border-[var(--brand-line)] px-2.5 py-1 rounded-full transition-colors cursor-pointer"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Giriş Alanı */}
          <div className="p-3 bg-[var(--bg)] border-t border-[var(--line)] flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Doğal dille stok sorusu yazın..."
              className="flex-1 text-xs bg-[var(--page)] border border-[var(--line)] focus:border-[var(--brand)] rounded-full px-3.5 py-2 text-[var(--text)] placeholder:text-[var(--text-muted)] outline-none transition-colors"
            />
            <button
              type="button"
              onClick={() => handleSend()}
              disabled={loading}
              aria-label="Gönder"
              className="btn-brand-primary p-2 rounded-full disabled:opacity-50 cursor-pointer"
            >
              <IconSend size={14} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
