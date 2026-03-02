import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface NovaResponse {
  response: string;
  modelUsed: "haiku" | "sonnet";
  tokensUsed: number;
  reasoningDepth: number;
  decisionVelocity: "fast" | "medium" | "deep";
}

function estimateComplexity(message: string): number {
  let score = 0;

  if (message.length > 500) score += 2;
  if (message.length > 1000) score += 2;

  const complexKeywords = [
    "algorithm",
    "design",
    "architecture",
    "debug",
    "optimize",
    "refactor",
    "edge case",
    "trade-off",
    "implement",
    "system",
  ];
  const lowerMessage = message.toLowerCase();
  complexKeywords.forEach((keyword) => {
    if (lowerMessage.includes(keyword)) score += 1;
  });

  if (lowerMessage.includes("```") || lowerMessage.includes("function")) {
    score += 2;
  }

  return Math.min(score, 10);
}

async function routeToModel(
  message: string,
  previousContext?: string
): Promise<NovaResponse> {
  const complexity = estimateComplexity(message);
  const fullPrompt = previousContext
    ? `${previousContext}\n\nUser: ${message}`
    : message;

  if (complexity < 5) {
    return await callHaiku(fullPrompt, complexity);
  } else {
    return await callSonnet(fullPrompt, complexity);
  }
}

async function callHaiku(
  message: string,
  complexity: number
): Promise<NovaResponse> {
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    messages: [{ role: "user", content: message }],
  });

  const textContent = response.content[0];
  const responseText =
    textContent.type === "text" ? textContent.text : "No response";

  return {
    response: responseText,
    modelUsed: "haiku",
    tokensUsed: response.usage.output_tokens,
    reasoningDepth: Math.min(complexity + 1, 10),
    decisionVelocity: "fast",
  };
}

async function callSonnet(
  message: string,
  complexity: number
): Promise<NovaResponse> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 2048,
    messages: [{ role: "user", content: message }],
  });

  const textContent = response.content[0];
  const responseText =
    textContent.type === "text" ? textContent.text : "No response";

  return {
    response: responseText,
    modelUsed: "sonnet",
    tokensUsed: response.usage.output_tokens,
    reasoningDepth: Math.min(complexity + 2, 10),
    decisionVelocity: "medium",
  };
}

export { routeToModel };
export type { NovaResponse };