/**
 * Çiçekana ERP — Müşteri Koruması ve Hata Dönüştürme Motoru (Error Sanitizer)
 *
 * KRİTİK KURAL: Geliştirici/Sistem dili YASAKTIR.
 * Kullanıcının önüne 500 Internal Server Error, NullPointer, Database connection failed vb.
 * teknik terimler düşürülmez.
 *
 * Bu motor, teknik hataları arayüzde filtreler, kibar ve çözüm odaklı Türkçe bildirimlere
 * dönüştürür ve arka planda sistem log servisine iletir.
 */

export interface SanitizedNotificationResult {
  title: string
  message: string
  isSanitized: boolean
  originalError?: string
}

// Yasaklı geliştirici/sistem kelime ve kalıpları
const TECHNICAL_TERMS_REGEX = [
  /500\s*(Internal Server Error)?/i,
  /Unhandled\s*Rejection/i,
  /NullPointer(Exception)?/i,
  /Path\s*Traversal\s*Error/i,
  /Database\s*connection\s*(failed|refused|error)?/i,
  /FFmpeg\s*process\s*(killed|failed|error)?/i,
  /Checksum\s*Mismatch/i,
  /SQL\s*(Query|Exception|Error|Syntax)/i,
  /PrismaClient[A-Za-z]*/i,
  /ECONNREFUSED/i,
  /ENOSPC/i,
  /TypeError:/i,
  /SyntaxError:/i,
  /ReferenceError:/i,
  /fetch\s*failed/i,
  /NetworkError/i,
  /HTTP\s*[45]\d\d/i,
]

/**
 * Bir hata veya bildirim mesajını kontrol eder; teknik ifadeler barındırıyorsa
 * kullanıcı dostu kibar Türkçe mesaj ile değiştirir ve loglama için işaretler.
 */
export function sanitizeNotificationMessage(
  rawTitle?: string,
  rawMessage?: string | Error | unknown
): SanitizedNotificationResult {
  const messageStr = rawMessage instanceof Error 
    ? rawMessage.message 
    : typeof rawMessage === 'string' 
      ? rawMessage 
      : JSON.stringify(rawMessage || '')

  const titleStr = rawTitle || ''

  const combinedText = `${titleStr} ${messageStr}`

  // Yasaklı teknik terim kontrolü
  const containsTechnicalTerm = TECHNICAL_TERMS_REGEX.some((pattern) => pattern.test(combinedText))

  if (containsTechnicalTerm || messageStr.includes('{"error"') || messageStr.includes('stack')) {
    // Arka plana sessiz log gönder
    sendSilentErrorTelemetry(combinedText, titleStr, messageStr)

    return {
      title: 'İşlem Tamamlanamadı',
      message: 'Talebiniz şu anda gerçekleştirilemedi. Sistem kayıtlarımız teknik ekibimize iletildi, lütfen kısa bir süre sonra tekrar deneyin.',
      isSanitized: true,
      originalError: messageStr,
    }
  }

  return {
    title: titleStr || 'Bilgilendirme',
    message: messageStr || 'İşleminiz güncellendi.',
    isSanitized: false,
  }
}

/**
 * Arka plana sessiz hata logu gönderir (Sistem Logları İzolasyonu).
 */
function sendSilentErrorTelemetry(fullContext: string, title: string, originalMessage: string) {
  if (typeof window === 'undefined') return

  try {
    const payload = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      title,
      originalMessage,
      context: fullContext,
    }

    // sendBeacon veya fetch ile sessizce ilet
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/notifications/log', JSON.stringify(payload))
    } else {
      fetch('/api/notifications/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {})
    }
  } catch {
    // İzolasyon gereği kullanıcıya veya konsola hata yansıtma
  }
}
