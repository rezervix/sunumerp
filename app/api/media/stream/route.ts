import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"

/**
 * Chunked Media Streaming API Route (HTTP 206 Partial Content)
 * Serves video and audio files dynamically in chunks as requested by the browser.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const filePathParam = searchParams.get("path")

    if (!filePathParam) {
      return NextResponse.json({ error: "File path required" }, { status: 400 })
    }

    // Security check: ensure path stays within storage or public directory
    const resolvedPath = path.resolve(filePathParam)
    const storageDir = path.resolve(process.cwd(), "storage")
    const publicDir = path.resolve(process.cwd(), "public")

    if (!resolvedPath.startsWith(storageDir) && !resolvedPath.startsWith(publicDir)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    if (!fs.existsSync(resolvedPath)) {
      return NextResponse.json({ error: "Media file not found" }, { status: 404 })
    }

    const stat = fs.statSync(resolvedPath)
    const fileSize = stat.size
    const range = req.headers.get("range")

    const ext = path.extname(resolvedPath).toLowerCase()
    let contentType = "application/octet-stream"
    if (ext === ".mp4") contentType = "video/mp4"
    else if (ext === ".webm") contentType = "video/webm"
    else if (ext === ".mp3") contentType = "audio/mpeg"
    else if (ext === ".wav") contentType = "audio/wav"
    else if (ext === ".ogg") contentType = "audio/ogg"
    else if (ext === ".webp") contentType = "image/webp"

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-")
      const start = parseInt(parts[0], 10)
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1

      const chunkSize = end - start + 1
      const stream = fs.createReadStream(resolvedPath, { start, end })

      const headers = new Headers({
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunkSize.toString(),
        "Content-Type": contentType
      })

      // Convert Node readable stream to Web Stream
      const webStream = new ReadableStream({
        start(controller) {
          stream.on("data", (chunk: any) => controller.enqueue(chunk))
          stream.on("end", () => controller.close())
          stream.on("error", (err) => controller.error(err))
        }
      })

      return new NextResponse(webStream, { status: 206, headers })
    } else {
      const stream = fs.createReadStream(resolvedPath)
      const headers = new Headers({
        "Content-Length": fileSize.toString(),
        "Content-Type": contentType
      })

      const webStream = new ReadableStream({
        start(controller) {
          stream.on("data", (chunk: any) => controller.enqueue(chunk))
          stream.on("end", () => controller.close())
          stream.on("error", (err) => controller.error(err))
        }
      })

      return new NextResponse(webStream, { status: 200, headers })
    }
  } catch (err: any) {
    console.error("[Media Stream API Error]:", err)
    return NextResponse.json({ error: "Internal streaming error" }, { status: 500 })
  }
}
