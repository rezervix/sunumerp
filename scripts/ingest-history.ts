#!/usr/bin/env ts-node
/**
 * scripts/ingest-history.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Geçmiş WhatsApp konuşmalarını ve işletme dokümanlarını embed edip
 * AiKnowledgeChunk tablosuna kaydeder.
 *
 * Kullanım:
 *   # WhatsApp .txt export'unu işle:
 *   ts-node scripts/ingest-history.ts --mode whatsapp --file ./exports/chat.txt
 *
 *   # İşletme dokümanı (PDF/DOCX/TXT) işle:
 *   ts-node scripts/ingest-history.ts --mode document --file ./docs/fiyat-listesi.pdf
 *
 *   # Tüm dokümanları işle:
 *   ts-node scripts/ingest-history.ts --mode document --dir ./docs/
 *
 * Bağımlılıklar: pdf-parse, mammoth, dotenv, pg (ai-orchestrator'dan)
 *
 * NOT: Bu script ai-orchestrator'ın aynı ortam değişkenlerini kullanır.
 *      services/ai-orchestrator/.env dosyasını kaynak olarak kullanın.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { Pool } from 'pg';

// ─── Veritabanı Bağlantısı ───────────────────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.AI_DB_URL,
  max: 5,
});

async function dbQuery(sql: string, params?: any[]): Promise<any[]> {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows;
  } finally {
    client.release();
  }
}

// ─── Telefon Normalizasyonu ───────────────────────────────────────────────────
function normalizePhone(raw: string): string | null {
  if (!raw) return null;
  let phone = raw.split('@')[0].trim().replace(/\D/g, '');
  if (!phone) return null;
  if (phone.length === 10 && phone.startsWith('5')) return '+90' + phone;
  if (phone.length === 11 && phone.startsWith('05')) return '+90' + phone.slice(1);
  if (phone.length === 12 && phone.startsWith('90')) return '+' + phone;
  if (phone.length >= 10) return '+' + phone;
  return null;
}

// ─── Embedding ────────────────────────────────────────────────────────────────
async function embedText(text: string): Promise<number[]> {
  const provider = process.env.LLM_PROVIDER || 'gemini';

  if (provider === 'openai') {
    const OpenAI = (await import('openai')).default;
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const r = await client.embeddings.create({
      model: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
      input: text.slice(0, 8000),
    });
    return r.data[0].embedding;
  }

  if (provider === 'gemini') {
    const axios = (await import('axios')).default;
    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004';
    const r = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${apiKey}`,
      { model: `models/${model}`, content: { parts: [{ text: text.slice(0, 8000) }] } },
    );
    return r.data.embedding.values;
  }

  if (provider === 'ollama') {
    const axios = (await import('axios')).default;
    const r = await axios.post(`${process.env.OLLAMA_URL || 'http://localhost:11434'}/api/embeddings`, {
      model: process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text',
      prompt: text.slice(0, 8000),
    });
    return r.data.embedding;
  }

  throw new Error(`Desteklenmeyen provider: ${provider}`);
}

// ─── Chunk Kayıt (İdempotent) ─────────────────────────────────────────────────
async function saveChunk(params: {
  source: 'business_doc' | 'whatsapp_history' | 'product_catalog';
  sourceRef?: string;
  content: string;
  metadata?: Record<string, unknown>;
}): Promise<{ saved: boolean }> {
  const contentHash = createHash('sha256').update(params.content).digest('hex');

  const existing = await dbQuery(
    'SELECT id FROM "AiKnowledgeChunk" WHERE "contentHash" = $1 LIMIT 1',
    [contentHash],
  );

  if (existing.length > 0) {
    return { saved: false };
  }

  let embedding: number[];
  try {
    embedding = await embedText(params.content);
  } catch (err: any) {
    console.error('  Embedding hatası:', err.message);
    return { saved: false };
  }

  const id = contentHash.slice(0, 21);
  await dbQuery(
    `INSERT INTO "AiKnowledgeChunk"
       (id, source, "sourceRef", content, "embeddingJson", "contentHash", metadata, "createdAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
    [
      id,
      params.source,
      params.sourceRef ?? null,
      params.content,
      JSON.stringify(embedding),
      contentHash,
      params.metadata ? JSON.stringify(params.metadata) : null,
    ],
  );

  return { saved: true };
}

// ─── Chunk'lama Yardımcısı ────────────────────────────────────────────────────
function chunkText(text: string, maxChars = 800, overlapChars = 150): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + maxChars, text.length);
    const chunk = text.slice(start, end).trim();
    if (chunk.length > 50) {
      chunks.push(chunk);
    }
    start = end - overlapChars;
    if (start >= text.length) break;
  }

  return chunks;
}

// ─── WhatsApp .txt Export Parser ──────────────────────────────────────────────
interface WhatsAppMessage {
  timestamp: string;
  sender: string;
  content: string;
}

function parseWhatsAppExport(text: string): Map<string, WhatsAppMessage[]> {
  // Format: [DD.MM.YYYY HH:MM] Gönderen: Mesaj
  const lineRegex = /^\[(\d{2}\.\d{2}\.\d{4}, \d{2}:\d{2})\] (.+?): (.+)$/;
  const conversations = new Map<string, WhatsAppMessage[]>();
  const lines = text.split('\n');

  for (const line of lines) {
    const match = line.match(lineRegex);
    if (!match) continue;

    const [, timestamp, sender, content] = match;
    const phone = normalizePhone(sender) ?? sender;

    if (!conversations.has(phone)) {
      conversations.set(phone, []);
    }
    conversations.get(phone)!.push({ timestamp, sender, content });
  }

  return conversations;
}

// ─── PDF Parser ───────────────────────────────────────────────────────────────
async function parsePDF(filePath: string): Promise<string> {
  const pdfParse = (await import('pdf-parse')).default;
  const buffer = fs.readFileSync(filePath);
  const result = await pdfParse(buffer);
  return result.text;
}

// ─── DOCX Parser ─────────────────────────────────────────────────────────────
async function parseDOCX(filePath: string): Promise<string> {
  const mammoth = await import('mammoth');
  const result = await mammoth.extractRawText({ path: filePath });
  return result.value;
}

// ─── TXT Parser ──────────────────────────────────────────────────────────────
function parseTXT(filePath: string): string {
  return fs.readFileSync(filePath, 'utf-8');
}

// ─── Müşteri ID Eşleştirme ────────────────────────────────────────────────────
async function findCustomerIdByPhone(phone: string): Promise<string | null> {
  const rows = await dbQuery(
    `SELECT id FROM "Customer" WHERE "whatsappNormalizedPhone" = $1 LIMIT 1`,
    [phone],
  );
  return rows[0]?.id ?? null;
}

// ─── Ana Modlar ───────────────────────────────────────────────────────────────

async function ingestWhatsAppHistory(filePath: string): Promise<void> {
  console.log(`\n📱 WhatsApp geçmişi işleniyor: ${filePath}`);
  const text = parseTXT(filePath);
  const conversations = parseWhatsAppExport(text);

  let totalSaved = 0;
  let totalSkipped = 0;

  for (const [phone, messages] of conversations) {
    const customerId = await findCustomerIdByPhone(phone);

    if (!customerId) {
      console.log(`  ⚠️  ${phone} → Müşteri bulunamadı, atlanıyor`);
      continue;
    }

    // Konuşmayı tek metin bloğuna dönüştür
    const conversationText = messages
      .map((m) => `[${m.timestamp}] ${m.sender}: ${m.content}`)
      .join('\n');

    // Chunk'la
    const chunks = chunkText(conversationText, 800, 150);
    console.log(`  📞 ${phone} (${customerId}) → ${messages.length} mesaj, ${chunks.length} chunk`);

    for (let i = 0; i < chunks.length; i++) {
      const result = await saveChunk({
        source: 'whatsapp_history',
        sourceRef: customerId,
        content: chunks[i],
        metadata: { phone, customerId, chunkIndex: i, totalChunks: chunks.length },
      });

      if (result.saved) totalSaved++;
      else totalSkipped++;

      // API rate limit için bekle
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  console.log(`✅ WhatsApp geçmişi tamamlandı: ${totalSaved} kaydedildi, ${totalSkipped} atlandı`);
}

async function ingestDocument(filePath: string): Promise<void> {
  const ext = path.extname(filePath).toLowerCase();
  const fileName = path.basename(filePath);
  console.log(`\n📄 Doküman işleniyor: ${fileName}`);

  let text: string;
  try {
    if (ext === '.pdf') text = await parsePDF(filePath);
    else if (ext === '.docx') text = await parseDOCX(filePath);
    else if (ext === '.txt') text = parseTXT(filePath);
    else {
      console.log(`  ⚠️  Desteklenmeyen format: ${ext}`);
      return;
    }
  } catch (err: any) {
    console.error(`  ❌ Parse hatası: ${err.message}`);
    return;
  }

  const chunks = chunkText(text, 800, 150);
  console.log(`  → ${text.length} karakter, ${chunks.length} chunk`);

  let saved = 0;
  let skipped = 0;

  for (let i = 0; i < chunks.length; i++) {
    const result = await saveChunk({
      source: 'business_doc',
      sourceRef: fileName,
      content: chunks[i],
      metadata: { fileName, chunkIndex: i, totalChunks: chunks.length },
    });

    if (result.saved) saved++;
    else skipped++;

    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(`  ✅ ${saved} kaydedildi, ${skipped} atlandı (hash kontrolü)`);
}

async function ingestDirectory(dirPath: string): Promise<void> {
  const files = fs.readdirSync(dirPath);
  const supported = files.filter((f) => ['.pdf', '.docx', '.txt'].includes(path.extname(f).toLowerCase()));

  console.log(`\n📁 Dizin: ${dirPath} — ${supported.length} dosya bulundu`);

  for (const file of supported) {
    await ingestDocument(path.join(dirPath, file));
  }
}

// ─── CLI Giriş Noktası ────────────────────────────────────────────────────────
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const modeIdx = args.indexOf('--mode');
  const fileIdx = args.indexOf('--file');
  const dirIdx = args.indexOf('--dir');

  const mode = modeIdx >= 0 ? args[modeIdx + 1] : null;
  const file = fileIdx >= 0 ? args[fileIdx + 1] : null;
  const dir = dirIdx >= 0 ? args[dirIdx + 1] : null;

  if (!mode) {
    console.error('Kullanım: ts-node scripts/ingest-history.ts --mode whatsapp|document --file <dosya> | --dir <dizin>');
    process.exit(1);
  }

  try {
    if (mode === 'whatsapp' && file) {
      await ingestWhatsAppHistory(file);
    } else if (mode === 'document' && file) {
      await ingestDocument(file);
    } else if (mode === 'document' && dir) {
      await ingestDirectory(dir);
    } else {
      console.error('Geçersiz argümanlar');
      process.exit(1);
    }
  } finally {
    await pool.end();
  }

  console.log('\n🎉 İşlem tamamlandı!');
}

main().catch((err) => {
  console.error('Fatal hata:', err.message);
  process.exit(1);
});
