import { ModelConnector, QueryResponse } from './BaseConnector';

export class OllamaConnector implements ModelConnector {
  private baseUrl: string;
  private model: string;
  private _connected: boolean = false;

  constructor(model: string = 'llama2') {
    this.baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.model = model;
    // Auto-connect on startup (best effort)
    this.authenticate('');
  }

  async authenticate(_apiKey: string): Promise<boolean> {
    this._connected = true;
    return true;
  }

  isConnected(): boolean {
    return this._connected;
  }

  async query(prompt: string, systemPrompt: string, _options?: Record<string, any>): Promise<QueryResponse> {
    const start = Date.now();

    const res = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        prompt,
        system: systemPrompt,
        stream: false,
      }),
    });

    if (!res.ok) {
      throw new Error(`Ollama request failed: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    const responseTime = Date.now() - start;

    const evalCount: number = data.eval_count ?? 0;
    const promptEvalCount: number = data.prompt_eval_count ?? 0;

    return {
      text: data.response,
      tokens: {
        input: promptEvalCount,
        output: evalCount,
      },
      metadata: {
        model: this.model,
        responseTime,
      },
    };
  }

  costPerToken(_inputTokens: number, _outputTokens: number): number {
    return 0;
  }

  maxTokens(): number {
    return 4096;
  }

  supportsStreaming(): boolean {
    return true;
  }
}
