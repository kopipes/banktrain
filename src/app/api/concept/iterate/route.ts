import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { aiModels } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { saveImage } from "@/lib/storage";
import { generateId } from "@/lib/utils";

const iterateSchema = z.object({
  imageModelId: z.string().min(1),
  originalImageUrl: z.string(),
  revisionPrompt: z.string().min(1),
  type: z.enum(["overall", "booth", "stage"]),
  theme: z.string(),
  brandColors: z.string(),
  envImageUrl: z.string().optional(), // reference environment image for img2img
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = iterateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const data = parsed.data;
  const model = await db.select().from(aiModels).where(eq(aiModels.id, data.imageModelId)).get();
  if (!model || !model.isActive || model.type !== "image") {
    return NextResponse.json({ error: "Image model not found or inactive." }, { status: 404 });
  }

  const prompt = `${data.type === "overall" ? "Aerial event venue floor plan blueprint" : data.type === "booth" ? "3D modular exhibition booth render" : "3D stage render"}, theme: ${data.theme}, brand colors: ${data.brandColors}. Revision: ${data.revisionPrompt}. Professional architectural visualization.`;

  const genId = generateId();

  try {
    if (model.provider === "kie.ai") {
      const supportsImg2Img = model.modelId.includes("image-to-image") || model.modelId.includes("edit") || model.modelId.includes("remix");

      const kieInput: Record<string, unknown> = { prompt, aspect_ratio: "16:9", resolution: "1K" };
      // Prefer env reference image, fall back to original generated image
      const inputUrl = data.envImageUrl || data.originalImageUrl;
      if (supportsImg2Img && inputUrl) kieInput.input_urls = [inputUrl];

      const createRes = await fetch(`${model.baseUrl}/api/v1/jobs/createTask`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${model.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: model.modelId, input: kieInput }),
      });
      const createData = await createRes.json() as { code?: number; msg?: string; data?: { taskId?: string } };
      if (createData.code !== 200 || !createData.data?.taskId) {
        throw new Error(`kie.ai task creation failed: ${createData.msg ?? "Unknown"}`);
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

      if (!resultUrl) throw new Error("Generation timed out after 90s");
      const imgRes = await fetch(resultUrl);
      if (!imgRes.ok) throw new Error("Failed to download image");
      const imageData = Buffer.from(await imgRes.arrayBuffer()).toString("base64");
      const { url } = await saveImage(imageData, `concept_iter_${genId}_${data.type}.png`);
      return NextResponse.json({ imageUrl: url, generationId: genId, prompt, type: data.type });
    }

    const OpenAI = (await import("openai")).default;
    const client = new OpenAI({ apiKey: model.apiKey, baseURL: model.baseUrl });
    const response = await client.images.generate({
      model: model.modelId, prompt, n: 1,
      size: "1024x1024" as Parameters<typeof client.images.generate>[0]["size"],
      response_format: "b64_json",
    });
    const b64 = response.data?.[0]?.b64_json;
    if (!b64) throw new Error("No image data returned");
    const { url } = await saveImage(b64, `concept_iter_${genId}_${data.type}.png`);
    return NextResponse.json({ imageUrl: url, generationId: genId, prompt, type: data.type });

  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
