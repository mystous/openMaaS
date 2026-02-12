"""
openMaaS Pass-through Proxy

Zero-Knowledge 원칙:
- API 키를 저장하지 않음
- 요청 헤더에서 키를 받아 즉시 전달
- 로깅에 키 포함 금지
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="openMaaS Proxy",
    description="Pass-through proxy for CORS-restricted LLM APIs",
    version="0.1.0",
)

# CORS 설정 - 프론트엔드에서 접근 허용
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {
        "service": "openMaaS Proxy",
        "version": "0.1.0",
        "status": "healthy",
        "zero_knowledge": True,
    }


@app.get("/health")
async def health():
    return {"status": "ok"}
