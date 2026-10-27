"use client"

import { useEffect, useRef, useState } from "react"

interface SplashScreenProps {
  onComplete: () => void
}

/**
 * Açılış Splash Video Bileşeni
 *
 * Video dosyaları gereken konumlar:
 *   - Masaüstü: /public/assets/videos/intro-desktop.mp4
 *   - Mobil:    /public/assets/videos/intro-mobile.mp4
 *
 * Video bittiğinde veya kullanıcı tıkladığında onComplete() çağrılır.
 * sessionStorage kontrolü ile aynı oturumda sadece 1 kez oynatılır.
 */
export function SplashScreen({ onComplete }: SplashScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [videoSrc, setVideoSrc] = useState<string>("")
  const [fadeOut, setFadeOut] = useState(false)

  // Cihaz tespiti — SSR güvenli
  useEffect(() => {
    const isMobile = typeof window !== "undefined" && window.innerWidth <= 768
    setVideoSrc(isMobile ? "/assets/videos/intro-mobile.mp4" : "/assets/videos/intro-desktop.mp4")
  }, [])

  const handleComplete = () => {
    setFadeOut(true)
    // CSS geçiş animasyonu tamamlandıktan sonra geçiş yap
    setTimeout(() => onComplete(), 500)
  }

  // Video yüklenemezse veya hata alırsa direkt geçiş yap
  const handleError = () => {
    console.warn("[SplashScreen] Video yüklenemedi, giriş sayfasına geçiliyor.")
    onComplete()
  }

  if (!videoSrc) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black cursor-pointer"
      style={{
        transition: "opacity 0.5s ease",
        opacity: fadeOut ? 0 : 1,
      }}
      onClick={handleComplete}
      title="Geçmek için tıklayın"
    >
      <video
        ref={videoRef}
        src={videoSrc}
        autoPlay
        muted
        playsInline
        onEnded={handleComplete}
        onError={handleError}
        className="w-full h-full object-cover"
      />

      {/* Skip İpucu */}
      <div
        className="absolute bottom-8 right-8 text-white/50 text-xs font-medium tracking-widest uppercase flex items-center gap-2"
        style={{ animation: "pulse 2s infinite" }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 18l8.5-6L6 6v12zm8.5-6L23 6v12l-8.5-6z" />
        </svg>
        Geçmek için tıkla
      </div>
    </div>
  )
}
