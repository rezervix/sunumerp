// wa-connector ile paylaşılan tip tanımları (kopyalanmış)
export type MessageType = 'text' | 'audio' | 'image' | 'document' | 'sticker' | 'video' | 'unknown';
export type ProviderType = 'baileys' | 'meta-cloud-api';

export interface IncomingMessagePayload {
  from: string;
  messageId: string;
  type: MessageType;
  text?: string;
  mediaUrl?: string;
  mediaMimeType?: string;
  timestamp: number;
  provider: ProviderType;
  pushName?: string;
}
