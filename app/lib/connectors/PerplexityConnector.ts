import { ModelConnector, QueryResponse, PRICING } from './BaseConnector';

export class PerplexityConnector implements ModelConnector {
  private apiKey: string = '';
  private _connected: boolean = false;
  private readonly baseUrl: string = 'https://api.perplexity.ai';
  private readonly model: string = 'sonar-pro';

  async authenticate(apiKey: string): Promise<boolean> {
    this.apiKey = apiKey;
    this._connected = true;
    return true;
  }

  isConnected(): boolean {
    return this._connected;
  }

  async query(prompt: string, systemPrompt: string, _options?: Record<string, any>): Promise<QueryResponse> {
    if (!this._connected) throw new Error('PerplexityConnector not authenticated');

    const start = Date.now();

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        max_tokens: 4096,
      }),
    });

    if (!res.ok) {
      throw new Error(`Perplexity request failed: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    const responseTime = Date.now() - start;

    const text: string = data.choices?.[0]?.message?.content ?? '';
    const inputTokens: number = data.usage?.prompt_tokens ?? 0;
    const outputTokens: number = data.usage?.completion_tokens ?? 0;
    const citations: string[] = data.citations || [];

    return {
      text,
      tokens: {
        input: inputTokens,
        output: outputTokens,
      },
      citations,
      metadata: {
        model: this.model,
        responseTime,
      },
    };
  }

  costPerToken(inputTokens: number, outputTokens: number): number {
    return (inputTokens * PRICING.perplexity.input + outputTokens * PRICING.perplexity.output) / 1000;
  }

  maxTokens(): number {
    return 127072;
  }

  supportsStreaming(): boolean {
    return false;
  }
}
