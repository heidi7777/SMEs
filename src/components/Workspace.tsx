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
  };

  const activeExpert = activeExpertId ? EXPERT_CONFIGS[activeExpertId] : undefined;

  return (
    <div className="workspaceRoot flex h-full w-full flex-col bg-gray-50">
      <div className="workspaceTabs flex shrink-0 gap-4 overflow-x-auto border-b bg-white p-4">
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
                  ? "isActive border-blue-600 bg-blue-50 font-semibold ring-2 ring-blue-200"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <div className="text-sm text-gray-500">{config?.name || id}</div>
              <div className="mt-2 text-sm text-gray-700 lineClamp2">
                {config?.description || "专家配置加载中..."}
              </div>
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="workspaceForm flex flex-1 gap-4 overflow-hidden p-4">
        <div className="workspaceInputPanel flex min-w-0 flex-1 flex-col rounded-lg bg-white p-4 shadow">
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
            className="workspaceActionBtn mt-4 inline-flex h-12 w-full items-center justify-center rounded-md bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {isLoading ? "AI思考中..." : "生成专属方案"}
          </button>
        </div>

        <div className="workspaceOutputPanel relative min-w-0 flex-1 overflow-y-auto rounded-lg bg-white p-6 shadow">
          {isLoading ? (
            <div className="workspaceLoadingOverlay absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/80">
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
