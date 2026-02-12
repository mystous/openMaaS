"use client";

import { useState, useEffect, useRef } from "react";
import { useKeyStore } from "@/lib/store/key-store";
import { usePlaygroundStore, type ChatMessage } from "@/lib/store/playground-store";
import { providerRouter } from "@/lib/llm/provider-router";
import {
  PROVIDERS,
  ProviderId,
} from "@openmaas/shared-types";
import type {
  Message,
  ChatChunk,
  ImageData,
  VideoData,
  AudioData,
} from "@/lib/llm/adapters/base";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Send,
  Loader2,
  Settings,
  Bot,
  User,
  Trash2,
  MessageSquare,
  ImageIcon,
  Film,
  Music,
  Volume2,
  Mic,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

// ── 탭 타입 & 상수 ──

type PlaygroundTab = "chat" | "image" | "video" | "music" | "tts" | "stt";

const PLAYGROUND_TABS = [
  { id: "chat" as const,  label: "Chat",  icon: MessageSquare, categories: ["chat"] },
  { id: "image" as const, label: "Image", icon: ImageIcon,     categories: ["image"] },
  { id: "video" as const, label: "Video", icon: Film,           categories: ["video"] },
  { id: "music" as const, label: "Music", icon: Music,          categories: ["music"] },
  { id: "tts" as const,   label: "TTS",   icon: Volume2,        categories: ["tts"] },
  { id: "stt" as const,   label: "STT",   icon: Mic,            categories: ["stt"] },
];

// ── 컴포넌트 ──

export default function ChatPage() {
  const { refreshConfigured, hasKey } = useKeyStore();
  const { messagesByModel, addMessage, clearModel } = usePlaygroundStore();
  const [provider, setProvider] = useState<ProviderId | null>(null);
  const [model, setModel] = useState("");
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [temperature, setTemperature] = useState(0.7);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<PlaygroundTab>("chat");

  // Video 설정
  const [videoAspectRatio, setVideoAspectRatio] = useState("16:9");
  const [videoResolution, setVideoResolution] = useState("720p");
  const [videoDuration, setVideoDuration] = useState(8);

  // Music 설정
  const [musicBpm, setMusicBpm] = useState(120);
  const [musicDuration, setMusicDuration] = useState(20);

  // TTS 설정
  const [ttsVoice, setTtsVoice] = useState("alloy");
  const [ttsSpeed, setTtsSpeed] = useState(1.0);

  // STT 설정
  const [sttFile, setSttFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── 파생 값 ──

  const currentTabConfig = PLAYGROUND_TABS.find((t) => t.id === activeTab)!;
  const messages = messagesByModel[model] ?? [];

  const tabModels = provider
    ? PROVIDERS[provider].models.filter((m) =>
        currentTabConfig.categories.includes(m.category)
      )
    : [];

  const availableProviders = mounted
    ? (Object.keys(PROVIDERS) as ProviderId[]).filter(
        (id) => id === "ollama" || hasKey(id)
      )
    : [];

  useEffect(() => {
    refreshConfigured();
    setMounted(true);
  }, [refreshConfigured]);

  useEffect(() => {
    if (mounted && !provider && availableProviders.length > 0) {
      const firstProvider = availableProviders[0];
      setProvider(firstProvider);
      const models = PROVIDERS[firstProvider]?.models.filter((m) =>
        currentTabConfig.categories.includes(m.category)
      );
      if (models && models.length > 0) {
        setModel(models[0].id);
      }
    }
  }, [mounted, availableProviders, provider, currentTabConfig.categories]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  useEffect(() => {
    if (!isStreaming) {
      inputRef.current?.focus();
    }
  }, [isStreaming]);

  useEffect(() => {
    if (!provider) return;
    const models = PROVIDERS[provider]?.models.filter((m) =>
      currentTabConfig.categories.includes(m.category)
    );
    if (models && models.length > 0) {
      setModel(models[0].id);
    } else {
      setModel("");
    }
  }, [provider, activeTab, currentTabConfig.categories]);

  useEffect(() => {
    setTtsVoice(provider === "gemini" ? "Kore" : "alloy");
  }, [provider]);

  // ── 핸들러 ──

  const handleTabChange = (tab: PlaygroundTab) => {
    if (tab === activeTab || isStreaming) return;
    setActiveTab(tab);
    setError(null);
    setSttFile(null);
  };

  const handleSend = async () => {
    if (!input.trim() || isStreaming || !provider || !model) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
      timestamp: Date.now(),
    };

    const currentModel = model;
    addMessage(currentModel, userMessage);
    setInput("");
    setIsStreaming(true);
    setStreamingContent("");
    setError(null);

    const allMessages: Message[] = messages
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }))
      .concat({ role: "user", content: userMessage.content });

    let fullContent = "";
    let ttft: number | undefined;
    const collectedImages: ImageData[] = [];
    const collectedVideos: VideoData[] = [];
    const collectedAudios: AudioData[] = [];
    const startTime = Date.now();

    try {
      const stream = providerRouter.chatStream(provider, {
        model,
        messages: allMessages,
        temperature,
        max_tokens: 4096,
        stream: true,
        videoConfig:
          activeTab === "video"
            ? {
                aspectRatio: videoAspectRatio,
                resolution: videoResolution,
                durationSeconds: videoDuration,
              }
            : undefined,
        musicConfig:
          activeTab === "music"
            ? { bpm: musicBpm, durationSeconds: musicDuration }
            : undefined,
        ttsConfig:
          activeTab === "tts"
            ? { voice: ttsVoice, speed: ttsSpeed }
            : undefined,
      });

      for await (const chunk of stream as AsyncIterable<ChatChunk>) {
        if (!ttft) {
          ttft = Date.now() - startTime;
        }
        const delta = chunk.choices[0]?.delta?.content;
        if (typeof delta === "string") {
          fullContent += delta;
          setStreamingContent(fullContent);
        }
        if (chunk.images?.length) {
          collectedImages.push(...chunk.images);
        }
        if (chunk.videos?.length) {
          collectedVideos.push(...chunk.videos);
        }
        if (chunk.audios?.length) {
          collectedAudios.push(...chunk.audios);
        }
      }

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: fullContent,
        timestamp: Date.now(),
        ttft,
        images: collectedImages.length > 0 ? collectedImages : undefined,
        videos: collectedVideos.length > 0 ? collectedVideos : undefined,
        audios: collectedAudios.length > 0 ? collectedAudios : undefined,
      };

      addMessage(currentModel, assistantMessage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류");
    } finally {
      setIsStreaming(false);
      setStreamingContent("");
    }
  };

  const handleTranscribe = async () => {
    if (!sttFile || isStreaming || !provider || !model) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: `🎙️ ${sttFile.name}`,
      timestamp: Date.now(),
    };

    const currentModel = model;
    addMessage(currentModel, userMessage);
    setIsStreaming(true);
    setError(null);

    try {
      const transcription = await providerRouter.transcribe(
        provider,
        sttFile,
        model
      );

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: transcription,
        timestamp: Date.now(),
      };

      addMessage(currentModel, assistantMessage);
      setSttFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류");
    } finally {
      setIsStreaming(false);
    }
  };

  const clearMessages = () => {
    if (!model) return;
    clearModel(model);
    setError(null);
  };

  // ── placeholder 텍스트 ──

  const inputPlaceholder: Record<PlaygroundTab, string> = {
    chat: "메시지를 입력하세요... (Enter로 전송)",
    image: "생성할 이미지를 설명하세요... (Enter로 전송)",
    video: "생성할 동영상을 설명하세요... (Enter로 전송)",
    music: "생성할 음악을 설명하세요... (Enter로 전송)",
    tts: "읽어줄 텍스트를 입력하세요... (Enter로 전송)",
    stt: "",
  };

  const emptyStateText: Record<PlaygroundTab, string> = {
    chat: "메시지를 입력해서 대화를 시작해보세요!",
    image: "이미지 생성을 위한 프롬프트를 입력하세요!",
    video: "동영상 생성을 위한 프롬프트를 입력하세요!",
    music: "음악 생성을 위한 프롬프트를 입력하세요!",
    tts: "텍스트를 입력하면 음성으로 변환합니다!",
    stt: "오디오 파일을 업로드하면 텍스트로 변환합니다!",
  };

  const streamingText: Record<PlaygroundTab, string> = {
    chat: "응답 생성 중...",
    image: "이미지 생성 중...",
    video: "동영상 생성 중... (수 분 소요)",
    music: "음악 생성 중...",
    tts: "음성 생성 중...",
    stt: "음성 인식 중...",
  };

  // ── 렌더 ──

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* 헤더 */}
      <header className="border-b shrink-0">
        <div className="container max-w-5xl mx-auto flex items-center gap-4 h-14 px-4">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="text-lg font-semibold">Playground</h1>

          <div className="ml-auto flex items-center gap-2">
            <Link href="/settings">
              <Button variant="outline" size="sm" className="gap-1">
                <Settings className="w-3 h-3" />
                API 키
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* 탭 바 */}
      <div className="border-b shrink-0">
        <div className="container max-w-5xl mx-auto px-4">
          <nav className="flex gap-1 -mb-px">
            {PLAYGROUND_TABS.map((tab) => {
              const Icon = tab.icon;
              const count = provider
                ? PROVIDERS[provider].models.filter((m) =>
                    tab.categories.includes(m.category)
                  ).length
                : 0;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  disabled={isStreaming}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors",
                    isActive
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30",
                    isStreaming && !isActive && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  <Badge
                    variant="secondary"
                    className="ml-1 h-5 min-w-[20px] px-1 text-[10px]"
                  >
                    {count}
                  </Badge>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="flex-1 container max-w-5xl mx-auto flex gap-4 p-4 overflow-hidden">
        {/* 사이드바: 설정 */}
        <Card className="w-64 shrink-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">모델 설정</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 제공자 선택 */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                제공자
              </label>
              <select
                value={provider ?? ""}
                onChange={(e) => setProvider(e.target.value as ProviderId)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                {availableProviders.map((id) => (
                  <option key={id} value={id}>
                    {PROVIDERS[id].name}
                  </option>
                ))}
              </select>
              {availableProviders.length === 0 && (
                <p className="text-xs text-red-500 mt-1">
                  설정된 API 키가 없어요.{" "}
                  <Link href="/settings" className="underline">
                    설정하기
                  </Link>
                </p>
              )}
            </div>

            {/* 모델 선택 */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                모델
              </label>
              {tabModels.length > 0 ? (
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {tabModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-xs text-muted-foreground py-2">
                  이 제공자에 {currentTabConfig.label} 모델이 없습니다.
                </p>
              )}
            </div>

            {/* Chat / Image 탭: Temperature */}
            {(activeTab === "chat" || activeTab === "image") && (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Temperature: {temperature}
                </label>
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={0.1}
                  value={temperature}
                  onChange={(e) => setTemperature(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            )}

            {/* TTS 탭: 음성 & 속도 */}
            {activeTab === "tts" && (
              <>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    음성
                  </label>
                  <select
                    value={ttsVoice}
                    onChange={(e) => setTtsVoice(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {provider === "gemini"
                      ? ["Kore","Puck","Charon","Zephyr","Fenrir","Leda","Orus","Aoede","Callirrhoe","Autonoe","Enceladus","Iapetus","Umbriel","Algieba","Despina","Erinome","Algenib","Rasalgethi","Laomedeia","Achernar","Alnilam","Schedar","Gacrux","Pulcherrima","Achird","Zubenelgenubi","Vindemiatrix","Sadachbia","Sadaltager","Sulafat"].map(
                          (v) => (
                            <option key={v} value={v}>{v}</option>
                          )
                        )
                      : ["alloy","ash","ballad","coral","echo","fable","nova","onyx","sage","shimmer","verse","marin","cedar"].map(
                          (v) => (
                            <option key={v} value={v}>
                              {v.charAt(0).toUpperCase() + v.slice(1)}
                            </option>
                          )
                        )
                    }
                  </select>
                </div>
                {provider !== "gemini" && (
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      속도: {ttsSpeed.toFixed(1)}x
                    </label>
                    <input
                      type="range"
                      min={0.25}
                      max={4.0}
                      step={0.25}
                      value={ttsSpeed}
                      onChange={(e) => setTtsSpeed(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                )}
              </>
            )}

            {/* Video 탭: 설정 */}
            {activeTab === "video" && (
              <>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    화면 비율
                  </label>
                  <select
                    value={videoAspectRatio}
                    onChange={(e) => setVideoAspectRatio(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="16:9">16:9 (가로)</option>
                    <option value="9:16">9:16 (세로)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    해상도
                  </label>
                  <select
                    value={videoResolution}
                    onChange={(e) => setVideoResolution(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="720p">720p</option>
                    <option value="1080p">1080p</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    길이: {videoDuration}초
                  </label>
                  <select
                    value={videoDuration}
                    onChange={(e) => setVideoDuration(Number(e.target.value))}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value={4}>4초</option>
                    <option value={6}>6초</option>
                    <option value={8}>8초</option>
                    <option value={12}>12초</option>
                  </select>
                </div>
              </>
            )}

            {/* Music 탭: 설정 */}
            {activeTab === "music" && (
              <>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    BPM: {musicBpm}
                  </label>
                  <input
                    type="range"
                    min={60}
                    max={200}
                    step={1}
                    value={musicBpm}
                    onChange={(e) => setMusicBpm(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    길이: {musicDuration}초
                  </label>
                  <input
                    type="range"
                    min={10}
                    max={30}
                    step={1}
                    value={musicDuration}
                    onChange={(e) => setMusicDuration(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              </>
            )}

            {/* 상태 표시 */}
            <div className="pt-2 border-t space-y-1">
              <div className="flex items-center gap-2 text-xs">
                <Badge
                  variant={
                    PROVIDERS[provider ?? "openai"]?.supportsCORS ? "outline" : "secondary"
                  }
                  className="text-[10px]"
                >
                  {PROVIDERS[provider ?? "openai"]?.supportsCORS
                    ? "직접 호출"
                    : "프록시 경유"}
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground">
                {PROVIDERS[provider ?? "openai"]?.supportsCORS
                  ? "브라우저에서 직접 API 호출"
                  : "Pass-through 프록시 경유"}
              </p>
            </div>

            {/* 초기화 */}
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1"
              onClick={clearMessages}
            >
              <Trash2 className="w-3 h-3" />
              대화 초기화
            </Button>
          </CardContent>
        </Card>

        {/* 메인 콘텐츠 영역 */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* 메시지 목록 */}
          <div className="flex-1 overflow-y-auto rounded-lg border bg-muted/30 p-4 space-y-4">
            {messages.length === 0 && !isStreaming && (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <currentTabConfig.icon className="w-12 h-12 mb-4 opacity-30" />
                <p className="text-sm">{emptyStateText[activeTab]}</p>
                <p className="text-xs mt-1">
                  {availableProviders.length > 0 && model
                    ? `${PROVIDERS[provider!]?.name} / ${model} 사용 중`
                    : "먼저 API 키를 설정해주세요"}
                </p>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[75%] rounded-lg px-4 py-2 ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background border"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div className="text-sm prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-pre:my-2 prose-code:text-xs prose-headings:my-2">
                      {msg.content && (
                        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                          {msg.content}
                        </ReactMarkdown>
                      )}
                      {msg.images?.map((img, i) => (
                        <img
                          key={i}
                          src={`data:${img.mimeType};base64,${img.data}`}
                          alt={`Generated image ${i + 1}`}
                          className="rounded-lg mt-2 max-w-full"
                        />
                      ))}
                      {msg.videos?.map((v, i) => (
                        <video
                          key={i}
                          src={v.url}
                          controls
                          className="rounded-lg mt-2 max-w-full"
                        />
                      ))}
                      {msg.audios?.map((a, i) => (
                        <audio
                          key={i}
                          src={a.url}
                          controls
                          className="mt-2 w-full"
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  )}
                  {msg.role === "assistant" && msg.ttft && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      TTFT: {msg.ttft}ms
                    </p>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
              </div>
            ))}

            {/* 스트리밍 중 */}
            {isStreaming && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div className="max-w-[75%] rounded-lg px-4 py-2 bg-background border">
                  {streamingContent ? (
                    <div className="text-sm prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-pre:my-2 prose-code:text-xs prose-headings:my-2">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                        {streamingContent}
                      </ReactMarkdown>
                      <span className="inline-block w-1.5 h-4 bg-primary animate-pulse ml-0.5" />
                    </div>
                  ) : (
                    <p className="text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        {streamingText[activeTab]}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* 에러 */}
            {error && (
              <div className="rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 p-3 text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* 입력 영역 */}
          {activeTab === "stt" ? (
            /* STT: 파일 업로드 UI */
            <div className="mt-3 flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={(e) => setSttFile(e.target.files?.[0] ?? null)}
                className="hidden"
              />
              <Button
                variant="outline"
                className="flex-1 gap-2 justify-start text-sm font-normal h-10"
                onClick={() => fileInputRef.current?.click()}
                disabled={isStreaming}
              >
                <Upload className="w-4 h-4 shrink-0" />
                {sttFile ? sttFile.name : "오디오 파일 선택..."}
              </Button>
              <Button
                onClick={handleTranscribe}
                disabled={isStreaming || !sttFile || !model}
                size="icon"
              >
                {isStreaming ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          ) : (
            /* 나머지 탭: 텍스트 입력 */
            <div className="mt-3 flex gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={inputPlaceholder[activeTab]}
                disabled={isStreaming || availableProviders.length === 0 || !model}
                className="flex-1"
              />
              <Button
                onClick={handleSend}
                disabled={
                  isStreaming || !input.trim() || availableProviders.length === 0 || !model
                }
                size="icon"
              >
                {isStreaming ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
