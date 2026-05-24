import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { getSystemPrompt } from "@/lib/prompts";
import type { ModuleKey } from "@/lib/types";

export const runtime = "edge";
export const dynamic = "force-dynamic";

function isModuleKey(v: unknown): v is ModuleKey {
  return v === "creative" || v === "visual" || v === "comms" || v === "marketing";
}

// 初始化 OpenAI 客户端
const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
  baseURL: (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, ""),
});

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    if (!body || !isModuleKey(body.moduleKey) || !Array.isArray(body.messages)) {
      return new Response(JSON.stringify({ error: "参数错误" }), { status: 400 });
    }

    const moduleKey = body.moduleKey;
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    
    const temperature = model.startsWith("kimi-") ? 1 : 0.7;
    const maxOutputTokens = model.startsWith("kimi-") ? 1536 : 512;

    // 💡 【关键修复】：清洗数据。强制过滤掉前端传来的所有内容为空字符串的脏数据
    const validMessages = body.messages.filter(
      (m: any) => typeof m.content === "string" && m.content.trim() !== ""
    );
    
    const recent = validMessages.slice(-8);
    const system = getSystemPrompt(moduleKey);
    console.log("[api/chat] request", {
      moduleKey,
      model,
      temperature,
      maxOutputTokens,
      recentLength: recent.length,
      recent,
      systemSnippet: system.slice(0, 200),
    });

    const result = await streamText({
      model: openai.chat(model),
      system,
      messages: recent,
      temperature,
      maxOutputTokens,
      onChunk: async ({ chunk }) => {
        console.log("[api/chat] onChunk", { chunk });
      },
      onError: async ({ error }) => {
        console.error("[api/chat] onError", error);
      },
      onFinish: async (event) => {
        console.log("[api/chat] onFinish", {
          finishReason: event.finishReason,
          text: event.text,
          usage: event.usage,
        });
      },
    });

    return result.toTextStreamResponse();
  } catch (e) {
    const message = e instanceof Error ? e.message : "未知错误";
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}