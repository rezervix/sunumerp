"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CreditCard, Check, Shield, Award, HelpCircle, ArrowLeft, Sparkles, CheckCircle2 } from "lucide-react"

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
    <div className="min-h-screen bg-background text-foreground p-6 md:p-12 flex flex-col justify-center items-center relative overflow-hidden">
      
      {/* Dynamic Ambient Glows */}
      <div className="absolute top-10 left-1/4 w-[500px] h-[500px] rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[400px] h-[400px] rounded-full bg-accent/10 blur-3xl pointer-events-none" />

      <div className="w-full max-w-5xl space-y-8 z-10">
        
        {/* Header */}
        <div className="text-center space-y-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-xs font-bold uppercase tracking-wider">
            <Sparkles size={14} /> Çiçekana ERP SaaS Lisanslama
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Kullanım Planınızı Seçin</h1>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">
            İşletmeniz için en uygun abonelik paketini seçerek tüm ERP ve Ajans modüllerini kesintisiz kullanın.
          </p>
        </div>

        {/* Pricing Tiers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Paket 1: Ücretsiz */}
          <div
            onClick={() => setSelectedPlan("free")}
            className={`border rounded-3xl p-6 cursor-pointer transition-all flex flex-col justify-between h-80 relative bg-card ${
              selectedPlan === "free"
                ? "border-primary ring-2 ring-primary/20 shadow-xl scale-[1.02]"
                : "border-border hover:border-primary/40"
            }`}
          >
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <span className="px-3 py-1 bg-muted text-muted-foreground rounded-full text-xs font-semibold">Başlangıç</span>
                {selectedPlan === "free" && (
                  <div className="size-5 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                    <Check size={12} className="stroke-[3]" />
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-xl font-bold">Paket 1 (Ücretsiz)</h3>
                <p className="text-xs text-muted-foreground mt-1">Temel özelliklerin ücretsiz kullanımı</p>
              </div>
              <div className="text-2xl font-bold">0 TL <span className="text-xs font-normal text-muted-foreground">/ Süresiz</span></div>
              <ul className="text-xs space-y-2 text-muted-foreground">
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-primary" /> Dashboard İzleme</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-primary" /> Temel Ayarlar</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-primary" /> Teknik Destek</li>
              </ul>
            </div>
            <div className="text-[11px] text-primary font-medium flex items-center gap-1"><Shield size={12} /> Sadece 3 temel ekran</div>
          </div>

          {/* Paket 2: Profesyonel */}
          <div
            onClick={() => setSelectedPlan("pro")}
            className={`border rounded-3xl p-6 cursor-pointer transition-all flex flex-col justify-between h-80 relative bg-card ${
              selectedPlan === "pro"
                ? "border-primary ring-2 ring-primary/20 shadow-xl scale-[1.02]"
                : "border-border hover:border-primary/40"
            }`}
          >
            <div className="absolute -top-3 right-6 px-3 py-0.5 bg-primary text-primary-foreground rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm">
              Kampanya
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-semibold">Popüler</span>
                {selectedPlan === "pro" && (
                  <div className="size-5 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                    <Check size={12} className="stroke-[3]" />
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-xl font-bold">Paket 2 (Profesyonel)</h3>
                <p className="text-xs text-muted-foreground mt-1">Gelişmiş ERP modülleri ve tüm ekranlar</p>
              </div>
              <div className="space-y-0.5">
                <div className="text-2xl font-bold text-primary">15.000 TL <span className="text-xs font-normal text-muted-foreground">/ Ay</span></div>
                <div className="text-[11px] text-emerald-500 font-semibold">İlk 3 Ay Sadece 10.000 TL / Ay</div>
              </div>
              <ul className="text-xs space-y-2 text-muted-foreground">
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-primary" /> Sınırsız CRM &amp; Proje Takibi</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-primary" /> Finansal Analiz &amp; Raporlar</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-primary" /> Detaylı Personel Denetim</li>
              </ul>
            </div>
            <div className="text-[11px] text-primary font-medium flex items-center gap-1"><Award size={12} /> Tüm özellikler açık</div>
          </div>

          {/* Paket 3: Enterprise */}
          <div
            onClick={() => setSelectedPlan("enterprise")}
            className={`border rounded-3xl p-6 cursor-pointer transition-all flex flex-col justify-between h-80 relative bg-card ${
              selectedPlan === "enterprise"
                ? "border-primary ring-2 ring-primary/20 shadow-xl scale-[1.02]"
                : "border-border hover:border-primary/40"
            }`}
          >
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <span className="px-3 py-1 bg-muted text-muted-foreground rounded-full text-xs font-semibold">Özel</span>
                {selectedPlan === "enterprise" && (
                  <div className="size-5 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                    <Check size={12} className="stroke-[3]" />
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-xl font-bold">Paket 3 (Enterprise)</h3>
                <p className="text-xs text-muted-foreground mt-1">Özel altyapı ve genişletilmiş yetkiler</p>
              </div>
              <div className="text-2xl font-bold">30.000 TL <span className="text-xs font-normal text-muted-foreground">/ Ay</span></div>
              <ul className="text-xs space-y-2 text-muted-foreground">
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-primary" /> Custom Domain Desteği</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-primary" /> 7/24 Özel Destek Hattı</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-primary" /> Özel Sunucu &amp; Web Erişimi</li>
              </ul>
            </div>
            <div className="text-[11px] text-primary font-medium flex items-center gap-1"><HelpCircle size={12} /> Şirkete özel Web Altyapısı</div>
          </div>

        </div>

        {/* Payment Checkout Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
          
          {/* Left info column */}
          <div className="lg:col-span-2 space-y-6 bg-card border border-border rounded-3xl p-6 shadow-md">
            <h4 className="font-bold text-lg">Ödeme Detayları</h4>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-muted-foreground">Seçilen Plan</span>
                <span className="font-bold capitalize">{selectedPlan}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-muted-foreground">Birim Fiyat</span>
                <span>
                  {selectedPlan === "free" ? "0 TL" : selectedPlan === "pro" ? "15.000 TL" : "30.000 TL"}
                </span>
              </div>
              {selectedPlan === "pro" && (
                <div className="text-xs text-emerald-500 bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20 font-medium">
                  Kampanya Kapsamında ilk 3 ay için sadece 10.000 TL faturalandırılacaktır.
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-primary pt-2">
                <span>Toplam Tutar</span>
                <span>
                  {selectedPlan === "free" ? "0 TL" : selectedPlan === "pro" ? "10.000 TL (Kampanya)" : "30.000 TL"}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded-xl border border-border">
              <CreditCard size={16} className="text-primary shrink-0" />
              <span>Ödemeleriniz İyzico PCI-DSS uyumlu güvenli altyapısıyla şifrelenir.</span>
            </div>
          </div>

          {/* Right credit card checkout form */}
          <form onSubmit={handleCheckout} className="lg:col-span-3 bg-card border border-border rounded-3xl p-8 space-y-6 shadow-md">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <CreditCard size={20} />
              </div>
              <div>
                <h4 className="font-bold text-base">Güvenli Kart Ödeme</h4>
                <p className="text-xs text-muted-foreground">Kart bilgilerinizi girerek aboneliğinizi başlatın</p>
              </div>
            </div>

            {selectedPlan === "free" ? (
              <div className="p-6 bg-muted/30 border border-border rounded-2xl text-center space-y-3">
                <Check className="size-10 text-primary mx-auto" />
                <p className="text-sm font-semibold">Ücretsiz paket için kredi kartı gerekmemektedir.</p>
                <p className="text-xs text-muted-foreground">Onayladığınızda sadece Dashboard, Ayarlar ve Teknik Destek paneline erişebileceksiniz.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Card holder */}
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">KART ÜZERİNDEKİ İSİM</label>
                  <input
                    type="text"
                    required
                    placeholder="John Doe"
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value)}
                    className="w-full h-11 bg-muted/40 border border-border rounded-xl px-4 text-sm focus:outline-none focus:border-primary text-foreground"
                  />
                </div>

                {/* Card number */}
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">KART NUMARASI</label>
                  <input
                    type="text"
                    required
                    placeholder="0000 0000 0000 0000"
                    value={cardNumber}
                    onChange={(e) => handleCardNumberChange(e.target.value)}
                    className="w-full h-11 bg-muted/40 border border-border rounded-xl px-4 text-sm font-mono focus:outline-none focus:border-primary text-foreground"
                  />
                </div>

                {/* Expiry and CVV */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">AY</label>
                    <input
                      type="text"
                      required
                      placeholder="MM"
                      maxLength={2}
                      value={expMonth}
                      onChange={(e) => setExpMonth(e.target.value.replace(/\D/g, ""))}
                      className="w-full h-11 bg-muted/40 border border-border rounded-xl px-4 text-sm text-center focus:outline-none focus:border-primary text-foreground"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">YIL</label>
                    <input
                      type="text"
                      required
                      placeholder="YY"
                      maxLength={2}
                      value={expYear}
                      onChange={(e) => setExpYear(e.target.value.replace(/\D/g, ""))}
                      className="w-full h-11 bg-muted/40 border border-border rounded-xl px-4 text-sm text-center focus:outline-none focus:border-primary text-foreground"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">CVC</label>
                    <input
                      type="password"
                      required
                      placeholder="000"
                      maxLength={3}
                      value={cvc}
                      onChange={(e) => setCvc(e.target.value.replace(/\D/g, ""))}
                      className="w-full h-11 bg-muted/40 border border-border rounded-xl px-4 text-sm text-center focus:outline-none focus:border-primary text-foreground"
                    />
                  </div>
                </div>
              </div>
            )}

            {errorMsg && (
              <p className="text-xs text-destructive font-semibold bg-destructive/10 border border-destructive/20 p-3 rounded-xl">
                {errorMsg}
              </p>
            )}

            {successMsg && (
              <p className="text-xs text-emerald-500 font-semibold bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl">
                {successMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
            >
              {isLoading ? "İşleniyor..." : selectedPlan === "free" ? "Ücretsiz Planı Başlat" : "Ödeme Yap ve Planı Başlat"}
            </button>
          </form>

        </div>

      </div>
    </div>
  )
}
