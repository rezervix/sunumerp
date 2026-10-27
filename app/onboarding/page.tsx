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
  const [primaryColor, setPrimaryColor] = useState("#D37112")
  const [accentColor, setAccentColor] = useState("#D32F28")
  const [extractedPalette, setExtractedPalette] = useState<ExtractedColor[]>([])

  // Dark Theme Palette (Derived from Logo)
  const [darkBgColor, setDarkBgColor] = useState("#171310")
  const [darkCardColor, setDarkCardColor] = useState("#231C17")
  const [darkPrimaryColor, setDarkPrimaryColor] = useState("#E6923C")
  const [darkAccentColor, setDarkAccentColor] = useState("#E2534B")
  
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
        setPrimaryColor("#D37112")
        setAccentColor("#D32F28")
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

  // Re-run background removal if user toggles tolerance or re-triggers
  const handleReanalyzeBg = () => {
    if (!originalLogo) return
    setIsAnalyzing(true)
    const img = new window.Image()
    img.src = originalLogo
    img.onload = () => {
      const cleaned = removeLogoBackground(img, 32)
      setBgRemovedLogo(cleaned)
      setIsAnalyzing(false)
    }
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
            darkBorder: "rgba(248, 239, 226, 0.15)"
          },
          subscription: {
            plan: "free",
            status: "inactive",
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
          }
        })
      })

      if (res.ok) {
        // Dispatch live event to update any active UI components immediately
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
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
      <div className="w-full max-w-3xl bg-card rounded-3xl border border-border shadow-2xl p-8 relative overflow-hidden">
        
        {/* Dynamic Glowing accents */}
        <div className="absolute -top-32 -left-32 w-64 h-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-64 h-64 rounded-full bg-accent/10 blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-primary/20 flex items-center justify-center text-primary font-bold">
              Ç
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Çiçekana ERP Marka Kiti Motoru</h1>
              <p className="text-xs text-muted-foreground">Otonom Kurulum ve Dinamik Tema Tasarımı</p>
            </div>
          </div>
          <span className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-xs font-bold flex items-center gap-1.5">
            <Sparkles size={13} /> Marka Kiti
          </span>
        </div>

        {/* Branding Engine Form */}
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Palette className="text-primary size-5" /> Akıllı Logo ve Tema Motoru
            </h2>
            <p className="text-sm text-muted-foreground mt-1">Şirket logonuzu yükleyin; renk analiz motoru marka kimliğinizi ve arka planını otomatik düzenler.</p>
          </div>

          {/* Drag & Drop File Upload */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-border hover:border-primary/50 bg-muted/20 rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3"
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
                  <div className="size-24 rounded-2xl bg-neutral-950 p-2 flex items-center justify-center shadow-md border border-neutral-800 relative">
                    <span className="absolute -top-2 left-2 text-[9px] font-bold bg-neutral-800 text-neutral-300 px-1.5 py-0.5 rounded">Koyu Zemin</span>
                    <img src={activeLogo} alt="Logo Dark" className="max-h-full max-w-full object-contain" />
                  </div>
                  <div className="size-24 rounded-2xl bg-white p-2 flex items-center justify-center shadow-md border border-gray-200 relative">
                    <span className="absolute -top-2 left-2 text-[9px] font-bold bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">Açık Zemin</span>
                    <img src={activeLogo} alt="Logo Light" className="max-h-full max-w-full object-contain" />
                  </div>
                </div>
                <p className="text-xs font-semibold text-primary">{logoName}</p>
              </div>
            ) : (
              <>
                <div className="size-12 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
                  <Upload size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold">Logonuzu Sürükleyin veya Tıklayın</p>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG, SVG (Maks 10MB)</p>
                </div>
              </>
            )}
          </div>

          {/* Background Removal & Quality Controls */}
          {originalLogo && (
            <div className="bg-muted/40 p-4 rounded-2xl border border-border space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wand2 className="size-4 text-primary" />
                  <span className="text-xs font-semibold text-foreground">Arka Planı Otomatik Temizle (Şeffaflaştır)</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoRemoveBg}
                    onChange={(e) => setAutoRemoveBg(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
              <p className="text-[11px] text-muted-foreground">Beyaz veya açık renkli kutu zeminleri otomatik temizleyerek şeffaf PNG formatında entegre eder.</p>
            </div>
          )}

          {/* Palette Suggestions & WCAG Contrast */}
          {originalLogo && extractedPalette.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground font-semibold block uppercase tracking-wider">Tarafımızca Taraflanan Marka Paleti</label>
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
                    className="flex items-center gap-2 p-2 rounded-xl border border-border bg-card hover:border-primary transition-all text-left shrink-0 cursor-pointer"
                  >
                    <span className="size-6 rounded-lg shadow-inner border border-black/10" style={{ backgroundColor: color.hex }} />
                    <div>
                      <p className="text-xs font-mono font-bold">{color.hex}</p>
                      <p className="text-[9px] text-muted-foreground">WCAG {color.contrastWithWhite >= 4.5 ? "AA ✓" : "Düşük"}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Color Pickers & Contrast Metrics for Light and Dark Themes */}
          {originalLogo && (
            <div className="space-y-4">
              {/* Light Theme Pickers */}
              <div className="bg-muted/30 p-4 rounded-2xl border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sun className="size-4 text-amber-500" />
                    <span className="text-xs font-bold uppercase tracking-wider text-foreground">Açık Tema Renk Paleti</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-1">
                    <ShieldCheck size={10} /> Kontrast: {contrastRatio.toFixed(1)}:1
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-muted-foreground font-semibold">Ana Tema Rengi (Primary)</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => {
                          const p = e.target.value
                          setPrimaryColor(p)
                          handleRegenerateDarkTheme(p, accentColor)
                        }}
                        className="size-9 rounded-lg cursor-pointer bg-transparent border-0 outline-none"
                      />
                      <span className="font-mono text-xs uppercase text-foreground/80 font-bold">{primaryColor}</span>
                      <span className="text-[10px] px-2 py-1 rounded font-bold ml-auto" style={{ backgroundColor: primaryColor, color: primaryFg }}>
                        Metin Rengi
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] text-muted-foreground font-semibold">Vurgu Rengi (Accent)</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={accentColor}
                        onChange={(e) => {
                          const a = e.target.value
                          setAccentColor(a)
                          handleRegenerateDarkTheme(primaryColor, a)
                        }}
                        className="size-9 rounded-lg cursor-pointer bg-transparent border-0 outline-none"
                      />
                      <span className="font-mono text-xs uppercase text-foreground/80 font-bold">{accentColor}</span>
                      <span className="text-[10px] px-2 py-1 rounded font-bold ml-auto" style={{ backgroundColor: accentColor, color: accentFg }}>
                        Vurgu Metni
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Logoya Özel Dynamic Dark Theme Pickers */}
              <div className="bg-neutral-900 text-neutral-100 p-4 rounded-2xl border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Moon className="size-4 text-indigo-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-200">Logodan Üretilen Karanlık Tema Paleti</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRegenerateDarkTheme()}
                    className="text-[10px] font-bold px-2 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw size={10} /> Yeniden Üret
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="space-y-1">
                    <label className="text-[10px] text-neutral-400 font-semibold">Koyu Zemin (Bg)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={darkBgColor}
                        onChange={(e) => setDarkBgColor(e.target.value)}
                        className="size-7 rounded cursor-pointer bg-transparent border-0"
                      />
                      <span className="font-mono text-[11px] font-bold uppercase text-neutral-300">{darkBgColor}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-neutral-400 font-semibold">Koyu Kart (Card)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={darkCardColor}
                        onChange={(e) => setDarkCardColor(e.target.value)}
                        className="size-7 rounded cursor-pointer bg-transparent border-0"
                      />
                      <span className="font-mono text-[11px] font-bold uppercase text-neutral-300">{darkCardColor}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-neutral-400 font-semibold">Koyu Vurgu (Primary)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={darkPrimaryColor}
                        onChange={(e) => setDarkPrimaryColor(e.target.value)}
                        className="size-7 rounded cursor-pointer bg-transparent border-0"
                      />
                      <span className="font-mono text-[11px] font-bold uppercase text-neutral-300">{darkPrimaryColor}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Realtime Layout Preview Demo - Side-by-side Light & Dark */}
          {activeLogo && (
            <div className="bg-muted/30 border border-border rounded-2xl p-4 space-y-3">
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Canlı Arayüz Önizlemesi (Açık vs Logoya Özel Koyu Tema)</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                {/* Light Mode Mock */}
                <div className="border border-border rounded-xl overflow-hidden h-28 flex bg-white text-gray-900 shadow-xs">
                  <div className="w-1/3 bg-gray-50 border-r border-gray-200 p-2 flex flex-col justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 pb-1 border-b border-gray-200">
                        <img src={activeLogo} alt="Logo" className="h-3.5 object-contain" />
                        <span className="font-bold text-[8px] truncate">Açık Tema</span>
                      </div>
                      <div className="h-3.5 rounded px-1 flex items-center text-[7px]" style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}>
                        Dashboard
                      </div>
                    </div>
                    <div className="h-2 rounded" style={{ backgroundColor: accentColor }} />
                  </div>
                  <div className="flex-1 p-2 flex flex-col justify-between">
                    <div className="flex justify-between items-center">
                      <div className="h-2 w-10 bg-gray-200 rounded" />
                      <div className="size-2 rounded-full" style={{ backgroundColor: primaryColor }} />
                    </div>
                    <div className="h-4 rounded flex items-center justify-center text-[8px] font-bold" style={{ backgroundColor: primaryColor, color: primaryFg }}>
                      Açık Buton
                    </div>
                  </div>
                </div>

                {/* Dark Mode Mock */}
                <div className="border border-neutral-700 rounded-xl overflow-hidden h-28 flex shadow-xs" style={{ backgroundColor: darkBgColor, color: "#F6F3F0" }}>
                  <div className="w-1/3 border-r border-neutral-700 p-2 flex flex-col justify-between" style={{ backgroundColor: darkCardColor }}>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 pb-1 border-b border-neutral-700">
                        <img src={activeLogo} alt="Logo" className="h-3.5 object-contain" />
                        <span className="font-bold text-[8px] truncate text-neutral-200">Koyu Tema</span>
                      </div>
                      <div className="h-3.5 rounded px-1 flex items-center text-[7px]" style={{ backgroundColor: `${darkPrimaryColor}30`, color: darkPrimaryColor }}>
                        Dashboard
                      </div>
                    </div>
                    <div className="h-2 rounded" style={{ backgroundColor: darkAccentColor }} />
                  </div>
                  <div className="flex-1 p-2 flex flex-col justify-between" style={{ backgroundColor: darkBgColor }}>
                    <div className="flex justify-between items-center">
                      <div className="h-2 w-10 bg-neutral-700 rounded" />
                      <div className="size-2 rounded-full" style={{ backgroundColor: darkPrimaryColor }} />
                    </div>
                    <div className="h-4 rounded flex items-center justify-center text-[8px] font-bold" style={{ backgroundColor: darkPrimaryColor, color: darkPrimaryFg }}>
                      Koyu Buton
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {errorMsg && (
            <p className="text-xs text-destructive font-semibold bg-destructive/10 border border-destructive/20 p-3 rounded-xl">
              {errorMsg}
            </p>
          )}

          <button
            type="button"
            onClick={handleCompleteOnboarding}
            disabled={isAnalyzing || isSaving || !originalLogo}
            className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 shadow-lg shadow-primary/20 cursor-pointer"
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
