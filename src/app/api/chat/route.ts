import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { EXPERT_CONFIGS } from "@/lib/prompts";
import { NextResponse } from "next/server";
import type { ModuleKey } from "@/lib/types";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
  baseURL: (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, ""),
});

const MODULE_PROMPTS: Record<ModuleKey, string> = {
  creative: "当前模块：创意策略工坊。产出应聚焦创新、方案可行性与差异化。",
  visual: "当前模块：视觉车间。产出应聚焦视觉表达、风格统一与可执行参数。",
  comms: "当前模块：沟通台。产出应聚焦沟通策略、共识路径与风险控制。",
  marketing: "当前模块：营销工坊。产出应聚焦市场定位、传播逻辑与商业转化。",
};

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const expertId = body?.expertId;
    const query = body?.query;
    const moduleKey = body?.moduleKey;
    const moduleName = body?.moduleName;

    if (typeof expertId !== "string" || typeof query !== "string" || typeof moduleKey !== "string") {
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    }

    const expertConfig = EXPERT_CONFIGS[expertId];
    if (!expertConfig) {
      return NextResponse.json({ error: "Invalid expertId" }, { status: 400 });
    }

    if (!(moduleKey in MODULE_PROMPTS)) {
      return NextResponse.json({ error: "Invalid moduleKey" }, { status: 400 });
    }

    const dynamicPrompt = [
      `【Module】${moduleName || moduleKey}`,
      `【Expert】${expertConfig.name}`,
      `【User Input】\n${query}`,
    ].join("\n\n");

    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    const result = await generateText({
      model: openai.chat(model),
      system: `${MODULE_PROMPTS[moduleKey as ModuleKey]}\n\n${expertConfig.systemPrompt}`,
      messages: [{ role: "user", content: dynamicPrompt }],
      temperature: 0.6,
    });

    return NextResponse.json({ text: result.text ?? "" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
