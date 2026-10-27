import { NextResponse } from "next/server"
import { cookies }      from "next/headers"
import { jwtVerify }    from "jose"
import { GoogleGenerativeAI } from "@google/generative-ai"

const JWT_SECRET = process.env.JWT_SECRET   || "super-secret-key-change-this"
// Use the same key as the rest of the project (see app/api/leads/generate-message/route.ts)
const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || "AIzaSyAgcDNHqgkK0Sn2cWaozYalttcP6j7q5tw"

const PLATFORM_HINTS: Record<string, string> = {
  instagram : "Instagram için (emoji kullan, 2200 karakter max, hashtag ekle)",
  twitter   : "Twitter/X için (280 karakter MAX, öz ve çarpıcı olsun)",
  facebook  : "Facebook için (samimi, biraz daha uzun olabilir)",
  linkedin  : "LinkedIn için (profesyonel ton, içgörü ve değer ekle)",
  tiktok    : "TikTok için (hook cümlesiyle başla, genç ve enerjik)",
  youtube   : "YouTube açıklaması için (call-to-action ekle, anahtar kelimeler ekle)",
  threads   : "Threads için (konuşma tonu, tartışma başlatıcı)",
  pinterest : "Pinterest için (ilham verici, görsel odaklı)",
  discord   : "Discord için (topluluk odaklı, emoji kullan)",
  bluesky   : "Bluesky için (samimi, açık kaynak topluluğuna uygun)",
  reddit    : "Reddit için (doğrudan, başlık çarpıcı olsun)",
  mastodon  : "Mastodon için (merkezi olmayan platform, açık kaynak dostu)",
  slack     : "Slack için (iş odaklı, net ve kısa)",
}

async function validateAuth(): Promise<boolean> {
  try {
    const cookieStore = await cookies()
    const token       = cookieStore.get("auth-token")?.value
    if (!token) return false
    const secret      = new TextEncoder().encode(JWT_SECRET)
    await jwtVerify(token, secret)
    return true
  } catch {
    return false
  }
}

export async function POST(req: Request) {
  // Auth guard
  const isAuthed = await validateAuth()
  if (!isAuthed) {
    return NextResponse.json({ error: "Kimlik doğrulama gerekli" }, { status: 401 })
  }

  if (!GEMINI_KEY) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY ortam değişkeni ayarlanmamış." },
      { status: 500 }
    )
  }

  let body: { prompt?: string; platforms?: string[]; tone?: string; language?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON gövdesi." }, { status: 400 })
  }

  const { prompt, platforms = [], tone = "profesyonel", language = "Türkçe" } = body

  if (!prompt?.trim()) {
    return NextResponse.json({ error: "Konu (prompt) alanı boş olamaz." }, { status: 400 })
  }

  // Build platform-specific hints
  const platformHints = platforms
    .map(pid => PLATFORM_HINTS[pid])
    .filter(Boolean)
    .join("; ")

  const systemInstruction = [
    `Sen, sosyal medya içerik uzmanısın. ${language} dilinde, ${tone} bir tonda içerik üretiyorsun.`,
    platformHints ? `Hedef platformlar: ${platformHints}.` : "Genel sosyal medya içeriği yaz.",
    "Emojiler kullanabilirsin ama aşırıya kaçma.",
    "Hashtag'leri içeriğin sonuna koy (varsa).",
    "Sadece gönderi metnini döndür — açıklama veya başlık ekleme.",
  ].join(" ")

  const userPrompt = `Şu konu hakkında sosyal medya gönderisi yaz: "${prompt.trim()}"`

  try {
    const genAI = new GoogleGenerativeAI(GEMINI_KEY)
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction,
    })

    const result = await model.generateContent(userPrompt)
    const text   = result.response.text().trim()

    return NextResponse.json({ text, platforms, prompt })
  } catch (err: any) {
    console.error("[gemini social-media]", err)
    return NextResponse.json(
      { error: err?.message || "Gemini API hatası oluştu." },
      { status: 500 }
    )
  }
}
