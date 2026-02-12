# openMaaS

다중 CSP LLM API를 통합하는 오픈소스 플레이그라운드

## 주요 특징

- **BYOK (Bring Your Own Key)**: 사용자가 자신의 API 키로 직접 비용 부담
- **Zero-Knowledge**: API 키는 서버에 저장되지 않음
- **하이브리드 호출**: CORS 지원 제공자는 직접 호출, 미지원은 Pass-through 프록시
- **OpenAI API 호환**: 모든 제공자를 통일된 형식으로 정규화

## 지원 제공자

| 제공자 | 호출 방식 | 상태 |
|--------|----------|------|
| OpenAI | 직접 호출 | 예정 |
| Google Gemini | 직접 호출 | 예정 |
| Ollama | 직접 호출 | 예정 |
| Anthropic Claude | 프록시 | 예정 |
| AWS Bedrock | 프록시 | 예정 |
| Azure OpenAI | 프록시 | 예정 |

---

## 요구 사항

- **Node.js**: >= 20.0.0 (권장), 18.x도 동작 가능
- **pnpm**: >= 9.0.0
- **Python**: >= 3.11 (프록시 서버용)

## 설치 가이드

### 1. 저장소 클론

```bash
git clone https://github.com/your-username/openMaaS.git
cd openMaaS
```

### 2. pnpm 설치 (선택)

pnpm이 전역 설치되어 있지 않다면:

```bash
# npm으로 전역 설치
npm install -g pnpm

# 또는 corepack 사용 (Node.js 16.13+)
corepack enable
corepack prepare pnpm@9.15.0 --activate
```

> **참고**: pnpm 전역 설치가 어려우면 `npx pnpm` 으로 대체 가능

### 3. 의존성 설치

```bash
# pnpm 전역 설치된 경우
pnpm install

# 또는 npx 사용
npx pnpm install
```

### 4. 개발 서버 실행

#### 웹 프론트엔드 (Next.js)

```bash
pnpm dev:web
# 또는
npx pnpm dev:web
```

`http://localhost:3000` 에서 접속

#### Pass-through 프록시 (FastAPI)

```bash
cd apps/proxy

# Python 가상환경 생성
python -m venv .venv

# 가상환경 활성화
# Linux/macOS:
source .venv/bin/activate
# Windows:
.venv\Scripts\activate

# 의존성 설치
pip install -r requirements.txt

# 서버 실행
uvicorn main:app --reload --port 8000
```

`http://localhost:8000/docs` 에서 API 문서 확인

#### 전체 실행 (웹 + 프록시)

```bash
pnpm dev
# 또는
npx pnpm dev
```

---

## Docker로 실행

```bash
docker-compose up --build
```

- 웹: `http://localhost:3000`
- 프록시: `http://localhost:8000`

---

## 프로젝트 구조

```
openMaaS/
├── apps/
│   ├── web/                 # Next.js 15 프론트엔드
│   └── proxy/               # FastAPI Pass-through 프록시
├── packages/
│   ├── shared-types/        # 공유 TypeScript 타입
│   └── pricing/             # 모델 가격 데이터
├── docs/                    # 기획 문서
├── docker-compose.yml
├── pnpm-workspace.yaml
├── PROJECT.md               # 프로젝트 상세 개요
└── DEVELOPMENT.md           # 개발 단계별 가이드
```

---

## 주요 스크립트

| 명령어 | 설명 |
|--------|------|
| `pnpm dev` | 전체 개발 서버 실행 |
| `pnpm dev:web` | 웹 프론트엔드만 실행 |
| `pnpm dev:proxy` | 프록시 서버만 실행 |
| `pnpm build` | 프로덕션 빌드 |
| `pnpm lint` | ESLint 검사 |
| `pnpm format` | Prettier 포맷팅 |
| `pnpm clean` | 빌드 산출물 정리 |

---

## 라이선스

MIT License
