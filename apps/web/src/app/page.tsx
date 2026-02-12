"use client";

import { useState } from "react";
import {
  Sparkles,
  Zap,
  Shield,
  ArrowRight,
  Bot,
  Cpu,
  Cloud,
  Lock,
} from "lucide-react";

const providers = [
  { name: "OpenAI", color: "from-green-500 to-emerald-600", delay: "0ms" },
  { name: "Claude", color: "from-orange-500 to-amber-600", delay: "100ms" },
  { name: "Gemini", color: "from-blue-500 to-cyan-600", delay: "200ms" },
  { name: "Bedrock", color: "from-purple-500 to-violet-600", delay: "300ms" },
  { name: "Azure", color: "from-sky-500 to-blue-600", delay: "400ms" },
  { name: "Ollama", color: "from-gray-500 to-slate-600", delay: "500ms" },
];

const features = [
  {
    icon: Shield,
    title: "Zero-Knowledge",
    description: "API 키가 서버에 저장되지 않습니다",
    gradient: "from-emerald-500 to-teal-500",
  },
  {
    icon: Zap,
    title: "Direct Call",
    description: "CORS 지원 제공자는 브라우저에서 직접 호출",
    gradient: "from-amber-500 to-orange-500",
  },
  {
    icon: Cpu,
    title: "Unified API",
    description: "모든 제공자를 OpenAI 형식으로 통일",
    gradient: "from-violet-500 to-purple-500",
  },
];

export default function Home() {
  const [hoveredProvider, setHoveredProvider] = useState<string | null>(null);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-[100px]" />
        <div className="absolute -bottom-40 right-1/3 w-80 h-80 bg-emerald-500/20 rounded-full blur-[100px]" />
      </div>

      {/* Grid pattern overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: "64px 64px",
        }}
      />

      <div className="relative z-10">
        {/* Header */}
        <header className="flex items-center justify-between px-8 py-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg">openMaaS</span>
          </div>
          <nav className="flex items-center gap-6 text-sm text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">
              Features
            </a>
            <a href="#providers" className="hover:text-white transition-colors">
              Providers
            </a>
          </nav>
        </header>

        {/* Hero Section */}
        <section className="px-8 pt-20 pb-32 max-w-6xl mx-auto">
          <div className="text-center space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-slate-300">
                Open Source LLM Playground
              </span>
            </div>

            {/* Title */}
            <h1 className="text-2xl md:text-4xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                하나의 플레이그라운드로
              </span>
              <br />
              <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
                모든 LLM을 테스트
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
              OpenAI, Claude, Gemini, Bedrock 등 다양한 LLM API를
              <br className="hidden md:block" />
              <span className="text-white font-medium">
                당신의 API 키
              </span>
              로 직접 테스트하세요
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <button className="group px-8 py-4 bg-gradient-to-r from-violet-600 to-purple-600 rounded-xl font-semibold text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all hover:scale-105">
                <span className="flex items-center justify-center gap-2">
                  시작하기
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </button>
              <button className="px-8 py-4 bg-white/5 border border-white/10 rounded-xl font-semibold hover:bg-white/10 transition-all">
                문서 보기
              </button>
            </div>
          </div>
        </section>

        {/* Provider Cards */}
        <section id="providers" className="px-8 pb-24 max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-slate-200 mb-2">
              지원 제공자
            </h2>
            <p className="text-slate-500">
              BYOK (Bring Your Own Key) - 당신의 키로 직접 연결
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {providers.map((provider) => (
              <div
                key={provider.name}
                className="group relative"
                onMouseEnter={() => setHoveredProvider(provider.name)}
                onMouseLeave={() => setHoveredProvider(null)}
                style={{ animationDelay: provider.delay }}
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${provider.color} rounded-2xl opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500`}
                />
                <div className="relative p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all hover:scale-105 cursor-pointer">
                  <div
                    className={`w-10 h-10 rounded-xl bg-gradient-to-br ${provider.color} flex items-center justify-center mb-3 shadow-lg`}
                  >
                    <Cloud className="w-5 h-5 text-white" />
                  </div>
                  <p className="font-semibold text-white">{provider.name}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {provider.name === "Ollama" ? "로컬" : "클라우드"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section id="features" className="px-8 pb-32 max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group p-8 rounded-3xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 hover:border-white/20 transition-all"
              >
                <div
                  className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform`}
                >
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-slate-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Security Banner */}
        <section className="px-8 pb-32 max-w-4xl mx-auto">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 p-8 md:p-12">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px]" />
            <div className="relative flex flex-col md:flex-row items-center gap-8">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                <Lock className="w-10 h-10 text-white" />
              </div>
              <div className="text-center md:text-left">
                <h3 className="text-2xl font-bold text-white mb-2">
                  Zero-Knowledge 보안
                </h3>
                <p className="text-slate-400 max-w-lg">
                  API 키는 브라우저 로컬 스토리지에만 저장됩니다. 서버는 키를
                  저장하거나 로깅하지 않으며, CORS 지원 제공자는 브라우저에서
                  직접 호출합니다.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="px-8 py-12 border-t border-white/5">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-slate-500">
              <Bot className="w-5 h-5" />
              <span>openMaaS</span>
            </div>
            <p className="text-sm text-slate-600">
              Open Source · MIT License · Made with Next.js
            </p>
          </div>
        </footer>
      </div>
    </main>
  );
}
