/**
 * openMaaS 모델 가격 데이터
 * 가격 단위: USD per 1M tokens
 */

export interface ModelPricing {
  modelId: string;
  inputPrice: number;
  outputPrice: number;
  lastUpdated: string;
}

export const OPENAI_PRICING: ModelPricing[] = [
  { modelId: "gpt-4o", inputPrice: 2.5, outputPrice: 10, lastUpdated: "2025-01" },
  { modelId: "gpt-4o-mini", inputPrice: 0.15, outputPrice: 0.6, lastUpdated: "2025-01" },
  { modelId: "gpt-4-turbo", inputPrice: 10, outputPrice: 30, lastUpdated: "2025-01" },
  { modelId: "gpt-3.5-turbo", inputPrice: 0.5, outputPrice: 1.5, lastUpdated: "2025-01" },
];

export const ANTHROPIC_PRICING: ModelPricing[] = [
  { modelId: "claude-3-5-sonnet-20241022", inputPrice: 3, outputPrice: 15, lastUpdated: "2025-01" },
  { modelId: "claude-3-5-haiku-20241022", inputPrice: 0.8, outputPrice: 4, lastUpdated: "2025-01" },
  { modelId: "claude-3-opus-20240229", inputPrice: 15, outputPrice: 75, lastUpdated: "2025-01" },
];

export const GEMINI_PRICING: ModelPricing[] = [
  { modelId: "gemini-1.5-pro", inputPrice: 1.25, outputPrice: 5, lastUpdated: "2025-01" },
  { modelId: "gemini-1.5-flash", inputPrice: 0.075, outputPrice: 0.3, lastUpdated: "2025-01" },
  { modelId: "gemini-2.0-flash-exp", inputPrice: 0, outputPrice: 0, lastUpdated: "2025-01" },
];

export function getModelPricing(providerId: string, modelId: string): ModelPricing | undefined {
  const allPricing: Record<string, ModelPricing[]> = {
    openai: OPENAI_PRICING,
    anthropic: ANTHROPIC_PRICING,
    gemini: GEMINI_PRICING,
  };

  return allPricing[providerId]?.find((p) => p.modelId === modelId);
}

export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  pricing: ModelPricing
): number {
  const inputCost = (inputTokens / 1_000_000) * pricing.inputPrice;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPrice;
  return inputCost + outputCost;
}
