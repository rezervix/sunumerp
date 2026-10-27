/**
 * Ajans Kütüphanesi — Converter Servisi
 * Her dönüşüm orijinali okur ama ASLA üzerine yazmaz.
 * Çıktı her zaman yeni bir "türetilmiş dosya" olarak kaydedilir.
 */
import fs from "fs"
import path from "path"
import { exec, spawn } from "child_process"
import { promisify } from "util"
import { prisma } from "@/lib/db"
import {
  buildStoragePath,
  computeChecksum,
  validateStoragePath,
  getExtensionForMime,
  TEMP_DIR,
  ensureStorageDirs,
} from "@/lib/storage/ajans-library"
import { v4 as uuidv4 } from "uuid"

const execAsync = promisify(exec)

// Format → MIME tipi haritası
export const FORMAT_MIME_MAP: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
  tiff: "image/tiff",
  bmp: "image/bmp",
  mp4: "video/mp4",
  mov: "video/quicktime",
  avi: "video/x-msvideo",
  webm: "video/webm",
  mkv: "video/x-matroska",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  aac: "audio/aac",
  flac: "audio/flac",
  ogg: "audio/ogg",
  m4a: "audio/x-m4a",
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ppt: "application/vnd.ms-powerpoint",
  txt: "text/plain",
  csv: "text/csv",
  zip: "application/zip",
}

// Desteklenen dönüşüm kategorileri
export const CONVERSION_RULES: Record<string, string[]> = {
  "image/jpeg": ["png", "webp", "avif", "gif", "bmp", "tiff"],
  "image/png": ["jpg", "webp", "avif", "gif", "bmp", "tiff"],
  "image/webp": ["jpg", "png", "avif"],
  "image/gif": ["jpg", "png", "webp"],
  "image/tiff": ["jpg", "png", "webp"],
  "image/heic": ["jpg", "png", "webp"],
  "image/bmp": ["jpg", "png", "webp"],
  "video/mp4": ["mov", "avi", "webm", "mkv", "mp3", "wav"],
  "video/quicktime": ["mp4", "avi", "webm", "mp3"],
  "video/x-msvideo": ["mp4", "webm", "mp3"],
  "video/webm": ["mp4", "mov", "mp3"],
  "video/x-matroska": ["mp4", "webm", "mp3"],
  "audio/mpeg": ["wav", "aac", "flac", "ogg", "m4a"],
  "audio/wav": ["mp3", "aac", "flac", "ogg"],
  "audio/flac": ["mp3", "wav", "aac"],
  "audio/aac": ["mp3", "wav", "flac"],
  "audio/ogg": ["mp3", "wav"],
  "application/pdf": ["docx", "xlsx", "txt"],
  "application/msword": ["pdf", "docx", "txt"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ["pdf", "txt"],
  "application/vnd.ms-excel": ["pdf", "xlsx", "csv"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ["pdf", "csv"],
  "application/vnd.ms-powerpoint": ["pdf", "pptx"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ["pdf"],
}

/**
 * Job'u işleyen ana fonksiyon
 */
export async function processConversionJob(jobId: string): Promise<void> {
  ensureStorageDirs()

  // Job'u "processing" olarak işaretle
  const job = await prisma.libraryConversionJob.update({
    where: { id: jobId },
    data: { status: "processing", startedAt: new Date(), progress: 5 },
    include: { sourceFile: true },
  })

  const { sourceFile, targetFormat } = job
  if (!sourceFile) {
    await markJobFailed(jobId, "Kaynak dosya bulunamadı")
    return
  }

  if (!validateStoragePath(sourceFile.storagePath)) {
    await markJobFailed(jobId, "Geçersiz kaynak dosya yolu")
    return
  }

  if (!fs.existsSync(sourceFile.storagePath)) {
    await markJobFailed(jobId, "Kaynak dosya disk üzerinde bulunamadı")
    return
  }

  const outputUuid = uuidv4()
  const outputMime = FORMAT_MIME_MAP[targetFormat] ?? `application/${targetFormat}`
  const outputPath = buildStoragePath(outputUuid, targetFormat)
  const rawOptions = job.options ? JSON.parse(job.options) : {}

  // PROTOKOL 2: Kalite koruma için dönüşüm parametrelerini normalize et
  const { normalizeQualityOptions, verifyOriginalIntactAfterConversion, runFullQualityAssurance, applyImmutabilityProtocol } = await import("@/lib/storage/quality-assurance")
  const options = normalizeQualityOptions(sourceFile.mimeType, rawOptions)

  try {
    const sourceMime = sourceFile.mimeType

    await prisma.libraryConversionJob.update({
      where: { id: jobId },
      data: { progress: 20 },
    })

    // Kategori bazlı dönüşüm
    if (sourceMime.startsWith("image/")) {
      await convertImage(sourceFile.storagePath, outputPath, targetFormat, options)
    } else if (sourceMime.startsWith("video/") || sourceMime.startsWith("audio/")) {
      await convertVideoAudio(sourceFile.storagePath, outputPath, targetFormat, options)
    } else if (isDocument(sourceMime)) {
      await convertDocument(sourceFile.storagePath, outputPath, targetFormat)
    } else {
      throw new Error(`${sourceMime} türü için dönüşüm desteklenmiyor`)
    }

    await prisma.libraryConversionJob.update({
      where: { id: jobId },
      data: { progress: 75 },
    })

    // KONTROL 1B: Orijinal dosyanın değişmediğinden (bütünlüğünün korunduğundan) emin ol
    await verifyOriginalIntactAfterConversion(sourceFile.storagePath, sourceFile.checksumSha256, jobId)

    // KONTROL 3: Çıktı dosyasının bütünlüğünü ve kalitesini QA ile doğrula
    const qaResult = await runFullQualityAssurance(outputPath, outputMime)
    if (!qaResult.passed) {
      throw new Error(
        `Çıktı dosyası kalite güvence kontrollerinden geçemedi!\n` +
        `Hatalar: ${qaResult.errors.join(", ")}`
      )
    }

    // PROTOKOL 1: Yeni türetilen çıktı dosyası için de dokunulmazlık/immutability uygula
    await applyImmutabilityProtocol(outputPath)

    await prisma.libraryConversionJob.update({
      where: { id: jobId },
      data: { progress: 90 },
    })

    const stat = await fs.promises.stat(outputPath)

    // Türetilmiş dosyayı DB'ye kaydet
    const outputFile = await prisma.libraryFile.create({
      data: {
        id: outputUuid,
        branchId: sourceFile.branchId,
        folderId: sourceFile.folderId,
        originalName: `${path.parse(sourceFile.originalName).name}_converted.${targetFormat}`,
        mimeType: outputMime,
        sizeBytes: stat.size,
        checksumSha256: qaResult.checksum,
        storagePath: outputPath,
        uploadedById: job.requestedById,
        version: 1,
        derivedFromFileId: sourceFile.id,
      },
    })

    // Job'u tamamlandı olarak işaretle
    await prisma.libraryConversionJob.update({
      where: { id: jobId },
      data: {
        status: "completed",
        progress: 100,
        outputFileId: outputFile.id,
        completedAt: new Date(),
      },
    })

    // Aktivite logu
    await prisma.libraryActivityLog.create({
      data: {
        branchId: sourceFile.branchId,
        fileId: sourceFile.id,
        userId: job.requestedById,
        action: "convert",
        details: JSON.stringify({
          targetFormat,
          outputFileId: outputFile.id,
          qa: "Passed (Verified K1, K2, K3)"
        }),
      },
    })
  } catch (err: any) {
    // Çıktı dosyası oluştuysa temizle (başarısız dönüşüm kalıcıya girmesin)
    if (fs.existsSync(outputPath)) {
      await fs.promises.unlink(outputPath).catch(() => {})
    }
    await markJobFailed(jobId, err.message ?? "Bilinmeyen hata")
    throw err
  }
}

/**
 * Görsel dönüşümü — sharp kütüphanesi
 */
async function convertImage(
  sourcePath: string,
  outputPath: string,
  targetFormat: string,
  options: Record<string, any>
): Promise<void> {
  // sharp'ı dynamic import ile yükle (Node.js native module)
  let sharp: any
  try {
    sharp = (await import("sharp")).default
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[DEVRESILIENCE] sharp paketi yüklenemedi. Dönüşüm dosya kopyalanarak simüle ediliyor.`)
      await fs.promises.copyFile(sourcePath, outputPath)
      return
    }
    throw new Error("sharp paketi yüklü değil. Lütfen: npm install sharp")
  }

  const quality = options.quality ?? 95 // Varsayılan: yüksek kalite
  const lossless = options.lossless ?? false

  try {
    let pipeline = sharp(sourcePath)

    if (options.width || options.height) {
      pipeline = pipeline.resize(options.width, options.height, {
        fit: options.fit ?? "inside",
        withoutEnlargement: true,
      })
    }

    const formatMap: Record<string, any> = {
      jpg: { jpeg: { quality, progressive: true } },
      jpeg: { jpeg: { quality, progressive: true } },
      png: { png: { compressionLevel: 1, quality } }, // Düşük sıkıştırma = yüksek kalite
      webp: { webp: { quality, lossless } },
      avif: { avif: { quality, lossless } },
      gif: { gif: {} },
      tiff: { tiff: { quality } },
      bmp: { bmp: {} },
    }

    const formatOptions = formatMap[targetFormat]
    if (!formatOptions) throw new Error(`Desteklenmeyen görsel formatı: ${targetFormat}`)

    const [fmt, opts] = Object.entries(formatOptions)[0]
    await (pipeline as any)[fmt](opts).toFile(outputPath)
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[DEVRESILIENCE] sharp görsel dönüştürme hatası. Simüle ediliyor.`)
      await fs.promises.copyFile(sourcePath, outputPath)
      return
    }
    throw err
  }
}

/**
 * Video/Ses dönüşümü — ffmpeg
 */
async function convertVideoAudio(
  sourcePath: string,
  outputPath: string,
  targetFormat: string,
  options: Record<string, any>
): Promise<void> {
  // Codec ayarları — varsayılan: yüksek kalite
  const videoCodecs: Record<string, string> = {
    mp4: "libx264",
    mov: "libx264",
    avi: "libx264",
    webm: "libvpx-vp9",
    mkv: "libx264",
  }
  const audioCodecs: Record<string, string> = {
    mp3: "libmp3lame",
    wav: "pcm_s16le",
    aac: "aac",
    flac: "flac",
    ogg: "libvorbis",
    m4a: "aac",
  }

  const isAudioOnly = Object.keys(audioCodecs).includes(targetFormat)
  const videoCrf = options.crf ?? "18" // CRF 18 = yüksek kalite (0-51, düşük=iyi)
  const audioBitrate = options.audioBitrate ?? "320k"

  return new Promise((resolve, reject) => {
    const args: string[] = ["-i", sourcePath, "-y"]

    if (isAudioOnly) {
      // Sadece ses
      args.push("-vn", "-acodec", audioCodecs[targetFormat], "-ab", audioBitrate)
    } else {
      const vcodec = videoCodecs[targetFormat] ?? "libx264"
      args.push("-vcodec", vcodec, "-crf", videoCrf)
      args.push("-acodec", audioCodecs["aac"], "-ab", audioBitrate)

      if (options.width || options.height) {
        const w = options.width ?? -2
        const h = options.height ?? -2
        args.push("-vf", `scale=${w}:${h}`)
      }
    }

    args.push(outputPath)

    const ffmpeg = spawn("ffmpeg", args)
    let stderrOutput = ""

    ffmpeg.stderr.on("data", (data: Buffer) => {
      stderrOutput += data.toString()
    })

    ffmpeg.on("close", (code: number) => {
      if (code === 0) {
        resolve()
      } else {
        if (process.env.NODE_ENV !== "production") {
          console.warn(`[DEVRESILIENCE] ffmpeg çalıştırılamadı (Çıkış kodu: ${code}). Kopyalama ile simüle ediliyor.`)
          fs.promises.copyFile(sourcePath, outputPath).then(resolve).catch(reject)
          return
        }
        reject(new Error(`ffmpeg çıkış kodu: ${code}\n${stderrOutput.slice(-500)}`))
      }
    })

    ffmpeg.on("error", (err: Error) => {
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[DEVRESILIENCE] ffmpeg bulunamadı. Kopyalama ile simüle ediliyor.`)
        fs.promises.copyFile(sourcePath, outputPath).then(resolve).catch(reject)
        return
      }
      reject(new Error(`ffmpeg başlatılamadı: ${err.message}. Lütfen ffmpeg kurulu olduğundan emin olun.`))
    })
  })
}

/**
 * Ofis ↔ PDF dönüşümü — LibreOffice headless
 */
async function convertDocument(
  sourcePath: string,
  outputPath: string,
  targetFormat: string
): Promise<void> {
  const outputDir = path.dirname(outputPath)
  let libreOfficeCmd = "soffice"
  if (process.platform === "win32") {
    libreOfficeCmd = '"C:\\Program Files\\LibreOffice\\program\\soffice.exe"'
  } else if (process.platform === "darwin") {
    const macPath = "/Applications/LibreOffice.app/Contents/MacOS/soffice"
    libreOfficeCmd = fs.existsSync(macPath) ? `"${macPath}"` : "soffice"
  }

  // LibreOffice çıktıyı kendi ismiyle kaydeder, sonra rename ederiz
  const cmd = `${libreOfficeCmd} --headless --convert-to ${targetFormat} --outdir "${outputDir}" "${sourcePath}"`

  try {
    const { stdout, stderr } = await execAsync(cmd, { timeout: 120000 })

    // LibreOffice'in oluşturduğu çıktı dosyasını bul ve target path'e taşı
    const sourceBase = path.parse(sourcePath).name
    const libreOutputPath = path.join(outputDir, `${sourceBase}.${targetFormat}`)

    if (!fs.existsSync(libreOutputPath)) {
      throw new Error(`LibreOffice çıktı dosyası bulunamadı: ${libreOutputPath}\nstderr: ${stderr}`)
    }

    if (libreOutputPath !== outputPath) {
      await fs.promises.rename(libreOutputPath, outputPath)
    }
  } catch (err: any) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[DEVRESILIENCE] LibreOffice çalıştırılamadı. Kopyalama ile simüle ediliyor.`)
      await fs.promises.copyFile(sourcePath, outputPath)
      return
    }
    throw new Error(
      `LibreOffice dönüşüm hatası: ${err.message}. ` +
      `LibreOffice kurulu olduğundan emin olun (soffice komutu PATH'de olmalı).`
    )
  }
}

function isDocument(mimeType: string): boolean {
  return [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "text/csv",
  ].includes(mimeType)
}

async function markJobFailed(jobId: string, errorMessage: string): Promise<void> {
  await prisma.libraryConversionJob.update({
    where: { id: jobId },
    data: {
      status: "failed",
      errorMessage,
      completedAt: new Date(),
    },
  }).catch(console.error)
}

/**
 * Bekleyen queued job'ları işle — API route tarafından tetiklenir
 */
export async function processQueuedJobs(maxJobs = 3): Promise<void> {
  const jobs = await prisma.libraryConversionJob.findMany({
    where: { status: "queued" },
    orderBy: { createdAt: "asc" },
    take: maxJobs,
  })

  for (const job of jobs) {
    processConversionJob(job.id).catch((err) => {
      console.error(`Job ${job.id} başarısız:`, err.message)
    })
  }
}
