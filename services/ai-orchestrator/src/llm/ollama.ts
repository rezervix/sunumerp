import axios from 'axios';
import type { LLMAdapter, ChatMessage, ToolDefinition, LLMResponse } from './adapter';
import { checkEscalationNeeded } from './adapter';

export class OllamaAdapter implements LLMAdapter {
  readonly providerName = 'ollama';
  readonly modelName: string;
  private baseUrl: string;

  constructor() {
    this.modelName = process.env.OLLAMA_MODEL || 'llama3.1:8b';
    this.baseUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
  }

  async chat(
    messages: ChatMessage[],
    tools: ToolDefinition[] = [],
    options: { maxTokens?: number; temperature?: number } = {},
  ): Promise<LLMResponse> {
    const response = await axios.post(
      `${this.baseUrl}/api/chat`,
      {
        model: this.modelName,
        messages,
        stream: false,
        options: {
          temperature: options.temperature ?? 0.3,
          num_predict: options.maxTokens ?? 1024,
        },
        // Ollama tool calling (>=0.3.x modelleri destekler)
        tools: tools.length > 0
          ? tools.map((t) => ({
              type: 'function',
              function: {
                name: t.name,
                description: t.description,
                parameters: t.parameters,
              },
            }))
          : undefined,
      },
      { timeout: 60_000 },
    );

    const message = response.data.message;
    const textContent: string = message.content ?? '';
    const toolCalls = (message.tool_calls ?? []).map((tc: any, idx: number) => ({
      id: `ollama-${idx}`,
      name: tc.function.name,
      arguments: tc.function.arguments ?? {},
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
