import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { promptLibrary } from "@/db/schema";
import { desc, eq, and } from "drizzle-orm";
import { generateId } from "@/lib/utils";
import { z } from "zod";

const createSchema = z.object({
  generationId: z.string().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  fullPrompt: z.string().min(1),
  negativePrompt: z.string().optional(),
  tags: z.array(z.string()).optional(),
  style: z.string().optional(),
  cfgScale: z.number().optional(),
  steps: z.number().optional(),
  aspectRatio: z.string().optional(),
  imageUrl: z.string().optional(),
  forkedFromId: z.string().optional(),
});

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const entries = await db
    .select()
    .from(promptLibrary)
    .orderBy(desc(promptLibrary.likes), desc(promptLibrary.createdAt))
    .limit(60);

  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as { id: string };
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const id = generateId();

  await db.insert(promptLibrary).values({
    id,
    userId: user.id,
    generationId: data.generationId,
    title: data.title,
    description: data.description,
    fullPrompt: data.fullPrompt,
    negativePrompt: data.negativePrompt,
    tags: data.tags ? JSON.stringify(data.tags) : null,
    style: data.style,
    cfgScale: data.cfgScale,
    steps: data.steps,
    aspectRatio: data.aspectRatio,
    imageUrl: data.imageUrl,
    forkedFromId: data.forkedFromId,
  });

  return NextResponse.json({ id }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as { id: string; role?: string };
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  // Allow owner or admin to delete
  const entry = await db
    .select({ userId: promptLibrary.userId })
    .from(promptLibrary)
    .where(eq(promptLibrary.id, id))
    .get();

  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOwner = entry.userId === user.id;
  const isAdmin = user.role === "admin";
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db
    .delete(promptLibrary)
    .where(and(eq(promptLibrary.id, id)));

  return NextResponse.json({ success: true });
}
