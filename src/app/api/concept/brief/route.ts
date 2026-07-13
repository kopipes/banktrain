import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { aiModels } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const briefSchema = z.object({
  brief: z.object({
    eventName: z.string(),
    objective: z.string(),
    targetAudience: z.string(),
    brandName: z.string(),
    brandValues: z.string(),
    brandColors: z.string(),
    expectedAttendees: z.string(),
    eventDate: z.string(),
    eventDuration: z.string(),
    additionalNotes: z.string(),
  }),
  modelId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = briefSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { brief, modelId } = parsed.data;

  const model = await db.select().from(aiModels).where(eq(aiModels.id, modelId)).get();
  if (!model || !model.isActive || model.type !== "llm") {
    return NextResponse.json({ error: "LLM model not found or inactive." }, { status: 404 });
  }

  const prompt = `You are a senior event design consultant. Based on this event brief, suggest 5 compelling narrative themes for the event concept. Return ONLY a JSON array of 5 short theme names (2-5 words each), nothing else.

Brief:
- Event Name: ${brief.eventName}
- Objective: ${brief.objective}
- Target Audience: ${brief.targetAudience}
- Brand: ${brief.brandName} — ${brief.brandValues}
- Brand Colors: ${brief.brandColors}
- Attendees: ${brief.expectedAttendees}
- Duration: ${brief.eventDuration}
${brief.additionalNotes ? `- Notes: ${brief.additionalNotes}` : ""}

Return format: ["Theme 1", "Theme 2", "Theme 3", "Theme 4", "Theme 5"]`;

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
        max_tokens: 200,
        temperature: 0.8,
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

    // Extract JSON array from content (may have markdown fences)
    const match = content.match(/\[[\s\S]*\]/);
    const themes: string[] = match ? JSON.parse(match[0]) : [];

    return NextResponse.json({ themes });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
