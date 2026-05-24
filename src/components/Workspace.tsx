"use client";

import { useState, useEffect, type FormEvent } from "react";
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

  useEffect(() => {
    if (!activeExpertId) {
      setUserInput("");
      setResultText("");
      return;
    }

    const config = EXPERT_CONFIGS[activeExpertId];
    setResultText("");
    setUserInput(config?.defaultTemplate || "");
  }, [activeExpertId]);

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
    } catch (error) {
      setResultText("请求出错，请稍后重试。");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!resultText) return;
    await navigator.clipboard.writeText(resultText);
  };

  const activeExpert = activeExpertId ? EXPERT_CONFIGS[activeExpertId] : undefined;

  return (
    <div className="flex flex-col h-full w-full bg-gray-50">
      <div className="flex gap-4 p-4 border-b bg-white overflow-x-auto shrink-0">
        {moduleExperts.map((id) => {
          const config = EXPERT_CONFIGS[id];
          const isActive = id === activeExpertId;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setActiveExpertId(id)}
              className={`min-w-[160px] rounded-xl border px-4 py-3 text-left transition-all ${
                isActive
                  ? "border-blue-600 bg-blue-50 ring-2 ring-blue-200 font-semibold"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <div className="text-sm text-gray-500">{config?.name || id}</div>
              <div className="mt-2 text-sm text-gray-700 line-clamp-2">
                {config?.description || "专家配置加载中..."}
              </div>
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-1 overflow-hidden p-4 gap-4">
        <div className="flex-1 bg-white rounded-lg shadow flex flex-col p-4 min-w-0">
          <div className="mb-4 text-lg font-semibold text-gray-800">
            {activeExpert?.name || "请选择专家"}
          </div>
          <textarea
            className="flex-1 w-full resize-none border border-gray-200 bg-white p-4 text-sm text-gray-800 focus:outline-none"
            value={userInput}
            onChange={(event) => setUserInput(event.target.value)}
            placeholder="请在此输入您的需求与背景信息..."
          />
          <button
            type="submit"
            disabled={isLoading || !activeExpertId}
            className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-md bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {isLoading ? "AI思考中..." : "生成专属方案"}
          </button>
        </div>

        <div className="flex-1 bg-white rounded-lg shadow p-6 overflow-y-auto relative min-w-0">
          {isLoading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/80">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-300 border-t-blue-600" />
              <div className="text-gray-700">AI 正在生成，请稍候...</div>
            </div>
          ) : resultText ? (
            <>
              <button
                type="button"
                onClick={handleCopy}
                className="absolute right-6 top-6 rounded-md border border-gray-200 bg-white px-3 py-1 text-sm text-gray-700 shadow-sm hover:bg-gray-50"
              >
                一键复制
              </button>
              <div className="prose max-w-none pt-2 text-gray-800">
                <ReactMarkdown>{resultText}</ReactMarkdown>
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center text-gray-500">
              <p className="text-base">请在左侧补充信息后点击生成</p>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
