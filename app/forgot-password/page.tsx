"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Lock, User, CheckCircle2, ArrowLeft, AlertCircle, Loader2, Sparkles } from "lucide-react"

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ message: string; tempPassword?: string } | null>(null)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setResult(null)

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      })

      const data = await res.json()
      if (res.ok) {
        setResult(data)
      } else {
        setError(data.error || "Bir hata oluştu")
      }
    } catch {
      setError("Sunucu bağlantı hatası")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#080A09] text-white p-4 relative overflow-hidden">
      {/* Ambient Glow */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(16,185,129,0.12),transparent)]" />

      <div className="w-full max-w-md relative z-10">

        <div className="text-center mb-8">
          <div className="flex flex-col items-center gap-3">
            <div className="size-14 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center rounded-2xl shadow-[0_0_20px_rgba(52,211,153,0.15)]">
              <Lock className="size-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Şifremi Unuttum
              </h1>
              <span className="text-xs text-zinc-400 font-medium uppercase tracking-widest mt-1 block">Sunum ERP Yönetim Paneli</span>
            </div>
          </div>
        </div>

        <div className="bg-[#111513]/90 backdrop-blur-2xl rounded-[24px] shadow-2xl border border-white/10 overflow-hidden">
          <div className="p-8">
            {result ? (
              <div className="space-y-4">
                <div className="bg-emerald-500/10 text-emerald-300 p-4 rounded-xl text-sm border border-emerald-500/20">
                  <h3 className="font-semibold mb-2 flex items-center gap-2 text-white">
                    <CheckCircle2 className="size-5 text-emerald-400" />
                    {result.message}
                  </h3>
                  {result.tempPassword && (
                    <div className="mt-3 bg-[#080A09] border border-white/10 rounded-xl p-3 shadow-sm">
                      <p className="text-xs text-zinc-400 mb-1">Geçici Şifreniz:</p>
                      <p className="font-mono font-bold text-emerald-400 text-xl tracking-wider select-all">{result.tempPassword}</p>
                      <p className="text-[10px] text-zinc-500 mt-2 uppercase tracking-wide">Lütfen güvenli bir yere kaydedin.</p>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => router.push("/")}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-black py-3 rounded-xl font-semibold text-xs transition-all cursor-pointer shadow-[0_0_20px_rgba(52,211,153,0.3)] mt-2"
                >
                  Giriş Sayfasına Dön
                </button>
              </div>
            ) : (
              <>
                <div className="text-center mb-6">
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Yöneticiniz tarafından sıfırlanabilmesi için lütfen kullanıcı adınızı girin.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="bg-red-500/10 text-red-400 p-3 rounded-xl text-xs flex items-center gap-2 border border-red-500/20">
                      <AlertCircle className="size-4 shrink-0" />
                      {error}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label htmlFor="username" className="text-xs font-medium text-zinc-300">
                      Kullanıcı Adı
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                        <User className="size-4" />
                      </div>
                      <input
                        id="username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        placeholder="kullanici.adi"
                        className="block w-full pl-10 pr-3.5 py-2.5 border border-white/10 rounded-xl bg-white/[0.03] text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-black py-3 rounded-xl font-semibold text-xs shadow-[0_0_20px_rgba(52,211,153,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="animate-spin size-4" />
                        İşleniyor...
                      </>
                    ) : "Şifre Sıfırla"}
                  </button>

                  <div className="text-center mt-6">
                    <Link href="/" className="text-xs font-medium text-zinc-400 hover:text-emerald-400 transition-colors inline-flex items-center gap-1.5">
                      <ArrowLeft className="size-3.5" />
                      Giriş sayfasına dön
                    </Link>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
