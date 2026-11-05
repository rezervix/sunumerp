"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ShieldAlert, AlertTriangle, ShieldCheck, ArrowRight, LifeBuoy } from "lucide-react"
import Link from "next/link"

export default function TamperPage() {
  const router = useRouter()
  const [isTestMode, setIsTestMode] = useState<boolean | null>(null)

  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch("/api/system-config")
        if (res.ok) {
          const config = await res.json()
          setIsTestMode(!!config.securityDisabled)
        }
      } catch (err) {
        setIsTestMode(false)
      }
    }
    checkStatus()
  }, [])

  return (
    <div className="min-h-screen bg-[#080A09] text-white flex flex-col items-center justify-center p-6 select-none relative overflow-hidden">
      {/* Dynamic Background Glows */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(16,185,129,0.12),transparent)]" />
      <div className="fixed top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[500px] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-lg bg-[#111513]/90 backdrop-blur-2xl border border-white/10 rounded-[24px] p-8 text-center space-y-6 shadow-2xl relative overflow-hidden z-10">
        
        {isTestMode ? (
          /* TEST MODE ACTIVE BANNER */
          <>
            <div className="size-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.2)]">
              <ShieldCheck size={36} />
            </div>

            <div className="space-y-2">
              <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-semibold uppercase tracking-wider">
                Test Modu Aktif
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-white">Güvenlik Koruması Devre Dışı</h1>
              <p className="text-xs text-zinc-400">
                <code className="bg-white/10 px-1.5 py-0.5 rounded text-zinc-200 font-mono">storage/TEST_MODE</code> dosyası bulundu.
              </p>
            </div>

            <div className="bg-white/[0.02] border border-white/10 p-4 rounded-xl text-xs text-left leading-relaxed text-zinc-400 font-mono space-y-2">
              <p className="text-emerald-400 font-bold">[✓] TEST MODU BİLGİSİ</p>
              <p>&gt; Test bayrak dosyası silinmediği sürece güvenlik kilidi kapalı kalacaktır.</p>
              <p>&gt; Dosyayı sildiğinizde (storage/TEST_MODE) güvenlik koruması tekrar aktifleşecektir.</p>
            </div>

            <div className="pt-2">
              <button
                onClick={() => router.push("/dashboard")}
                className="w-full h-12 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(52,211,153,0.3)] cursor-pointer"
              >
                Dashboard&apos;a Dön <ArrowRight size={16} />
              </button>
            </div>
          </>
        ) : (
          /* PRODUCTION SECURITY BREACH SCREEN */
          <>
            <div className="absolute top-0 left-0 w-full h-1 bg-red-500" />

            <div className="size-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-400 animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.2)]">
              <ShieldAlert size={36} />
            </div>

            <div className="space-y-2">
              <h1 className="text-lg font-bold tracking-tight text-red-400 flex items-center justify-center gap-2">
                <AlertTriangle size={18} /> GÜVENLİK İHLALİ ALGILANDI
              </h1>
              <p className="text-xs text-zinc-400">Sunum ERP Otonom Lisans Koruma Sistemi</p>
            </div>

            <div className="bg-red-500/[0.03] border border-red-500/20 p-5 rounded-xl text-xs text-left leading-relaxed text-zinc-400 font-mono space-y-2">
              <p className="text-red-400 font-bold">[!] SİSTEM KORUMASI DEVREDE</p>
              <p>&gt; İzinsiz kod veya bellek manipülasyonu algılandı.</p>
              <p>&gt; Güvenlik politikası gereği kullanıcı oturumu askıya alınmıştır.</p>
              <p>&gt; Veritabanı önbelleği emniyet amacıyla kilitlenmiştir.</p>
              <p className="text-zinc-200 mt-2 font-sans font-medium">&gt; Lütfen sistem yöneticinizle irtibata geçin.</p>
            </div>

            <div className="flex items-center justify-between pt-2 text-[10px] text-zinc-500 font-mono border-t border-white/[0.08]">
              <span>KOD: 0x800F_TAMPER_DETECTED</span>
              <Link 
                href="/dashboard/support-tickets"
                className="text-emerald-400 hover:underline font-sans font-semibold flex items-center gap-1 cursor-pointer"
              >
                <LifeBuoy size={12} /> Destek Talebi
              </Link>
            </div>
          </>
        )}

      </div>
    </div>
  )
}
