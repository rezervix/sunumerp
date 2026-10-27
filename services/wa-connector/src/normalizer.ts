import { proto } from '@whiskeysockets/baileys';
import { MessageType, IncomingMessagePayload } from './types';
import { normalizePhone } from './phoneMatcher';

/**
 * Baileys proto.IMessage nesnesini provider-agnostik IncomingMessagePayload'a dönüştürür.
 * Mesaj tipi ve içerik normalleştirilir.
 */
export function normalizeBaileysMessage(
  msg: proto.IWebMessageInfo,
): IncomingMessagePayload | null {
  if (!msg.message) return null;
  if (!msg.key.remoteJid) return null;

  // Sadece gelen mesajlar (kendi gönderdiğimiz değil)
  if (msg.key.fromMe) return null;

  // Grup mesajlarını şimdilik pas geç
  if (msg.key.remoteJid.endsWith('@g.us')) return null;

  const rawPhone = msg.key.remoteJid;
  const from = normalizePhone(rawPhone);
  if (!from) return null;

  const timestamp = typeof msg.messageTimestamp === 'number'
    ? msg.messageTimestamp
    : Number(msg.messageTimestamp ?? 0);

  const messageId = msg.key.id ?? `${rawPhone}-${timestamp}`;
  const pushName = msg.pushName ?? undefined;

  // Mesaj tipini ve içeriği belirle
  const m = msg.message;

  if (m.conversation || m.extendedTextMessage) {
    const text = m.conversation ?? m.extendedTextMessage?.text ?? '';
    return {
      from,
      messageId,
      type: 'text',
      text,
      timestamp,
      provider: 'baileys',
      pushName,
    };
  }

  if (m.audioMessage) {
    const audio = m.audioMessage;
    return {
      from,
      messageId,
      type: 'audio',
      mediaMimeType: audio?.mimetype ?? 'audio/ogg; codecs=opus',
      timestamp,
      provider: 'baileys',
      pushName,
    };
  }

  if (m.imageMessage) {
    return {
      from,
      messageId,
      type: 'image',
      text: m.imageMessage.caption ?? undefined,
      mediaMimeType: m.imageMessage.mimetype ?? 'image/jpeg',
      timestamp,
      provider: 'baileys',
      pushName,
    };
  }

  if (m.documentMessage) {
    return {
      from,
      messageId,
      type: 'document',
      text: m.documentMessage.title ?? undefined,
      mediaMimeType: m.documentMessage.mimetype ?? undefined,
      timestamp,
      provider: 'baileys',
      pushName,
    };
  }

  if (m.videoMessage) {
    return {
      from,
      messageId,
      type: 'video',
      text: m.videoMessage.caption ?? undefined,
      mediaMimeType: m.videoMessage.mimetype ?? undefined,
      timestamp,
      provider: 'baileys',
      pushName,
    };
  }

  // Bilinmeyen tip — yine de ilet, ai-orchestrator karar verir
  return {
    from,
    messageId,
    type: 'unknown',
    timestamp,
    provider: 'baileys',
    pushName,
  };
}
