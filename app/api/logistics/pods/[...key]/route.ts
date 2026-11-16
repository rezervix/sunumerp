/**
 * Lojistik e-POD Depolama Adaptörü Okuma Ucu (`LocalStorageProofProvider`)
 */

import { NextResponse } from "next/server"
import { readFile } from "fs/promises"
import { join, normalize } from "path"

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
      const buf = await readFile(cand)
      const ext = cand.split(".").pop()?.toLowerCase() || ""
      const mime =
        ext === "png"
          ? "image/png"
          : ext === "jpg" || ext === "jpeg"
            ? "image/jpeg"
            : ext === "webp"
              ? "image/webp"
              : ext === "svg"
                ? "image/svg+xml"
                : "application/octet-stream"
      return new NextResponse(buf, {
        headers: {
          "Content-Type": mime,
          "Cache-Control": "public, max-age=3600",
        },
      })
    } catch {
      // Sonraki konuma geç
    }
  }

  return new NextResponse("POD Artifact Not Found", { status: 404 })
}
