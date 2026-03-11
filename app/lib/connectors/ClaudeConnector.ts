import Anthropic from '@anthropic-ai/sdk';
import { ModelConnector, QueryResponse, PRICING } from './BaseConnector';

export class ClaudeConnector implements ModelConnector {
  private anthropic: Anthropic | null = null;
  private _connected: boolean = false;
  private readonly model: string = 'claude-sonnet-4-6';

  async authenticate(apiKey: string): Promise<boolean> {
    try {
      this.anthropic = new Anthropic({ apiKey });
      this._connected = true;
      return true;
    } catch {
      this._connected = false;
      return false;
    }
  }

  isConnected(): boolean {
    return this._connected;
  }

  async query(prompt: string, systemPrompt: string, _options?: Record<string, any>): Promise<QueryResponse> {
    if (!this.anthropic) throw new Error('ClaudeConnector not authenticated');

    const start = Date.now();

    const response = await this.anthropic.messages.create({
      model: this.model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    });

    const responseTime = Date.now() - start;

    const inputTokens = response.usage.input_tokens;
    const outputTokens = response.usage.output_tokens;

    const textBlock = response.content.find((block) => block.type === 'text');
    const text = textBlock && textBlock.type === 'text' ? textBlock.text : '';

    return {
      text,
      tokens: {
        input: inputTokens,
        output: outputTokens,
      },
      metadata: {
        model: this.model,
        inputTokens,
        outputTokens,
        responseTime,
      },
    };
  }

  costPerToken(inputTokens: number, outputTokens: number): number {
    return (inputTokens * PRICING.claude.input + outputTokens * PRICING.claude.output) / 1000;
  }

  maxTokens(): number {
    return 200000;
  }

  supportsStreaming(): boolean {
    return true;
  }
}
