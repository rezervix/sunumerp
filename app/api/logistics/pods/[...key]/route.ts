/**
 * Lojistik e-POD Depolama Adaptörü Okuma Ucu (`LocalStorageProofProvider`)
 */

import { NextResponse } from "next/server"
import { readFile } from "fs/promises"
import { basename, join, normalize } from "path"

const ALLOWED_SERVED_POD_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "webp",
  "pdf",
  "txt",
  "svg",
])

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const { key } = await params
  const decodedRel = decodeURIComponent((key || []).join("/"))
  if (!decodedRel || decodedRel.includes("..")) {
    return new NextResponse("Forbidden", { status: 403 })
  }

  const base1 = join(process.cwd(), "storage", "logistics-pods")
  const base2 = join(process.cwd(), "public", "uploads")
  const cand1 = normalize(join(base1, decodedRel))
  const cand2 = normalize(join(base2, decodedRel))

  for (const [cand, root] of [
    [cand1, base1],
    [cand2, base2],
  ] as const) {
    if (!cand.startsWith(root)) continue
    try {
      const ext = cand.split(".").pop()?.toLowerCase() || ""
      if (!ALLOWED_SERVED_POD_EXTENSIONS.has(ext)) {
        return new NextResponse("Forbidden File Type", { status: 403 })
      }
      const buf = await readFile(cand)
      const mime =
        ext === "png"
          ? "image/png"
          : ext === "jpg" || ext === "jpeg"
            ? "image/jpeg"
            : ext === "webp"
              ? "image/webp"
              : ext === "pdf"
                ? "application/pdf"
                : ext === "txt"
                  ? "text/plain; charset=utf-8"
                  : ext === "svg"
                    ? "image/svg+xml"
                    : "application/octet-stream"

      const headers: Record<string, string> = {
        "Content-Type": mime,
        "Cache-Control": "public, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      }
      if (ext === "svg") {
        const safeDownloadName = basename(cand).replace(/[^a-zA-Z0-9._-]/g, "_")
        headers["Content-Security-Policy"] = "sandbox"
        headers["Content-Disposition"] = `attachment; filename="${safeDownloadName}"`
      }

      return new NextResponse(buf, { headers })
    } catch {
      // Sonraki konuma geç
    }
  }

  return new NextResponse("POD Artifact Not Found", { status: 404 })
}
