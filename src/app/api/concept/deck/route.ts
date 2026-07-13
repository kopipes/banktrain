import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { aiModels } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const deckSchema = z.object({
  llmModelId: z.string().min(1),
  paradigm: z.enum(["full_concept", "budget_fit"]),
  brief: z.object({
    eventName: z.string(),
    objective: z.string(),
    targetAudience: z.string(),
    brandName: z.string(),
    brandValues: z.string(),
  }),
  theme: z.string(),
  narrative: z.string().optional(),
  visualCount: z.number().default(3),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = deckSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { llmModelId, paradigm, brief, theme } = parsed.data;

  const model = await db.select().from(aiModels).where(eq(aiModels.id, llmModelId)).get();
  if (!model || !model.isActive || model.type !== "llm") {
    return NextResponse.json({ error: "LLM model not found or inactive." }, { status: 404 });
  }

  const budgetSlide = paradigm === "budget_fit"
    ? `- "budget": A slide titled "Budget & Feasibility" with a brief cost-benefit narrative`
    : "";

  const prompt = `You are a senior event concept strategist. Generate a structured narrative pitch deck for this event.

Event: ${brief.eventName}
Objective: ${brief.objective}
Target Audience: ${brief.targetAudience}
Brand: ${brief.brandName} — ${brief.brandValues}
Concept Theme: ${theme}
Paradigm: ${paradigm === "full_concept" ? "Full Concept (Blue Sky)" : "Budget Fit (Value-Engineered)"}

Generate a JSON array of slide objects. Each slide must have: type, title, body.
Required slides in order:
- "title": Hook slide with event name and theme tagline
- "background": The "Why" — context and opportunity
- "narrative": The storyline — 3-4 sentence concept narrative
- "overall_layout": Venue and spatial allocation overview
- "zone_detail": Key zones and booth highlights
${budgetSlide}
- "closing": Call to action and next steps

Return ONLY valid JSON array, no markdown fences:
[{"type":"title","title":"...","body":"..."},...]`;

  try {
    const rawRes = await fetch(`${model.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${model.apiKey}`,
      },
      body: JSON.stringify({
        model: model.modelId,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1500,
        temperature: 0.7,
        stream: false,
      }),
    });

    if (!rawRes.ok) {
      const errText = await rawRes.text();
      return NextResponse.json({ error: `API error ${rawRes.status}: ${errText.slice(0, 200)}` }, { status: 500 });
    }

    const rawText = await rawRes.text();
    const jsonText = rawText.replace(/\s*data:\s*\[DONE\]\s*$/, "").trim();
    const data = JSON.parse(jsonText) as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content ?? "[]";

    // Extract JSON array
    const match = content.match(/\[[\s\S]*\]/);
    const slides = match ? JSON.parse(match[0]) : [];

    return NextResponse.json({ slides });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
