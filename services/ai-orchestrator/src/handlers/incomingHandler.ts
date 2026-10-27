import axios from 'axios';
import pino from 'pino';
import { query, queryOne } from '../db/readonlyClient';
import { normalizePhone } from '../shared/phoneMatcher';
import { retrieveRelevantChunks } from '../rag/retriever';
import { ERP_TOOL_DEFINITIONS, executeToolCalls } from '../tools/erpTools';
import type { LLMAdapter, ChatMessage } from '../llm/adapter';
import type { IncomingMessagePayload } from '../types';
import { createHash } from 'crypto';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const WA_CONNECTOR_URL = process.env.WA_CONNECTOR_URL || 'http://localhost:3001';
const INTERNAL_SECRET = process.env.INTERNAL_SECRET || '';
const ERP_API_URL = process.env.ERP_API_URL || 'http://localhost:3005';
const ERP_SERVICE_TOKEN = process.env.ERP_SERVICE_TOKEN || '';
const SHADOW_MODE = process.env.SHADOW_MODE !== 'false'; // Varsayılan: AÇIK

// İşletme sistem promptu
const SYSTEM_PROMPT = `Sen, ${process.env.BUSINESS_NAME || 'çiçekana'} şirketinin müşteri hizmetleri yapay zeka asistanısın.

TEMEL KURALLAR:
1. Sadece ERP sisteminden doğrulanmış bilgiyi paylaş — asla uydurma bilgi verme.
2. Müşteri verileri gizlidir — sadece ilgili müşteriyle konuş, başka müşteri bilgisi paylaşma.
3. Kibarca ve yardımsever bir ton kullan; resmi ama sıcak ol.
4. Türkçe konuş. Müşteri başka dilde yazarsa o dilde yanıt ver.
5. Sipariş durumu, stok ve bakiye gibi bilgileri ERP tool'ları üzerinden sorgula.

DEVRETME KURALLARI (bu durumlarda "insana devrediyorum" de ve yanıt üretme):
- Fiyat pazarlığı veya özel indirim talepleri
- İptal veya iade işlemleri
- Şikayet, hukuki konu, tazminat talepleri
- Kesin cevap veremeyeceğin teknik konular
- Müşteri çok sinirli veya hayal kırıklığı içindeyse

Eğer emin değilsen veya soru kapsam dışındaysa, nazikçe müşteri temsilcisine bağlayacağını söyle.`;

interface CustomerRecord {
  id: string;
  name: string | null;
  company: string | null;
  status: string;
  branchId: string;
  aiAutoReplyEnabled: boolean;
  whatsappConsent: boolean;
  phone: string | null;
  whatsappNormalizedPhone: string | null;
}

interface ContactRecord {
  customerId: string;
  phone: string | null;
}

/**
 * Ana mesaj işleme akışı — 4.1 → 4.4
 */
export async function processIncomingMessage(
  payload: IncomingMessagePayload,
  llm: LLMAdapter,
): Promise<void> {
  const startTime = Date.now();
  const normalizedPhone = payload.from; // Zaten normalize edilmiş E.164

  // ─── 4.1a: Müşteriyi tanı ────────────────────────────────────────────────
  let customer: CustomerRecord | null = await findCustomerByPhone(normalizedPhone);

  // ─── 4.1b: Müşteri bulunamazsa → insan ajana bildir ────────────────────
  if (!customer) {
    logger.warn({ phone: normalizedPhone }, 'Tanımsız numara — insan ajana yönlendiriliyor');
    await notifyHumanAgent({
      reason: 'unknown_number',
      phone: normalizedPhone,
      message: payload.text ?? `[${payload.type} mesajı]`,
      pushName: payload.pushName,
    });
    return;
  }

  // ─── 4.1c: Durum kontrolleri ──────────────────────────────────────────
  if (customer.status !== 'active') {
    logger.info({ customerId: customer.id, status: customer.status }, 'Pasif müşteri — insan ajana');
    await escalateToHuman(customer, payload, 'Müşteri pasif statüde', 'inactive_customer');
    return;
  }

  if (!customer.aiAutoReplyEnabled) {
    logger.info({ customerId: customer.id }, 'aiAutoReplyEnabled=false — insan ajana');
    await escalateToHuman(customer, payload, 'AI otomatik yanıt bu müşteri için kapalı', 'ai_disabled');
    return;
  }

  if (!customer.whatsappConsent) {
    logger.info({ customerId: customer.id }, 'whatsappConsent=false — KVKK, insan ajana');
    await escalateToHuman(customer, payload, 'WhatsApp KVKK onayı yok', 'no_consent');
    return;
  }

  // Metin olmayan mesajlar için basit yanıt
  const incomingText = payload.text ?? `[${payload.type} mesaj alındı]`;

  // ─── 4.2: Bağlam toplama (RAG) ──────────────────────────────────────────
  const [ragChunks, memoryMessages, customerContext] = await Promise.all([
    // 4.2b: pgvector cosine similarity
    retrieveRelevantChunks(incomingText, {
      topK: 6,
      sources: ['business_doc', 'whatsapp_history', 'product_catalog'],
      customerId: customer.id,
    }),
    // 4.2c: Kısa vadeli hafıza — son 12 mesaj
    getConversationMemory(customer.id, 12),
    // 4.2d: ERP özeti — LLM gereksiz tool çağırmasın
    getCustomerContextSummary(customer.id, customer.branchId),
  ]);

  // ─── 4.3: LLM çağrısı ───────────────────────────────────────────────────
  const ragContext = ragChunks
    .map((c) => `[${c.source}] ${c.content}`)
    .join('\n---\n');

  const systemWithContext = `${SYSTEM_PROMPT}

--- ERP MÜŞTERİ BİLGİSİ ---
Müşteri: ${customer.name ?? 'Bilinmiyor'} ${customer.company ? `(${customer.company})` : ''}
Müşteri ID: ${customer.id}
Şube ID: ${customer.branchId}

--- SON SİPARİŞLER / BAKIYE ---
${customerContext}

--- İLGİLİ DOKÜMANTASYON ---
${ragContext || 'İlgili belge bulunamadı.'}`;

  const messages: ChatMessage[] = [
    { role: 'system', content: systemWithContext },
    ...memoryMessages,
    { role: 'user', content: incomingText },
  ];

  let llmResponse;
  let toolCallsLog: Record<string, unknown>[] = [];

  try {
    // İlk LLM çağrısı
    llmResponse = await llm.chat(messages, ERP_TOOL_DEFINITIONS, {
      maxTokens: 512,
      temperature: 0.3,
    });

    // Tool call'lar varsa çalıştır ve ikinci LLM çağrısı yap
    if (llmResponse.toolCalls.length > 0) {
      const toolResults = await executeToolCalls(llmResponse.toolCalls, {
        customerId: customer.id,
        branchId: customer.branchId,
      });
      toolCallsLog = toolResults.map((r) => ({ name: r.toolName, result: r.result }));

      // Tool sonuçlarını mesaj geçmişine ekle
      const messagesWithTools: ChatMessage[] = [
        ...messages,
        { role: 'assistant', content: llmResponse.content },
        {
          role: 'user',
          content: `Tool sonuçları:\n${JSON.stringify(toolResults.map((r) => ({ tool: r.toolName, data: r.result })), null, 2)}`,
        },
      ];

      // İkinci LLM çağrısı (tool sonuçlarıyla)
      llmResponse = await llm.chat(messagesWithTools, [], { maxTokens: 512 });
    }
  } catch (err: any) {
    logger.error({ err: err.message, customerId: customer.id }, 'LLM hatası — insan ajana devrediliyor');
    await escalateToHuman(customer, payload, `LLM hatası: ${err.message}`, 'llm_error');
    await logAgentDecision({
      customerId: customer.id,
      incomingMessage: incomingText,
      retrievedContext: { ragChunks: ragChunks.map((c) => c.id) },
      toolCalls: toolCallsLog,
      generatedResponse: '',
      wasAutoSent: false,
      escalatedToHuman: true,
      escalationReason: `LLM hatası: ${err.message}`,
      latencyMs: Date.now() - startTime,
      llmProvider: llm.providerName,
    });
    return;
  }

  // ─── 4.3d: Escalation kontrolü ──────────────────────────────────────────
  const shouldEscalate = llmResponse.needsEscalation;

  if (shouldEscalate) {
    logger.info(
      { customerId: customer.id, reason: llmResponse.escalationReason },
      'Escalation tetiklendi — insan ajana',
    );
    await escalateToHuman(customer, payload, llmResponse.escalationReason ?? 'Escalation', 'llm_escalation');
    await logAgentDecision({
      customerId: customer.id,
      incomingMessage: incomingText,
      retrievedContext: { ragChunks: ragChunks.map((c) => c.id), ragContext },
      toolCalls: toolCallsLog,
      generatedResponse: llmResponse.content,
      wasAutoSent: false,
      escalatedToHuman: true,
      escalationReason: llmResponse.escalationReason,
      latencyMs: Date.now() - startTime,
      llmProvider: llm.providerName,
    });
    return;
  }

  const finalResponse = llmResponse.content.trim();
  if (!finalResponse) {
    logger.warn({ customerId: customer.id }, 'Boş LLM yanıtı — insan ajana');
    await escalateToHuman(customer, payload, 'Boş yanıt', 'empty_response');
    return;
  }

  // ─── 4.4a: Yanıtı gönder (shadow mode'da GÖNDERMEZ) ─────────────────────
  let wasAutoSent = false;

  if (!SHADOW_MODE) {
    try {
      await axios.post(
        `${WA_CONNECTOR_URL}/internal/send`,
        { to: normalizedPhone, text: finalResponse },
        {
          headers: { 'X-Internal-Secret': INTERNAL_SECRET },
          timeout: 10_000,
        },
      );
      wasAutoSent = true;
      logger.info({ to: normalizedPhone }, 'Yanıt gönderildi');
    } catch (err: any) {
      logger.error({ err: err.message }, 'Mesaj gönderilemedi — insana devrediliyor');
      await escalateToHuman(customer, payload, 'Gönderim hatası', 'send_error');
    }
  } else {
    logger.info({ customerId: customer.id }, '🔵 SHADOW MODE: Yanıt üretildi ama gönderilmedi');
  }

  // ─── 4.4b: ERP CustomerChat'e kaydet ─────────────────────────────────────
  await logToErpCustomerChat(customer.id, incomingText, finalResponse);

  // ─── 4.4c: Konuşma hafızasına kaydet ────────────────────────────────────
  await saveToMemory(customer.id, 'user', incomingText);
  await saveToMemory(customer.id, 'assistant', finalResponse);

  // ─── 4.4c: AiAgentLog'a kaydet ───────────────────────────────────────────
  await logAgentDecision({
    customerId: customer.id,
    incomingMessage: incomingText,
    retrievedContext: {
      ragChunks: ragChunks.map((c) => ({ id: c.id, source: c.source, similarity: c.similarity })),
    },
    toolCalls: toolCallsLog,
    generatedResponse: finalResponse,
    wasAutoSent,
    escalatedToHuman: false,
    latencyMs: Date.now() - startTime,
    llmProvider: llm.providerName,
  });
}

// ─── Yardımcı Fonksiyonlar ────────────────────────────────────────────────────

async function findCustomerByPhone(phone: string): Promise<CustomerRecord | null> {
  // Önce whatsappNormalizedPhone üzerinden ara
  const byNormalized = await queryOne<CustomerRecord>(
    `SELECT id, name, company, status, "branchId", "aiAutoReplyEnabled",
            "whatsappConsent", phone, "whatsappNormalizedPhone"
     FROM "Customer"
     WHERE "whatsappNormalizedPhone" = $1
     LIMIT 1`,
    [phone],
  );
  if (byNormalized) return byNormalized;

  // CustomerContact.phone üzerinden ara
  const byContact = await queryOne<ContactRecord>(
    `SELECT cc."customerId"
     FROM "CustomerContact" cc
     WHERE REGEXP_REPLACE(cc.phone, '[^0-9]', '', 'g') LIKE $1
     LIMIT 1`,
    [`%${phone.replace(/\D/g, '')}`],
  );

  if (byContact) {
    return queryOne<CustomerRecord>(
      `SELECT id, name, company, status, "branchId", "aiAutoReplyEnabled",
              "whatsappConsent", phone, "whatsappNormalizedPhone"
       FROM "Customer" WHERE id = $1`,
      [byContact.customerId],
    );
  }

  return null;
}

async function getConversationMemory(
  customerId: string,
  limit: number,
): Promise<ChatMessage[]> {
  const rows = await query<{ role: string; content: string }>(
    `SELECT role, content FROM "AiConversationMemory"
     WHERE "customerId" = $1
     ORDER BY "createdAt" DESC
     LIMIT $2`,
    [customerId, limit],
  );
  // Ters çevir — en eskisi önce olsun
  return rows.reverse().map((r) => ({
    role: r.role as 'user' | 'assistant',
    content: r.content,
  }));
}

async function getCustomerContextSummary(
  customerId: string,
  branchId: string,
): Promise<string> {
  try {
    const orders = await query<{
      orderNumber: string | null;
      title: string;
      status: string;
      paymentStatus: string;
      totalAmount: number | null;
      orderDate: Date;
    }>(
      `SELECT "orderNumber", title, status, "paymentStatus", "totalAmount", "orderDate"
       FROM "Order"
       WHERE "customerId" = $1
       ORDER BY "orderDate" DESC
       LIMIT 3`,
      [customerId],
    );

    if (orders.length === 0) return 'Henüz sipariş bulunamadı.';

    return orders
      .map(
        (o) =>
          `#${o.orderNumber ?? '?'} - ${o.title} | Durum: ${o.status} | Ödeme: ${o.paymentStatus} | Tutar: ${o.totalAmount ?? '?'}₺`,
      )
      .join('\n');
  } catch {
    return 'ERP bağlantı hatası — sipariş bilgisi alınamadı.';
  }
}

async function saveToMemory(
  customerId: string,
  role: 'user' | 'assistant',
  content: string,
): Promise<void> {
  const id = createHash('sha256')
    .update(`${customerId}-${role}-${content}-${Date.now()}`)
    .digest('hex')
    .slice(0, 21);

  await query(
    `INSERT INTO "AiConversationMemory" (id, "customerId", role, content, "createdAt")
     VALUES ($1, $2, $3, $4, NOW())`,
    [id, customerId, role, content],
  );

  // Son 50 mesajı tut, eskilerini sil
  await query(
    `DELETE FROM "AiConversationMemory"
     WHERE "customerId" = $1
       AND id NOT IN (
         SELECT id FROM "AiConversationMemory"
         WHERE "customerId" = $1
         ORDER BY "createdAt" DESC
         LIMIT 50
       )`,
    [customerId],
  );
}

async function logToErpCustomerChat(
  customerId: string,
  incomingMessage: string,
  aiResponse: string,
): Promise<void> {
  try {
    // ERP'nin kendi API'si üzerinden CustomerChat'e yaz
    await axios.post(
      `${ERP_API_URL}/api/ai-agent/webhook`,
      {
        customerId,
        incomingMessage,
        aiResponse,
        type: 'WhatsApp',
      },
      {
        headers: {
          Authorization: `Bearer ${ERP_SERVICE_TOKEN}`,
          'Content-Type': 'application/json',
          'X-Internal-Secret': INTERNAL_SECRET,
        },
        timeout: 5_000,
      },
    );
  } catch (err: any) {
    // CustomerChat kaydı başarısız olsa bile asıl akışı durdurmaz
    logger.error({ err: err.message, customerId }, 'CustomerChat log hatası');
  }
}

async function logAgentDecision(params: {
  customerId: string;
  incomingMessage: string;
  retrievedContext: Record<string, unknown>;
  toolCalls: unknown[];
  generatedResponse: string;
  wasAutoSent: boolean;
  escalatedToHuman: boolean;
  escalationReason?: string;
  latencyMs: number;
  llmProvider: string;
}): Promise<void> {
  const id = createHash('sha256')
    .update(`${params.customerId}-${Date.now()}-${Math.random()}`)
    .digest('hex')
    .slice(0, 21);

  const shadowMode = SHADOW_MODE;

  await query(
    `INSERT INTO "AiAgentLog"
       (id, "customerId", "incomingMessage", "retrievedContext", "toolCalls",
        "generatedResponse", "wasAutoSent", "escalatedToHuman", "escalationReason",
        "latencyMs", "llmProvider", "shadowMode", "createdAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())`,
    [
      id,
      params.customerId,
      params.incomingMessage,
      JSON.stringify(params.retrievedContext),
      params.toolCalls.length > 0 ? JSON.stringify(params.toolCalls) : null,
      params.generatedResponse,
      params.wasAutoSent,
      params.escalatedToHuman,
      params.escalationReason ?? null,
      params.latencyMs,
      params.llmProvider,
      shadowMode,
    ],
  );
}

async function escalateToHuman(
  customer: CustomerRecord,
  payload: IncomingMessagePayload,
  reason: string,
  type: string,
): Promise<void> {
  logger.warn({ customerId: customer.id, reason, type }, 'İnsan ajana devredildi');

  try {
    await axios.post(
      `${ERP_API_URL}/api/ai-agent/webhook`,
      {
        customerId: customer.id,
        incomingMessage: payload.text ?? `[${payload.type}]`,
        aiResponse: null,
        type: 'WhatsApp',
        escalated: true,
        escalationReason: reason,
      },
      {
        headers: {
          Authorization: `Bearer ${ERP_SERVICE_TOKEN}`,
          'Content-Type': 'application/json',
          'X-Internal-Secret': INTERNAL_SECRET,
        },
        timeout: 5_000,
      },
    );
  } catch (err: any) {
    logger.error({ err: err.message }, 'Escalation webhook hatası');
  }
}

async function notifyHumanAgent(params: {
  reason: string;
  phone: string;
  message: string;
  pushName?: string;
}): Promise<void> {
  try {
    await axios.post(
      `${ERP_API_URL}/api/ai-agent/webhook`,
      {
        customerId: null,
        incomingMessage: params.message,
        aiResponse: null,
        type: 'WhatsApp',
        escalated: true,
        escalationReason: `Tanımsız numara: ${params.phone}${params.pushName ? ` (${params.pushName})` : ''}`,
        unknownPhone: params.phone,
      },
      {
        headers: {
          Authorization: `Bearer ${ERP_SERVICE_TOKEN}`,
          'Content-Type': 'application/json',
          'X-Internal-Secret': INTERNAL_SECRET,
        },
        timeout: 5_000,
      },
    );
  } catch (err: any) {
    logger.error({ err: err.message }, 'Tanımsız numara bildirimi hatası');
  }
}
