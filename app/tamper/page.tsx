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
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 select-none relative overflow-hidden">
      {/* Dynamic Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/10 blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg bg-card border border-border rounded-3xl p-8 text-center space-y-6 shadow-2xl relative overflow-hidden backdrop-blur-md">
        
        {isTestMode ? (
          /* TEST MODE ACTIVE BENIGN BANNER */
          <>
            <div className="size-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-500">
              <ShieldCheck size={36} />
            </div>

            <div className="space-y-2">
              <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full text-xs font-bold uppercase tracking-wider">
                Test Modu Aktif
              </span>
              <h1 className="text-2xl font-extrabold tracking-tight">Güvenlik Koruması Devre Dışı</h1>
              <p className="text-xs text-muted-foreground">
                <code className="bg-muted px-1.5 py-0.5 rounded text-foreground font-mono">storage/TEST_MODE</code> dosyası bulundu.
              </p>
            </div>

            <div className="bg-muted/50 border border-border p-4 rounded-2xl text-xs text-left leading-relaxed text-muted-foreground font-mono space-y-2">
              <p className="text-emerald-500 font-bold">[✓] TEST MODU UYARISI</p>
              <p>&gt; Test bayrak dosyası silinmediği sürece güvenlik kilidi kapalı kalacaktır.</p>
              <p>&gt; Dosyayı sildiğinizde (storage/TEST_MODE) güvenlik koruması tekrar aktifleşecektir.</p>
            </div>

            <div className="pt-2">
              <button
                onClick={() => router.push("/dashboard")}
                className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
              >
                Dashboard&apos;a Dön <ArrowRight size={16} />
              </button>
            </div>
          </>
        ) : (
          /* PRODUCTION SECURITY BREACH SCREEN */
          <>
            <div className="absolute top-0 left-0 w-full h-1.5 bg-destructive" />

            <div className="size-16 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center mx-auto text-destructive animate-pulse">
              <ShieldAlert size={36} />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-bold tracking-tight text-destructive flex items-center justify-center gap-2">
                <AlertTriangle size={20} /> GÜVENLİK İHLALİ ALGILANDI
              </h1>
              <p className="text-xs text-muted-foreground">Çiçekana ERP Otonom Lisans Koruma Sistemi</p>
            </div>

            <div className="bg-muted/50 border border-destructive/20 p-5 rounded-2xl text-xs text-left leading-relaxed text-muted-foreground font-mono space-y-2">
              <p className="text-destructive font-bold">[!] SİSTEM KARANTİNAYA ALINDI</p>
              <p>&gt; Debugger kullanımı veya izinsiz kod manipülasyonu algılandı.</p>
              <p>&gt; Güvenlik politikası gereği tüm kullanıcı oturumları askıya alınmıştır.</p>
              <p>&gt; Çevrimdışı veritabanı önbelleği emniyet amacıyla kilitlenmiştir.</p>
              <p className="text-foreground mt-2 font-sans font-medium">&gt; Lütfen sistem yöneticinizle irtibata geçin.</p>
            </div>

            <div className="flex items-center justify-between pt-2 text-[10px] text-muted-foreground font-mono border-t border-border">
              <span>KOD: 0x800F_TAMPER_DETECTED</span>
              <Link 
                href="/dashboard/support-tickets"
                className="text-primary hover:underline font-sans font-semibold flex items-center gap-1"
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
