import 'dotenv/config';
import express from 'express';
import pino from 'pino';
import { startConnector, sendMessage, getConnectionStatus } from './connector';
import { RateLimiter } from './rateLimiter';
import type { SendMessageRequest, ApiResponse } from './types';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const app = express();
app.use(express.json({ limit: '5mb' }));

const PORT = parseInt(process.env.PORT || '3001');
const INTERNAL_SECRET = process.env.INTERNAL_SECRET || '';

const rateLimiter = new RateLimiter();

// ─── Shared Secret Middleware ─────────────────────────────────────────────────
// /internal/* endpoint'leri sadece localhost'tan ve doğru secret ile erişilebilir
function requireInternalSecret(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
): void {
  const secret = req.headers['x-internal-secret'];
  const ip = req.ip || req.socket.remoteAddress || '';

  // Sadece localhost'tan kabul et
  const isLocal = ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
  if (!isLocal) {
    res.status(403).json({ success: false, error: 'Yalnızca localhost erişimi' } satisfies ApiResponse);
    return;
  }

  if (!INTERNAL_SECRET || secret !== INTERNAL_SECRET) {
    res.status(401).json({ success: false, error: 'Geçersiz internal secret' } satisfies ApiResponse);
    return;
  }

  next();
}

// ─── Sağlık Kontrolü ─────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      service: 'wa-connector',
      connected: getConnectionStatus(),
      timestamp: new Date().toISOString(),
    },
  } satisfies ApiResponse<{ service: string; connected: boolean; timestamp: string }>);
});

// ─── Giden Mesaj Endpoint'i (ai-orchestrator → wa-connector) ─────────────────
app.post('/internal/send', requireInternalSecret, async (req, res) => {
  const body = req.body as SendMessageRequest;

  if (!body.to || !body.text) {
    res.status(400).json({ success: false, error: 'to ve text zorunludur' } satisfies ApiResponse);
    return;
  }

  // Rate limit kontrolü
  const rateError = rateLimiter.canSend(body.to);
  if (rateError) {
    logger.warn({ to: body.to, reason: rateError }, 'Rate limit engeli');
    res.status(429).json({ success: false, error: rateError } satisfies ApiResponse);
    return;
  }

  try {
    // Minimum gecikme uygula (WhatsApp spam algılamasına karşı)
    await rateLimiter.waitIfNeeded(body.to);

    await sendMessage(body.to, body.text, body.quoteMessageId);
    rateLimiter.recordSent(body.to);

    logger.info({ to: body.to }, 'Mesaj gönderildi');
    res.json({ success: true } satisfies ApiResponse);
  } catch (err: any) {
    logger.error({ err: err.message, to: body.to }, 'Mesaj gönderilemedi');
    res.status(500).json({ success: false, error: err.message } satisfies ApiResponse);
  }
});

// ─── Sunucuyu Başlat ─────────────────────────────────────────────────────────
app.listen(PORT, '127.0.0.1', async () => {
  logger.info(`wa-connector dinliyor: http://127.0.0.1:${PORT}`);
  logger.info('WhatsApp bağlantısı başlatılıyor...');

  try {
    await startConnector();
  } catch (err: any) {
    logger.error({ err: err.message }, 'Connector başlatma hatası');
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM alındı, kapatılıyor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT alındı, kapatılıyor...');
  process.exit(0);
});
