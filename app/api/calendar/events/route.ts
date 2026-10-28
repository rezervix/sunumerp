import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { jwtVerify } from "jose"
import { prisma } from "@/lib/db"
import { isDemoModeActive, getMockData } from "@/lib/data-controller"

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-change-this"

async function getSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get("auth-token")?.value
  if (!token) return null
  try {
    const secret = new TextEncoder().encode(JWT_SECRET)
    const { payload } = await jwtVerify(token, secret)
    return payload as { userId: string }
  } catch {
    return null
  }
}

export interface CalendarEvent {
  id: string
  title: string
  date: string // ISO date string
  endDate?: string
  type: "appointment" | "income_payment" | "expense_payment" | "reminder" | "todo" | "content_calendar"
  color: string
  description?: string
  amount?: number
  status?: string
  allDay?: boolean
  location?: string
}

/**
 * GET /api/calendar/events?branchId=xxx&from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Şubeye ait tüm takvim eventlerini (randevu, ödeme planı, hatırlatıcı) birleştirir.
 */
export async function GET(req: Request) {
  if (isDemoModeActive()) {
    return NextResponse.json(getMockData("calendar_events"))
  }

  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const branchId = searchParams.get("branchId")
  const fromStr = searchParams.get("from")
  const toStr = searchParams.get("to")

  if (!branchId) return NextResponse.json({ error: "branchId gerekli" }, { status: 400 })

  const from = fromStr ? new Date(fromStr) : new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  const to = toStr ? new Date(toStr) : new Date(new Date().getFullYear(), new Date().getMonth() + 2, 0)

  try {
    const [appointments, finances, reminders, todos, contentCalendars] = await Promise.all([
      // Randevular (kullanıcıya özel veya atananlar)
      prisma.appointment.findMany({
        where: { branchId, startDate: { gte: from, lte: to }, OR: [{ userId: session.userId }, { userId: null }] },
        orderBy: { startDate: "asc" },
      }),

      // Finans kayıtları (planlanmış ödemeler)
      prisma.finance.findMany({
        where: {
          branchId,
          date: { gte: from, lte: to },
          type: { in: ["INCOME", "EXPENSE", "DEBT", "EXPECTED_PAYMENT"] },
        },
        orderBy: { date: "asc" },
      }),

      // Hatırlatıcılar (Şube geneli)
      prisma.reminder.findMany({
        where: {
          branchId,
          dueDate: { gte: from, lte: to },
        },
        orderBy: { dueDate: "asc" },
      }),

      // Yapılacaklar (Kullanıcıya özel To-Do)
      prisma.todo.findMany({
        where: {
          userId: session.userId,
          dueDate: { gte: from, lte: to },
        },
        orderBy: { dueDate: "asc" },
      }),

      // İçerik takvimi öğeleri
      prisma.contentCalendar.findMany({
        where: {
          branchId,
          scheduledDate: { gte: from, lte: to },
        },
        orderBy: { scheduledDate: "asc" },
      }),
    ])

    const events: CalendarEvent[] = []

    // ── Randevular
    appointments.forEach((a) => {
      events.push({
        id: `appointment-${a.id}`,
        title: a.title,
        date: a.startDate.toISOString(),
        endDate: a.endDate?.toISOString(),
        type: "appointment",
        color: a.color || "#3B82F6",
        description: a.description || undefined,
        status: a.status,
        allDay: a.allDay,
        location: a.location || undefined,
      })
    })

    // ── Finans kayıtları → Alınacak / Yapılacak Ödeme
    finances.forEach((f) => {
      const isIncome = f.type === "INCOME" || f.type === "EXPECTED_PAYMENT"
      events.push({
        id: `finance-${f.id}`,
        title: `${isIncome ? "📥 Alınacak" : "📤 Yapılacak"}: ${f.category}`,
        date: f.date.toISOString(),
        type: isIncome ? "income_payment" : "expense_payment",
        color: isIncome ? "#10b981" : "#ef4444",
        description: f.description || undefined,
        amount: f.amount,
        allDay: true,
      })
    })

    // ── Hatırlatıcılar
    reminders.forEach((r) => {
      events.push({
        id: `reminder-${r.id}`,
        title: r.title,
        date: r.dueDate.toISOString(),
        type: "reminder",
        color: "#f59e0b",
        description: r.description || undefined,
        status: r.status,
        allDay: true,
      })
    })

    // ── Yapılacaklar
    todos.forEach((t) => {
      if (t.dueDate) {
        events.push({
          id: `todo-${t.id}`,
          title: t.title,
          date: t.dueDate.toISOString(),
          type: "todo",
          color: "#8b5cf6",
          description: t.description || undefined,
          status: t.status,
          allDay: true,
        })
      }
    })

    contentCalendars.forEach((item) => {
      events.push({
        id: `content-calendar-${item.id}`,
        title: item.title,
        date: item.scheduledDate.toISOString(),
        type: "content_calendar",
        color: "#0ea5e9",
        description: item.description || undefined,
        status: item.status,
        allDay: true,
      })
    })

    // Tarihe göre sırala
    events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    return NextResponse.json(events)
  } catch (error) {
    console.error("Calendar events hatası:", error)
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 })
  }
}
