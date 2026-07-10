import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { aiModels } from "@/db/schema";
import { eq } from "drizzle-orm";
import { trackTokenUsage } from "@/lib/token-tracker";
import { z } from "zod";
import OpenAI from "openai";

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

  try {
    const client = new OpenAI({
      apiKey: model.apiKey,
      baseURL: model.baseUrl,
    });

    // currentPrompt is placed in a clearly delimited user-turn message to prevent
    // prompt injection from overriding the system persona
    const contextMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: CREATIVE_DIRECTOR_SYSTEM_PROMPT },
      ...(currentPrompt
        ? [{ role: "user" as const, content: `[Context] My current assembled prompt is:\n\`\`\`\n${currentPrompt}\n\`\`\`` }]
        : []),
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const response = await client.chat.completions.create({
      model: model.modelId,
      messages: contextMessages,
      max_tokens: 512,
      temperature: 0.7,
    });

    const rawApiResponse = response as unknown as Record<string, unknown>;

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

    const content = response.choices[0]?.message?.content ?? "";
    return NextResponse.json({ content });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
