import OpenAI from 'openai';
import type { LLMAdapter, ChatMessage, ToolDefinition, LLMResponse } from './adapter';
import { checkEscalationNeeded } from './adapter';

export class OpenAIAdapter implements LLMAdapter {
  readonly providerName = 'openai';
  readonly modelName: string;
  private client: OpenAI;

  constructor() {
    this.modelName = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  async chat(
    messages: ChatMessage[],
    tools: ToolDefinition[] = [],
    options: { maxTokens?: number; temperature?: number } = {},
  ): Promise<LLMResponse> {
    const openaiMessages = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const openaiTools = tools.map((t) => ({
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));

    const response = await this.client.chat.completions.create({
      model: this.modelName,
      max_tokens: options.maxTokens ?? 1024,
      temperature: options.temperature ?? 0.3,
      messages: openaiMessages,
      tools: openaiTools.length > 0 ? openaiTools : undefined,
    });

    const choice = response.choices[0];
    const textContent = choice.message.content ?? '';

    const toolCalls = (choice.message.tool_calls ?? []).map((tc) => ({
      id: tc.id,
      name: tc.function.name,
      arguments: JSON.parse(tc.function.arguments || '{}'),
    }));

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
