"use client";

import { useState, type FormEvent } from "react";
import ReactMarkdown from "react-markdown";
import { EXPERT_CONFIGS } from "@/lib/prompts";

interface WorkspaceProps {
  moduleExperts: string[];
}

export default function Workspace({ moduleExperts }: WorkspaceProps) {
  const [activeExpertId, setActiveExpertId] = useState<string>(moduleExperts[0] || "");
  const [userInput, setUserInput] = useState<string>("");
  const [resultText, setResultText] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const handleExpertChange = (expertId: string) => {
    setActiveExpertId(expertId);
    if (!expertId) {
      setUserInput("");
      setResultText("");
      return;
    }
    const config = EXPERT_CONFIGS[expertId];
    setResultText("");
    setUserInput(config?.defaultTemplate || "");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeExpertId) return;

    setIsLoading(true);
    setResultText("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ expertId: activeExpertId, query: userInput }),
      });

      const data = await response.json();
      setResultText(data.text || "");
    } catch {
      setResultText("请求出错，请稍后重试。");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!resultText) return;
    await navigator.clipboard.writeText(resultText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activeExpert = activeExpertId ? EXPERT_CONFIGS[activeExpertId] : undefined;

  return (
    <div className="workspaceRoot flex h-full w-full flex-col">
      <div className="workspaceTabs flex shrink-0 gap-4 overflow-x-auto p-4">
        {moduleExperts.map((id) => {
          const config = EXPERT_CONFIGS[id];
          const isActive = id === activeExpertId;
          return (
            <button
              key={id}
              type="button"
              onClick={() => handleExpertChange(id)}
              className={`workspaceExpertCard min-w-[160px] rounded-xl border px-4 py-3 text-left transition-all ${
                isActive
                  ? "isActive font-semibold ring-2"
                  : ""
              }`}
            >
              <div className="text-sm" style={{ color: "var(--muted)" }}>{config?.name || id}</div>
              <div className="mt-2 text-sm lineClamp2" style={{ color: "var(--text)" }}>
                {config?.description || "专家配置加载中…"}
              </div>
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="workspaceForm flex flex-1 gap-4 overflow-hidden">
        <div className="workspaceInputPanel flex min-w-0 flex-1 flex-col rounded-lg p-4">
          <div className="mb-4 text-lg font-semibold" style={{ color: "var(--text)" }}>
            {activeExpert?.name || "请选择专家"}
          </div>
          <textarea
            className="treaTextarea flex-1 resize-none"
            value={userInput}
            onChange={(event) => setUserInput(event.target.value)}
            placeholder="请在此输入您的需求与背景信息…"
            aria-label="输入需求"
          />
          <button
            type="submit"
            disabled={isLoading || !activeExpertId}
            className="workspaceActionBtn mt-4 inline-flex h-12 w-full items-center justify-center rounded-md px-4 text-sm font-semibold transition disabled:cursor-not-allowed"
          >
            {isLoading ? "AI 思考中…" : "生成专属方案"}
          </button>
        </div>

        <div className="workspaceOutputPanel relative min-w-0 flex-1 overflow-y-auto rounded-lg p-6">
          {isLoading ? (
            <div className="workspaceLoadingOverlay absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div
                className="h-12 w-12 animate-spin rounded-full border-4"
                style={{ borderColor: "rgba(124, 92, 255, 0.3)", borderTopColor: "var(--primary)" }}
              />
              <div style={{ color: "var(--text)" }}>AI 正在生成，请稍候…</div>
            </div>
          ) : resultText ? (
            <>
              <button
                type="button"
                onClick={handleCopy}
                className="button absolute right-6 top-6 px-3 py-1 text-sm"
                aria-live="polite"
              >
                {copied ? "已复制" : "一键复制"}
              </button>
              <div className="prose max-w-none pt-2" style={{ color: "var(--text)" }}>
                <ReactMarkdown>{resultText}</ReactMarkdown>
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center" style={{ color: "var(--muted)" }}>
              <p className="text-base">请在左侧补充信息后点击生成</p>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
