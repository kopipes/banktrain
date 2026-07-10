import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { negativePromptProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateId } from "@/lib/utils";
import { z } from "zod";

const schema = z.object({
  keywords: z.array(z.string().min(1)).min(1),
});

/**
 * GET  — fetch the user's negative prompt profile (auto-injected keyword list)
 * POST — add keywords to the profile (from user corrections / explicit saves)
 * DELETE — remove a specific keyword (?keyword=xxx)
 */
export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { id: string };

  const profile = await db
    .select()
    .from(negativePromptProfiles)
    .where(eq(negativePromptProfiles.userId, user.id))
    .get();

  const keywords: string[] = profile?.keywords
    ? (() => { try { return JSON.parse(profile.keywords); } catch { return []; } })()
    : [];

  return NextResponse.json({ keywords });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { id: string };

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const profile = await db
    .select()
    .from(negativePromptProfiles)
    .where(eq(negativePromptProfiles.userId, user.id))
    .get();

  let existing: string[] = [];
  if (profile?.keywords) {
    try { existing = JSON.parse(profile.keywords); } catch { /**/ }
  }

  // Merge, deduplicate, preserve order
  const merged = Array.from(new Set([...existing, ...parsed.data.keywords]));

  if (profile) {
    await db
      .update(negativePromptProfiles)
      .set({ keywords: JSON.stringify(merged), updatedAt: new Date().toISOString() })
      .where(eq(negativePromptProfiles.id, profile.id));
  } else {
    await db.insert(negativePromptProfiles).values({
      id: generateId(),
      userId: user.id,
      keywords: JSON.stringify(merged),
    });
  }

  return NextResponse.json({ keywords: merged });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { id: string };

  const keyword = new URL(req.url).searchParams.get("keyword");
  if (!keyword) return NextResponse.json({ error: "Missing keyword" }, { status: 400 });

  const profile = await db
    .select()
    .from(negativePromptProfiles)
    .where(eq(negativePromptProfiles.userId, user.id))
    .get();

  if (!profile) return NextResponse.json({ keywords: [] });

  let existing: string[] = [];
  try { existing = JSON.parse(profile.keywords); } catch { /**/ }

  const updated = existing.filter((k) => k !== keyword);
  await db
    .update(negativePromptProfiles)
    .set({ keywords: JSON.stringify(updated), updatedAt: new Date().toISOString() })
    .where(eq(negativePromptProfiles.id, profile.id));

  return NextResponse.json({ keywords: updated });
}
