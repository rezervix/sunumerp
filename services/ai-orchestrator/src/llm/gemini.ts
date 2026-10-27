import axios from 'axios';
import type { LLMAdapter, ChatMessage, ToolDefinition, LLMResponse } from './adapter';
import { checkEscalationNeeded } from './adapter';

/**
 * Google Gemini Adapter
 * Mevcut ERP'de GEMINI_API_KEY zaten var — bu adapter o key'i kullanır.
 * Tool calling: Gemini Function Calling API.
 */
export class GeminiAdapter implements LLMAdapter {
  readonly providerName = 'gemini';
  readonly modelName: string;
  private apiKey: string;

  constructor() {
    this.modelName = process.env.GEMINI_CHAT_MODEL || 'gemini-1.5-flash';
    this.apiKey = process.env.GEMINI_API_KEY || '';
  }

  async chat(
    messages: ChatMessage[],
    tools: ToolDefinition[] = [],
    options: { maxTokens?: number; temperature?: number } = {},
  ): Promise<LLMResponse> {
    const systemInstruction = messages.find((m) => m.role === 'system')?.content;
    const chatMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      }));

    const body: Record<string, unknown> = {
      contents: chatMessages,
      generationConfig: {
        maxOutputTokens: options.maxTokens ?? 1024,
        temperature: options.temperature ?? 0.3,
      },
    };

    if (systemInstruction) {
      body.systemInstruction = { parts: [{ text: systemInstruction }] };
    }

    if (tools.length > 0) {
      body.tools = [
        {
          functionDeclarations: tools.map((t) => ({
            name: t.name,
            description: t.description,
            parameters: t.parameters,
          })),
        },
      ];
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.modelName}:generateContent?key=${this.apiKey}`;
    const response = await axios.post(url, body, { timeout: 30_000 });

    const candidate = response.data.candidates?.[0];
    const parts = candidate?.content?.parts ?? [];

    let textContent = '';
    const toolCalls = [];

    for (const part of parts) {
      if (part.text) {
        textContent += part.text;
      } else if (part.functionCall) {
        toolCalls.push({
          id: `gemini-${part.functionCall.name}`,
          name: part.functionCall.name,
          arguments: part.functionCall.args ?? {},
        });
      }
    }

    const escalation = checkEscalationNeeded(textContent);

    return {
      content: textContent,
      toolCalls,
      provider: this.providerName,
      model: this.modelName,
      needsEscalation: escalation.needed,
      escalationReason: escalation.reason,
    };
  }
}
