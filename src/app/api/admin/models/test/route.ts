import { requireAdmin } from "@/lib/auth-utils";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { aiModels } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import OpenAI from "openai";

const testSchema = z.object({
  // Either provide a saved model id (for edit) or full credentials (for create)
  modelId: z.string().optional(),   // saved model id in DB
  baseUrl: z.string().url(),
  apiKey: z.string().min(1),
  modelIdentifier: z.string().min(1), // the actual model name e.g. "dall-e-3"
  type: z.enum(["image", "llm"]),
});

export async function POST(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = testSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  let { baseUrl, apiKey, modelIdentifier, type, modelId } = parsed.data;

  // If editing a saved model and api key is masked, load the real key from DB
  if (modelId && apiKey.startsWith("***")) {
    const saved = await db.select().from(aiModels).where(eq(aiModels.id, modelId)).get();
    if (!saved) return NextResponse.json({ error: "Model not found" }, { status: 404 });
    apiKey = saved.apiKey;
  }

  const client = new OpenAI({ apiKey, baseURL: baseUrl });
  const start = Date.now();

  try {
    if (type === "llm") {
      // Test with a minimal chat completion
      const res = await client.chat.completions.create({
        model: modelIdentifier,
        messages: [{ role: "user", content: "Say OK" }],
        max_tokens: 5,
      });
      const latency = Date.now() - start;
      const usage = (res as unknown as { usage?: { total_tokens?: number } }).usage;
      return NextResponse.json({
        ok: true,
        type: "llm",
        latencyMs: latency,
        model: res.model,
        tokens: usage?.total_tokens ?? null,
        message: `Connected successfully in ${latency}ms`,
      });
    } else {
      // Test image model — use models.list() if available, otherwise a minimal generate
      // Try listing models first (cheapest call, no cost)
      try {
        const list = await client.models.list();
        const latency = Date.now() - start;
        const found = list.data.some((m) => m.id === modelIdentifier);
        return NextResponse.json({
          ok: true,
          type: "image",
          latencyMs: latency,
          modelFound: found,
          message: found
            ? `Connected — model "${modelIdentifier}" confirmed in ${latency}ms`
            : `Connected but model "${modelIdentifier}" not found in provider list. Check Model ID.`,
        });
      } catch {
        // models.list() not supported by this provider — try a tiny generate
        const res = await client.images.generate({
          model: modelIdentifier,
          prompt: "a white circle",
          n: 1,
          size: "256x256" as Parameters<typeof client.images.generate>[0]["size"],
        });
        const latency = Date.now() - start;
        return NextResponse.json({
          ok: true,
          type: "image",
          latencyMs: latency,
          message: `Connected and generated successfully in ${latency}ms`,
        });
      }
    }
  } catch (err) {
    const latency = Date.now() - start;
    const message = err instanceof Error ? err.message : "Unknown error";
    // Extract status code if available
    const status = (err as { status?: number }).status;
    return NextResponse.json({
      ok: false,
      latencyMs: latency,
      error: message,
      status,
      message: `Connection failed: ${message}`,
    });
  }
}
