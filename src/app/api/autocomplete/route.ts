import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { generations } from "@/db/schema";
import { eq, desc, like } from "drizzle-orm";

/**
 * GET /api/autocomplete?q=text&field=subject|style|lighting|environment
 *
 * Returns up to 8 keyword suggestions for the given field based on the
 * authenticated user's successful generation history.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { id: string };

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();
  const field = searchParams.get("field") ?? "subject";

  // Map field name to the actual column
  const fieldToColumn: Record<string, keyof typeof generations.$inferSelect> = {
    subject: "subject",
    style: "style",
    lighting: "lighting",
    environment: "environment",
    colorPalette: "colorPalette",
    action: "action",
  };

  const colKey = fieldToColumn[field];
  if (!colKey) return NextResponse.json({ suggestions: [] });

  // Fetch recent successful gens, filter non-null values for the field
  const rows = await db
    .select({ value: generations[colKey] })
    .from(generations)
    .where(eq(generations.userId, user.id))
    .orderBy(desc(generations.createdAt))
    .limit(200) as Array<{ value: string | null }>;

  // Count frequency of each unique value
  const freq: Record<string, number> = {};
  for (const row of rows) {
    if (!row.value) continue;
    const val = row.value.trim();
    if (!val) continue;
    freq[val] = (freq[val] ?? 0) + 1;
  }

  // Filter by query prefix and sort by frequency
  const suggestions = Object.entries(freq)
    .filter(([val]) => !q || val.toLowerCase().includes(q))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([val]) => val);

  return NextResponse.json({ suggestions });
}
