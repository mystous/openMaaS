"use client";

import { useState, useEffect } from "react";
import { useKeyStore } from "@/lib/store/key-store";
import { PROVIDERS, ProviderConfig } from "@openmaas/shared-types";
import { StorageType } from "@/lib/llm/key-manager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Eye,
  EyeOff,
  Trash2,
  ExternalLink,
  Check,
  Shield,
  ArrowLeft,
  KeyRound,
} from "lucide-react";
import Link from "next/link";

export default function SettingsPage() {
  const { configuredProviders, addKey, removeKey, hasKey, refreshConfigured } =
    useKeyStore();

  useEffect(() => {
    refreshConfigured();
  }, [refreshConfigured]);

  const providerList = Object.values(PROVIDERS);
  const directProviders = providerList.filter((p) => p.supportsCORS);
  const proxyProviders = providerList.filter((p) => !p.supportsCORS);

  return (
    <div className="min-h-screen bg-background">
      {/* 헤더 */}
      <header className="border-b">
        <div className="container max-w-4xl mx-auto flex items-center gap-4 h-14 px-4">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5" />
            <h1 className="text-lg font-semibold">API 키 설정</h1>
          </div>
          <Badge variant="secondary" className="ml-auto">
            {configuredProviders.length}개 설정됨
          </Badge>
        </div>
      </header>

      <main className="container max-w-4xl mx-auto py-8 px-4">
        {/* 직접 호출 제공자 */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-1">직접 호출 (CORS 지원)</h2>
          <p className="text-sm text-muted-foreground mb-4">
            브라우저에서 직접 API를 호출합니다. 서버를 경유하지 않아요.
          </p>
          <div className="space-y-3">
            {directProviders.map((provider) => (
              <ProviderKeyCard
                key={provider.id}
                provider={provider}
                isConfigured={hasKey(provider.id)}
                onSave={(key, storage) => addKey(provider.id, key, storage)}
                onRemove={() => removeKey(provider.id)}
              />
            ))}
          </div>
        </section>

        {/* 프록시 경유 제공자 */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-1">프록시 경유 (CORS 미지원)</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Pass-through 프록시를 통해 호출합니다. 키는 서버에 저장되지 않아요.
          </p>
          <div className="space-y-3">
            {proxyProviders.map((provider) => (
              <ProviderKeyCard
                key={provider.id}
                provider={provider}
                isConfigured={hasKey(provider.id)}
                onSave={(key, storage) => addKey(provider.id, key, storage)}
                onRemove={() => removeKey(provider.id)}
              />
            ))}
          </div>
        </section>

        {/* 보안 안내 */}
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <Shield className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
              <div>
                <h3 className="font-semibold mb-2">Zero-Knowledge 보안</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>
                    API 키는 브라우저의 localStorage에만 저장됩니다.
                  </li>
                  <li>
                    서버로 전송되거나 저장되지 않습니다.
                  </li>
                  <li>
                    프록시 경유 시에도 키는 메모리에서 즉시 전달 후 폐기됩니다.
                  </li>
                  <li>
                    공용 컴퓨터에서는 &quot;세션 저장소&quot; 사용을 권장합니다.
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function ProviderKeyCard({
  provider,
  isConfigured,
  onSave,
  onRemove,
}: {
  provider: ProviderConfig;
  isConfigured: boolean;
  onSave: (key: string, storage: StorageType) => void;
  onRemove: () => void;
}) {
  const [key, setKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [storageType, setStorageType] = useState<StorageType>("local");
  const [isEditing, setIsEditing] = useState(false);
  const { validateKey } = useKeyStore();

  const handleSave = () => {
    if (!key.trim()) return;

    // Ollama는 키 불필요
    if (provider.id === "ollama") {
      onSave("ollama-local", storageType);
      setKey("");
      setIsEditing(false);
      return;
    }

    onSave(key.trim(), storageType);
    setKey("");
    setIsEditing(false);
  };

  const handleRemove = () => {
    onRemove();
    setIsEditing(false);
    setKey("");
  };

  const isValidKey =
    !key.trim() || provider.id === "ollama" || validateKey(provider.id, key);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-base">{provider.name}</CardTitle>
            {provider.supportsCORS ? (
              <Badge variant="outline" className="text-xs">
                직접 호출
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                프록시
              </Badge>
            )}
          </div>
          {isConfigured && (
            <Badge className="bg-green-600 hover:bg-green-600">
              <Check className="w-3 h-3 mr-1" />
              설정됨
            </Badge>
          )}
        </div>
        <CardDescription>{provider.description}</CardDescription>
      </CardHeader>

      <CardContent>
        {isConfigured && !isEditing ? (
          /* 설정 완료 상태 */
          <div className="flex items-center gap-2">
            <Input
              value="••••••••••••••••••••"
              disabled
              className="font-mono"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              변경
            </Button>
            <Button variant="destructive" size="icon" onClick={handleRemove}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          /* 입력 상태 */
          <div className="space-y-3">
            {provider.id !== "ollama" && (
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showKey ? "text" : "password"}
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    placeholder={provider.keyPlaceholder}
                    className={`font-mono pr-10 ${
                      key && !isValidKey ? "border-red-500" : ""
                    }`}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSave();
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowKey(!showKey)}
                    tabIndex={-1}
                  >
                    {showKey ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            )}

            {key && !isValidKey && (
              <p className="text-xs text-red-500">
                키 형식이 올바르지 않습니다. ({provider.keyPlaceholder} 형식)
              </p>
            )}

            <div className="flex items-center gap-2">
              {/* 저장 위치 선택 */}
              <div className="flex items-center gap-1 text-xs">
                <span className="text-muted-foreground">저장:</span>
                {(["local", "session", "memory"] as StorageType[]).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStorageType(st)}
                    className={`px-2 py-1 rounded text-xs transition-colors ${
                      storageType === st
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80"
                    }`}
                  >
                    {st === "local"
                      ? "영구"
                      : st === "session"
                        ? "세션"
                        : "일회성"}
                  </button>
                ))}
              </div>

              <div className="ml-auto flex items-center gap-2">
                {isEditing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsEditing(false);
                      setKey("");
                    }}
                  >
                    취소
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={
                    provider.id !== "ollama" && (!key.trim() || !isValidKey)
                  }
                >
                  저장
                </Button>
                <a
                  href={provider.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="link" size="sm" className="gap-1">
                    <ExternalLink className="w-3 h-3" />
                    키 발급
                  </Button>
                </a>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
