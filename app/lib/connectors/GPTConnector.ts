import OpenAI from 'openai';
import { ModelConnector, QueryResponse, PRICING } from './BaseConnector';

export class GPTConnector implements ModelConnector {
  private openai: OpenAI | null = null;
  private _connected: boolean = false;
  private readonly model: string = 'gpt-4o';

  async authenticate(apiKey: string): Promise<boolean> {
    try {
      this.openai = new OpenAI({ apiKey });
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
    if (!this.openai) throw new Error('GPTConnector not authenticated');

    const start = Date.now();

    const completion = await this.openai.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      max_tokens: 4096,
    });

    const responseTime = Date.now() - start;

    const inputTokens = completion.usage?.prompt_tokens ?? 0;
    const outputTokens = completion.usage?.completion_tokens ?? 0;
    const text = completion.choices[0]?.message?.content ?? '';

    return {
      text,
      tokens: {
        input: inputTokens,
        output: outputTokens,
      },
      metadata: {
        model: this.model,
        responseTime,
      },
    };
  }

  costPerToken(inputTokens: number, outputTokens: number): number {
    return (inputTokens * PRICING.gpt.input + outputTokens * PRICING.gpt.output) / 1000;
  }

  maxTokens(): number {
    return 128000;
  }

  supportsStreaming(): boolean {
    return true;
  }
}
