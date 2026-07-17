import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { generations } from "@/db/schema";
import { eq, and } from "drizzle-orm";

// PATCH /api/generations/[id]/visibility — toggle isPublic for own generation
export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const user = session?.user as { id?: string } | undefined;
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const gen = await db
    .select({ id: generations.id, userId: generations.userId, isPublic: generations.isPublic })
    .from(generations)
    .where(and(eq(generations.id, id), eq(generations.userId, user.id)))
    .get();

  if (!gen) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const newIsPublic = !gen.isPublic;

  await db
    .update(generations)
    .set({ isPublic: newIsPublic })
    .where(eq(generations.id, id));

  return NextResponse.json({ isPublic: newIsPublic });
}
