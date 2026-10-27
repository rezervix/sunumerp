/**
 * LLM Provider Adapter Interface
 *
 * Tüm LLM sağlayıcıları bu interface'i implement eder.
 * ai-orchestrator yalnızca bu interface'i kullanır — provider'dan bağımsız.
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface LLMResponse {
  content: string;
  toolCalls: ToolCall[];
  provider: string;
  model: string;
  /** Yanıt belirsizlik göstergesi — yüksekse insana devret */
  needsEscalation: boolean;
  escalationReason?: string;
}

export interface LLMAdapter {
  readonly providerName: string;
  readonly modelName: string;

  chat(
    messages: ChatMessage[],
    tools?: ToolDefinition[],
    options?: {
      maxTokens?: number;
      temperature?: number;
    },
  ): Promise<LLMResponse>;
}

// ─── Escalation Trigger Analizi ──────────────────────────────────────────────
/** Mesaj veya yanıtta insan devri gerektiren anahtar kelimeler */
const ESCALATION_KEYWORDS_TR = [
  'iptal', 'iade', 'şikayet', 'avukat', 'dava', 'mahkeme',
  'hukuki', 'tazminat', 'dolandırıcı', 'şikayet', 'savcılık',
  'emin değilim', 'bilmiyorum', 'kesin söyleyemem',
];

export function checkEscalationNeeded(text: string): { needed: boolean; reason?: string } {
  const lowerText = text.toLowerCase();
  for (const keyword of ESCALATION_KEYWORDS_TR) {
    if (lowerText.includes(keyword)) {
      return { needed: true, reason: `Anahtar kelime: "${keyword}"` };
    }
  }
  return { needed: false };
}
