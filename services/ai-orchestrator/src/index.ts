import 'dotenv/config';
import express from 'express';
import pino from 'pino';
import { processIncomingMessage } from './handlers/incomingHandler';
import type { LLMAdapter } from './llm/adapter';
import type { IncomingMessagePayload } from './types';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const app = express();
app.use(express.json({ limit: '10mb' }));

const PORT = parseInt(process.env.PORT || '3002');
const INTERNAL_SECRET = process.env.INTERNAL_SECRET || '';

// ─── Mesaj başına rate limiting (spam/döngü koruması) ────────────────────────
const perPhoneRequests = new Map<string, { count: number; windowStart: number }>();
const MAX_PER_MINUTE = parseInt(process.env.MAX_MESSAGES_PER_MINUTE || '10');

function checkRateLimit(phone: string): boolean {
  const now = Date.now();
  const win = perPhoneRequests.get(phone);
  if (!win || now - win.windowStart > 60_000) {
    perPhoneRequests.set(phone, { count: 1, windowStart: now });
    return true;
  }
  if (win.count >= MAX_PER_MINUTE) return false;
  win.count++;
  return true;
}

// ─── LLM Adapter Factory ──────────────────────────────────────────────────────
function createLLMAdapter(): LLMAdapter {
  const provider = process.env.LLM_PROVIDER || 'gemini';

  switch (provider) {
    case 'anthropic': {
      const { AnthropicAdapter } = require('./llm/anthropic');
      return new AnthropicAdapter();
    }
    case 'openai': {
      const { OpenAIAdapter } = require('./llm/openai');
      return new OpenAIAdapter();
    }
    case 'ollama': {
      const { OllamaAdapter } = require('./llm/ollama');
      return new OllamaAdapter();
    }
    case 'gemini':
    default: {
      const { GeminiAdapter } = require('./llm/gemini');
      return new GeminiAdapter();
    }
  }
}

const llmAdapter: LLMAdapter = createLLMAdapter();
logger.info({ provider: llmAdapter.providerName, model: llmAdapter.modelName }, 'LLM adapter başlatıldı');

// ─── Internal Secret Middleware ──────────────────────────────────────────────
function requireSecret(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
): void {
  const ip = req.ip || req.socket.remoteAddress || '';
  const isLocal = ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';

  if (!isLocal) {
    res.status(403).json({ error: 'Sadece localhost erişimi' });
    return;
  }

  const secret = req.headers['x-internal-secret'];
  if (!INTERNAL_SECRET || secret !== INTERNAL_SECRET) {
    res.status(401).json({ error: 'Geçersiz internal secret' });
    return;
  }

  next();
}

// ─── Sağlık Kontrolü ──────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    service: 'ai-orchestrator',
    llmProvider: llmAdapter.providerName,
    model: llmAdapter.modelName,
    shadowMode: process.env.SHADOW_MODE !== 'false',
    timestamp: new Date().toISOString(),
  });
});

// ─── Gelen Mesaj Endpoint'i (wa-connector → ai-orchestrator) ─────────────────
app.post('/internal/incoming', requireSecret, async (req, res) => {
  const payload = req.body as IncomingMessagePayload;

  if (!payload.from || !payload.type) {
    res.status(400).json({ error: 'from ve type zorunludur' });
    return;
  }

  // Rate limit
  if (!checkRateLimit(payload.from)) {
    logger.warn({ from: payload.from }, 'Rate limit — çok fazla mesaj');
    res.status(429).json({ error: 'Rate limit: çok fazla mesaj' });
    return;
  }

  // Hemen 202 döndür (async işleme)
  res.status(202).json({ received: true });

  // Async olarak işle
  setImmediate(async () => {
    try {
      await processIncomingMessage(payload, llmAdapter);
    } catch (err: any) {
      logger.error({ err: err.message, from: payload.from }, 'İşleme hatası');
    }
  });
});

// ─── Sunucuyu Başlat ──────────────────────────────────────────────────────────
app.listen(PORT, '127.0.0.1', () => {
  logger.info(`ai-orchestrator dinliyor: http://127.0.0.1:${PORT}`);
  logger.info(`Shadow mode: ${process.env.SHADOW_MODE !== 'false' ? '🔵 AÇIK' : '🟢 KAPALI'}`);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM — kapatılıyor');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT — kapatılıyor');
  process.exit(0);
});
