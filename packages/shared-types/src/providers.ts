/**
 * LLM 제공자 타입 정의
 */

export type ProviderId =
  | "openai"
  | "anthropic"
  | "gemini"
  | "bedrock"
  | "azure"
  | "vertex"
  | "mistral"
  | "cohere"
  | "ollama";

export interface ProviderConfig {
  id: ProviderId;
  name: string;
  description: string;
  supportsCORS: boolean; // true면 직접 호출, false면 프록시
  keyPlaceholder: string; // "sk-..." 등
  keyPattern?: RegExp; // 키 형식 검증
  docsUrl: string; // API 키 발급 문서 링크
  models: ModelConfig[];
}

export interface ModelConfig {
  id: string;
  name: string;
  contextWindow: number;
  inputPrice: number; // USD per 1M tokens
  outputPrice: number; // USD per 1M tokens
  capabilities: ModelCapability[];
}

export type ModelCapability =
  | "chat"
  | "completion"
  | "vision"
  | "function_calling"
  | "json_mode"
  | "streaming";

/**
 * 직접 호출 가능 제공자 (CORS 지원)
 */
export const DIRECT_CALL_PROVIDERS: ProviderId[] = [
  "openai",
  "gemini",
  "ollama",
];

/**
 * 프록시 경유 제공자 (CORS 미지원)
 */
export const PROXY_REQUIRED_PROVIDERS: ProviderId[] = [
  "anthropic",
  "bedrock",
  "azure",
  "vertex",
  "mistral",
  "cohere",
];
