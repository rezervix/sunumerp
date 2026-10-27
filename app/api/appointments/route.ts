import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { z } from "zod"
import { requirePermission } from "@/lib/auth/server-permission"

const appointmentSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  customerId: z.string().optional(),
  customerName: z.string().optional(),
  startDate: z.string(), // ISO string
  endDate: z.string().optional(),
  allDay: z.boolean().default(false),
  color: z.string().default("#3B82F6"),
  location: z.string().optional(),
  status: z.enum(["scheduled", "completed", "cancelled"]).default("scheduled"),
  branchId: z.string(),
})

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const branchId = searchParams.get("branchId")
  const fromDate = searchParams.get("from")
  const toDate = searchParams.get("to")

  if (!branchId) return NextResponse.json({ error: "branchId gerekli" }, { status: 400 })

  const auth = await requirePermission("appointments", "view", branchId)
  if (auth instanceof NextResponse) return auth

  try {
    const appointments = await prisma.appointment.findMany({
      where: {
        branchId,
        ...(fromDate || toDate
          ? {
              startDate: {
                ...(fromDate ? { gte: new Date(fromDate) } : {}),
                ...(toDate ? { lte: new Date(toDate) } : {}),
              },
            }
          : {}),
      },
      orderBy: { startDate: "asc" },
    })

    return NextResponse.json(appointments)
  } catch (error) {
    console.error("Randevu listeleme hatası:", error)
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = appointmentSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: "Geçersiz veri", details: parsed.error.format() }, { status: 400 })
    }

    const { branchId, startDate, endDate, ...rest } = parsed.data

    const auth = await requirePermission("appointments", "create", branchId)
    if (auth instanceof NextResponse) return auth

    const appointment = await prisma.appointment.create({
      data: {
        ...rest,
        branchId,
        userId: auth.payload.userId,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
      },
    })

    return NextResponse.json(appointment, { status: 201 })
  } catch (error) {
    console.error("Randevu oluşturma hatası:", error)
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 })
  }
}

