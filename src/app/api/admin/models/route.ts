import { requireAdmin } from "@/lib/auth-utils";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { aiModels } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateId } from "@/lib/utils";
import { z } from "zod";

const modelSchema = z.object({
  name: z.string().min(1),
  provider: z.string().min(1),
  baseUrl: z.string().url(),
  apiKey: z.string().min(1),
  modelId: z.string().min(1),
  type: z.enum(["image", "llm"]),
  pricePerToken: z.number().min(0).default(0),
  pricePerImage: z.number().min(0).default(0),
  isDefault: z.boolean().default(false),
});

// Partial schema for PUT — all fields optional except id (handled separately)
const updateModelSchema = modelSchema
  .partial()
  .extend({ id: z.string().min(1) });

export async function GET(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const models = await db.select().from(aiModels).orderBy(aiModels.createdAt);
  // Mask api keys in response
  return NextResponse.json(
    models.map((m) => ({ ...m, apiKey: m.apiKey ? "***" + m.apiKey.slice(-4) : "" }))
  );
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = modelSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const id = generateId();

  if (data.isDefault) {
    await db.update(aiModels).set({ isDefault: false }).where(eq(aiModels.type, data.type));
  }

  await db.insert(aiModels).values({ id, ...data });
  return NextResponse.json({ id }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = updateModelSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  const { id, apiKey: submittedKey, ...rest } = parsed.data;

  // Fetch existing record server-side to avoid client-controlled masking bypass
  const existing = await db.select().from(aiModels).where(eq(aiModels.id, id)).get();
  if (!existing) return NextResponse.json({ error: "Model not found" }, { status: 404 });

  const updates: Partial<typeof aiModels.$inferInsert> = { ...rest };

  // Only update apiKey if a real (non-masked) value was submitted
  if (submittedKey && !submittedKey.startsWith("***")) {
    updates.apiKey = submittedKey;
  }

  if (rest.isDefault && rest.type) {
    await db.update(aiModels).set({ isDefault: false }).where(eq(aiModels.type, rest.type));
  }

  await db.update(aiModels).set(updates).where(eq(aiModels.id, id));
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await db.update(aiModels).set({ isActive: false }).where(eq(aiModels.id, id));
  return NextResponse.json({ success: true });
}
