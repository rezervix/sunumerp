"use client"

import React, { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { KeyRound, ShieldCheck, AlertTriangle, RefreshCw, ArrowRight } from "lucide-react"

export default function SupplierPortalInviteTokenPage() {
  const params = useParams<{ token: string }>()
  const router = useRouter()
  const token = typeof params?.token === "string" ? params.token : ""

  const [verifying, setVerifying] = useState(true)
  const [inviteInfo, setInviteInfo] = useState<any | null>(null)
  const [errorMsg, setErrorMsg] = useState("")
  const [exchanging, setExchanging] = useState(false)

  useEffect(() => {
    if (!token) {
      setVerifying(false)
      setErrorMsg("Davet anahtarı bulunamadı.")
      return
    }
    let active = true
    fetch(`/api/supplier-portal/invite?token=${encodeURIComponent(token)}`)
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!active) return
        if (!ok || !d.success) {
          setErrorMsg(d.error || "Davet bağlantısı doğrulanamadı veya süresi dolmuş.")
        } else {
          setInviteInfo(d)
        }
      })
      .catch(() => {
        if (active) setErrorMsg("Sunucu doğrulaması sırasında hata oluştu.")
      })
      .finally(() => {
        if (active) setVerifying(false)
      })
    return () => {
      active = false
    }
  }, [token])

  const handleActivateSession = async () => {
    setExchanging(true)
    setErrorMsg("")
    try {
      const res = await fetch("/api/supplier-portal/invite/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || "Portal oturumu açılamadı.")
        return
      }
      router.replace(data.redirectTo || "/tedarikci-portali")
    } catch {
      setErrorMsg("Ağ hatası nedeniyle portal oturumu açılamadı.")
    } finally {
      setExchanging(false)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#080A09] text-zinc-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111513] p-6 space-y-5 shadow-2xl">
        {verifying ? (
          <div className="py-6 text-center space-y-3">
            <RefreshCw className="size-7 text-[#34D399] animate-spin mx-auto" />
            <div className="text-sm font-medium text-white">Davet İmzanız Doğrulanıyor...</div>
          </div>
        ) : errorMsg ? (
          <div className="space-y-4 text-center">
            <div className="size-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
              <AlertTriangle className="size-6" />
            </div>
            <div className="space-y-1">
              <h1 className="text-lg font-bold text-white">Davet Geçersiz veya Süresi Dolmuş</h1>
              <p className="text-xs text-rose-300">{errorMsg}</p>
            </div>
            <a
              href="/tedarikci-portali"
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl border border-white/15 bg-white/[0.05] text-xs text-white"
            >
              Tedarikçi Giriş Sayfasına Git
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[#34D399] text-xs font-semibold">
              <ShieldCheck className="size-4" />
              <span>İmzalı Tedarikçi Portal Daveti Doğrulandı</span>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-[#0B0E0D] p-4 space-y-1.5">
              <div className="text-base font-bold text-white">{inviteInfo.supplier?.name}</div>
              <div className="text-xs font-mono text-zinc-400">
                Kod: {inviteInfo.supplier?.code} · Amaç: {inviteInfo.invite?.purpose}
              </div>
              {inviteInfo.invite?.relatedRef && (
                <div className="text-xs text-[#34D399]">İlgili Referans: {inviteInfo.invite.relatedRef}</div>
              )}
              <div className="text-[11px] text-zinc-500">
                Geçerlilik Sonu:{" "}
                {new Date(inviteInfo.invite?.expiresAt).toLocaleString("tr-TR")}
              </div>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Devam ettiğinizde yalnızca <strong>{inviteInfo.supplier?.name}</strong> kayıtlarına
              erişebilen kısıtlı tedarikçi portal oturumu başlatılacaktır.
            </p>
            <button
              type="button"
              disabled={exchanging}
              onClick={handleActivateSession}
              data-testid="exchange-invite-btn"
              className="w-full h-10 rounded-xl bg-[#34D399] hover:bg-[#34D399]/90 text-[#061811] text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <KeyRound className="size-4" />
              {exchanging ? "Oturum Açılıyor..." : "Portal Oturumunu Etkinleştir"}
              <ArrowRight className="size-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
