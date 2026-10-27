/**
 * WhatsApp Connector — Baileys Tabanlı
 *
 * UYARI: Bu servis, @whiskeysockets/baileys kullanır. Bu, WhatsApp'in
 * resmi API'si DEGILDIR ve Hizmet Kosullari'ni ihlal eder.
 * Hesap askiya alinma riski vardir. Ticari kullanim icin
 * Meta Cloud API tercih edilmeli.
 *
 * Mimari Notu: Bu dosyanin dis arayrüzü (startConnector/sendMessage)
 * provider-agnostik tasarlanmistir — ileride Meta Cloud API'ye gecilirse
 * sadece bu dosya degisir, ai-orchestrator degismez.
 */

import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import axios from 'axios';
import path from 'path';
import { normalizeBaileysMessage } from './normalizer';
import { IncomingMessagePayload } from './types';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || 'http://localhost:3002';
const INTERNAL_SECRET = process.env.INTERNAL_SECRET || '';
const SESSION_DIR = path.resolve(process.env.SESSION_DIR || './sessions/erp-main');

let sock: ReturnType<typeof makeWASocket> | null = null;
let isConnected = false;

async function forwardToOrchestrator(payload: IncomingMessagePayload): Promise<void> {
  try {
    await axios.post(
      `${ORCHESTRATOR_URL}/internal/incoming`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': INTERNAL_SECRET,
        },
        timeout: 10_000,
      },
    );
    logger.info({ from: payload.from, type: payload.type }, 'Mesaj orchestrator ile iletildi');
  } catch (err: any) {
    logger.error({ err: err.message, from: payload.from }, 'Iletim basarisiz');
  }
}

export async function startConnector(): Promise<void> {
  const { version } = await fetchLatestBaileysVersion();
  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);

  sock = makeWASocket({
    version,
    logger: logger.child({ level: 'silent' }) as any,
    auth: state,
    printQRInTerminal: true,
    shouldIgnoreJid: (jid) => jid.endsWith('@g.us') || jid.endsWith('@broadcast'),
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      logger.info('QR terminale yazdirildi - WhatsApp ile tara.');
    }

    if (connection === 'open') {
      isConnected = true;
      logger.info('WhatsApp baglantisi kuruldu.');
    }

    if (connection === 'close') {
      isConnected = false;
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;

      if (statusCode === DisconnectReason.loggedOut) {
        logger.error('WhatsApp oturumu kapandi - QR yeniden taranmali. Admin bildirildi.');
        notifyAdmin('WhatsApp oturumu kapandi - QR yeniden taranmali.');
        return;
      }

      logger.warn({ statusCode }, 'Baglanti koptu, 5s sonra yeniden deneniyor...');
      setTimeout(startConnector, 5_000);
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      const payload = normalizeBaileysMessage(msg);
      if (!payload) continue;

      logger.info({ from: payload.from, type: payload.type }, 'Yeni mesaj alindi');
      await forwardToOrchestrator(payload);
    }
  });
}

export async function sendMessage(to: string, text: string, _quoteMessageId?: string): Promise<void> {
  if (!sock || !isConnected) {
    throw new Error('WhatsApp bagli degil');
  }

  const jid = to.replace('+', '') + '@s.whatsapp.net';
  await sock.sendMessage(jid, { text });
}

function notifyAdmin(message: string): void {
  logger.error({ message }, 'ADMIN BILDIRIMI GEREKIYOR');
}

export function getConnectionStatus(): boolean {
  return isConnected;
}
