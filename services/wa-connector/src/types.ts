// ─────────────────────────────────────────────────────────────────────────────
// Provider-Agnostik WhatsApp Mesaj Tip Tanımları
// Bu tip tanımları hem wa-connector hem ai-orchestrator tarafından import edilir.
// Amaç: ileride Meta Cloud API'ye geçilirse ai-orchestrator'da hiç değişiklik
// gerekmemesi — sadece wa-connector değişir, payload şekli sabit kalır.
// ─────────────────────────────────────────────────────────────────────────────

export type MessageType = 'text' | 'audio' | 'image' | 'document' | 'sticker' | 'video' | 'unknown';
export type ProviderType = 'baileys' | 'meta-cloud-api';

/** wa-connector → ai-orchestrator gelen mesaj payload'ı */
export interface IncomingMessagePayload {
  from: string;             // E.164 normalize edilmiş: +905551234567
  messageId: string;        // Provider'a özgü mesaj ID'si (duplicate koruması için)
  type: MessageType;
  text?: string;            // Metin mesajı içeriği
  mediaUrl?: string;        // Ses/görsel/belge için geçici URL veya base64
  mediaMimeType?: string;   // Ses için: audio/ogg; Görsel için: image/jpeg
  timestamp: number;        // Unix epoch (saniye)
  provider: ProviderType;
  pushName?: string;        // WhatsApp'ta görünen ad (varsa)
}

/** ai-orchestrator → wa-connector giden mesaj payload'ı */
export interface OutgoingMessagePayload {
  to: string;               // E.164 normalize edilmiş hedef numara
  text: string;             // Gönderilecek metin
  quoteMessageId?: string;  // Yanıt mesajı (quote) için
}

/** wa-connector'ın /internal/send endpoint'ine gelen istek body'si */
export interface SendMessageRequest {
  to: string;
  text: string;
  quoteMessageId?: string;
}

/** Tüm endpoint'lerde kullanılan standart başarı/hata yanıtı */
export interface ApiResponse<T = null> {
  success: boolean;
  data?: T;
  error?: string;
}
