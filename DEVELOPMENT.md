# openMaaS 개발 가이드

이 문서는 openMaaS 프로젝트의 단계별 개발 계획과 상세 설계를 담고 있습니다.

---

## 목차

1. [1단계: 프로젝트 기반 구축](#1단계-프로젝트-기반-구축)
2. [2단계: API 키 관리 시스템](#2단계-api-키-관리-시스템)
3. [3단계: 직접 호출 어댑터](#3단계-직접-호출-어댑터)
4. [4단계: 기본 채팅 UI](#4단계-기본-채팅-ui)
5. [5단계: Pass-through 프록시](#5단계-pass-through-프록시)
6. [6단계: 비용 추적 + 비교 모드](#6단계-비용-추적--비교-모드)

---

## 1단계: 프로젝트 기반 구축

### 목표
- 모노레포 구조 설정
- 개발 환경 구성
- 기본 실행 환경 확인

### 예상 소요: 1-2일

### 1-1. 디렉토리 구조 생성

```
openMaaS/
├── apps/
│   ├── web/                      # Next.js 프론트엔드
│   └── proxy/                    # FastAPI Pass-through 프록시
├── packages/
│   ├── shared-types/             # 공유 타입 정의
│   └── pricing/                  # 모델 가격 데이터
├── docs/                         # 기획 문서 (PDF)
├── PROJECT.md
├── DEVELOPMENT.md                # 이 문서
├── docker-compose.yml
├── package.json                  # 루트 워크스페이스
└── pnpm-workspace.yaml
```

### 1-2. Next.js 15 초기화

```bash
# apps/web 디렉토리에서
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

**설정 옵션**:
- TypeScript: Yes
- ESLint: Yes
- Tailwind CSS: Yes
- `src/` directory: Yes
- App Router: Yes
- Import alias: `@/*`

### 1-3. shadcn/ui 설정

```bash
npx shadcn@latest init
```

**초기 컴포넌트 설치**:
```bash
npx shadcn@latest add button input textarea select dropdown-menu dialog card tabs scroll-area
```

### 1-4. 필수 의존성 (프론트엔드)

```json
{
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "zustand": "^5.0.0",
    "openai": "^4.70.0",
    "@google/generative-ai": "^0.21.0",
    "react-markdown": "^9.0.0",
    "remark-gfm": "^4.0.0",
    "rehype-highlight": "^7.0.0",
    "tiktoken": "^1.0.0",
    "lucide-react": "^0.460.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "typescript": "^5.6.0",
    "tailwindcss": "^3.4.0",
    "eslint": "^9.0.0",
    "prettier": "^3.4.0"
  }
}
```

### 1-5. FastAPI 프로젝트 초기화

```bash
# apps/proxy 디렉토리에서
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
```

**requirements.txt**:
```
fastapi>=0.115.0
uvicorn[standard]>=0.32.0
httpx>=0.28.0
pydantic>=2.10.0
python-dotenv>=1.0.0
```

**기본 구조**:
```
apps/proxy/
├── main.py
├── routers/
│   └── completions.py
├── adapters/
│   └── base.py
├── middleware/
│   └── security.py
├── requirements.txt
└── Dockerfile
```

### 1-6. Docker Compose 기본 설정

```yaml
# docker-compose.yml
version: '3.9'

services:
  web:
    build:
      context: ./apps/web
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_PROXY_URL=http://proxy:8000
    depends_on:
      - proxy

  proxy:
    build:
      context: ./apps/proxy
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - LOG_LEVEL=info
      # API 키 관련 환경변수 없음 (Zero-Knowledge)
```

### 1-7. 검증 체크리스트

- [ ] `pnpm install` 성공
- [ ] `pnpm dev` (web) 실행 → localhost:3000 접속 가능
- [ ] `uvicorn main:app --reload` (proxy) 실행 → localhost:8000/docs 접속 가능
- [ ] `docker-compose up` 성공

---

## 2단계: API 키 관리 시스템

### 목표
- 클라이언트 측 API 키 저장/관리 구현
- 제공자별 키 입력 UI

### 예상 소요: 2-3일

### 2-1. 제공자 타입 정의

```typescript
// packages/shared-types/src/providers.ts

export type ProviderId =
  | 'openai'
  | 'anthropic'
  | 'gemini'
  | 'bedrock'
  | 'azure'
  | 'vertex'
  | 'mistral'
  | 'cohere'
  | 'ollama';

export interface ProviderConfig {
  id: ProviderId;
  name: string;
  description: string;
  supportsCORS: boolean;           // true면 직접 호출, false면 프록시
  keyPlaceholder: string;          // "sk-..." 등
  keyPattern?: RegExp;             // 키 형식 검증
  docsUrl: string;                 // API 키 발급 문서 링크
  models: ModelConfig[];
}

export interface ModelConfig {
  id: string;                      // "gpt-4o", "claude-3-5-sonnet" 등
  name: string;
  contextWindow: number;
  pricing: {
    input: number;                 // $ per 1M tokens
    output: number;
    cached?: number;               // 캐시된 입력 토큰
  };
  capabilities: {
    vision: boolean;
    tools: boolean;
    streaming: boolean;
  };
}

// 제공자 설정 목록
export const PROVIDERS: Record<ProviderId, ProviderConfig> = {
  openai: {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT-4o, GPT-4 Turbo, GPT-3.5',
    supportsCORS: true,
    keyPlaceholder: 'sk-...',
    keyPattern: /^sk-[a-zA-Z0-9]{32,}$/,
    docsUrl: 'https://platform.openai.com/api-keys',
    models: [
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        contextWindow: 128000,
        pricing: { input: 2.5, output: 10 },
        capabilities: { vision: true, tools: true, streaming: true }
      },
      // ... 더 많은 모델
    ]
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Claude 3.5 Sonnet, Claude 3 Opus',
    supportsCORS: false,  // 프록시 필요
    keyPlaceholder: 'sk-ant-...',
    keyPattern: /^sk-ant-[a-zA-Z0-9-]{32,}$/,
    docsUrl: 'https://console.anthropic.com/settings/keys',
    models: [
      {
        id: 'claude-3-5-sonnet-20241022',
        name: 'Claude 3.5 Sonnet',
        contextWindow: 200000,
        pricing: { input: 3, output: 15 },
        capabilities: { vision: true, tools: true, streaming: true }
      },
      // ...
    ]
  },
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Gemini 1.5 Pro, Gemini 2.0 Flash',
    supportsCORS: true,
    keyPlaceholder: 'AIza...',
    keyPattern: /^AIza[a-zA-Z0-9_-]{35}$/,
    docsUrl: 'https://aistudio.google.com/app/apikey',
    models: [/* ... */]
  },
  ollama: {
    id: 'ollama',
    name: 'Ollama (로컬)',
    description: 'Llama 3, Mistral, Qwen 등 로컬 모델',
    supportsCORS: true,
    keyPlaceholder: '(API 키 불필요)',
    docsUrl: 'https://ollama.ai/',
    models: [/* 동적으로 가져옴 */]
  },
  // ... anthropic, bedrock, azure, vertex, mistral, cohere
};
```

### 2-2. KeyManager 클래스

```typescript
// apps/web/src/lib/llm/key-manager.ts

export type StorageType = 'local' | 'session' | 'memory';

interface StoredKey {
  key: string;
  addedAt: number;
  lastUsedAt?: number;
}

class KeyManager {
  private memoryStore: Map<ProviderId, StoredKey> = new Map();
  private readonly STORAGE_PREFIX = 'openmaas_key_';

  /**
   * API 키 저장
   * @param provider 제공자 ID
   * @param key API 키 (평문)
   * @param storage 저장 위치
   */
  setKey(provider: ProviderId, key: string, storage: StorageType = 'local'): void {
    const stored: StoredKey = {
      key,
      addedAt: Date.now(),
    };

    switch (storage) {
      case 'local':
        localStorage.setItem(
          this.STORAGE_PREFIX + provider,
          JSON.stringify(stored)
        );
        break;
      case 'session':
        sessionStorage.setItem(
          this.STORAGE_PREFIX + provider,
          JSON.stringify(stored)
        );
        break;
      case 'memory':
        this.memoryStore.set(provider, stored);
        break;
    }
  }

  /**
   * API 키 조회
   */
  getKey(provider: ProviderId): string | null {
    // 1. 메모리 먼저 확인
    const memoryKey = this.memoryStore.get(provider);
    if (memoryKey) return memoryKey.key;

    // 2. sessionStorage 확인
    const sessionData = sessionStorage.getItem(this.STORAGE_PREFIX + provider);
    if (sessionData) {
      const parsed: StoredKey = JSON.parse(sessionData);
      return parsed.key;
    }

    // 3. localStorage 확인
    const localData = localStorage.getItem(this.STORAGE_PREFIX + provider);
    if (localData) {
      const parsed: StoredKey = JSON.parse(localData);
      return parsed.key;
    }

    return null;
  }

  /**
   * 키 존재 여부 확인
   */
  hasKey(provider: ProviderId): boolean {
    return this.getKey(provider) !== null;
  }

  /**
   * 키 삭제
   */
  deleteKey(provider: ProviderId): void {
    this.memoryStore.delete(provider);
    sessionStorage.removeItem(this.STORAGE_PREFIX + provider);
    localStorage.removeItem(this.STORAGE_PREFIX + provider);
  }

  /**
   * 설정된 모든 제공자 목록
   */
  getConfiguredProviders(): ProviderId[] {
    return Object.keys(PROVIDERS).filter(
      (id) => this.hasKey(id as ProviderId)
    ) as ProviderId[];
  }

  /**
   * 모든 키 삭제
   */
  clearAll(): void {
    this.memoryStore.clear();
    Object.keys(PROVIDERS).forEach((id) => {
      sessionStorage.removeItem(this.STORAGE_PREFIX + id);
      localStorage.removeItem(this.STORAGE_PREFIX + id);
    });
  }
}

export const keyManager = new KeyManager();
```

### 2-3. Zustand 스토어

```typescript
// apps/web/src/lib/store/key-store.ts

import { create } from 'zustand';
import { keyManager, StorageType } from '../llm/key-manager';
import { ProviderId, PROVIDERS } from '@openmaas/shared-types';

interface KeyState {
  // 상태
  configuredProviders: ProviderId[];

  // 액션
  addKey: (provider: ProviderId, key: string, storage: StorageType) => void;
  removeKey: (provider: ProviderId) => void;
  hasKey: (provider: ProviderId) => boolean;
  getKey: (provider: ProviderId) => string | null;
  refreshConfigured: () => void;
}

export const useKeyStore = create<KeyState>((set, get) => ({
  configuredProviders: [],

  addKey: (provider, key, storage) => {
    keyManager.setKey(provider, key, storage);
    set({ configuredProviders: keyManager.getConfiguredProviders() });
  },

  removeKey: (provider) => {
    keyManager.deleteKey(provider);
    set({ configuredProviders: keyManager.getConfiguredProviders() });
  },

  hasKey: (provider) => keyManager.hasKey(provider),

  getKey: (provider) => keyManager.getKey(provider),

  refreshConfigured: () => {
    set({ configuredProviders: keyManager.getConfiguredProviders() });
  },
}));
```

### 2-4. 설정 페이지 UI

```typescript
// apps/web/src/app/settings/page.tsx

'use client';

import { useState } from 'react';
import { useKeyStore } from '@/lib/store/key-store';
import { PROVIDERS, ProviderId } from '@openmaas/shared-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff, Trash2, ExternalLink, Check } from 'lucide-react';

export default function SettingsPage() {
  const { configuredProviders, addKey, removeKey, hasKey } = useKeyStore();

  return (
    <div className="container max-w-4xl py-8">
      <h1 className="text-3xl font-bold mb-8">API 키 설정</h1>

      <div className="space-y-4">
        {Object.values(PROVIDERS).map((provider) => (
          <ProviderKeyCard
            key={provider.id}
            provider={provider}
            isConfigured={hasKey(provider.id)}
            onSave={(key) => addKey(provider.id, key, 'local')}
            onRemove={() => removeKey(provider.id)}
          />
        ))}
      </div>

      <div className="mt-8 p-4 bg-muted rounded-lg">
        <h3 className="font-semibold mb-2">🔒 보안 안내</h3>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• API 키는 브라우저의 localStorage에만 저장됩니다.</li>
          <li>• 서버로 전송되거나 저장되지 않습니다.</li>
          <li>• 공용 컴퓨터에서는 세션 저장소 사용을 권장합니다.</li>
        </ul>
      </div>
    </div>
  );
}

function ProviderKeyCard({ provider, isConfigured, onSave, onRemove }) {
  const [key, setKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);

  const handleSave = () => {
    if (key.trim()) {
      onSave(key.trim());
      setKey('');
    }
  };

  const testConnection = async () => {
    setTesting(true);
    // TODO: 실제 API 호출 테스트
    await new Promise((r) => setTimeout(r, 1000));
    setTesting(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            {provider.name}
            {provider.supportsCORS ? (
              <Badge variant="outline" className="text-xs">직접 호출</Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">프록시</Badge>
            )}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{provider.description}</p>
        </div>
        {isConfigured && (
          <Badge variant="default" className="bg-green-600">
            <Check className="w-3 h-3 mr-1" /> 설정됨
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        {isConfigured ? (
          <div className="flex items-center gap-2">
            <Input value="••••••••••••••••" disabled className="font-mono" />
            <Button variant="outline" onClick={testConnection} disabled={testing}>
              {testing ? '테스트 중...' : '테스트'}
            </Button>
            <Button variant="destructive" size="icon" onClick={onRemove}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Input
              type={showKey ? 'text' : 'password'}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder={provider.keyPlaceholder}
              className="font-mono"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowKey(!showKey)}
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
            <Button onClick={handleSave} disabled={!key.trim()}>
              저장
            </Button>
            <Button variant="link" size="sm" asChild>
              <a href={provider.docsUrl} target="_blank" rel="noopener">
                <ExternalLink className="w-3 h-3 mr-1" />
                키 발급
              </a>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### 2-5. 검증 체크리스트

- [ ] `/settings` 페이지 접속 가능
- [ ] 각 제공자별 API 키 입력 가능
- [ ] 입력한 키가 localStorage에 저장됨
- [ ] 페이지 새로고침 후에도 키 유지
- [ ] 키 삭제 기능 동작
- [ ] 키 입력 시 마스킹 처리

---

## 3단계: 직접 호출 어댑터

### 목표
- CORS 지원 제공자 브라우저 직접 호출 구현
- OpenAI 호환 형식으로 응답 정규화

### 예상 소요: 3-4일

### 3-1. BaseAdapter 인터페이스

```typescript
// apps/web/src/lib/llm/adapters/base.ts

import { ProviderId } from '@openmaas/shared-types';

// OpenAI 호환 메시지 형식
export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | ContentPart[];
  name?: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface ContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string };
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

// 요청 파라미터
export interface ChatRequest {
  model: string;
  messages: Message[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  stream?: boolean;
  tools?: Tool[];
  tool_choice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
}

// 응답 형식 (OpenAI 호환)
export interface ChatResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: Choice[];
  usage: Usage;
}

export interface Choice {
  index: number;
  message: Message;
  finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter';
}

export interface Usage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

// 스트리밍 청크
export interface ChatChunk {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  choices: ChunkChoice[];
}

export interface ChunkChoice {
  index: number;
  delta: Partial<Message>;
  finish_reason: string | null;
}

// 어댑터 인터페이스
export interface LLMAdapter {
  readonly providerId: ProviderId;
  readonly supportsCORS: boolean;

  // 일반 호출
  chat(request: ChatRequest, apiKey: string): Promise<ChatResponse>;

  // 스트리밍 호출
  chatStream(request: ChatRequest, apiKey: string): AsyncIterable<ChatChunk>;

  // 모델 목록 조회 (Ollama 등 동적 모델용)
  listModels?(apiKey: string): Promise<string[]>;
}
```

### 3-2. OpenAI 어댑터

```typescript
// apps/web/src/lib/llm/adapters/openai.ts

import OpenAI from 'openai';
import { LLMAdapter, ChatRequest, ChatResponse, ChatChunk } from './base';

export class OpenAIAdapter implements LLMAdapter {
  readonly providerId = 'openai' as const;
  readonly supportsCORS = true;

  private createClient(apiKey: string): OpenAI {
    return new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true,  // 브라우저 직접 호출 허용
    });
  }

  async chat(request: ChatRequest, apiKey: string): Promise<ChatResponse> {
    const client = this.createClient(apiKey);

    const response = await client.chat.completions.create({
      model: request.model,
      messages: request.messages,
      temperature: request.temperature,
      max_tokens: request.max_tokens,
      top_p: request.top_p,
      tools: request.tools,
      tool_choice: request.tool_choice,
      stream: false,
    });

    return response as ChatResponse;
  }

  async *chatStream(request: ChatRequest, apiKey: string): AsyncIterable<ChatChunk> {
    const client = this.createClient(apiKey);

    const stream = await client.chat.completions.create({
      model: request.model,
      messages: request.messages,
      temperature: request.temperature,
      max_tokens: request.max_tokens,
      top_p: request.top_p,
      stream: true,
    });

    for await (const chunk of stream) {
      yield chunk as ChatChunk;
    }
  }

  async listModels(apiKey: string): Promise<string[]> {
    const client = this.createClient(apiKey);
    const models = await client.models.list();

    return models.data
      .filter((m) => m.id.startsWith('gpt'))
      .map((m) => m.id)
      .sort();
  }
}
```

### 3-3. Gemini 어댑터

```typescript
// apps/web/src/lib/llm/adapters/gemini.ts

import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { LLMAdapter, ChatRequest, ChatResponse, ChatChunk, Message } from './base';

export class GeminiAdapter implements LLMAdapter {
  readonly providerId = 'gemini' as const;
  readonly supportsCORS = true;

  private createClient(apiKey: string): GoogleGenerativeAI {
    return new GoogleGenerativeAI(apiKey);
  }

  // OpenAI 메시지 → Gemini Content 변환
  private convertMessages(messages: Message[]): { role: string; parts: { text: string }[] }[] {
    const geminiMessages: { role: string; parts: { text: string }[] }[] = [];
    let systemInstruction = '';

    for (const msg of messages) {
      if (msg.role === 'system') {
        // Gemini는 system을 별도로 처리
        systemInstruction += (typeof msg.content === 'string' ? msg.content : '') + '\n';
      } else {
        geminiMessages.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: typeof msg.content === 'string' ? msg.content : '' }],
        });
      }
    }

    // System instruction을 첫 user 메시지에 prepend
    if (systemInstruction && geminiMessages.length > 0) {
      const firstUserIdx = geminiMessages.findIndex((m) => m.role === 'user');
      if (firstUserIdx >= 0) {
        geminiMessages[firstUserIdx].parts[0].text =
          `[System Instructions]\n${systemInstruction}\n\n${geminiMessages[firstUserIdx].parts[0].text}`;
      }
    }

    return geminiMessages;
  }

  async chat(request: ChatRequest, apiKey: string): Promise<ChatResponse> {
    const client = this.createClient(apiKey);
    const model = client.getGenerativeModel({ model: request.model });

    const geminiMessages = this.convertMessages(request.messages);

    // 마지막 user 메시지를 prompt로, 나머지를 history로
    const history = geminiMessages.slice(0, -1);
    const lastMessage = geminiMessages[geminiMessages.length - 1];

    const chat = model.startChat({
      history,
      generationConfig: {
        temperature: request.temperature,
        maxOutputTokens: request.max_tokens,
        topP: request.top_p,
      },
    });

    const result = await chat.sendMessage(lastMessage.parts[0].text);
    const response = result.response;

    // OpenAI 형식으로 변환
    return {
      id: `gemini-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: request.model,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: response.text(),
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: response.usageMetadata?.promptTokenCount ?? 0,
        completion_tokens: response.usageMetadata?.candidatesTokenCount ?? 0,
        total_tokens: response.usageMetadata?.totalTokenCount ?? 0,
      },
    };
  }

  async *chatStream(request: ChatRequest, apiKey: string): AsyncIterable<ChatChunk> {
    const client = this.createClient(apiKey);
    const model = client.getGenerativeModel({ model: request.model });

    const geminiMessages = this.convertMessages(request.messages);
    const history = geminiMessages.slice(0, -1);
    const lastMessage = geminiMessages[geminiMessages.length - 1];

    const chat = model.startChat({
      history,
      generationConfig: {
        temperature: request.temperature,
        maxOutputTokens: request.max_tokens,
      },
    });

    const streamResult = await chat.sendMessageStream(lastMessage.parts[0].text);
    const id = `gemini-${Date.now()}`;
    const created = Math.floor(Date.now() / 1000);

    for await (const chunk of streamResult.stream) {
      const text = chunk.text();
      if (text) {
        yield {
          id,
          object: 'chat.completion.chunk',
          created,
          model: request.model,
          choices: [
            {
              index: 0,
              delta: { content: text },
              finish_reason: null,
            },
          ],
        };
      }
    }

    // 마지막 청크
    yield {
      id,
      object: 'chat.completion.chunk',
      created,
      model: request.model,
      choices: [
        {
          index: 0,
          delta: {},
          finish_reason: 'stop',
        },
      ],
    };
  }
}
```

### 3-4. Ollama 어댑터

```typescript
// apps/web/src/lib/llm/adapters/ollama.ts

import { LLMAdapter, ChatRequest, ChatResponse, ChatChunk } from './base';

export class OllamaAdapter implements LLMAdapter {
  readonly providerId = 'ollama' as const;
  readonly supportsCORS = true;

  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:11434') {
    this.baseUrl = baseUrl;
  }

  async chat(request: ChatRequest, _apiKey: string): Promise<ChatResponse> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: request.model,
        messages: request.messages,
        stream: false,
        options: {
          temperature: request.temperature,
          num_predict: request.max_tokens,
          top_p: request.top_p,
        },
      }),
    });

    const data = await response.json();

    return {
      id: `ollama-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: request.model,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: data.message.content,
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: data.prompt_eval_count ?? 0,
        completion_tokens: data.eval_count ?? 0,
        total_tokens: (data.prompt_eval_count ?? 0) + (data.eval_count ?? 0),
      },
    };
  }

  async *chatStream(request: ChatRequest, _apiKey: string): AsyncIterable<ChatChunk> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: request.model,
        messages: request.messages,
        stream: true,
        options: {
          temperature: request.temperature,
          num_predict: request.max_tokens,
        },
      }),
    });

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    const id = `ollama-${Date.now()}`;
    const created = Math.floor(Date.now() / 1000);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value);
      const lines = text.split('\n').filter(Boolean);

      for (const line of lines) {
        const data = JSON.parse(line);

        yield {
          id,
          object: 'chat.completion.chunk',
          created,
          model: request.model,
          choices: [
            {
              index: 0,
              delta: { content: data.message?.content ?? '' },
              finish_reason: data.done ? 'stop' : null,
            },
          ],
        };
      }
    }
  }

  async listModels(): Promise<string[]> {
    const response = await fetch(`${this.baseUrl}/api/tags`);
    const data = await response.json();
    return data.models.map((m: { name: string }) => m.name);
  }
}
```

### 3-5. Provider Router

```typescript
// apps/web/src/lib/llm/provider-router.ts

import { ProviderId, PROVIDERS } from '@openmaas/shared-types';
import { LLMAdapter, ChatRequest, ChatResponse, ChatChunk } from './adapters/base';
import { OpenAIAdapter } from './adapters/openai';
import { GeminiAdapter } from './adapters/gemini';
import { OllamaAdapter } from './adapters/ollama';
import { ProxyAdapter } from './adapters/proxy';
import { keyManager } from './key-manager';

class ProviderRouter {
  private directAdapters: Map<ProviderId, LLMAdapter> = new Map();
  private proxyAdapter: ProxyAdapter;

  constructor(proxyUrl: string = '/api/proxy') {
    // 직접 호출 어댑터 등록
    this.directAdapters.set('openai', new OpenAIAdapter());
    this.directAdapters.set('gemini', new GeminiAdapter());
    this.directAdapters.set('ollama', new OllamaAdapter());

    // 프록시 어댑터 (CORS 미지원 제공자용)
    this.proxyAdapter = new ProxyAdapter(proxyUrl);
  }

  private getAdapter(provider: ProviderId): LLMAdapter {
    const config = PROVIDERS[provider];

    if (config.supportsCORS) {
      const adapter = this.directAdapters.get(provider);
      if (adapter) return adapter;
    }

    // CORS 미지원 또는 직접 어댑터 없음 → 프록시
    return this.proxyAdapter;
  }

  async chat(provider: ProviderId, request: ChatRequest): Promise<ChatResponse> {
    const apiKey = keyManager.getKey(provider);
    if (!apiKey && provider !== 'ollama') {
      throw new Error(`API 키가 설정되지 않았습니다: ${provider}`);
    }

    const adapter = this.getAdapter(provider);

    // 프록시 어댑터의 경우 provider 정보도 전달
    if (adapter instanceof ProxyAdapter) {
      return adapter.chat(request, apiKey ?? '', provider);
    }

    return adapter.chat(request, apiKey ?? '');
  }

  async *chatStream(
    provider: ProviderId,
    request: ChatRequest
  ): AsyncIterable<ChatChunk> {
    const apiKey = keyManager.getKey(provider);
    if (!apiKey && provider !== 'ollama') {
      throw new Error(`API 키가 설정되지 않았습니다: ${provider}`);
    }

    const adapter = this.getAdapter(provider);

    if (adapter instanceof ProxyAdapter) {
      yield* adapter.chatStream(request, apiKey ?? '', provider);
    } else {
      yield* adapter.chatStream(request, apiKey ?? '');
    }
  }
}

export const providerRouter = new ProviderRouter(
  process.env.NEXT_PUBLIC_PROXY_URL || '/api/proxy'
);
```

### 3-6. 검증 체크리스트

- [ ] OpenAI 키 입력 후 GPT-4o 호출 성공
- [ ] 응답이 OpenAI 형식으로 정규화됨
- [ ] 스트리밍 응답 실시간 출력
- [ ] Gemini 어댑터 동작 확인
- [ ] Ollama 로컬 모델 호출 성공
- [ ] 에러 발생 시 적절한 에러 메시지

---

## 4단계: 기본 채팅 UI

### 목표
- 채팅 플레이그라운드 MVP 구현
- 실시간 스트리밍 표시

### 예상 소요: 4-5일

### 4-1. 레이아웃 구조

```
┌─────────────────────────────────────────────────────────────────────┐
│ ┌─────────┬───────────────────────────────────────┬─────────────┐  │
│ │ 사이드바 │           메인 채팅 영역              │ 설정 패널   │  │
│ │         │                                       │             │  │
│ │ • 새 채팅│ [모델 선택 드롭다운]                  │ Temperature │  │
│ │ • 기록1  │                                       │ [0.7    ]   │  │
│ │ • 기록2  │ ┌───────────────────────────────────┐ │             │  │
│ │ • 기록3  │ │ User: 안녕하세요                  │ │ Max Tokens  │  │
│ │         │ └───────────────────────────────────┘ │ [1024   ]   │  │
│ │         │                                       │             │  │
│ │         │ ┌───────────────────────────────────┐ │ Top P       │  │
│ │         │ │ Assistant: 안녕하세요!             │ │ [1.0    ]   │  │
│ │         │ │ 무엇을 도와드릴까요?               │ │             │  │
│ │         │ └───────────────────────────────────┘ │ [시스템     │  │
│ │         │                                       │  프롬프트]  │  │
│ │         │                                       │             │  │
│ │         │ ┌───────────────────────────────────┐ │             │  │
│ │─────────│ │ 메시지 입력...              [전송]│ │             │  │
│ │ 설정    │ └───────────────────────────────────┘ │             │  │
│ └─────────┴───────────────────────────────────────┴─────────────┘  │
│                                          토큰: 523 | 비용: $0.02   │
└─────────────────────────────────────────────────────────────────────┘
```

### 4-2. 채팅 상태 관리

```typescript
// apps/web/src/lib/store/chat-store.ts

import { create } from 'zustand';
import { Message, ChatRequest, ChatChunk } from '../llm/adapters/base';
import { providerRouter } from '../llm/provider-router';
import { ProviderId } from '@openmaas/shared-types';

interface ChatMessage extends Message {
  id: string;
  timestamp: number;
  usage?: { prompt_tokens: number; completion_tokens: number };
  latency?: number;  // TTFT in ms
}

interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  provider: ProviderId;
  model: string;
  createdAt: number;
  updatedAt: number;
}

interface ChatState {
  // 현재 세션
  currentSession: ChatSession | null;
  sessions: ChatSession[];

  // 설정
  provider: ProviderId;
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  systemPrompt: string;

  // UI 상태
  isStreaming: boolean;
  streamingContent: string;

  // 액션
  setProvider: (provider: ProviderId) => void;
  setModel: (model: string) => void;
  setTemperature: (temp: number) => void;
  setMaxTokens: (tokens: number) => void;
  setTopP: (topP: number) => void;
  setSystemPrompt: (prompt: string) => void;

  sendMessage: (content: string) => Promise<void>;
  newSession: () => void;
  loadSession: (id: string) => void;
  deleteSession: (id: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  currentSession: null,
  sessions: [],

  provider: 'openai',
  model: 'gpt-4o',
  temperature: 0.7,
  maxTokens: 4096,
  topP: 1.0,
  systemPrompt: '',

  isStreaming: false,
  streamingContent: '',

  setProvider: (provider) => set({ provider }),
  setModel: (model) => set({ model }),
  setTemperature: (temperature) => set({ temperature }),
  setMaxTokens: (maxTokens) => set({ maxTokens }),
  setTopP: (topP) => set({ topP }),
  setSystemPrompt: (systemPrompt) => set({ systemPrompt }),

  sendMessage: async (content) => {
    const state = get();

    // 세션 없으면 생성
    let session = state.currentSession;
    if (!session) {
      session = {
        id: crypto.randomUUID(),
        title: content.slice(0, 30) + '...',
        messages: [],
        provider: state.provider,
        model: state.model,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      set({ currentSession: session });
    }

    // 사용자 메시지 추가
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };
    session.messages.push(userMessage);
    set({ currentSession: { ...session } });

    // 어시스턴트 응답 스트리밍
    set({ isStreaming: true, streamingContent: '' });

    const messages: Message[] = [];

    // 시스템 프롬프트 추가
    if (state.systemPrompt) {
      messages.push({ role: 'system', content: state.systemPrompt });
    }

    // 기존 메시지 추가
    messages.push(...session.messages.map((m) => ({
      role: m.role,
      content: m.content,
    })));

    const request: ChatRequest = {
      model: state.model,
      messages,
      temperature: state.temperature,
      max_tokens: state.maxTokens,
      top_p: state.topP,
      stream: true,
    };

    let fullContent = '';
    let ttft: number | undefined;
    const startTime = Date.now();

    try {
      for await (const chunk of providerRouter.chatStream(state.provider, request)) {
        if (!ttft) {
          ttft = Date.now() - startTime;
        }

        const delta = chunk.choices[0]?.delta?.content ?? '';
        fullContent += delta;
        set({ streamingContent: fullContent });
      }

      // 어시스턴트 메시지 저장
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: fullContent,
        timestamp: Date.now(),
        latency: ttft,
      };
      session.messages.push(assistantMessage);
      session.updatedAt = Date.now();

      set({
        currentSession: { ...session },
        isStreaming: false,
        streamingContent: '',
      });
    } catch (error) {
      set({ isStreaming: false, streamingContent: '' });
      throw error;
    }
  },

  newSession: () => {
    const state = get();
    if (state.currentSession) {
      set({
        sessions: [...state.sessions, state.currentSession],
        currentSession: null,
      });
    }
  },

  loadSession: (id) => {
    const session = get().sessions.find((s) => s.id === id);
    if (session) {
      set({ currentSession: session });
    }
  },

  deleteSession: (id) => {
    set((state) => ({
      sessions: state.sessions.filter((s) => s.id !== id),
      currentSession: state.currentSession?.id === id ? null : state.currentSession,
    }));
  },
}));
```

### 4-3. 주요 컴포넌트

```typescript
// apps/web/src/components/chat/chat-page.tsx

'use client';

import { ChatSidebar } from './chat-sidebar';
import { ChatMain } from './chat-main';
import { ChatSettings } from './chat-settings';

export function ChatPage() {
  return (
    <div className="flex h-screen">
      <ChatSidebar className="w-64 border-r" />
      <ChatMain className="flex-1" />
      <ChatSettings className="w-80 border-l" />
    </div>
  );
}
```

```typescript
// apps/web/src/components/chat/chat-main.tsx

'use client';

import { useChatStore } from '@/lib/store/chat-store';
import { MessageList } from './message-list';
import { MessageInput } from './message-input';
import { ModelSelector } from './model-selector';

export function ChatMain({ className }: { className?: string }) {
  const { currentSession, isStreaming, streamingContent } = useChatStore();

  return (
    <div className={`flex flex-col ${className}`}>
      {/* 모델 선택 헤더 */}
      <div className="h-14 border-b px-4 flex items-center">
        <ModelSelector />
      </div>

      {/* 메시지 목록 */}
      <div className="flex-1 overflow-y-auto p-4">
        <MessageList
          messages={currentSession?.messages ?? []}
          streamingContent={isStreaming ? streamingContent : undefined}
        />
      </div>

      {/* 입력 영역 */}
      <div className="border-t p-4">
        <MessageInput disabled={isStreaming} />
      </div>
    </div>
  );
}
```

```typescript
// apps/web/src/components/chat/message-list.tsx

'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { ChatMessage } from '@/lib/store/chat-store';

interface MessageListProps {
  messages: ChatMessage[];
  streamingContent?: string;
}

export function MessageList({ messages, streamingContent }: MessageListProps) {
  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}

      {streamingContent && (
        <MessageBubble
          message={{
            id: 'streaming',
            role: 'assistant',
            content: streamingContent,
            timestamp: Date.now(),
          }}
          isStreaming
        />
      )}
    </div>
  );
}

function MessageBubble({
  message,
  isStreaming,
}: {
  message: ChatMessage;
  isStreaming?: boolean;
}) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-lg px-4 py-2 ${
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted'
        }`}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
          className="prose prose-sm dark:prose-invert"
        >
          {message.content as string}
        </ReactMarkdown>

        {!isUser && message.latency && (
          <div className="text-xs text-muted-foreground mt-2">
            TTFT: {message.latency}ms
          </div>
        )}

        {isStreaming && (
          <span className="inline-block w-2 h-4 bg-current animate-pulse ml-1" />
        )}
      </div>
    </div>
  );
}
```

### 4-4. 검증 체크리스트

- [ ] `/chat` 페이지 렌더링
- [ ] 모델 선택 드롭다운 동작
- [ ] 메시지 입력 및 전송
- [ ] 스트리밍 응답 실시간 표시
- [ ] 마크다운/코드 하이라이팅
- [ ] 대화 기록 유지
- [ ] 파라미터 조절 (temperature 등)
- [ ] 새 대화 시작

---

## 5단계: Pass-through 프록시

### 목표
- CORS 미지원 제공자를 위한 프록시 서버 구현
- API 키 비저장 원칙 준수

### 예상 소요: 3-4일

### 5-1. FastAPI 기본 구조

```python
# apps/proxy/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import completions
from middleware.security import no_key_logging_middleware

app = FastAPI(
    title="openMaaS Proxy",
    description="Zero-Knowledge Pass-through Proxy for LLM APIs",
    version="0.1.0",
)

# CORS 설정 (프론트엔드에서 호출 가능하도록)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 프로덕션에서는 특정 도메인만
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API 키 로깅 방지 미들웨어
app.middleware("http")(no_key_logging_middleware)

# 라우터 등록
app.include_router(completions.router, prefix="/v1")

@app.get("/health")
async def health_check():
    return {"status": "healthy", "key_storage": "none"}
```

### 5-2. 보안 미들웨어

```python
# apps/proxy/middleware/security.py

import logging
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

# API 키가 로그에 남지 않도록 필터링
class KeyFilter(logging.Filter):
    SENSITIVE_HEADERS = {'x-api-key', 'authorization', 'x-aws-access-key'}

    def filter(self, record: logging.LogRecord) -> bool:
        if hasattr(record, 'msg'):
            msg = str(record.msg).lower()
            for header in self.SENSITIVE_HEADERS:
                if header in msg:
                    record.msg = '[REDACTED - Contains sensitive header]'
                    break
        return True

# 모든 로거에 필터 적용
for handler in logging.root.handlers:
    handler.addFilter(KeyFilter())

async def no_key_logging_middleware(request: Request, call_next):
    """
    API 키가 로깅되지 않도록 보장하는 미들웨어.

    주의: 이 프록시는 API 키를 절대 저장하지 않습니다.
    키는 요청 헤더에서 추출하여 즉시 업스트림으로 전달되고,
    응답 후 메모리에서 폐기됩니다.
    """
    # 요청 로깅 시 헤더 제외
    safe_headers = {
        k: v for k, v in request.headers.items()
        if k.lower() not in {'x-api-key', 'authorization'}
    }

    response = await call_next(request)
    return response
```

### 5-3. Anthropic 어댑터 (프록시용)

```python
# apps/proxy/adapters/anthropic.py

from typing import AsyncIterator
import httpx
from .base import ProxyAdapter, ChatRequest, ChatResponse

class AnthropicAdapter(ProxyAdapter):
    """
    Anthropic Claude API 어댑터.

    주의: API 키는 메모리에서만 사용되고 저장되지 않습니다.
    """

    BASE_URL = "https://api.anthropic.com/v1"

    def build_headers(self, api_key: str) -> dict:
        return {
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }

    def transform_request(self, request: ChatRequest) -> tuple[str, dict]:
        """OpenAI 형식 → Anthropic 형식"""

        # 시스템 메시지 추출
        system_content = ""
        messages = []

        for msg in request.messages:
            if msg["role"] == "system":
                system_content += msg["content"] + "\n"
            else:
                # OpenAI의 assistant → Anthropic의 assistant
                messages.append({
                    "role": msg["role"],
                    "content": msg["content"],
                })

        payload = {
            "model": request.model,
            "messages": messages,
            "max_tokens": request.max_tokens or 4096,
        }

        if system_content:
            payload["system"] = system_content.strip()

        if request.temperature is not None:
            payload["temperature"] = request.temperature

        if request.top_p is not None:
            payload["top_p"] = request.top_p

        if request.stream:
            payload["stream"] = True

        return f"{self.BASE_URL}/messages", payload

    def transform_response(self, response: dict) -> ChatResponse:
        """Anthropic 형식 → OpenAI 형식"""

        content = ""
        for block in response.get("content", []):
            if block["type"] == "text":
                content += block["text"]

        return {
            "id": response["id"],
            "object": "chat.completion",
            "created": int(__import__("time").time()),
            "model": response["model"],
            "choices": [{
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": content,
                },
                "finish_reason": self._map_stop_reason(response.get("stop_reason")),
            }],
            "usage": {
                "prompt_tokens": response["usage"]["input_tokens"],
                "completion_tokens": response["usage"]["output_tokens"],
                "total_tokens": (
                    response["usage"]["input_tokens"] +
                    response["usage"]["output_tokens"]
                ),
            },
        }

    async def stream_transform(
        self,
        response: httpx.Response
    ) -> AsyncIterator[str]:
        """Anthropic SSE → OpenAI SSE 형식"""

        async for line in response.aiter_lines():
            if not line.startswith("data: "):
                continue

            data = line[6:]  # "data: " 제거
            if data == "[DONE]":
                yield "data: [DONE]\n\n"
                break

            import json
            event = json.loads(data)

            # content_block_delta 이벤트만 처리
            if event.get("type") == "content_block_delta":
                delta_text = event.get("delta", {}).get("text", "")
                if delta_text:
                    chunk = {
                        "id": "anthropic-stream",
                        "object": "chat.completion.chunk",
                        "created": int(__import__("time").time()),
                        "model": "claude",
                        "choices": [{
                            "index": 0,
                            "delta": {"content": delta_text},
                            "finish_reason": None,
                        }],
                    }
                    yield f"data: {json.dumps(chunk)}\n\n"

            elif event.get("type") == "message_stop":
                chunk = {
                    "id": "anthropic-stream",
                    "object": "chat.completion.chunk",
                    "choices": [{
                        "index": 0,
                        "delta": {},
                        "finish_reason": "stop",
                    }],
                }
                yield f"data: {json.dumps(chunk)}\n\n"
                yield "data: [DONE]\n\n"

    def _map_stop_reason(self, reason: str | None) -> str:
        mapping = {
            "end_turn": "stop",
            "max_tokens": "length",
            "stop_sequence": "stop",
        }
        return mapping.get(reason, "stop")
```

### 5-4. Completions 라우터

```python
# apps/proxy/routers/completions.py

from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import StreamingResponse
import httpx
from adapters.anthropic import AnthropicAdapter
# from adapters.bedrock import BedrockAdapter  # Phase 2
# from adapters.azure import AzureAdapter      # Phase 2

router = APIRouter()

# 제공자별 어댑터 등록
ADAPTERS = {
    "anthropic": AnthropicAdapter(),
    # "bedrock": BedrockAdapter(),
    # "azure": AzureAdapter(),
}

@router.post("/chat/completions")
async def proxy_chat_completions(request: Request):
    """
    OpenAI 호환 Chat Completions 프록시.

    헤더:
        X-Provider: 제공자 ID (anthropic, bedrock, azure 등)
        X-API-Key: 제공자 API 키 (저장되지 않음)

    주의: API 키는 이 함수 실행 후 메모리에서 폐기됩니다.
    """

    # 헤더에서 제공자와 키 추출
    provider = request.headers.get("X-Provider")
    api_key = request.headers.get("X-API-Key")

    if not provider:
        raise HTTPException(400, "X-Provider 헤더가 필요합니다")

    if not api_key:
        raise HTTPException(400, "X-API-Key 헤더가 필요합니다")

    adapter = ADAPTERS.get(provider)
    if not adapter:
        raise HTTPException(400, f"지원하지 않는 제공자: {provider}")

    # 요청 본문 파싱
    body = await request.json()

    # 요청 변환
    endpoint, payload = adapter.transform_request(body)
    headers = adapter.build_headers(api_key)

    # 스트리밍 여부 확인
    is_streaming = body.get("stream", False)

    async with httpx.AsyncClient(timeout=120.0) as client:
        if is_streaming:
            # 스트리밍 응답
            response = await client.post(
                endpoint,
                json=payload,
                headers=headers,
                timeout=None,
            )

            if response.status_code != 200:
                raise HTTPException(response.status_code, response.text)

            return StreamingResponse(
                adapter.stream_transform(response),
                media_type="text/event-stream",
            )
        else:
            # 일반 응답
            response = await client.post(endpoint, json=payload, headers=headers)

            if response.status_code != 200:
                raise HTTPException(response.status_code, response.text)

            result = adapter.transform_response(response.json())
            return result

    # 함수 종료 시 api_key는 자동으로 메모리에서 해제됨
```

### 5-5. 클라이언트 프록시 어댑터

```typescript
// apps/web/src/lib/llm/adapters/proxy.ts

import { LLMAdapter, ChatRequest, ChatResponse, ChatChunk } from './base';
import { ProviderId } from '@openmaas/shared-types';

export class ProxyAdapter implements LLMAdapter {
  readonly providerId = 'proxy' as const;
  readonly supportsCORS = true;  // 프록시 자체는 CORS 지원

  private proxyUrl: string;

  constructor(proxyUrl: string) {
    this.proxyUrl = proxyUrl;
  }

  async chat(
    request: ChatRequest,
    apiKey: string,
    provider?: ProviderId
  ): Promise<ChatResponse> {
    const response = await fetch(`${this.proxyUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Provider': provider ?? '',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({ ...request, stream: false }),
    });

    if (!response.ok) {
      throw new Error(`Proxy error: ${response.status}`);
    }

    return response.json();
  }

  async *chatStream(
    request: ChatRequest,
    apiKey: string,
    provider?: ProviderId
  ): AsyncIterable<ChatChunk> {
    const response = await fetch(`${this.proxyUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Provider': provider ?? '',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({ ...request, stream: true }),
    });

    if (!response.ok) {
      throw new Error(`Proxy error: ${response.status}`);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value);
      const lines = text.split('\n').filter((line) => line.startsWith('data: '));

      for (const line of lines) {
        const data = line.slice(6);  // "data: " 제거
        if (data === '[DONE]') break;

        try {
          yield JSON.parse(data) as ChatChunk;
        } catch {
          // 파싱 실패 무시
        }
      }
    }
  }
}
```

### 5-6. 검증 체크리스트

- [ ] 프록시 서버 실행 (`uvicorn main:app`)
- [ ] `/health` 엔드포인트 응답 확인
- [ ] Anthropic 키로 Claude 호출 성공
- [ ] 스트리밍 응답 동작
- [ ] API 키가 로그에 남지 않음 확인
- [ ] 프론트엔드에서 프록시 경유 호출 성공

---

## 6단계: 비용 추적 + 비교 모드

### 목표
- 토큰/비용 계산 및 표시
- Side-by-Side 모델 비교

### 예상 소요: 3-4일

### 6-1. 토큰 카운터

```typescript
// apps/web/src/lib/llm/token-counter.ts

import { encoding_for_model, TiktokenModel } from 'tiktoken';
import { ProviderId } from '@openmaas/shared-types';

// 모델별 토크나이저 매핑
const MODEL_TOKENIZERS: Record<string, TiktokenModel> = {
  'gpt-4o': 'gpt-4o',
  'gpt-4-turbo': 'gpt-4-turbo',
  'gpt-4': 'gpt-4',
  'gpt-3.5-turbo': 'gpt-3.5-turbo',
  // Claude, Gemini는 근사치 사용 (GPT-4 기준)
  'claude-3-5-sonnet': 'gpt-4',
  'claude-3-opus': 'gpt-4',
  'gemini-1.5-pro': 'gpt-4',
  'gemini-2.0-flash': 'gpt-4',
};

export function countTokens(text: string, model: string): number {
  const tokenizerModel = MODEL_TOKENIZERS[model] || 'gpt-4';

  try {
    const enc = encoding_for_model(tokenizerModel);
    const tokens = enc.encode(text);
    enc.free();
    return tokens.length;
  } catch {
    // 폴백: 대략적인 추정 (4글자당 1토큰)
    return Math.ceil(text.length / 4);
  }
}

export function countMessageTokens(
  messages: { role: string; content: string }[],
  model: string
): number {
  let total = 0;

  for (const msg of messages) {
    // 메시지 오버헤드 (role, formatting)
    total += 4;
    total += countTokens(msg.content, model);
  }

  // 프리앰블 토큰
  total += 3;

  return total;
}
```

### 6-2. 가격 데이터

```json
// packages/pricing/models.json

{
  "openai": {
    "gpt-4o": {
      "input": 2.5,
      "output": 10,
      "cached_input": 1.25
    },
    "gpt-4o-mini": {
      "input": 0.15,
      "output": 0.6
    },
    "gpt-4-turbo": {
      "input": 10,
      "output": 30
    }
  },
  "anthropic": {
    "claude-3-5-sonnet-20241022": {
      "input": 3,
      "output": 15
    },
    "claude-3-opus-20240229": {
      "input": 15,
      "output": 75
    }
  },
  "gemini": {
    "gemini-1.5-pro": {
      "input": 1.25,
      "output": 5
    },
    "gemini-2.0-flash-exp": {
      "input": 0,
      "output": 0
    }
  }
}
```

### 6-3. 비용 계산 유틸리티

```typescript
// apps/web/src/lib/llm/pricing.ts

import pricingData from '@openmaas/pricing/models.json';
import { ProviderId } from '@openmaas/shared-types';

interface PricingInfo {
  input: number;   // $ per 1M tokens
  output: number;
  cached_input?: number;
}

export function getModelPricing(
  provider: ProviderId,
  model: string
): PricingInfo | null {
  const providerPricing = pricingData[provider as keyof typeof pricingData];
  if (!providerPricing) return null;

  return providerPricing[model as keyof typeof providerPricing] ?? null;
}

export function calculateCost(
  provider: ProviderId,
  model: string,
  inputTokens: number,
  outputTokens: number,
  cachedInputTokens: number = 0
): number {
  const pricing = getModelPricing(provider, model);
  if (!pricing) return 0;

  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  const cachedCost = pricing.cached_input
    ? (cachedInputTokens / 1_000_000) * pricing.cached_input
    : 0;

  return inputCost + outputCost + cachedCost;
}

export function formatCost(cost: number): string {
  if (cost < 0.01) {
    return `$${(cost * 100).toFixed(4)}¢`;
  }
  return `$${cost.toFixed(4)}`;
}
```

### 6-4. Side-by-Side 비교 UI

```typescript
// apps/web/src/app/compare/page.tsx

'use client';

import { useState } from 'react';
import { useChatStore } from '@/lib/store/chat-store';
import { providerRouter } from '@/lib/llm/provider-router';
import { calculateCost, formatCost } from '@/lib/llm/pricing';
import { countMessageTokens } from '@/lib/llm/token-counter';
import { ProviderId } from '@openmaas/shared-types';

interface ComparisonResult {
  provider: ProviderId;
  model: string;
  content: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  ttft: number;        // Time to First Token (ms)
  totalTime: number;   // Total time (ms)
  error?: string;
}

export default function ComparePage() {
  const [prompt, setPrompt] = useState('');
  const [models, setModels] = useState<{ provider: ProviderId; model: string }[]>([
    { provider: 'openai', model: 'gpt-4o' },
    { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' },
  ]);
  const [results, setResults] = useState<ComparisonResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runComparison = async () => {
    if (!prompt.trim()) return;

    setIsRunning(true);
    setResults([]);

    const messages = [{ role: 'user' as const, content: prompt }];

    // 모든 모델에 병렬로 요청
    const promises = models.map(async ({ provider, model }) => {
      const result: ComparisonResult = {
        provider,
        model,
        content: '',
        inputTokens: countMessageTokens(messages, model),
        outputTokens: 0,
        cost: 0,
        ttft: 0,
        totalTime: 0,
      };

      const startTime = Date.now();
      let ttft = 0;

      try {
        for await (const chunk of providerRouter.chatStream(provider, {
          model,
          messages,
          temperature: 0.7,
          max_tokens: 1024,
          stream: true,
        })) {
          if (!ttft) {
            ttft = Date.now() - startTime;
          }

          const delta = chunk.choices[0]?.delta?.content ?? '';
          result.content += delta;

          // 실시간 업데이트
          setResults((prev) => {
            const idx = prev.findIndex(
              (r) => r.provider === provider && r.model === model
            );
            if (idx >= 0) {
              const updated = [...prev];
              updated[idx] = { ...result, ttft, content: result.content };
              return updated;
            }
            return [...prev, { ...result, ttft, content: result.content }];
          });
        }

        result.ttft = ttft;
        result.totalTime = Date.now() - startTime;
        result.outputTokens = countTokens(result.content, model);
        result.cost = calculateCost(
          provider,
          model,
          result.inputTokens,
          result.outputTokens
        );
      } catch (error) {
        result.error = error instanceof Error ? error.message : 'Unknown error';
      }

      return result;
    });

    await Promise.all(promises);
    setIsRunning(false);
  };

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-8">모델 비교</h1>

      {/* 프롬프트 입력 */}
      <div className="mb-6">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="비교할 프롬프트를 입력하세요..."
          className="w-full h-32 p-4 border rounded-lg"
        />
        <button
          onClick={runComparison}
          disabled={isRunning || !prompt.trim()}
          className="mt-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg disabled:opacity-50"
        >
          {isRunning ? '비교 중...' : '비교 실행'}
        </button>
      </div>

      {/* 결과 비교 */}
      <div className="grid grid-cols-2 gap-4">
        {results.map((result) => (
          <div key={`${result.provider}-${result.model}`} className="border rounded-lg p-4">
            <div className="font-semibold mb-2">
              {result.provider} / {result.model}
            </div>

            {result.error ? (
              <div className="text-red-500">{result.error}</div>
            ) : (
              <>
                <div className="prose prose-sm max-h-64 overflow-y-auto mb-4">
                  {result.content}
                </div>

                <div className="text-sm text-muted-foreground space-y-1">
                  <div>입력: {result.inputTokens} 토큰</div>
                  <div>출력: {result.outputTokens} 토큰</div>
                  <div>비용: {formatCost(result.cost)}</div>
                  <div>TTFT: {result.ttft}ms</div>
                  <div>총 시간: {result.totalTime}ms</div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* 비교 요약 테이블 */}
      {results.length > 1 && !isRunning && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">비교 요약</h2>
          <table className="w-full border-collapse border">
            <thead>
              <tr className="bg-muted">
                <th className="border p-2">모델</th>
                <th className="border p-2">비용</th>
                <th className="border p-2">TTFT</th>
                <th className="border p-2">총 시간</th>
                <th className="border p-2">출력 토큰</th>
              </tr>
            </thead>
            <tbody>
              {results
                .filter((r) => !r.error)
                .sort((a, b) => a.cost - b.cost)
                .map((result, idx) => (
                  <tr key={`${result.provider}-${result.model}`}>
                    <td className="border p-2">
                      {idx === 0 && '🏆 '}
                      {result.model}
                    </td>
                    <td className="border p-2">{formatCost(result.cost)}</td>
                    <td className="border p-2">{result.ttft}ms</td>
                    <td className="border p-2">{result.totalTime}ms</td>
                    <td className="border p-2">{result.outputTokens}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

### 6-5. 비용 표시 컴포넌트 (채팅 UI용)

```typescript
// apps/web/src/components/chat/cost-display.tsx

import { useChatStore } from '@/lib/store/chat-store';
import { calculateCost, formatCost } from '@/lib/llm/pricing';
import { countMessageTokens } from '@/lib/llm/token-counter';

export function CostDisplay() {
  const { currentSession, provider, model } = useChatStore();

  if (!currentSession?.messages.length) {
    return null;
  }

  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  for (const msg of currentSession.messages) {
    const tokens = countTokens(msg.content as string, model);
    if (msg.role === 'user' || msg.role === 'system') {
      totalInputTokens += tokens;
    } else {
      totalOutputTokens += tokens;
    }
  }

  const cost = calculateCost(provider, model, totalInputTokens, totalOutputTokens);

  return (
    <div className="flex items-center gap-4 text-sm text-muted-foreground">
      <span>입력: {totalInputTokens} 토큰</span>
      <span>출력: {totalOutputTokens} 토큰</span>
      <span className="font-medium">비용: {formatCost(cost)}</span>
    </div>
  );
}
```

### 6-6. 검증 체크리스트

- [ ] 토큰 카운터 정확도 확인
- [ ] 비용 계산 정확도 확인
- [ ] 채팅 UI에 비용 표시
- [ ] `/compare` 페이지 렌더링
- [ ] 2개 모델 동시 비교 실행
- [ ] 비교 결과 테이블 표시
- [ ] TTFT 측정 정확도

---

## 전체 MVP 완료 조건

- [ ] OpenAI, Gemini, Ollama 직접 호출 가능
- [ ] Anthropic 프록시 경유 호출 가능
- [ ] API 키 입력/저장/삭제
- [ ] 채팅 플레이그라운드 기능 완성
- [ ] 스트리밍 응답 표시
- [ ] 비용/토큰 추적
- [ ] 모델 비교 기능
- [ ] Docker Compose 배포 가능

---

## 다음 단계 (Phase 2 미리보기)

- AWS Bedrock, Azure OpenAI, Vertex AI 프록시 어댑터
- 프롬프트 템플릿 저장/관리
- 대화 기록 영구 저장 (IndexedDB)
- 사용자 계정 시스템
- 팀 공유 기능
