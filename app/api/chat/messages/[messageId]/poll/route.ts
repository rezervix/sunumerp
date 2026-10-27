/**
 * /api/chat/messages/[messageId]/poll
 * 
 * POST — Ankete oy ver
 * GET  — Anket sonuçlarını getir
 */
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getAuthPayload } from "@/lib/auth/server-permission"
import { emitChatEvent } from "@/lib/services/chatService"

interface PollOption {
  id: string
  text: string
  votes: string[] // userId listesi
}

interface PollData {
  question: string
  options: PollOption[]
  isAnonymous: boolean
  allowMultiple: boolean
  expiresAt: string | null
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const auth = await getAuthPayload()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { messageId } = await params

  try {
    const { optionIds } = await req.json() as { optionIds: string[] }

    if (!optionIds || optionIds.length === 0) {
      return NextResponse.json({ error: "En az bir seçenek seçilmeli" }, { status: 400 })
    }

    // Mesajı bul
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        conversation: {
          include: {
            participants: {
              where: { isRemoved: false, leftAt: null },
              select: { userId: true },
            },
          },
        },
      },
    })

    if (!message || message.isDeleted) {
      return NextResponse.json({ error: "Mesaj bulunamadı" }, { status: 404 })
    }

    if (message.contentType !== "poll") {
      return NextResponse.json({ error: "Bu mesaj bir anket değil" }, { status: 400 })
    }

    // Üyelik kontrolü
    const isMember = message.conversation.participants.some((p) => p.userId === auth.userId)
    if (!isMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (!message.pollData) {
      return NextResponse.json({ error: "Anket verisi bulunamadı" }, { status: 400 })
    }

    const poll = JSON.parse(message.pollData) as PollData

    // Süre kontrolü
    if (poll.expiresAt && new Date(poll.expiresAt) < new Date()) {
      return NextResponse.json({ error: "Anket süresi dolmuş" }, { status: 400 })
    }

    // Çoklu seçim kontrolü
    if (!poll.allowMultiple && optionIds.length > 1) {
      return NextResponse.json(
        { error: "Bu ankette yalnızca bir seçenek seçilebilir" },
        { status: 400 }
      )
    }

    // Seçenek ID doğrulama
    const validOptionIds = poll.options.map((o) => o.id)
    const invalidIds = optionIds.filter((id) => !validOptionIds.includes(id))
    if (invalidIds.length > 0) {
      return NextResponse.json(
        { error: `Geçersiz seçenek ID'leri: ${invalidIds.join(", ")}` },
        { status: 400 }
      )
    }

    // Oyları güncelle: önce bu kullanıcının tüm oylarını kaldır
    poll.options = poll.options.map((option) => ({
      ...option,
      votes: option.votes.filter((uid) => uid !== auth.userId),
    }))

    // Seçilen seçeneklere oy ekle
    poll.options = poll.options.map((option) => {
      if (optionIds.includes(option.id)) {
        return { ...option, votes: [...option.votes, auth.userId] }
      }
      return option
    })

    // Güncel poll verisini kaydet
    await prisma.message.update({
      where: { id: messageId },
      data: {
        pollData: JSON.stringify(poll),
        updatedAt: new Date(),
      },
    })

    // Anonim anket ise oy kimleri gizle
    const responsePoll = poll.isAnonymous
      ? {
          ...poll,
          options: poll.options.map((o) => ({
            ...o,
            votes: [], // Anonim: sadece sayıyı gönder
            voteCount: o.votes.length,
            hasVoted: o.votes.includes(auth.userId),
          })),
        }
      : {
          ...poll,
          options: poll.options.map((o) => ({
            ...o,
            voteCount: o.votes.length,
            hasVoted: o.votes.includes(auth.userId),
          })),
        }

    emitChatEvent({
      type: "message_edited", // Poll güncellemesi için message_edited kullan
      conversationId: message.conversationId,
      targetUserIds: message.conversation.participants.map((p) => p.userId),
      payload: {
        messageId,
        pollUpdate: responsePoll,
      },
    })

    return NextResponse.json({ success: true, poll: responsePoll })
  } catch (error) {
    console.error("Vote poll error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const auth = await getAuthPayload()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { messageId } = await params

  try {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        conversation: {
          include: {
            participants: {
              where: { isRemoved: false, leftAt: null },
              select: { userId: true },
            },
          },
        },
      },
    })

    if (!message || message.contentType !== "poll" || !message.pollData) {
      return NextResponse.json({ error: "Anket bulunamadı" }, { status: 404 })
    }

    const isMember = message.conversation.participants.some((p) => p.userId === auth.userId)
    if (!isMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const poll = JSON.parse(message.pollData) as PollData

    // Oy verenlerın profil bilgilerini getir (anonim değilse)
    let voterDetails: Record<string, { id: string; fullName: string }[]> = {}

    if (!poll.isAnonymous) {
      const allVoterIds = Array.from(
        new Set(poll.options.flatMap((o) => o.votes))
      )
      const voters = await prisma.user.findMany({
        where: { id: { in: allVoterIds } },
        select: { id: true, fullName: true },
      })
      const voterMap = new Map(voters.map((v) => [v.id, v]))

      voterDetails = poll.options.reduce<typeof voterDetails>((acc, option) => {
        acc[option.id] = option.votes
          .map((uid) => voterMap.get(uid))
          .filter(Boolean) as { id: string; fullName: string }[]
        return acc
      }, {})
    }

    const totalVotes = poll.options.reduce((sum, o) => sum + o.votes.length, 0)

    const enrichedPoll = {
      ...poll,
      totalVotes,
      options: poll.options.map((o) => ({
        ...o,
        voteCount: o.votes.length,
        percentage: totalVotes > 0 ? Math.round((o.votes.length / totalVotes) * 100) : 0,
        hasVoted: o.votes.includes(auth.userId),
        voters: poll.isAnonymous ? [] : (voterDetails[o.id] ?? []),
        votes: poll.isAnonymous ? [] : o.votes, // Anonim ise ID'leri gizle
      })),
      isExpired: poll.expiresAt ? new Date(poll.expiresAt) < new Date() : false,
    }

    return NextResponse.json(enrichedPoll)
  } catch (error) {
    console.error("Get poll results error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
