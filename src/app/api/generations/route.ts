import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { generations, tokenLogs } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function DELETE(req: NextRequest) {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  // Fetch the generation to verify ownership or admin
  const gen = await db.select().from(generations).where(eq(generations.id, id)).get();
  if (!gen) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Only allow delete if admin, or if it's the user's own error entry
  const isAdmin = user.role === "admin";
  const isOwner = gen.userId === user.id;
  const isError = gen.status === "error";

  if (!isAdmin && !(isOwner && isError)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Delete associated token logs first (FK constraint)
  await db.delete(tokenLogs).where(eq(tokenLogs.generationId, id));
  await db.delete(generations).where(eq(generations.id, id));

  return NextResponse.json({ success: true });
}
