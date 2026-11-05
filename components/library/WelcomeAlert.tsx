"use client"

import { useState, useEffect } from "react"
import { Info, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { BRAND_CONFIG } from "@/lib/config/brand"

interface WelcomeAlertProps {
  className?: string
}

export function WelcomeAlert({ className }: WelcomeAlertProps) {
  const [show, setShow] = useState(false)
  const [count, setCount] = useState(0)

  useEffect(() => {
    // Check if the component was closed manually
    const closed = localStorage.getItem("library_welcome_closed") === "true"
    const countStr = localStorage.getItem("library_welcome_count")
    let currentCount = countStr ? parseInt(countStr, 10) : 0

    if (isNaN(currentCount)) {
      currentCount = 0
    }

    const newCount = currentCount + 1
    localStorage.setItem("library_welcome_count", String(newCount))
    setCount(newCount)

    if (!closed && newCount < 90) {
      setShow(true)
    }
  }, [])

  const handleClose = () => {
    localStorage.setItem("library_welcome_closed", "true")
    setShow(false)
  }

  if (!show) return null

  return (
    <div
      className={cn(
        "relative w-full rounded-2xl border border-emerald-500/20 bg-[#111513]/90 backdrop-blur-xl p-5 shadow-2xl transition-all animate-in fade-in slide-in-from-bottom-2 duration-300",
        className
      )}
    >
      <div className="flex gap-4 items-start">
        <div className="size-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0 border border-emerald-500/20 text-emerald-400">
          <Info size={20} className="animate-pulse" />
        </div>
        
        <div className="flex-1 space-y-3 min-w-0 pr-20 sm:pr-24 lg:pr-32">
          <div>
            <h4 className="text-base font-semibold text-white leading-snug">
              {BRAND_CONFIG.name} — Dijital Arşiv & Kütüphane Bilgilendirmesi
            </h4>
          </div>
          
          <div className="text-xs leading-relaxed text-zinc-300 space-y-2">
            <p>
              Değerli Ekip Arkadaşlarımız,
            </p>
            <p>
              Operasyonel verimliliğimizi ve veri güvenliğimizi en üst seviyeye taşımak amacıyla gerçekleştirdiğimiz dijital dönüşüm süreçlerimizin bir parçası olarak, yeni <strong className="font-semibold text-emerald-400">Ajans Kütüphanesi</strong> sistemimiz devreye alınmıştır.
            </p>
            <p>
              Geçmişte harici bulut servisleri üzerinden yürütülen tüm dosya yönetimi, paylaşım, arşivleme ve içerik yükleme süreçleri artık tamamen bu yeni merkezi panelimiz üzerinden gerçekleştirilecektir.
            </p>
            <p>
              Tüm iş süreçlerinizde dosya ve arşiv yönetimlerinizi bu panel aracılığıyla sürdürmenizi önemle rica ederiz. Sorularınız için <strong className="font-semibold text-emerald-400">{BRAND_CONFIG.contactPerson}</strong> ile iletişime geçebilirsiniz.
            </p>
          </div>

          <div className="pt-1.5">
            <p className="text-[11px] text-zinc-500 font-mono">
              ℹ️ Bu bilgilendirme 90. ziyaretinizden sonra otomatik olarak gizlenecektir. (Mevcut ziyaret: {count}/90)
            </p>
          </div>
        </div>

        {/* Manuel Kapatma Opsiyonu */}
        <div className="absolute top-4 right-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleClose}
            className="text-xs h-8 border-white/[0.08] bg-white/[0.02] text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors rounded-xl"
          >
            <X size={13} className="sm:mr-1" />
            <span className="hidden sm:inline">Anladım, kapat</span>
            <span className="sm:hidden">Kapat</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
