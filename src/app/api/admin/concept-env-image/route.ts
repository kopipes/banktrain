import { requireAdmin } from "@/lib/auth-utils";
import { NextRequest, NextResponse } from "next/server";
import { saveConceptCreatorEnvImage } from "@/lib/concept-creator-settings";
import { saveImage } from "@/lib/storage";
import { generateId } from "@/lib/utils";
import { z } from "zod";

const bodySchema = z.object({
  type: z.enum(["blueprint", "render3d"]),
  imageData: z.string().min(1), // base64 data URL or raw base64
});

export async function PUT(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { type, imageData } = parsed.data;

  try {
    const filename = `concept_env_${type}_${generateId()}.png`;
    const { url } = await saveImage(imageData, filename);
    await saveConceptCreatorEnvImage(type, url);
    return NextResponse.json({ url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") as "blueprint" | "render3d" | null;
  if (!type || !["blueprint", "render3d"].includes(type)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  await saveConceptCreatorEnvImage(type, "");
  return NextResponse.json({ success: true });
}
