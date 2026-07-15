import { auth } from "@/lib/auth";
import { db } from "@/db";
import { conceptProjects } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import type { ConceptSession } from "@/app/(dashboard)/concept-creator/types";

// GET /api/concept/projects/[id] — load a single project (full session data)
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const row = await db
    .select()
    .from(conceptProjects)
    .where(and(eq(conceptProjects.id, id), eq(conceptProjects.userId, session.user.id)))
    .get();

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let sessionData: ConceptSession;
  try {
    sessionData = JSON.parse(row.sessionData) as ConceptSession;
  } catch {
    return NextResponse.json({ error: "Corrupt session data" }, { status: 500 });
  }

  return NextResponse.json({ ...row, sessionData });
}

// PUT /api/concept/projects/[id] — save session state + advance phase
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Verify ownership
  const existing = await db
    .select({ id: conceptProjects.id })
    .from(conceptProjects)
    .where(and(eq(conceptProjects.id, id), eq(conceptProjects.userId, session.user.id)))
    .get();

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json() as {
    sessionData: ConceptSession;
    title?: string;
    status?: "in_progress" | "completed";
  };

  const currentPhase = body.sessionData?.currentPhase ?? 1;
  const status = body.status ?? (currentPhase === 5 ? "completed" : "in_progress");

  // Derive a title from event name if not explicitly provided
  const eventName = body.sessionData?.phase1?.brief?.eventName;
  const title = body.title ?? (eventName && eventName.trim() !== "" ? eventName.trim() : undefined);

  await db
    .update(conceptProjects)
    .set({
      sessionData: JSON.stringify(body.sessionData),
      currentPhase,
      status,
      ...(title ? { title } : {}),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(conceptProjects.id, id));

  return NextResponse.json({ ok: true });
}

// DELETE /api/concept/projects/[id] — delete a project
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await db
    .select({ id: conceptProjects.id })
    .from(conceptProjects)
    .where(and(eq(conceptProjects.id, id), eq(conceptProjects.userId, session.user.id)))
    .get();

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db
    .delete(conceptProjects)
    .where(eq(conceptProjects.id, id));

  return NextResponse.json({ ok: true });
}
