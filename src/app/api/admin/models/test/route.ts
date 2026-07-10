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
  provider: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = testSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  let { baseUrl, apiKey, modelIdentifier, type, modelId, provider } = parsed.data;

  // If editing a saved model and api key is masked, load the real key from DB
  if (modelId && apiKey.startsWith("***")) {
    const saved = await db.select().from(aiModels).where(eq(aiModels.id, modelId)).get();
    if (!saved) return NextResponse.json({ error: "Model not found" }, { status: 404 });
    apiKey = saved.apiKey;
    if (!provider) provider = saved.provider;
  }

  const start = Date.now();

  // ── kie.ai provider — uses async task/poll, not OpenAI-compatible ─────────
  if (provider === "kie.ai") {
    try {
      const res = await fetch(`${baseUrl}/api/v1/jobs/createTask`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: modelIdentifier,
          input: { prompt: "a white circle", aspect_ratio: "1:1", resolution: "1K" },
        }),
      });
      const latency = Date.now() - start;
      const data = await res.json() as { code?: number; msg?: string; data?: { taskId?: string } };

      if (data.code === 200 && data.data?.taskId) {
        return NextResponse.json({
          ok: true,
          type: "image",
          latencyMs: latency,
          message: `kie.ai connected successfully in ${latency}ms. Task created: ${data.data.taskId}`,
        });
      }
      return NextResponse.json({
        ok: false,
        latencyMs: latency,
        error: data.msg ?? "Unknown error",
        message: `kie.ai connection failed: ${data.msg ?? "Unknown error"}`,
      });
    } catch (err) {
      const latency = Date.now() - start;
      const message = err instanceof Error ? err.message : "Unknown error";
      return NextResponse.json({ ok: false, latencyMs: latency, error: message, message: `Connection failed: ${message}` });
    }
  }

  // ── OpenAI-compatible providers ───────────────────────────────────────────
  const client = new OpenAI({ apiKey, baseURL: baseUrl });

  try {
    if (type === "llm") {
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
            ? `Connected successfully in ${latency}ms. Model confirmed.`
            : `Connected in ${latency}ms, but model "${modelIdentifier}" not found in list — double-check the ID.`,
        });
      } catch {
        // models.list() not supported — try a tiny generate
        const res = await client.images.generate({
          model: modelIdentifier,
          prompt: "a white circle",
          n: 1,
          size: "256x256" as Parameters<typeof client.images.generate>[0]["size"],
        });
        void res;
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
