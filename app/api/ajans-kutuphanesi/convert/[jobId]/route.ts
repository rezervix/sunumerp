/**
 * GET /api/ajans-kutuphanesi/convert/[jobId]
 * SSE (Server-Sent Events) ile job ilerleme durumu yayınlar
 */
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getAuthPayload } from "@/lib/auth/server-permission"

type Params = { params: Promise<{ jobId: string }> }

export async function GET(req: Request, { params }: Params) {
  const payload = await getAuthPayload()
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { jobId } = await params

  // Accept: text/event-stream ise SSE modu
  const acceptHeader = req.headers.get("accept") ?? ""
  if (acceptHeader.includes("text/event-stream")) {
    let isClosed = false
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: object) => {
          if (!isClosed) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
          }
        }

        const poll = async () => {
          if (isClosed) return
          try {
            const job = await prisma.libraryConversionJob.findUnique({
              where: { id: jobId, requestedById: payload.userId },
              include: {
                outputFile: {
                  select: { id: true, originalName: true, mimeType: true, sizeBytes: true },
                },
              },
            })

            if (!job) {
              send({ error: "Job bulunamadı" })
              controller.close()
              return
            }

            send({
              id: job.id,
              status: job.status,
              progress: job.progress,
              targetFormat: job.targetFormat,
              outputFile: job.outputFile
                ? { ...job.outputFile, sizeBytes: Number((job.outputFile as any).sizeBytes) }
                : null,
              errorMessage: job.errorMessage,
              createdAt: job.createdAt,
              completedAt: job.completedAt,
            })

            if (job.status === "completed" || job.status === "failed") {
              controller.close()
              return
            }

            // Her 2 saniyede bir poll
            setTimeout(poll, 2000)
          } catch (err) {
            send({ error: "Sorgu hatası" })
            controller.close()
          }
        }

        poll()
      },
      cancel() {
        isClosed = true
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  }

  // Normal JSON sorgusu
  const job = await prisma.libraryConversionJob.findUnique({
    where: { id: jobId },
    include: {
      outputFile: {
        select: { id: true, originalName: true, mimeType: true, sizeBytes: true },
      },
    },
  })

  if (!job) return NextResponse.json({ error: "Job bulunamadı" }, { status: 404 })

  return NextResponse.json({
    ...job,
    outputFile: job.outputFile
      ? { ...job.outputFile, sizeBytes: Number((job.outputFile as any).sizeBytes) }
      : null,
  })
}
