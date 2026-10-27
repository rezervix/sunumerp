/**
 * POST /api/ai-agent/webhook
 *
 * ai-orchestrator servisinin ERP'ye CustomerChat kaydı açmak için çağırdığı
 * dahili endpoint. ERP'nin kendi Prisma client'ını ve validation mantığını kullanır.
 *
 * Güvenlik: Shared-secret header + JWT service-account token doğrulaması.
 *
 * Bu endpoint, ERP dışından erişilemez — sadece localhost'taki ai-orchestrator çağırır.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { headers } from 'next/headers';

const INTERNAL_SECRET = process.env.AI_INTERNAL_SECRET || '';

interface WebhookBody {
  customerId: string | null;
  incomingMessage: string;
  aiResponse: string | null;
  type?: string;
  escalated?: boolean;
  escalationReason?: string;
  unknownPhone?: string;
}

export async function POST(req: Request) {
  // ─── 1. Shared-Secret Doğrulama ─────────────────────────────────────────
  const headersList = await headers();
  const secret = headersList.get('x-internal-secret');

  if (!INTERNAL_SECRET || secret !== INTERNAL_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ─── 2. Authorization Header (service token) ────────────────────────────
  const authHeader = headersList.get('authorization');
  const serviceToken = process.env.ERP_AI_SERVICE_TOKEN;

  if (!serviceToken || authHeader !== `Bearer ${serviceToken}`) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // ─── 3. Body Parse ──────────────────────────────────────────────────────
  let body: WebhookBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 });
  }

  if (!body.incomingMessage) {
    return NextResponse.json({ error: 'incomingMessage zorunludur' }, { status: 400 });
  }

  try {
    // ─── 4. Müşteri doğrulama (customerId varsa) ─────────────────────────
    if (body.customerId) {
      const customer = await prisma.customer.findUnique({
        where: { id: body.customerId },
        select: { id: true, name: true },
      });

      if (!customer) {
        return NextResponse.json({ error: 'Müşteri bulunamadı' }, { status: 404 });
      }
    }

    // ─── 5. CustomerChat kaydı ────────────────────────────────────────────
    // Gelen müşteri mesajını kaydet
    if (body.customerId) {
      await prisma.customerChat.create({
        data: {
          customerId: body.customerId,
          type: body.type ?? 'WhatsApp',
          content: body.escalated
            ? `[ESKALASYON] ${body.incomingMessage}\nSebep: ${body.escalationReason ?? 'Belirtilmedi'}`
            : body.incomingMessage,
          timestamp: new Date(),
        },
      });

      // AI yanıtını da kaydet (varsa ve escalation değilse)
      if (body.aiResponse && !body.escalated) {
        await prisma.customerChat.create({
          data: {
            customerId: body.customerId,
            type: body.type ?? 'WhatsApp',
            content: `[AI Yanıtı] ${body.aiResponse}`,
            timestamp: new Date(),
          },
        });
      }
    }

    // ─── 6. Escalation durumunda personele bildirim ───────────────────────
    if (body.escalated) {
      // İnsan ajan bildirim sistemi — mevcut ERP Notification tablosunu kullan
      // Tüm aktif kullanıcılara değil, ilgili şube yöneticisine bildirim gönder
      // TODO: Şube ID'si tespit edilerek şube yöneticisine gönder
      // Şimdilik console log — sonra mevcut /api/notifications endpoint'i kullanılabilir
      console.warn(
        `[AI AGENT ESCALATION] CustomerId: ${body.customerId ?? 'TANIMLI DEĞİL'} | ` +
        `Sebep: ${body.escalationReason} | ` +
        `Mesaj: ${body.incomingMessage.slice(0, 100)}...`
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[ai-agent/webhook] Hata:', err.message);
    return NextResponse.json(
      { error: 'Sunucu hatası', detail: err.message },
      { status: 500 }
    );
  }
}
