import { query } from '../db/readonlyClient';
import { createHash } from 'crypto';

/**
 * Embedding Servisi
 *
 * LLM_PROVIDER'a göre doğru embedding API'sini çağırır.
 * Embedding'ler AiKnowledgeChunk.embeddingJson alanına JSON olarak saklanır.
 * (pgvector kurulunca vector(1536) tipine migrate edilecek)
 */
export async function embedText(text: string): Promise<number[]> {
  const provider = process.env.LLM_PROVIDER || 'openai';

  if (provider === 'openai') {
    return embedWithOpenAI(text);
  } else if (provider === 'anthropic') {
    // Anthropic kendi embedding API'sini sunmaz — OpenAI veya yerel model kullan
    return embedWithOpenAI(text);
  } else if (provider === 'ollama') {
    return embedWithOllama(text);
  } else if (provider === 'gemini') {
    return embedWithGemini(text);
  }

  throw new Error(`Desteklenmeyen LLM_PROVIDER: ${provider}`);
}

async function embedWithOpenAI(text: string): Promise<number[]> {
  const { default: OpenAI } = await import('openai');
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const model = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
  const response = await client.embeddings.create({ model, input: text.slice(0, 8000) });
  return response.data[0].embedding;
}

async function embedWithOllama(text: string): Promise<number[]> {
  const axios = (await import('axios')).default;
  const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
  const model = process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text';

  const response = await axios.post(`${ollamaUrl}/api/embeddings`, {
    model,
    prompt: text.slice(0, 8000),
  });

  return response.data.embedding;
}

async function embedWithGemini(text: string): Promise<number[]> {
  const axios = (await import('axios')).default;
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004';

  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${apiKey}`,
    {
      model: `models/${model}`,
      content: { parts: [{ text: text.slice(0, 8000) }] },
    },
  );

  return response.data.embedding.values;
}

/**
 * Chunk'ı embed edip AiKnowledgeChunk tablosuna kaydeder.
 * contentHash kontrolüyle aynı içerik tekrar embed edilmez (idempotent).
 */
export async function embedAndSaveChunk(params: {
  source: 'business_doc' | 'whatsapp_history' | 'product_catalog';
  sourceRef?: string;
  content: string;
  metadata?: Record<string, unknown>;
}): Promise<{ saved: boolean; id?: string }> {
  const contentHash = createHash('sha256').update(params.content).digest('hex');

  // Aynı içerik zaten var mı?
  const existing = await query(
    'SELECT id FROM "AiKnowledgeChunk" WHERE "contentHash" = $1 LIMIT 1',
    [contentHash],
  );

  if (existing.length > 0) {
    return { saved: false, id: existing[0].id };
  }

  // Embed et
  const embedding = await embedText(params.content);
  const embeddingJson = JSON.stringify(embedding);

  const { nanoid } = await import('nanoid').catch(() => ({
    nanoid: () => createHash('sha256').update(Date.now().toString() + Math.random()).digest('hex').slice(0, 21),
  }));

  const id = nanoid();

  await query(
    `INSERT INTO "AiKnowledgeChunk" (id, source, "sourceRef", content, "embeddingJson", "contentHash", metadata, "createdAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
    [
      id,
      params.source,
      params.sourceRef ?? null,
      params.content,
      embeddingJson,
      contentHash,
      params.metadata ? JSON.stringify(params.metadata) : null,
    ],
  );

  return { saved: true, id };
}
