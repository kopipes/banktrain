import { auth } from "@/lib/auth";
import { db } from "@/db";
import { conceptProjects } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { generateId } from "@/lib/utils";
import type { ConceptSession } from "@/app/(dashboard)/concept-creator/types";
import { createDefaultSession } from "@/app/(dashboard)/concept-creator/types";

// GET /api/concept/projects — list all projects for the current user
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projects = await db
    .select({
      id: conceptProjects.id,
      title: conceptProjects.title,
      currentPhase: conceptProjects.currentPhase,
      status: conceptProjects.status,
      createdAt: conceptProjects.createdAt,
      updatedAt: conceptProjects.updatedAt,
    })
    .from(conceptProjects)
    .where(eq(conceptProjects.userId, session.user.id))
    .orderBy(desc(conceptProjects.updatedAt))
    .all();

  return NextResponse.json({ projects });
}

// POST /api/concept/projects — create a new project
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const title: string = body.title ?? "Untitled Project";

  const defaultSession: ConceptSession = createDefaultSession();
  const id = generateId();

  await db.insert(conceptProjects).values({
    id,
    userId: session.user.id,
    title,
    currentPhase: 1,
    sessionData: JSON.stringify(defaultSession),
    status: "in_progress",
    updatedAt: new Date().toISOString(),
  });

  return NextResponse.json({ id, title, currentPhase: 1, status: "in_progress" }, { status: 201 });
}
