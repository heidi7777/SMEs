import { NextResponse } from "next/server";
import { getSystemPrompt } from "@/lib/prompts";
import { createChatCompletion } from "@/lib/openai";
import type { ModuleKey } from "@/lib/types";

function isModuleKey(v: unknown): v is ModuleKey {
  return v === "creative" || v === "visual" || v === "comms" || v === "marketing";
}

function safeJsonParse<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function extractJsonObject(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return text.slice(start, end + 1);
}

const defaultChips: Record<ModuleKey, string[]> = {
  creative: ["再来 5 个创意方向", "做 JTBD 竞品拆解", "把方案写成一句话卖点"],
  visual: ["再给 2 套 Prompt", "加留白/构图参数", "把“高级感”转成 PBR 参数"],
  comms: ["提炼成事实清单", "生成 A/B 选项确认", "输出 NVC 话术并含底线"],
  marketing: ["按黄金圈出 PPT 大纲", "按 STP 写卖点清单", "生成小红书种草文案"],
};

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as
      | {
          moduleKey?: unknown;
          messages?: Array<{ role: "user" | "assistant"; content: string }>;
        }
      | null;

    if (!body || !isModuleKey(body.moduleKey) || !Array.isArray(body.messages)) {
      return NextResponse.json({ error: "参数错误" }, { status: 400 });
    }

    const moduleKey = body.moduleKey;
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

    // 滑动窗口：最近 10 条（5 轮）+ 最新输入（已在 messages 内）
    const recent = body.messages.slice(-10);
    const system = getSystemPrompt(moduleKey);

    const completion = await createChatCompletion({
      model,
      temperature: 0.7,
      messages: [{ role: "system", content: system }, ...recent],
    });

    const content = completion.choices?.[0]?.message?.content ?? "";
    const jsonText = extractJsonObject(content) ?? content;
    const parsed = safeJsonParse<{ answer?: string; chips?: string[] }>(jsonText);

    const answer = parsed?.answer?.trim() || content.trim() || "（无输出）";
    const chips = (parsed?.chips ?? defaultChips[moduleKey]).filter(Boolean).slice(0, 3);

    return NextResponse.json({ answer, chips });
  } catch (e) {
    const message = e instanceof Error ? e.message : "未知错误";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

