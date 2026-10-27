/**
 * lib/services/whatsappParser.ts
 *
 * WhatsApp "Sohbeti Dışa Aktar" (.zip) formatını parse eden saf modül.
 * UI/DB katmanından tamamen bağımsızdır.
 */

import { unzipSync } from "fflate"
import { createHash } from "crypto"

// ─── Tipler ────────────────────────────────────────────────────

export interface ParsedMessage {
  senderName: string
  timestamp: Date
  content: string
  contentType: string
  fileRef?: string
  isSystemMessage: boolean
  externalId: string
}

export interface ParseError {
  line: number
  raw: string
  reason: string
}

export interface ParseResult {
  messages: ParsedMessage[]
  mediaMap: Map<string, Uint8Array>
  parseErrors: ParseError[]
  detectedFormat: string
}

// ─── Sabitler ──────────────────────────────────────────────────

const INVISIBLE_UNICODE_RE = /[\u200E\u200F\u200B\u200C\u200D\uFEFF\u00A0]/g

const SYSTEM_MESSAGE_PATTERNS = [
  /uçtan uca şifrelidir/i,
  /end-to-end encrypted/i,
  /grubu oluşturdu/i,
  /created the group/i,
  /gruba eklendi/i,
  /was added/i,
  /gruptan ayrıldı/i,
  /\bleft\b/i,
  /numarasını değiştirdi/i,
  /changed their phone number/i,
  /mesajlar ve aramalar/i,
  /messages and calls/i,
  /güvenlik kodunuz değişti/i,
  /security code changed/i,
  /fotoğrafı değiştirdi/i,
  /changed the group/i,
  /grup adını değiştirdi/i,
  /changed the subject/i,
  /görüntüleme bir kez/i,
  /view once/i,
]

const MEDIA_ATTACHMENT_PATTERNS = [
  /<attached:\s*(.+?)>/i,
  /^(.+?)\s*\(dosya eklendi\)$/i,
  /^(.+?)\s*\(file attached\)$/i,
  /^(.+?)\s*\(dosya dahil edilmedi\)$/i,
  /^(.+?)\s*\(file omitted\)$/i,
]

const MEDIA_OMITTED_PATTERNS = [
  /dosya dahil edilmedi/i,
  /file omitted/i,
  /medya dahil edilmedi/i,
  /media omitted/i,
]

const MESSAGE_FORMATS = [
  {
    name: "ios_brackets",
    re: /^\[(\d{1,2}[./]\d{1,2}[./]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?)\]\s+([^:]+?):\s([\s\S]*)$/,
  },
  {
    name: "android_dot",
    re: /^(\d{1,2}[./]\d{1,2}[./]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?)\s+-\s+([^:]+?):\s([\s\S]*)$/,
  },
  {
    name: "android_slash",
    re: /^(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?)\s+-\s+([^:]+?):\s([\s\S]*)$/,
  },
  {
    name: "android_tr_ampm",
    re: /^(\d{1,2}[./]\d{1,2}[./]\d{2,4}),?\s+(\d{1,2}:\d{2}(?:\s*(?:öö|ÖÖ|ös|ÖS))?)\s+-\s+([^:]+?):\s([\s\S]*)$/,
  },
  {
    name: "ios_iso",
    re: /^\[(\d{4}-\d{2}-\d{2}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?)\]\s+([^:]+?):\s([\s\S]*)$/,
  },
]

const SYSTEM_LINE_FORMATS = [
  {
    name: "ios_system",
    re: /^\[(\d{1,2}[./]\d{1,2}[./]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?)\]\s+([\s\S]+)$/,
  },
  {
    name: "android_system",
    re: /^(\d{1,2}[./\-]\d{1,2}[./\-]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?)\s+-\s+([\s\S]+)$/,
  },
]

// ─── Yardımcılar ───────────────────────────────────────────────

function stripInvisible(text: string): string {
  return text.replace(INVISIBLE_UNICODE_RE, "")
}

function parseDateTime(dateStr: string, timeStr: string): Date | null {
  const d = dateStr.replace(/\//g, ".").trim()
  const t = timeStr
    .trim()
    .replace(/öö/i, "AM")
    .replace(/ÖÖ/i, "AM")
    .replace(/ös/i, "PM")
    .replace(/ÖS/i, "PM")

  const parts = d.split(".")
  if (parts.length < 3) return null

  const [p0, p1, p2] = parts.map(Number)
  const candidates: Array<[number, number, number]> = []

  if (p2 > 31) {
    candidates.push([p0, p1, p2])
    candidates.push([p1, p0, p2])
  } else {
    candidates.push([p2, p1, p0])
    candidates.push([p2, p0, p1])
  }

  for (const [day, month, year] of candidates) {
    if (day < 1 || day > 31 || month < 1 || month > 12) continue
    const fullYear = year < 100 ? 2000 + year : year
    const dateTimeStr = `${fullYear}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")} ${t}`
    const dt = new Date(dateTimeStr)
    if (!isNaN(dt.getTime()) && dt.getDate() === day) return dt
  }

  return null
}

function mimeToContentType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? ""
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return "image"
  if (["mp4", "mov", "avi", "mkv", "3gp", "webm"].includes(ext)) return "video"
  if (ext === "opus" || filename.startsWith("PTT-")) return "voice"
  if (["mp3", "m4a", "aac", "wav", "flac"].includes(ext)) return "audio"
  if (["vcf"].includes(ext)) return "contact"
  if (ext === "webp") return "sticker"
  return "document"
}

function makeExternalId(senderName: string, timestamp: Date, content: string): string {
  return createHash("sha256")
    .update(`${senderName}::${timestamp.toISOString()}::${content.slice(0, 200)}`)
    .digest("hex")
    .slice(0, 32)
}

function detectFormat(lines: string[]): (typeof MESSAGE_FORMATS)[number] {
  const sample = lines.slice(0, 100)
  let bestFormat = MESSAGE_FORMATS[0]
  let bestCount = 0
  for (const fmt of MESSAGE_FORMATS) {
    const count = sample.filter((l) => fmt.re.test(l)).length
    if (count > bestCount) {
      bestCount = count
      bestFormat = fmt
    }
  }
  return bestFormat
}

// ─── Ana Parse Fonksiyonu ────────────────────────────────────

export function parseWhatsAppZip(zipBuffer: Uint8Array): ParseResult {
  const messages: ParsedMessage[] = []
  const parseErrors: ParseError[] = []
  const mediaMap = new Map<string, Uint8Array>()

  // 1. Zip aç
  let files: Record<string, Uint8Array>
  try {
    files = unzipSync(zipBuffer)
  } catch (e) {
    throw new Error("Zip dosyası açılamadı: " + String(e))
  }

  // 2. Chat metin dosyasını bul
  const chatFileKey = Object.keys(files).find(
    (k) =>
      k === "_chat.txt" ||
      k.toLowerCase().endsWith("_chat.txt") ||
      /whatsapp chat with .+\.txt$/i.test(k) ||
      /whatsapp sohbeti .+\.txt$/i.test(k)
  )

  if (!chatFileKey) {
    throw new Error(
      "Zip içinde sohbet metin dosyası bulunamadı. " +
      "Lütfen WhatsApp 'Sohbeti Dışa Aktar' özelliğiyle oluşturulan zip'i yükleyin."
    )
  }

  // 3. Medya haritası
  for (const [key, data] of Object.entries(files)) {
    if (key === chatFileKey) continue
    const fileName = key.split("/").pop()!
    mediaMap.set(fileName, data)
  }

  // 4. Satırlara böl
  const rawText = new TextDecoder("utf-8").decode(files[chatFileKey])
  const lines = rawText.split(/\r?\n/).map((l) => stripInvisible(l))

  // 5. Format tespiti
  const format = detectFormat(lines)

  // 6. Parse
  interface Pending {
    senderName: string
    timestamp: Date
    contentLines: string[]
    isSystemMessage: boolean
    fileRef?: string
    contentType: string
  }

  let current: Pending | null = null

  const flush = () => {
    if (!current) return
    const content = current.contentLines.join("\n").trim()
    messages.push({
      senderName: current.senderName,
      timestamp: current.timestamp,
      content,
      contentType: current.contentType,
      fileRef: current.fileRef,
      isSystemMessage: current.isSystemMessage,
      externalId: makeExternalId(current.senderName, current.timestamp, content),
    })
    current = null
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const match = format.re.exec(line)
    if (match) {
      flush()
      const [, dateStr, timeStr, senderName, messageContent] = match
      const timestamp = parseDateTime(dateStr, timeStr)
      if (!timestamp) {
        parseErrors.push({ line: i + 1, raw: line, reason: "Tarih/saat parse edilemedi" })
        continue
      }

      let fileRef: string | undefined
      let contentType = "text"
      let textContent = messageContent.trim()

      for (const mp of MEDIA_ATTACHMENT_PATTERNS) {
        const mMatch = mp.exec(textContent)
        if (mMatch) {
          const fname = mMatch[1]?.trim()
          if (fname) {
            const isOmitted = MEDIA_OMITTED_PATTERNS.some((p) => p.test(textContent))
            if (!isOmitted) {
              fileRef = fname
              contentType = mimeToContentType(fname)
              textContent = fname
            } else {
              textContent = "[Medya kullanılamıyor]"
              contentType = "document"
            }
          }
          break
        }
      }

      const isSystem = SYSTEM_MESSAGE_PATTERNS.some((p) => p.test(textContent))

      current = {
        senderName: senderName.trim(),
        timestamp,
        contentLines: [textContent],
        isSystemMessage: isSystem,
        fileRef,
        contentType: isSystem ? "system" : contentType,
      }
      continue
    }

    // Sistem satırı
    for (const sf of SYSTEM_LINE_FORMATS) {
      const sm = sf.re.exec(line)
      if (sm) {
        const [, dateStr, timeStr, content] = sm
        const timestamp = parseDateTime(dateStr, timeStr)
        if (timestamp) {
          flush()
          current = {
            senderName: "System",
            timestamp,
            contentLines: [content.trim()],
            isSystemMessage: true,
            contentType: "system",
          }
        }
        break
      }
    }

    if (!current && i > 5) {
      parseErrors.push({ line: i + 1, raw: line, reason: "Format tanınamadı" })
      continue
    }

    if (current && !format.re.exec(line)) {
      current.contentLines.push(line)
    }
  }

  flush()
  return { messages, mediaMap, parseErrors, detectedFormat: format.name }
}
