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
        "relative w-full rounded-xl border border-blue-200 bg-blue-50/50 dark:border-blue-800/30 dark:bg-blue-950/20 p-5 shadow-xs transition-all animate-in fade-in slide-in-from-bottom-2 duration-300",
        className
      )}
    >
      <div className="flex gap-4 items-start">
        <div className="size-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0 border border-blue-500/20 text-blue-600 dark:text-blue-400">
          <Info size={20} className="animate-pulse" />
        </div>
        
        <div className="flex-1 space-y-3 min-w-0 pr-20 sm:pr-24 lg:pr-32">
          <div>
            <h4 className="text-base font-bold text-blue-950 dark:text-blue-300 leading-snug">
              {BRAND_CONFIG.name} — Dijital Arşiv & Kütüphane Bilgilendirmesi
            </h4>
          </div>
          
          <div className="text-sm leading-relaxed text-blue-900/80 dark:text-blue-300/80 space-y-2">
            <p>
              Değerli Ekip Arkadaşlarımız,
            </p>
            <p>
              Operasyonel verimliliğimizi ve veri güvenliğimizi en üst seviyeye taşımak amacıyla gerçekleştirdiğimiz dijital dönüşüm süreçlerimizin bir parçası olarak, yeni <strong className="font-semibold text-blue-950 dark:text-blue-200">Ajans Kütüphanesi</strong> sistemimiz devreye alınmıştır.
            </p>
            <p>
              Geçmişte harici bulut servisleri üzerinden yürütülen tüm dosya yönetimi, paylaşım, arşivleme ve içerik yükleme süreçleri artık tamamen bu yeni merkezi panelimiz üzerinden gerçekleştirilecektir. Hem performans hem de veri güvenliği standartlarımız doğrultusunda, dosya yönetim süreçlerinde harici bulut servisleri kullanımı sonlandırılmış olup bu sisteme geçiş zorunludur.
            </p>
            <p>
              Tüm iş süreçlerinizde dosya ve arşiv yönetimlerinizi bu panel aracılığıyla sürdürmenizi önemle rica ederiz. Geçiş süreci, kullanım detayları veya karşılaştığınız teknik konularla ilgili sorularınız için <strong className="font-semibold text-blue-950 dark:text-blue-200">{BRAND_CONFIG.contactPerson}</strong> ile iletişime geçebilirsiniz.
            </p>
            <p>
              İş birliğiniz ve katkılarınız için teşekkür eder, iyi çalışmalar dileriz.
            </p>
          </div>

          <div className="pt-1.5">
            <p className="text-xs text-blue-900/60 dark:text-blue-400/50 font-medium">
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
            className="text-xs h-8 border-blue-200 hover:bg-blue-100 hover:text-blue-900 dark:border-blue-800/50 dark:hover:bg-blue-900/30 dark:hover:text-blue-200 transition-colors"
          >
            <X size={13} className="sm:mr-1" />
            <span className="hidden sm:inline">Anladım, tekrar gösterme</span>
            <span className="sm:hidden">Kapat</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
