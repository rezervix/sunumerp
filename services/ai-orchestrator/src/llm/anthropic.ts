import Anthropic from '@anthropic-ai/sdk';
import type { LLMAdapter, ChatMessage, ToolDefinition, LLMResponse } from './adapter';
import { checkEscalationNeeded } from './adapter';

export class AnthropicAdapter implements LLMAdapter {
  readonly providerName = 'anthropic';
  readonly modelName: string;
  private client: Anthropic;

  constructor() {
    this.modelName = process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-20241022';
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  async chat(
    messages: ChatMessage[],
    tools: ToolDefinition[] = [],
    options: { maxTokens?: number; temperature?: number } = {},
  ): Promise<LLMResponse> {
    const systemMessage = messages.find((m) => m.role === 'system');
    const userMessages = messages.filter((m) => m.role !== 'system');

    const anthropicMessages = userMessages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    const anthropicTools = tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: {
        type: 'object' as const,
        ...t.parameters,
      },
    }));

    const response = await this.client.messages.create({
      model: this.modelName,
      max_tokens: options.maxTokens ?? 1024,
      temperature: options.temperature ?? 0.3,
      system: systemMessage?.content,
      messages: anthropicMessages,
      tools: anthropicTools.length > 0 ? anthropicTools : undefined,
    });

    const toolCalls = response.content
      .filter((block) => block.type === 'tool_use')
      .map((block: any) => ({
        id: block.id,
        name: block.name,
        arguments: block.input,
      }));

    const textContent = response.content
      .filter((block) => block.type === 'text')
      .map((block: any) => block.text)
      .join('');

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
