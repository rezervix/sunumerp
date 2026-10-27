import { NextResponse } from "next/server"
import { readFile, access } from "fs/promises"
import { join, normalize, relative } from "path"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params
  if (!filename) return new NextResponse("File not found", { status: 404 })

  // URL'deki ek path segmentlerini de yakala (voice/xxx.webm gibi)
  const { searchParams } = new URL(req.url)
  const subdir = searchParams.get("subdir") ?? ""

  // Path traversal saldırısına karşı güvenlik kontrolü
  const uploadBase = join(process.cwd(), "public", "uploads")
  const filePath = normalize(join(uploadBase, subdir, filename))

  // Dosya yolu uploads klasörü dışına çıkıyorsa reddet
  if (!filePath.startsWith(uploadBase)) {
    return new NextResponse("Forbidden", { status: 403 })
  }

  try {
    await access(filePath)
    const fileBuffer = await readFile(filePath)

    const ext = filename.split(".").pop()?.toLowerCase() ?? ""

    const mimeTypes: Record<string, string> = {
      // Resim
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      svg: "image/svg+xml",
      // Video
      mp4: "video/mp4",
      webm: "video/webm",
      ogv: "video/ogg",
      mov: "video/quicktime",
      avi: "video/x-msvideo",
      // Ses
      mp3: "audio/mpeg",
      ogg: "audio/ogg",
      wav: "audio/wav",
      m4a: "audio/mp4",
      aac: "audio/aac",
      flac: "audio/flac",
      // Ses/Video (WebM hem ses hem video olabilir)
      // Belgeler
      pdf: "application/pdf",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      xls: "application/vnd.ms-excel",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ppt: "application/vnd.ms-powerpoint",
      pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      txt: "text/plain",
      csv: "text/csv",
      // Arşiv
      zip: "application/zip",
      rar: "application/x-rar-compressed",
      "7z": "application/x-7z-compressed",
    }

    const contentType = mimeTypes[ext] ?? "application/octet-stream"

    // Ses/video dosyaları için range request desteği (streaming için)
    const rangeHeader = req.headers.get("range")
    if (rangeHeader && (contentType.startsWith("audio/") || contentType.startsWith("video/"))) {
      const total = fileBuffer.length
      const [startStr, endStr] = rangeHeader.replace("bytes=", "").split("-")
      const start = parseInt(startStr, 10)
      const end = endStr ? parseInt(endStr, 10) : total - 1
      const chunkLength = end - start + 1

      return new NextResponse(fileBuffer.subarray(start, end + 1), {
        status: 206,
        headers: {
          "Content-Type": contentType,
          "Content-Range": `bytes ${start}-${end}/${total}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunkLength.toString(),
          "Cache-Control": "public, max-age=86400",
        },
      })
    }

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
        "Accept-Ranges": "bytes",
      },
    })
  } catch {
    return new NextResponse("File not found", { status: 404 })
  }
}

