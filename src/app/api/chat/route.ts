import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { EXPERT_CONFIGS } from "@/lib/prompts";
import { NextResponse } from "next/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
  baseURL: (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, ""),
});

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const expertId = body?.expertId;
    const query = body?.query;

    if (typeof expertId !== "string" || typeof query !== "string") {
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    }

    const expertConfig = EXPERT_CONFIGS[expertId];
    if (!expertConfig) {
      return NextResponse.json({ error: "Invalid expertId" }, { status: 400 });
    }

    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    const result = await generateText({
      model: openai.chat(model),
      system: expertConfig.systemPrompt,
      messages: [{ role: "user", content: query }],
      temperature: 0.6,
    });

    return NextResponse.json({ text: result.text ?? "" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
