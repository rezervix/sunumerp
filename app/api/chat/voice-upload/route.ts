/**
 * POST /api/chat/voice-upload
 * 
 * Sesli mesaj kaydını yükler (WebM/OGG blob).
 * MediaRecorder API'sinden gelen blob verisini kabul eder.
 * 
 * Form fields:
 *  - audio: Blob (audio/webm;codecs=opus veya audio/ogg)
 *  - duration: number (saniye)
 *  - waveform: JSON string (float array)
 */
import { NextResponse } from "next/server"
import { mkdir, writeFile } from "fs/promises"
import { join } from "path"
import { v4 as uuidv4 } from "uuid"
import { getAuthPayload } from "@/lib/auth/server-permission"

export async function POST(req: Request) {
  const auth = await getAuthPayload()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const formData = await req.formData()
    const audioFile = formData.get("audio") as File | null
    const duration = parseInt(formData.get("duration") as string ?? "0")
    const waveformRaw = formData.get("waveform") as string | null

    if (!audioFile) {
      return NextResponse.json({ error: "Ses dosyası zorunludur" }, { status: 400 })
    }

    // Güvenli MIME tipi kontrolü
    const allowedMimeTypes = [
      "audio/webm",
      "audio/ogg",
      "audio/mpeg",
      "audio/mp4",
      "audio/wav",
      "audio/webm;codecs=opus",
    ]

    const mimeType = audioFile.type.split(";")[0] // codec kısmını ayır
    if (!allowedMimeTypes.includes(mimeType) && !allowedMimeTypes.some(m => audioFile.type.startsWith(m.split(";")[0]))) {
      return NextResponse.json(
        { error: "Geçersiz ses formatı. WebM, OGG veya MP3 kullanın." },
        { status: 400 }
      )
    }

    // Boyut limiti: 16MB
    const maxSize = 16 * 1024 * 1024
    if (audioFile.size > maxSize) {
      return NextResponse.json(
        { error: "Ses dosyası 16MB'ı aşamaz" },
        { status: 400 }
      )
    }

    // Dosya uzantısını belirle
    const ext = audioFile.type.includes("ogg") ? "ogg"
      : audioFile.type.includes("wav") ? "wav"
      : audioFile.type.includes("mp4") ? "m4a"
      : "webm"

    const fileName = `voice_${uuidv4()}.${ext}`
    const uploadDir = join(process.cwd(), "public", "uploads", "voice")

    await mkdir(uploadDir, { recursive: true })

    const buffer = Buffer.from(await audioFile.arrayBuffer())
    await writeFile(join(uploadDir, fileName), buffer)

    const fileUrl = `/api/uploads/voice/${fileName}`

    // Waveform verisi doğrulama
    let waveformData: number[] | null = null
    if (waveformRaw) {
      try {
        const parsed = JSON.parse(waveformRaw)
        if (Array.isArray(parsed) && parsed.every((v) => typeof v === "number")) {
          // WhatsApp gibi 64 noktalı waveform'a normalize et
          waveformData = normalizeWaveform(parsed, 64)
        }
      } catch {
        // Waveform parse hatası — devam et
      }
    }

    return NextResponse.json({
      fileUrl,
      fileName,
      fileSize: audioFile.size,
      duration,
      mimeType: audioFile.type,
      waveform: waveformData,
    })
  } catch (error) {
    console.error("Voice upload error:", error)
    return NextResponse.json({ error: "Ses dosyası yüklenirken hata oluştu" }, { status: 500 })
  }
}

/**
 * Dalgaformu belirli bir nokta sayısına normalize eder.
 * Örn: 2000 örnek → 64 nokta (min-max örnekleme)
 */
function normalizeWaveform(samples: number[], targetPoints: number): number[] {
  if (samples.length === 0) return new Array(targetPoints).fill(0)
  
  const chunkSize = Math.floor(samples.length / targetPoints)
  const normalized: number[] = []

  for (let i = 0; i < targetPoints; i++) {
    const start = i * chunkSize
    const end = Math.min(start + chunkSize, samples.length)
    const chunk = samples.slice(start, end)
    
    if (chunk.length === 0) {
      normalized.push(0)
      continue
    }

    // RMS (Root Mean Square) değeri — ses şiddetini daha doğru temsil eder
    const rms = Math.sqrt(chunk.reduce((sum, v) => sum + v * v, 0) / chunk.length)
    normalized.push(Math.min(1, rms))
  }

  // 0-1 aralığına normalize et
  const max = Math.max(...normalized, 0.001)
  return normalized.map((v) => parseFloat((v / max).toFixed(3)))
}
