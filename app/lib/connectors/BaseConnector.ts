export interface QueryResponse {
  text: string;
  tokens: { input: number; output: number };
  metadata: Record<string, any>;
  citations?: string[];
}

export interface ModelConnector {
  authenticate(apiKey: string): Promise<boolean>;
  isConnected(): boolean;
  query(prompt: string, systemPrompt: string, options?: Record<string, any>): Promise<QueryResponse>;
  costPerToken(inputTokens: number, outputTokens: number): number;
  maxTokens(): number;
  supportsStreaming(): boolean;
}

export const PRICING: Record<string, { input: number; output: number }> = {
  ollama:     { input: 0,     output: 0 },
  claude:     { input: 0.003, output: 0.015 },
  gpt:        { input: 0.005, output: 0.015 },
  perplexity: { input: 0.002, output: 0.006 },
};
