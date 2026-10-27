import { Pool, QueryResultRow } from 'pg';

/**
 * AI Servis salt-okunur baglanti havuzu.
 * ai_readonly PostgreSQL rolu ile calisir.
 * Ana ERP Prisma'sindan TAMAMEN BAGIMSIZDIR.
 */
const pool = new Pool({
  connectionString: process.env.AI_DB_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on('error', (err) => {
  console.error('[readonlyClient] DB hatasi:', err.message);
});

export async function query<T extends QueryResultRow = Record<string, any>>(
  sql: string,
  params?: any[],
): Promise<T[]> {
  const client = await pool.connect();
  try {
    const result = await client.query<T>(sql, params);
    return result.rows;
  } finally {
    client.release();
  }
}

export async function queryOne<T extends QueryResultRow = Record<string, any>>(
  sql: string,
  params?: any[],
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

export { pool };
