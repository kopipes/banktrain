import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { aiModels } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { saveImage } from "@/lib/storage";
import { generateId } from "@/lib/utils";

const generateSchema = z.object({
  imageModelId: z.string().min(1),
  theme: z.string(),
  paradigm: z.enum(["full_concept", "budget_fit"]),
  brief: z.object({
    eventName: z.string(),
    objective: z.string(),
    brandName: z.string(),
    brandColors: z.string(),
    expectedAttendees: z.string(),
  }),
  venue: z.object({
    venueWidth: z.string(),
    venueLength: z.string(),
    venueType: z.string(),
  }),
  components: z.array(z.object({
    name: z.string(),
    enabled: z.boolean(),
    area: z.string(),
  })),
  type: z.enum(["overall", "booth", "stage"]),
  envImageUrl: z.string().optional(), // reference environment image for img2img
});

function buildImagePrompt(data: z.infer<typeof generateSchema>): string {
  const enabledComponents = data.components.filter((c) => c.enabled).map((c) => c.name).join(", ");
  const budgetNote = data.paradigm === "budget_fit" ? ", value-engineered, modular construction" : ", premium high-end design";

  if (data.type === "overall") {
    return `Aerial bird's eye view architectural floor plan blueprint of an event venue, theme: ${data.theme}, event: ${data.brief.eventName}, brand colors: ${data.brief.brandColors}, zones: ${enabledComponents}, venue ${data.venue.venueWidth}x${data.venue.venueLength}m ${data.venue.venueType}${budgetNote}, clean technical illustration style, top-down view, labeled zones, professional event design`;
  }
  if (data.type === "booth") {
    return `3D render of a 4x4m modular exhibition booth, theme: ${data.theme}, brand: ${data.brief.brandName}, brand colors: ${data.brief.brandColors}${budgetNote}, detailed structural elements, custom illumination, photorealistic architectural visualization`;
  }
  return `Professional 3D stage render, theme: ${data.theme}, event: ${data.brief.eventName}, brand colors: ${data.brief.brandColors}, ${data.brief.expectedAttendees} attendees capacity${budgetNote}, dramatic lighting, photorealistic architectural visualization`;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = generateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });

  const data = parsed.data;
  const model = await db.select().from(aiModels).where(eq(aiModels.id, data.imageModelId)).get();
  if (!model || !model.isActive || model.type !== "image") {
    return NextResponse.json({ error: "Image model not found or inactive." }, { status: 404 });
  }

  const prompt = buildImagePrompt(data);
  const genId = generateId();

  try {
    // kie.ai flow
    if (model.provider === "kie.ai") {
      const supportsImg2Img = model.modelId.includes("image-to-image") ||
        model.modelId.includes("edit") || model.modelId.includes("remix");

      const kieInput: Record<string, unknown> = { prompt, aspect_ratio: "16:9", resolution: "1K" };
      // Use env reference image for img2img if model supports it
      if (supportsImg2Img && data.envImageUrl) {
        kieInput.input_urls = [data.envImageUrl];
      }

      const createRes = await fetch(`${model.baseUrl}/api/v1/jobs/createTask`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${model.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: model.modelId, input: kieInput }),
      });
      const createData = await createRes.json() as { code?: number; msg?: string; data?: { taskId?: string } };
      if (createData.code !== 200 || !createData.data?.taskId) {
        throw new Error(`kie.ai task creation failed: ${createData.msg ?? "Unknown error"}`);
      }

      const taskId = createData.data.taskId;
      const pollStart = Date.now();
      let resultUrl: string | null = null;

      while (Date.now() - pollStart < 90_000) {
        await new Promise((r) => setTimeout(r, 2000));
        const pollRes = await fetch(`${model.baseUrl}/api/v1/jobs/recordInfo?taskId=${taskId}`, {
          headers: { "Authorization": `Bearer ${model.apiKey}` },
        });
        const pollData = await pollRes.json() as { code?: number; data?: { state?: string; resultJson?: string; failMsg?: string } };
        if (pollData.code !== 200 || !pollData.data) continue;
        const { state, resultJson, failMsg } = pollData.data;
        if (state === "failed") throw new Error(`kie.ai failed: ${failMsg ?? "Unknown"}`);
        if (state === "success" && resultJson) {
          const result = JSON.parse(resultJson) as { resultUrls?: string[] };
          resultUrl = result.resultUrls?.[0] ?? null;
          break;
        }
      }

      if (!resultUrl) throw new Error("kie.ai generation timed out after 90s");

      const imgRes = await fetch(resultUrl);
      if (!imgRes.ok) throw new Error("Failed to download image from kie.ai");
      const imgBuffer = await imgRes.arrayBuffer();
      const imageData = Buffer.from(imgBuffer).toString("base64");
      const { url } = await saveImage(imageData, `concept_${genId}_${data.type}.png`);

      return NextResponse.json({ imageUrl: url, generationId: genId, prompt, type: data.type });
    }

    // OpenAI-compatible flow
    const OpenAI = (await import("openai")).default;
    const client = new OpenAI({ apiKey: model.apiKey, baseURL: model.baseUrl });
    const response = await client.images.generate({
      model: model.modelId,
      prompt,
      n: 1,
      size: "1024x1024" as Parameters<typeof client.images.generate>[0]["size"],
      response_format: "b64_json",
    });
    const b64 = response.data?.[0]?.b64_json;
    if (!b64) throw new Error("No image data returned");
    const { url } = await saveImage(b64, `concept_${genId}_${data.type}.png`);
    return NextResponse.json({ imageUrl: url, generationId: genId, prompt, type: data.type });

  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
