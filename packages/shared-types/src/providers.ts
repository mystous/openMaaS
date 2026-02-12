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
  supportsCORS: boolean;
  keyPlaceholder: string;
  keyPattern?: string; // RegExp를 직렬화 가능한 string으로 저장
  docsUrl: string;
  models: ModelConfig[];
}

export type ModelCategory = "chat" | "image" | "audio" | "tts" | "stt" | "video" | "music";

export interface ModelConfig {
  id: string;
  name: string;
  category: ModelCategory;
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
  | "streaming"
  | "image_generation"
  | "video_generation"
  | "music_generation";

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

/**
 * 전체 제공자 설정
 */
export const PROVIDERS: Record<ProviderId, ProviderConfig> = {
  openai: {
    id: "openai",
    name: "OpenAI",
    description: "GPT-4o, DALL·E 3, GPT Image, Sora 2",
    supportsCORS: true,
    keyPlaceholder: "sk-...",
    keyPattern: "^sk-[a-zA-Z0-9_-]{32,}$",
    docsUrl: "https://platform.openai.com/api-keys",
    models: [
      {
        id: "gpt-4o",
        name: "GPT-4o",
        category: "chat",
        contextWindow: 128000,
        inputPrice: 2.5,
        outputPrice: 10,
        capabilities: ["chat", "vision", "function_calling", "json_mode", "streaming"],
      },
      {
        id: "gpt-4o-mini",
        name: "GPT-4o Mini",
        category: "chat",
        contextWindow: 128000,
        inputPrice: 0.15,
        outputPrice: 0.6,
        capabilities: ["chat", "vision", "function_calling", "json_mode", "streaming"],
      },
      {
        id: "gpt-4-turbo",
        name: "GPT-4 Turbo",
        category: "chat",
        contextWindow: 128000,
        inputPrice: 10,
        outputPrice: 30,
        capabilities: ["chat", "vision", "function_calling", "json_mode", "streaming"],
      },
      {
        id: "gpt-3.5-turbo",
        name: "GPT-3.5 Turbo",
        category: "chat",
        contextWindow: 16385,
        inputPrice: 0.5,
        outputPrice: 1.5,
        capabilities: ["chat", "function_calling", "json_mode", "streaming"],
      },
      // ── 이미지 생성 ──
      {
        id: "gpt-image-1.5",
        name: "GPT Image 1.5",
        category: "image",
        contextWindow: 32000,
        inputPrice: 0,
        outputPrice: 0,
        capabilities: ["image_generation"],
      },
      {
        id: "gpt-image-1",
        name: "GPT Image 1",
        category: "image",
        contextWindow: 32000,
        inputPrice: 0,
        outputPrice: 0, // quality·size별 차등 과금
        capabilities: ["image_generation"],
      },
      {
        id: "gpt-image-1-mini",
        name: "GPT Image 1 Mini",
        category: "image",
        contextWindow: 32000,
        inputPrice: 0,
        outputPrice: 0,
        capabilities: ["image_generation"],
      },
      {
        id: "dall-e-3",
        name: "DALL·E 3",
        category: "image",
        contextWindow: 4000,
        inputPrice: 0,
        outputPrice: 0, // $0.04~$0.12/장
        capabilities: ["image_generation"],
      },
      {
        id: "dall-e-2",
        name: "DALL·E 2",
        category: "image",
        contextWindow: 1000,
        inputPrice: 0,
        outputPrice: 0, // $0.02~$0.04/장
        capabilities: ["image_generation"],
      },
      // ── 동영상 생성 (Sora) ──
      {
        id: "sora-2-pro",
        name: "Sora 2 Pro",
        category: "video",
        contextWindow: 32000,
        inputPrice: 0,
        outputPrice: 0, // duration별 차등 과금
        capabilities: ["video_generation"],
      },
      {
        id: "sora-2",
        name: "Sora 2",
        category: "video",
        contextWindow: 32000,
        inputPrice: 0,
        outputPrice: 0,
        capabilities: ["video_generation"],
      },
      // ── TTS (Text-to-Speech) ──
      {
        id: "gpt-4o-mini-tts",
        name: "GPT-4o Mini TTS",
        category: "tts",
        contextWindow: 4096,
        inputPrice: 0,
        outputPrice: 0, // $15.00/1M chars
        capabilities: ["chat"],
      },
      {
        id: "tts-1-hd",
        name: "TTS-1 HD",
        category: "tts",
        contextWindow: 4096,
        inputPrice: 0,
        outputPrice: 0, // $30.00/1M chars
        capabilities: ["chat"],
      },
      {
        id: "tts-1",
        name: "TTS-1",
        category: "tts",
        contextWindow: 4096,
        inputPrice: 0,
        outputPrice: 0, // $15.00/1M chars
        capabilities: ["chat"],
      },
      // ── STT (Speech-to-Text) ──
      {
        id: "gpt-4o-transcribe",
        name: "GPT-4o Transcribe",
        category: "stt",
        contextWindow: 0,
        inputPrice: 0,
        outputPrice: 0, // $2.50/hr
        capabilities: ["chat"],
      },
      {
        id: "gpt-4o-mini-transcribe",
        name: "GPT-4o Mini Transcribe",
        category: "stt",
        contextWindow: 0,
        inputPrice: 0,
        outputPrice: 0, // $1.25/hr
        capabilities: ["chat"],
      },
      {
        id: "whisper-1",
        name: "Whisper",
        category: "stt",
        contextWindow: 0,
        inputPrice: 0,
        outputPrice: 0, // $0.006/분
        capabilities: ["chat"],
      },
    ],
  },
  anthropic: {
    id: "anthropic",
    name: "Anthropic",
    description: "Claude 3.5 Sonnet, Claude 3 Opus",
    supportsCORS: false,
    keyPlaceholder: "sk-ant-...",
    keyPattern: "^sk-ant-[a-zA-Z0-9_-]{32,}$",
    docsUrl: "https://console.anthropic.com/settings/keys",
    models: [
      {
        id: "claude-3-5-sonnet-20241022",
        name: "Claude 3.5 Sonnet",
        category: "chat",
        contextWindow: 200000,
        inputPrice: 3,
        outputPrice: 15,
        capabilities: ["chat", "vision", "function_calling", "streaming"],
      },
      {
        id: "claude-3-5-haiku-20241022",
        name: "Claude 3.5 Haiku",
        category: "chat",
        contextWindow: 200000,
        inputPrice: 0.8,
        outputPrice: 4,
        capabilities: ["chat", "function_calling", "streaming"],
      },
      {
        id: "claude-3-opus-20240229",
        name: "Claude 3 Opus",
        category: "chat",
        contextWindow: 200000,
        inputPrice: 15,
        outputPrice: 75,
        capabilities: ["chat", "vision", "function_calling", "streaming"],
      },
    ],
  },
  gemini: {
    id: "gemini",
    name: "Google Gemini",
    description: "Gemini 3/2.5 전체 모델 — 텍스트, 이미지, TTS, STT, 동영상(Veo)",
    supportsCORS: true,
    keyPlaceholder: "AIza...",
    keyPattern: "^AIza[a-zA-Z0-9_-]{35}$",
    docsUrl: "https://aistudio.google.com/app/apikey",
    models: [
      // ── Gemini 3 시리즈 ──
      {
        id: "gemini-3-pro-preview",
        name: "Gemini 3 Pro",
        category: "chat",
        contextWindow: 1048576,
        inputPrice: 2.0,
        outputPrice: 12.0,
        capabilities: ["chat", "vision", "function_calling", "json_mode", "streaming"],
      },
      {
        id: "gemini-3-flash-preview",
        name: "Gemini 3 Flash",
        category: "chat",
        contextWindow: 1048576,
        inputPrice: 0.5,
        outputPrice: 3.0,
        capabilities: ["chat", "vision", "function_calling", "json_mode", "streaming"],
      },
      {
        id: "gemini-3-pro-image-preview",
        name: "Gemini 3 Pro Image",
        category: "image",
        contextWindow: 65536,
        inputPrice: 2.0,
        outputPrice: 120.0,
        capabilities: ["chat", "vision", "image_generation"],
      },
      // ── Gemini 2.5 시리즈 ──
      {
        id: "gemini-2.5-pro",
        name: "Gemini 2.5 Pro",
        category: "chat",
        contextWindow: 1048576,
        inputPrice: 1.25,
        outputPrice: 10.0,
        capabilities: ["chat", "vision", "function_calling", "json_mode", "streaming"],
      },
      {
        id: "gemini-2.5-flash",
        name: "Gemini 2.5 Flash",
        category: "chat",
        contextWindow: 1048576,
        inputPrice: 0.3,
        outputPrice: 2.5,
        capabilities: ["chat", "vision", "function_calling", "json_mode", "streaming"],
      },
      {
        id: "gemini-2.5-flash-lite",
        name: "Gemini 2.5 Flash Lite",
        category: "chat",
        contextWindow: 1048576,
        inputPrice: 0.1,
        outputPrice: 0.4,
        capabilities: ["chat", "vision", "function_calling", "json_mode", "streaming"],
      },
      {
        id: "gemini-2.5-flash-image",
        name: "Gemini 2.5 Flash Image",
        category: "image",
        contextWindow: 65536,
        inputPrice: 0.3,
        outputPrice: 30.0,
        capabilities: ["chat", "vision", "image_generation"],
      },
      // ── TTS (generateContent 지원) ──
      {
        id: "gemini-2.5-flash-preview-tts",
        name: "Gemini 2.5 Flash TTS",
        category: "tts",
        contextWindow: 8192,
        inputPrice: 0.5,
        outputPrice: 10.0,
        capabilities: ["chat"],
      },
      {
        id: "gemini-2.5-pro-preview-tts",
        name: "Gemini 2.5 Pro TTS",
        category: "tts",
        contextWindow: 8192,
        inputPrice: 1.0,
        outputPrice: 20.0,
        capabilities: ["chat"],
      },
      // gemini-2.5-flash-native-audio-preview-12-2025 → Live API (WebSocket) 전용, generateContent 미지원
      // ── Gemini 2.0 시리즈 (2026.03.31 퇴역 예정) ──
      {
        id: "gemini-2.0-flash",
        name: "Gemini 2.0 Flash ⚠️",
        category: "chat",
        contextWindow: 1048576,
        inputPrice: 0.1,
        outputPrice: 0.4,
        capabilities: ["chat", "vision", "function_calling", "json_mode", "streaming"],
      },
      {
        id: "gemini-2.0-flash-lite",
        name: "Gemini 2.0 Flash Lite ⚠️",
        category: "chat",
        contextWindow: 1048576,
        inputPrice: 0.075,
        outputPrice: 0.3,
        capabilities: ["chat", "vision", "function_calling", "json_mode", "streaming"],
      },
      // ── Veo 시리즈 (동영상 생성, generateVideos API) ──
      {
        id: "veo-3.1-generate-preview",
        name: "Veo 3.1",
        category: "video",
        contextWindow: 1024,
        inputPrice: 0,
        outputPrice: 0, // $0.40/초 (720p/1080p), $0.60/초 (4K)
        capabilities: ["video_generation"],
      },
      {
        id: "veo-3.1-fast-generate-preview",
        name: "Veo 3.1 Fast",
        category: "video",
        contextWindow: 1024,
        inputPrice: 0,
        outputPrice: 0, // $0.15/초 (720p/1080p), $0.35/초 (4K)
        capabilities: ["video_generation"],
      },
      {
        id: "veo-2.0-generate-001",
        name: "Veo 2",
        category: "video",
        contextWindow: 1024,
        inputPrice: 0,
        outputPrice: 0, // $0.35/초
        capabilities: ["video_generation"],
      },
      // ── Imagen 4 시리즈 (이미지 생성, generateImages API) ──
      {
        id: "imagen-4.0-generate-001",
        name: "Imagen 4",
        category: "image",
        contextWindow: 480,
        inputPrice: 0,
        outputPrice: 0, // $0.04/장
        capabilities: ["image_generation"],
      },
      {
        id: "imagen-4.0-ultra-generate-001",
        name: "Imagen 4 Ultra",
        category: "image",
        contextWindow: 480,
        inputPrice: 0,
        outputPrice: 0, // $0.06/장
        capabilities: ["image_generation"],
      },
      {
        id: "imagen-4.0-fast-generate-001",
        name: "Imagen 4 Fast",
        category: "image",
        contextWindow: 480,
        inputPrice: 0,
        outputPrice: 0, // $0.02/장
        capabilities: ["image_generation"],
      },
      // ── STT (Speech-to-Text, generateContent + inline audio) ──
      {
        id: "gemini-2.5-flash-stt",
        name: "Gemini 2.5 Flash STT",
        category: "stt",
        contextWindow: 1048576,
        inputPrice: 0.3,
        outputPrice: 2.5,
        capabilities: ["chat"],
      },
      {
        id: "gemini-2.5-pro-stt",
        name: "Gemini 2.5 Pro STT",
        category: "stt",
        contextWindow: 1048576,
        inputPrice: 1.25,
        outputPrice: 10.0,
        capabilities: ["chat"],
      },
      // ── Lyria (음악 생성, Live Music WebSocket API) ──
      {
        id: "lyria-realtime-exp",
        name: "Lyria RealTime",
        category: "music",
        contextWindow: 0,
        inputPrice: 0,
        outputPrice: 0,
        capabilities: ["music_generation"],
      },
    ],
  },
  bedrock: {
    id: "bedrock",
    name: "AWS Bedrock",
    description: "Claude, Llama, Titan via AWS",
    supportsCORS: false,
    keyPlaceholder: "AWS Access Key ID",
    docsUrl: "https://docs.aws.amazon.com/bedrock/latest/userguide/",
    models: [
      {
        id: "anthropic.claude-3-5-sonnet-20241022-v2:0",
        name: "Claude 3.5 Sonnet (Bedrock)",
        category: "chat",
        contextWindow: 200000,
        inputPrice: 3,
        outputPrice: 15,
        capabilities: ["chat", "vision", "streaming"],
      },
    ],
  },
  azure: {
    id: "azure",
    name: "Azure OpenAI",
    description: "GPT-4, GPT-3.5 via Azure",
    supportsCORS: false,
    keyPlaceholder: "Azure API Key",
    docsUrl: "https://learn.microsoft.com/azure/ai-services/openai/",
    models: [
      {
        id: "gpt-4o",
        name: "GPT-4o (Azure)",
        category: "chat",
        contextWindow: 128000,
        inputPrice: 2.5,
        outputPrice: 10,
        capabilities: ["chat", "vision", "function_calling", "json_mode", "streaming"],
      },
    ],
  },
  vertex: {
    id: "vertex",
    name: "Google Vertex AI",
    description: "Gemini via Google Cloud",
    supportsCORS: false,
    keyPlaceholder: "OAuth2 / Service Account",
    docsUrl: "https://cloud.google.com/vertex-ai/docs",
    models: [
      {
        id: "gemini-1.5-pro",
        name: "Gemini 1.5 Pro (Vertex)",
        category: "chat",
        contextWindow: 2097152,
        inputPrice: 1.25,
        outputPrice: 5,
        capabilities: ["chat", "vision", "function_calling", "streaming"],
      },
    ],
  },
  mistral: {
    id: "mistral",
    name: "Mistral",
    description: "Mistral Large, Mixtral",
    supportsCORS: false,
    keyPlaceholder: "Mistral API Key",
    docsUrl: "https://docs.mistral.ai/",
    models: [
      {
        id: "mistral-large-latest",
        name: "Mistral Large",
        category: "chat",
        contextWindow: 128000,
        inputPrice: 2,
        outputPrice: 6,
        capabilities: ["chat", "function_calling", "json_mode", "streaming"],
      },
      {
        id: "mistral-small-latest",
        name: "Mistral Small",
        category: "chat",
        contextWindow: 128000,
        inputPrice: 0.1,
        outputPrice: 0.3,
        capabilities: ["chat", "function_calling", "json_mode", "streaming"],
      },
    ],
  },
  cohere: {
    id: "cohere",
    name: "Cohere",
    description: "Command R+",
    supportsCORS: false,
    keyPlaceholder: "Cohere API Key",
    docsUrl: "https://dashboard.cohere.com/api-keys",
    models: [
      {
        id: "command-r-plus",
        name: "Command R+",
        category: "chat",
        contextWindow: 128000,
        inputPrice: 2.5,
        outputPrice: 10,
        capabilities: ["chat", "function_calling", "streaming"],
      },
    ],
  },
  ollama: {
    id: "ollama",
    name: "Ollama (로컬)",
    description: "Llama 3, Mistral, Qwen 등 로컬 모델",
    supportsCORS: true,
    keyPlaceholder: "(API 키 불필요)",
    docsUrl: "https://ollama.ai/",
    models: [], // 동적으로 가져옴
  },
};
