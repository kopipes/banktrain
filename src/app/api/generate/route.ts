import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { generations, aiModels } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateId } from "@/lib/utils";
import { trackTokenUsage, checkQuota } from "@/lib/token-tracker";
import { saveImage } from "@/lib/storage";
import { logTelemetry } from "@/lib/telemetry";
import { z } from "zod";
import OpenAI from "openai";

const generateSchema = z.object({
  fullPrompt: z.string().min(1),
  negativePrompt: z.string().optional(),
  subject: z.string().optional(),
  action: z.string().optional(),
  environment: z.string().optional(),
  lighting: z.string().optional(),
  style: z.string().optional(),
  colorPalette: z.string().optional(),
  modelId: z.string().min(1),
  seed: z.number().optional(),
  cfgScale: z.number().min(1).max(30).optional().default(7),
  steps: z.number().min(1).max(150).optional().default(30),
  aspectRatio: z.string().optional().default("1:1"),
  isPublic: z.boolean().optional().default(false),
  generationType: z.enum(["text-to-image", "image-to-image"]).optional().default("text-to-image"),
  inputImageUrl: z.string().optional(), // for image-to-image — base64 data URL or remote URL
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as { id: string; division?: string };

  const body = await req.json();
  const parsed = generateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  // Run quota check and model fetch in parallel — neither depends on the other
  const [quota, model] = await Promise.all([
    checkQuota(user.division ?? "general"),
    db.select().from(aiModels).where(eq(aiModels.id, data.modelId)).get(),
  ]);

  if (!quota.allowed) {
    return NextResponse.json(
      { error: `Division quota exceeded. Used: ${quota.used.toFixed(0)} / ${quota.budget.toFixed(0)} IDR this month.` },
      { status: 429 }
    );
  }

  if (!model || !model.isActive) {
    return NextResponse.json({ error: "Model not found or inactive." }, { status: 404 });
  }

  const genId = generateId();
  const resolvedSeed = data.seed ?? Math.floor(Math.random() * 2 ** 31);

  // Insert pending record
  await db.insert(generations).values({
    id: genId,
    userId: user.id,
    modelId: model.id,
    subject: data.subject,
    action: data.action,
    environment: data.environment,
    lighting: data.lighting,
    style: data.style,
    colorPalette: data.colorPalette,
    negativePrompt: data.negativePrompt,
    fullPrompt: data.fullPrompt,
    seed: resolvedSeed,
    cfgScale: data.cfgScale,
    steps: data.steps,
    aspectRatio: data.aspectRatio,
    isPublic: data.isPublic,
    status: "pending",
  });

  try {
    let imageData: string; // base64
    let rawApiResponse: Record<string, unknown> = {};
    const [w, h] = aspectRatioToDimensions(data.aspectRatio);

    if (model.provider === "kie.ai") {
      // ── kie.ai async task/poll flow ─────────────────────────────────────────
      const isImg2Img = data.generationType === "image-to-image";

      // Build input payload — image-to-image needs input_urls
      const kieInput: Record<string, unknown> = {
        prompt: data.fullPrompt,
        aspect_ratio: data.aspectRatio ?? "1:1",
        resolution: "1K",
      };

      if (isImg2Img && data.inputImageUrl) {
        // kie.ai accepts either a URL array or base64 — we send as URL array
        // If it's a base64 data URL, upload to storage first then send the URL
        if (data.inputImageUrl.startsWith("data:")) {
          const base64 = data.inputImageUrl.split(",")[1];
          const inputKey = `input_${genId}.png`;
          const { url: inputUrl } = await saveImage(base64, inputKey);
          kieInput.input_urls = [inputUrl];
        } else {
          kieInput.input_urls = [data.inputImageUrl];
        }
      }

      const createRes = await fetch(`${model.baseUrl}/api/v1/jobs/createTask`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${model.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: model.modelId,
          input: kieInput,
        }),
      });

      const createData = await createRes.json() as {
        code?: number;
        msg?: string;
        data?: { taskId?: string };
      };

      if (createData.code !== 200 || !createData.data?.taskId) {
        throw new Error(`kie.ai task creation failed: ${createData.msg ?? "Unknown error"}`);
      }

      const taskId = createData.data.taskId;

      // Poll for result — max 120s, every 3s
      const pollStart = Date.now();
      const POLL_INTERVAL = 3000;
      const POLL_TIMEOUT = 120_000;
      let resultUrl: string | null = null;

      while (Date.now() - pollStart < POLL_TIMEOUT) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL));

        const pollRes = await fetch(
          `${model.baseUrl}/api/v1/jobs/recordInfo?taskId=${taskId}`,
          { headers: { "Authorization": `Bearer ${model.apiKey}` } }
        );
        const pollData = await pollRes.json() as {
          code?: number;
          data?: {
            state?: string;
            resultJson?: string;
            failMsg?: string;
            creditsConsumed?: number;
          };
        };

        if (pollData.code !== 200 || !pollData.data) continue;

        const { state, resultJson, failMsg } = pollData.data;

        if (state === "failed") {
          throw new Error(`kie.ai generation failed: ${failMsg ?? "Unknown error"}`);
        }

        if (state === "success" && resultJson) {
          const result = JSON.parse(resultJson) as { resultUrls?: string[] };
          resultUrl = result.resultUrls?.[0] ?? null;
          rawApiResponse = pollData.data as Record<string, unknown>;
          break;
        }
      }

      if (!resultUrl) {
        throw new Error("kie.ai generation timed out — no result after 120s");
      }

      // Download image and convert to base64
      const imgRes = await fetch(resultUrl);
      if (!imgRes.ok) throw new Error("Failed to download generated image from kie.ai");
      const imgBuffer = await imgRes.arrayBuffer();
      imageData = Buffer.from(imgBuffer).toString("base64");

    } else {
      // ── OpenAI-compatible flow ──────────────────────────────────────────────
      const client = new OpenAI({
        apiKey: model.apiKey,
        baseURL: model.baseUrl,
      });

      const response = await client.images.generate({
        model: model.modelId,
        prompt: data.fullPrompt,
        n: 1,
        size: `${w}x${h}` as Parameters<typeof client.images.generate>[0]["size"],
        response_format: "b64_json",
      });

      rawApiResponse = response as unknown as Record<string, unknown>;
      const b64 = response.data?.[0]?.b64_json;
      if (!b64) throw new Error("No image data returned from API");
      imageData = b64;
    }

    // Save image to storage
    const filename = `${genId}.png`;
    const { key, url } = await saveImage(imageData, filename);

    // Track token/cost usage
    const tracking = await trackTokenUsage({
      userId: user.id,
      division: user.division ?? "general",
      modelId: model.id,
      generationId: genId,
      type: "image",
      pricePerToken: model.pricePerToken,
      pricePerImage: model.pricePerImage,
      rawApiResponse,
    });

    // Update generation record
    await db
      .update(generations)
      .set({
        imageUrl: url,
        imageKey: key,
        promptTokens: tracking.promptTokens,
        completionTokens: tracking.completionTokens,
        totalTokens: tracking.totalTokens,
        costIdr: tracking.costIdr,
        rawUsageMetadata: tracking.rawUsageMetadata,
        width: w,
        height: h,
        status: "success",
      })
      .where(eq(generations.id, genId));

    // Fire-and-forget telemetry
    void logTelemetry(user.id, "generation_success", {
      style: data.style,
      aspectRatio: data.aspectRatio,
      cfgScale: data.cfgScale,
      steps: data.steps,
      lighting: data.lighting,
      environment: data.environment,
    });

    return NextResponse.json({
      id: genId,
      imageUrl: url,
      fullPrompt: data.fullPrompt,
      seed: resolvedSeed,
      cfgScale: data.cfgScale,
      steps: data.steps,
      aspectRatio: data.aspectRatio,
      totalTokens: tracking.totalTokens,
      costIdr: tracking.costIdr,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await db
      .update(generations)
      .set({ status: "error", errorMessage: message })
      .where(eq(generations.id, genId));
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function aspectRatioToDimensions(ratio: string): [number, number] {
  const map: Record<string, [number, number]> = {
    "1:1": [1024, 1024],
    "16:9": [1344, 768],
    "9:16": [768, 1344],
    "4:3": [1152, 896],
    "3:4": [896, 1152],
    "3:2": [1216, 832],
    "2:3": [832, 1216],
  };
  return map[ratio] ?? [1024, 1024];
}
