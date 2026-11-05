"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CreditCard, Check, Shield, Award, HelpCircle, ArrowLeft, Sparkles, CheckCircle2, Lock } from "lucide-react"

export default function PaywallPage() {
  const router = useRouter()
  const [selectedPlan, setSelectedPlan] = useState<"free" | "pro" | "enterprise">("pro")
  const [cardHolder, setCardHolder] = useState("")
  const [cardNumber, setCardNumber] = useState("")
  const [expMonth, setExpMonth] = useState("")
  const [expYear, setExpYear] = useState("")
  const [cvc, setCvc] = useState("")

  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [successMsg, setSuccessMsg] = useState("")

  // Dynamic formatting for card number
  const handleCardNumberChange = (value: string) => {
    const clean = value.replace(/\D/g, "")
    const formatted = clean.match(/.{1,4}/g)?.join(" ") || clean
    setCardNumber(formatted.substring(0, 19))
  }

  // Handle Checkout / Payment
  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMsg("")
    setSuccessMsg("")

    try {
      let payload = {}
      if (selectedPlan === "free") {
        payload = {
          planName: "free",
          cardHolderName: "Free User",
          cardNumber: "0000000000000000",
          expireMonth: "12",
          expireYear: "30",
          cvc: "000"
        }
      } else {
        if (!cardHolder || !cardNumber || !expMonth || !expYear || !cvc) {
          setErrorMsg("Lütfen tüm kart alanlarını doldurunuz.")
          setIsLoading(false)
          return
        }
        payload = {
          planName: selectedPlan,
          cardHolderName: cardHolder,
          cardNumber: cardNumber.replace(/\s+/g, ""),
          expireMonth: expMonth,
          expireYear: expYear,
          cvc
        }
      }

      const res = await fetch("/api/iyzico/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      const data = await res.json()

      if (res.ok) {
        setSuccessMsg("Aboneliğiniz başarıyla etkinleştirildi! Yönlendiriliyorsunuz...")
        setTimeout(() => {
          router.push("/dashboard")
        }, 1500)
      } else {
        setErrorMsg(data.error || "Ödeme işlemi gerçekleştirilemedi.")
      }
    } catch (err) {
      setErrorMsg("Bağlantı hatası oluştu.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#080A09] text-white p-6 md:p-12 flex flex-col justify-center items-center relative overflow-hidden">
      
      {/* Ambient Glows */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(16,185,129,0.12),transparent)]" />
      <div className="fixed -bottom-40 -right-40 size-[500px] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-5xl space-y-8 z-10">
        
        {/* Header */}
        <div className="text-center space-y-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-semibold uppercase tracking-wider">
            <Sparkles size={14} /> Sunum ERP SaaS Lisanslama
          </span>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">Kullanım Planınızı Seçin</h1>
          <p className="text-sm text-zinc-400 max-w-lg mx-auto font-light">
            İşletmeniz için en uygun abonelik paketini seçerek tüm ERP ve operasyon modüllerini kesintisiz kullanın.
          </p>
        </div>

        {/* Pricing Tiers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Paket 1: Ücretsiz */}
          <div
            onClick={() => setSelectedPlan("free")}
            className={`border rounded-[24px] p-6 cursor-pointer transition-all flex flex-col justify-between h-80 relative bg-[#111513]/90 ${
              selectedPlan === "free"
                ? "border-emerald-500/80 ring-1 ring-emerald-500/30 shadow-[0_0_20px_rgba(52,211,153,0.15)] scale-[1.02]"
                : "border-white/[0.06] hover:border-white/20"
            }`}
          >
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <span className="px-3 py-1 bg-white/[0.04] text-zinc-400 border border-white/10 rounded-full text-xs font-semibold">Başlangıç</span>
                {selectedPlan === "free" && (
                  <div className="size-5 rounded-full bg-emerald-500 flex items-center justify-center text-black">
                    <Check size={12} className="stroke-[3]" />
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Paket 1 (Ücretsiz)</h3>
                <p className="text-xs text-zinc-400 mt-1">Temel özelliklerin ücretsiz kullanımı</p>
              </div>
              <div className="text-2xl font-light text-white">0 TL <span className="text-xs font-normal text-zinc-500">/ Süresiz</span></div>
              <ul className="text-xs space-y-2 text-zinc-400">
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400" /> Dashboard İzleme</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400" /> Temel Ayarlar</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400" /> Teknik Destek</li>
              </ul>
            </div>
            <div className="text-[11px] text-zinc-500 font-medium flex items-center gap-1.5"><Shield size={12} className="text-zinc-400" /> Sadece 3 temel ekran</div>
          </div>

          {/* Paket 2: Profesyonel */}
          <div
            onClick={() => setSelectedPlan("pro")}
            className={`border rounded-[24px] p-6 cursor-pointer transition-all flex flex-col justify-between h-80 relative bg-[#111513]/90 ${
              selectedPlan === "pro"
                ? "border-emerald-500/80 ring-1 ring-emerald-500/30 shadow-[0_0_20px_rgba(52,211,153,0.2)] scale-[1.02]"
                : "border-white/[0.06] hover:border-white/20"
            }`}
          >
            <div className="absolute -top-3 right-6 px-3 py-0.5 bg-emerald-500 text-black rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm">
              Popüler
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-semibold">Önerilen</span>
                {selectedPlan === "pro" && (
                  <div className="size-5 rounded-full bg-emerald-500 flex items-center justify-center text-black">
                    <Check size={12} className="stroke-[3]" />
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Paket 2 (Profesyonel)</h3>
                <p className="text-xs text-zinc-400 mt-1">Gelişmiş ERP modülleri ve tüm ekranlar</p>
              </div>
              <div className="space-y-0.5">
                <div className="text-2xl font-light text-white">15.000 TL <span className="text-xs font-normal text-zinc-500">/ Ay</span></div>
                <div className="text-[11px] text-emerald-400 font-semibold">İlk 3 Ay Sadece 10.000 TL / Ay</div>
              </div>
              <ul className="text-xs space-y-2 text-zinc-400">
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400" /> Sınırsız CRM &amp; Proje Takibi</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400" /> Finansal Analiz &amp; Raporlar</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400" /> Detaylı Personel Denetim</li>
              </ul>
            </div>
            <div className="text-[11px] text-emerald-400 font-medium flex items-center gap-1.5"><Award size={12} /> Tüm modüller tam açık</div>
          </div>

          {/* Paket 3: Enterprise */}
          <div
            onClick={() => setSelectedPlan("enterprise")}
            className={`border rounded-[24px] p-6 cursor-pointer transition-all flex flex-col justify-between h-80 relative bg-[#111513]/90 ${
              selectedPlan === "enterprise"
                ? "border-emerald-500/80 ring-1 ring-emerald-500/30 shadow-[0_0_20px_rgba(52,211,153,0.15)] scale-[1.02]"
                : "border-white/[0.06] hover:border-white/20"
            }`}
          >
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <span className="px-3 py-1 bg-white/[0.04] text-zinc-400 border border-white/10 rounded-full text-xs font-semibold">Özel</span>
                {selectedPlan === "enterprise" && (
                  <div className="size-5 rounded-full bg-emerald-500 flex items-center justify-center text-black">
                    <Check size={12} className="stroke-[3]" />
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Paket 3 (Enterprise)</h3>
                <p className="text-xs text-zinc-400 mt-1">Özel altyapı ve genişletilmiş yetkiler</p>
              </div>
              <div className="text-2xl font-light text-white">30.000 TL <span className="text-xs font-normal text-zinc-500">/ Ay</span></div>
              <ul className="text-xs space-y-2 text-zinc-400">
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400" /> Özel Domain Desteği</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400" /> 7/24 Özel Destek Hattı</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400" /> Özel Sunucu &amp; API Erişimi</li>
              </ul>
            </div>
            <div className="text-[11px] text-zinc-500 font-medium flex items-center gap-1.5"><HelpCircle size={12} className="text-zinc-400" /> Şirkete özel altyapı</div>
          </div>

        </div>

        {/* Payment Checkout Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
          
          {/* Left info column */}
          <div className="lg:col-span-2 space-y-6 bg-[#111513]/90 border border-white/10 rounded-[24px] p-6 shadow-md">
            <h4 className="font-bold text-base text-white">Ödeme Detayları</h4>
            <div className="space-y-4 text-xs">
              <div className="flex justify-between border-b border-white/[0.06] pb-2.5">
                <span className="text-zinc-400">Seçilen Plan</span>
                <span className="font-bold capitalize text-white">{selectedPlan}</span>
              </div>
              <div className="flex justify-between border-b border-white/[0.06] pb-2.5">
                <span className="text-zinc-400">Birim Fiyat</span>
                <span className="text-zinc-200">
                  {selectedPlan === "free" ? "0 TL" : selectedPlan === "pro" ? "15.000 TL" : "30.000 TL"}
                </span>
              </div>
              {selectedPlan === "pro" && (
                <div className="text-xs text-emerald-400 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 font-medium">
                  Kampanya Kapsamında ilk 3 ay için sadece 10.000 TL faturalandırılacaktır.
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-emerald-400 pt-1">
                <span>Toplam Tutar</span>
                <span>
                  {selectedPlan === "free" ? "0 TL" : selectedPlan === "pro" ? "10.000 TL (Kampanya)" : "30.000 TL"}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-zinc-400 bg-white/[0.02] p-3 rounded-xl border border-white/10">
              <Lock size={15} className="text-emerald-400 shrink-0" />
              <span>Ödemeleriniz PCI-DSS uyumlu 256-bit SSL korumasıyla şifrelenir.</span>
            </div>
          </div>

          {/* Right credit card checkout form */}
          <form onSubmit={handleCheckout} className="lg:col-span-3 bg-[#111513]/90 border border-white/10 rounded-[24px] p-8 space-y-6 shadow-md">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <CreditCard size={18} />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">Güvenli Kart Ödeme</h4>
                <p className="text-xs text-zinc-400">Kart bilgilerinizi girerek aboneliğinizi başlatın</p>
              </div>
            </div>

            {selectedPlan === "free" ? (
              <div className="p-6 bg-white/[0.02] border border-white/10 rounded-2xl text-center space-y-2">
                <Check className="size-8 text-emerald-400 mx-auto" />
                <p className="text-sm font-semibold text-white">Ücretsiz paket için kredi kartı gerekmemektedir.</p>
                <p className="text-xs text-zinc-400">Onayladığınızda sadece Dashboard, Ayarlar ve Teknik Destek paneline erişebileceksiniz.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Card holder */}
                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-400 font-medium uppercase tracking-wider">KART ÜZERİNDEKİ İSİM</label>
                  <input
                    type="text"
                    required
                    placeholder="Ad Soyad"
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value)}
                    className="w-full h-11 bg-white/[0.03] border border-white/10 rounded-xl px-4 text-xs focus:outline-none focus:border-emerald-500/50 text-white placeholder:text-zinc-600"
                  />
                </div>

                {/* Card number */}
                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-400 font-medium uppercase tracking-wider">KART NUMARASI</label>
                  <input
                    type="text"
                    required
                    placeholder="0000 0000 0000 0000"
                    value={cardNumber}
                    onChange={(e) => handleCardNumberChange(e.target.value)}
                    className="w-full h-11 bg-white/[0.03] border border-white/10 rounded-xl px-4 text-xs font-mono focus:outline-none focus:border-emerald-500/50 text-white placeholder:text-zinc-600"
                  />
                </div>

                {/* Expiry and CVV */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs text-zinc-400 font-medium uppercase tracking-wider">AY</label>
                    <input
                      type="text"
                      required
                      placeholder="MM"
                      maxLength={2}
                      value={expMonth}
                      onChange={(e) => setExpMonth(e.target.value.replace(/\D/g, ""))}
                      className="w-full h-11 bg-white/[0.03] border border-white/10 rounded-xl px-3 text-xs text-center focus:outline-none focus:border-emerald-500/50 text-white placeholder:text-zinc-600"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-zinc-400 font-medium uppercase tracking-wider">YIL</label>
                    <input
                      type="text"
                      required
                      placeholder="YY"
                      maxLength={2}
                      value={expYear}
                      onChange={(e) => setExpYear(e.target.value.replace(/\D/g, ""))}
                      className="w-full h-11 bg-white/[0.03] border border-white/10 rounded-xl px-3 text-xs text-center focus:outline-none focus:border-emerald-500/50 text-white placeholder:text-zinc-600"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-zinc-400 font-medium uppercase tracking-wider">CVC</label>
                    <input
                      type="password"
                      required
                      placeholder="000"
                      maxLength={3}
                      value={cvc}
                      onChange={(e) => setCvc(e.target.value.replace(/\D/g, ""))}
                      className="w-full h-11 bg-white/[0.03] border border-white/10 rounded-xl px-3 text-xs text-center focus:outline-none focus:border-emerald-500/50 text-white placeholder:text-zinc-600"
                    />
                  </div>
                </div>
              </div>
            )}

            {errorMsg && (
              <p className="text-xs text-red-400 font-semibold bg-red-500/10 border border-red-500/20 p-3 rounded-xl">
                {errorMsg}
              </p>
            )}

            {successMsg && (
              <p className="text-xs text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl">
                {successMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(52,211,153,0.3)] cursor-pointer"
            >
              {isLoading ? "İşleniyor..." : selectedPlan === "free" ? "Ücretsiz Planı Başlat" : "Ödeme Yap ve Planı Başlat"}
            </button>
          </form>

        </div>

      </div>
    </div>
  )
}
