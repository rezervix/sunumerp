import { query } from '../db/readonlyClient';
import { embedText } from './embedder';

export interface RetrievedChunk {
  id: string;
  source: string;
  sourceRef: string | null;
  content: string;
  similarity: number;
  metadata: Record<string, unknown> | null;
}

/**
 * pgvector cosine similarity ile en alakalı chunk'ları getirir.
 *
 * NOT: pgvector kuruluysa ve vector(1536) sütunu varsa
 * bu fonksiyonu aşağıdaki şekilde kullanın (vektör indeksli sorgu):
 *
 *   ORDER BY embedding <=> query_vector::vector LIMIT $3
 *
 * Şu an embeddingJson (TEXT) ile JavaScript'te cosine similarity hesaplıyoruz.
 * pgvector kurulunca bu dosyadaki retrieveRelevantChunks fonksiyonunu
 * SQL sorgusunu değiştirerek güncellemeniz yeterlidir.
 */
export async function retrieveRelevantChunks(
  queryText: string,
  options: {
    topK?: number;
    sources?: Array<'business_doc' | 'whatsapp_history' | 'product_catalog'>;
    customerId?: string;
  } = {},
): Promise<RetrievedChunk[]> {
  const { topK = 6, sources, customerId } = options;

  // Sorguyu embed et
  const queryEmbedding = await embedText(queryText);

  // Tüm chunk'ları çek (production'da pgvector ile veritabanında yapılacak)
  let sql = `
    SELECT id, source, "sourceRef", content, "embeddingJson", metadata
    FROM "AiKnowledgeChunk"
    WHERE "embeddingJson" IS NOT NULL
  `;
  const params: any[] = [];

  if (sources && sources.length > 0) {
    sql += ` AND source = ANY($${params.length + 1})`;
    params.push(sources);
  }

  if (customerId) {
    sql += ` AND ("sourceRef" = $${params.length + 1} OR source != 'whatsapp_history')`;
    params.push(customerId);
  }

  // Maksimum 500 chunk getir (performans için limit)
  sql += ` LIMIT 500`;

  const rows = await query<{
    id: string;
    source: string;
    sourceRef: string | null;
    content: string;
    embeddingJson: string;
    metadata: any;
  }>(sql, params);

  // JavaScript'te cosine similarity hesapla
  const scored: Array<RetrievedChunk> = rows
    .map((row) => {
      try {
        const chunkEmbedding: number[] = JSON.parse(row.embeddingJson);
        const similarity = cosineSimilarity(queryEmbedding, chunkEmbedding);
        return {
          id: row.id,
          source: row.source,
          sourceRef: row.sourceRef,
          content: row.content,
          similarity,
          metadata: row.metadata,
        };
      } catch {
        return null;
      }
    })
    .filter((r): r is RetrievedChunk => r !== null)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);

  return scored;
}

/** Cosine benzerlik hesabı — iki vektör arasındaki açı kosinüsü */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;
  return dot / denominator;
}
