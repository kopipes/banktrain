import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { aiModels } from "@/db/schema";
import { eq } from "drizzle-orm";
import { trackTokenUsage } from "@/lib/token-tracker";
import { z } from "zod";

const CREATIVE_DIRECTOR_SYSTEM_PROMPT = `You are an expert Creative Director and AI Image Prompting Specialist.
Your role is to help users craft precise, high-quality prompts for AI image generation.

Guidelines:
- Give concrete, actionable advice about prompt structure and word choice
- Explain techniques like subject specificity, lighting vocabulary, style modifiers, and negative prompts
- Reference the user's current prompt when they share it and suggest specific improvements
- Keep responses concise and practical — max 3-4 sentences unless a detailed breakdown is requested
- Use the PRD-aligned hybrid prompt structure: Subject → Action → Environment → Lighting → Style → Color Palette
- Share examples of strong keywords and explain why they work
- Be direct and technical — avoid vague platitudes`;

const mentorSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    })
  ),
  currentPrompt: z.string().optional(),
  modelId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as { id: string; division?: string };

  const body = await req.json();
  const parsed = mentorSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { messages, currentPrompt, modelId } = parsed.data;

  const model = await db.select().from(aiModels).where(eq(aiModels.id, modelId)).get();
  if (!model || !model.isActive || model.type !== "llm") {
    return NextResponse.json({ error: "LLM model not found or inactive." }, { status: 404 });
  }

  // Build context messages
  const contextMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: CREATIVE_DIRECTOR_SYSTEM_PROMPT },
    ...(currentPrompt
      ? [{ role: "user" as const, content: `[Context] My current assembled prompt is:\n\`\`\`\n${currentPrompt}\n\`\`\`` }]
      : []),
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  try {
    // Some providers (e.g. openagentic) append `data: [DONE]\n\n` after the JSON
    // body even when stream=false, which breaks JSON.parse. Use raw fetch and
    // strip the SSE trailer before parsing.
    const rawRes = await fetch(`${model.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${model.apiKey}`,
      },
      body: JSON.stringify({
        model: model.modelId,
        messages: contextMessages,
        max_tokens: 512,
        temperature: 0.7,
        stream: false,
      }),
    });

    if (!rawRes.ok) {
      const errText = await rawRes.text();
      return NextResponse.json(
        { error: `API error ${rawRes.status}: ${errText.slice(0, 200)}` },
        { status: 500 }
      );
    }

    const rawText = await rawRes.text();
    // Strip trailing SSE `data: [DONE]` trailer appended by some providers
    const jsonText = rawText.replace(/\s*data:\s*\[DONE\]\s*$/, "").trim();

    let parsed: { choices?: Array<{ message?: { content?: string } }>; usage?: Record<string, unknown> };
    try {
      parsed = JSON.parse(jsonText) as typeof parsed;
    } catch {
      return NextResponse.json(
        { error: `Failed to parse API response: ${jsonText.slice(0, 200)}` },
        { status: 500 }
      );
    }

    const rawApiResponse = parsed as unknown as Record<string, unknown>;

    // Track LLM token usage
    await trackTokenUsage({
      userId: user.id,
      division: user.division ?? "general",
      modelId: model.id,
      type: "llm",
      pricePerToken: model.pricePerToken,
      pricePerImage: 0,
      rawApiResponse,
    });

    const content = parsed.choices?.[0]?.message?.content ?? "";
    return NextResponse.json({ content });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
