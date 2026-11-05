"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Upload, Palette, Check, Sparkles, Wand2, ShieldCheck, RefreshCw, Moon, Sun } from "lucide-react"
import {
  extractBrandColorsFromImage,
  removeLogoBackground,
  getReadableForeground,
  getContrastRatio,
  generateDarkPaletteFromBrandColor,
  type ExtractedColor,
  type DarkThemePalette
} from "@/lib/utils/brand-engine"

export default function OnboardingPage() {
  const router = useRouter()
  
  // Logo & Color States
  const [originalLogo, setOriginalLogo] = useState<string | null>(null)
  const [bgRemovedLogo, setBgRemovedLogo] = useState<string | null>(null)
  const [autoRemoveBg, setAutoRemoveBg] = useState<boolean>(true)
  const [logoName, setLogoName] = useState<string>("")
  
  // Light Theme Palette
  const [primaryColor, setPrimaryColor] = useState("#10B981")
  const [accentColor, setAccentColor] = useState("#06B6D4")
  const [extractedPalette, setExtractedPalette] = useState<ExtractedColor[]>([])

  // Dark Theme Palette (Derived from Logo)
  const [darkBgColor, setDarkBgColor] = useState("#080A09")
  const [darkCardColor, setDarkCardColor] = useState("#111513")
  const [darkPrimaryColor, setDarkPrimaryColor] = useState("#34D399")
  const [darkAccentColor, setDarkAccentColor] = useState("#22D3EE")
  
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Active displayed logo depending on background removal toggle
  const activeLogo = autoRemoveBg && bgRemovedLogo ? bgRemovedLogo : originalLogo

  // Calculate readable text colors for current selections
  const primaryFg = getReadableForeground(primaryColor)
  const accentFg = getReadableForeground(accentColor)
  const contrastRatio = getContrastRatio(primaryColor, primaryFg)

  // Dark mode readable text colors
  const darkPrimaryFg = getReadableForeground(darkPrimaryColor)
  const darkAccentFg = getReadableForeground(darkAccentColor)

  // Handle Logo Upload, Background Removal & Color Extraction
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLogoName(file.name)
    setIsAnalyzing(true)
    setErrorMsg("")

    const reader = new FileReader()
    reader.onload = (event) => {
      const base64Data = event.target?.result as string
      setOriginalLogo(base64Data)

      const img = new window.Image()
      img.src = base64Data
      img.onload = () => {
        try {
          // 1. Color Extraction via Brand Engine
          const analysis = extractBrandColorsFromImage(img)
          setPrimaryColor(analysis.primary)
          setAccentColor(analysis.accent)
          setExtractedPalette(analysis.palette)

          // Extract & Set Dark Theme Palette from Logo
          if (analysis.darkPalette) {
            setDarkBgColor(analysis.darkPalette.background)
            setDarkCardColor(analysis.darkPalette.card)
            setDarkPrimaryColor(analysis.darkPalette.primary)
            setDarkAccentColor(analysis.darkPalette.accent)
          }

          // 2. Automatic Background Removal via Canvas Alpha-Keying
          const cleanedDataUrl = removeLogoBackground(img, 32)
          setBgRemovedLogo(cleanedDataUrl)
        } catch (err) {
          console.error("Failed to analyze image:", err)
          setErrorMsg("Görsel analizi sırasında hata oluştu.")
        } finally {
          setIsAnalyzing(false)
        }
      }
      img.onerror = () => {
        setPrimaryColor("#10B981")
        setAccentColor("#06B6D4")
        setIsAnalyzing(false)
      }
    }
    reader.onerror = () => {
      setErrorMsg("Görsel okunamadı.")
      setIsAnalyzing(false)
    }
    reader.readAsDataURL(file)
  }

  // Regenerate dark theme colors manually if user changes light primary color
  const handleRegenerateDarkTheme = (pColor = primaryColor, aColor = accentColor) => {
    const darkPal = generateDarkPaletteFromBrandColor(pColor, aColor)
    setDarkBgColor(darkPal.background)
    setDarkCardColor(darkPal.card)
    setDarkPrimaryColor(darkPal.primary)
    setDarkAccentColor(darkPal.accent)
  }

  // Complete Onboarding & Save Configuration
  const handleCompleteOnboarding = async () => {
    if (!originalLogo) {
      setErrorMsg("Lütfen şirket logonuzu yükleyin.")
      return
    }

    setIsSaving(true)
    setErrorMsg("")

    try {
      const res = await fetch("/api/system-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          onboarded: true,
          eulaApproved: true,
          logoUrl: originalLogo,
          bgRemovedLogoUrl: bgRemovedLogo || originalLogo,
          themeColors: {
            primary: primaryColor,
            primaryForeground: primaryFg,
            accent: accentColor,
            accentForeground: accentFg,
            darkBackground: darkBgColor,
            darkCard: darkCardColor,
            darkPopover: darkCardColor,
            darkSidebar: darkBgColor,
            darkHeader: darkBgColor,
            darkPrimary: darkPrimaryColor,
            darkPrimaryForeground: darkPrimaryFg,
            darkAccent: darkAccentColor,
            darkAccentForeground: darkAccentFg,
            darkForeground: "#F6F3F0",
            darkMutedForeground: "#A89F95",
            darkBorder: "rgba(255, 255, 255, 0.08)"
          },
          subscription: {
            plan: "free",
            status: "inactive",
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
          }
        })
      })

      if (res.ok) {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("system-config-updated"))
        }
        router.replace("/paywall")
      } else {
        const data = await res.json()
        setErrorMsg(data.error || "Yapılandırma kaydedilemedi.")
      }
    } catch (err) {
      setErrorMsg("Sunucuyla bağlantı kurulamadı.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#080A09] text-white p-6 relative overflow-hidden">
      {/* Dynamic Glowing accents */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(16,185,129,0.12),transparent)]" />
      <div className="fixed -top-32 -left-32 w-96 h-96 rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-3xl bg-[#111513]/90 backdrop-blur-2xl rounded-[24px] border border-white/10 shadow-2xl p-8 relative overflow-hidden z-10">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold shadow-[0_0_15px_rgba(52,211,153,0.15)]">
              S
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">Sunum ERP Marka Kiti Motoru</h1>
              <p className="text-xs text-zinc-400">Otonom Kurulum ve Dinamik Tema Tasarımı</p>
            </div>
          </div>
          <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-semibold flex items-center gap-1.5">
            <Sparkles size={13} /> Marka Kiti
          </span>
        </div>

        {/* Branding Engine Form */}
        <div className="space-y-6">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Palette className="text-emerald-400 size-5" /> Akıllı Logo ve Tema Motoru
            </h2>
            <p className="text-xs text-zinc-400 mt-1">Şirket logonuzu yükleyin; renk analiz motoru marka kimliğinizi ve arka planını otomatik düzenler.</p>
          </div>

          {/* Drag & Drop File Upload */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-white/10 hover:border-emerald-500/40 bg-white/[0.02] hover:bg-emerald-500/[0.02] rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleLogoUpload}
              accept="image/png, image/jpeg, image/svg+xml, application/pdf"
              className="hidden"
            />
            {activeLogo ? (
              <div className="space-y-3">
                <div className="flex justify-center items-center gap-6">
                  <div className="size-24 rounded-2xl bg-[#080A09] p-2.5 flex items-center justify-center shadow-md border border-white/10 relative">
                    <span className="absolute -top-2 left-2 text-[9px] font-bold bg-white/10 text-zinc-300 px-1.5 py-0.5 rounded">Koyu Zemin</span>
                    <img src={activeLogo} alt="Logo Dark" className="max-h-full max-w-full object-contain" />
                  </div>
                  <div className="size-24 rounded-2xl bg-white p-2.5 flex items-center justify-center shadow-md border border-gray-200 relative">
                    <span className="absolute -top-2 left-2 text-[9px] font-bold bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">Açık Zemin</span>
                    <img src={activeLogo} alt="Logo Light" className="max-h-full max-w-full object-contain" />
                  </div>
                </div>
                <p className="text-xs font-semibold text-emerald-400">{logoName}</p>
              </div>
            ) : (
              <>
                <div className="size-12 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-zinc-400">
                  <Upload size={20} className="text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Logonuzu Sürükleyin veya Tıklayın</p>
                  <p className="text-xs text-zinc-500 mt-1">PNG, JPG, SVG (Maks 10MB)</p>
                </div>
              </>
            )}
          </div>

          {/* Background Removal & Quality Controls */}
          {originalLogo && (
            <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wand2 className="size-4 text-emerald-400" />
                  <span className="text-xs font-semibold text-white">Arka Planı Otomatik Temizle (Şeffaflaştır)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoRemoveBg(!autoRemoveBg)}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                    autoRemoveBg ? "bg-emerald-500 shadow-[0_0_12px_rgba(52,211,153,0.5)]" : "bg-white/10"
                  }`}
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-black transition-transform absolute top-1 ${
                      autoRemoveBg ? "translate-x-6" : "translate-x-1 bg-white"
                    }`}
                  />
                </button>
              </div>
              <p className="text-[11px] text-zinc-400">Beyaz veya açık renkli kutu zeminleri otomatik temizleyerek şeffaf PNG formatında entegre eder.</p>
            </div>
          )}

          {/* Palette Suggestions & WCAG Contrast */}
          {originalLogo && extractedPalette.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs text-zinc-400 font-semibold block uppercase tracking-wider">Algılanan Marka Paleti</label>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {extractedPalette.map((color, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setPrimaryColor(color.hex)
                      if (extractedPalette[idx + 1]) {
                        setAccentColor(extractedPalette[idx + 1].hex)
                      }
                    }}
                    className="flex items-center gap-2 p-2.5 rounded-xl border border-white/10 bg-white/[0.02] hover:border-emerald-500/50 transition-all text-left shrink-0 cursor-pointer"
                  >
                    <span className="size-6 rounded-lg shadow-inner border border-white/10" style={{ backgroundColor: color.hex }} />
                    <div>
                      <p className="text-xs font-mono font-bold text-white">{color.hex}</p>
                      <p className="text-[9px] text-zinc-400">WCAG {color.contrastWithWhite >= 4.5 ? "AA ✓" : "Düşük"}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Color Pickers */}
          {originalLogo && (
            <div className="space-y-4">
              {/* Light Theme Pickers */}
              <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sun className="size-4 text-amber-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-white">Açık Tema Renk Paleti</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                    <ShieldCheck size={10} /> Kontrast: {contrastRatio.toFixed(1)}:1
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-zinc-400 font-semibold">Ana Tema Rengi (Primary)</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => {
                          const p = e.target.value
                          setPrimaryColor(p)
                          handleRegenerateDarkTheme(p, accentColor)
                        }}
                        className="size-9 rounded-xl cursor-pointer bg-transparent border-0 outline-none"
                      />
                      <span className="font-mono text-xs uppercase text-white font-bold">{primaryColor}</span>
                      <span className="text-[10px] px-2 py-1 rounded font-bold ml-auto" style={{ backgroundColor: primaryColor, color: primaryFg }}>
                        Metin Rengi
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] text-zinc-400 font-semibold">Vurgu Rengi (Accent)</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={accentColor}
                        onChange={(e) => {
                          const a = e.target.value
                          setAccentColor(a)
                          handleRegenerateDarkTheme(primaryColor, a)
                        }}
                        className="size-9 rounded-xl cursor-pointer bg-transparent border-0 outline-none"
                      />
                      <span className="font-mono text-xs uppercase text-white font-bold">{accentColor}</span>
                      <span className="text-[10px] px-2 py-1 rounded font-bold ml-auto" style={{ backgroundColor: accentColor, color: accentFg }}>
                        Vurgu Metni
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dynamic Dark Theme Pickers */}
              <div className="bg-[#080A09] text-white p-4 rounded-2xl border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Moon className="size-4 text-emerald-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-200">Logodan Üretilen Karanlık Tema Paleti</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRegenerateDarkTheme()}
                    className="text-[10px] font-bold px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors flex items-center gap-1 cursor-pointer border border-emerald-500/20"
                  >
                    <RefreshCw size={10} /> Yeniden Üret
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-400 font-semibold">Koyu Zemin (Bg)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={darkBgColor}
                        onChange={(e) => setDarkBgColor(e.target.value)}
                        className="size-7 rounded cursor-pointer bg-transparent border-0"
                      />
                      <span className="font-mono text-[11px] font-bold uppercase text-zinc-300">{darkBgColor}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-400 font-semibold">Koyu Kart (Card)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={darkCardColor}
                        onChange={(e) => setDarkCardColor(e.target.value)}
                        className="size-7 rounded cursor-pointer bg-transparent border-0"
                      />
                      <span className="font-mono text-[11px] font-bold uppercase text-zinc-300">{darkCardColor}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-400 font-semibold">Koyu Vurgu (Primary)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={darkPrimaryColor}
                        onChange={(e) => setDarkPrimaryColor(e.target.value)}
                        className="size-7 rounded cursor-pointer bg-transparent border-0"
                      />
                      <span className="font-mono text-[11px] font-bold uppercase text-zinc-300">{darkPrimaryColor}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {errorMsg && (
            <p className="text-xs text-red-400 font-semibold bg-red-500/10 border border-red-500/20 p-3 rounded-xl">
              {errorMsg}
            </p>
          )}

          <button
            type="button"
            onClick={handleCompleteOnboarding}
            disabled={isAnalyzing || isSaving || !originalLogo}
            className="w-full h-12 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(52,211,153,0.3)] cursor-pointer"
          >
            {isSaving ? "Kaydediliyor..." : isAnalyzing ? "Analiz Ediliyor..." : (
              <> Kurulumu Tamamla ve Paket Seçimine Geç <Check size={16} /> </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
