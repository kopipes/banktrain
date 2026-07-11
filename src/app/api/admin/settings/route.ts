import { requireAdmin } from "@/lib/auth-utils";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { appSettings } from "@/db/schema";
import { z } from "zod";
import { getFeatureFlags } from "@/lib/feature-flags";

const updateSchema = z.object({
  showLibrary: z.boolean().optional(),
  showChallenges: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const flags = await getFeatureFlags();
  return NextResponse.json(flags);
}

export async function PUT(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const updates = parsed.data;

  await Promise.all(
    (Object.entries(updates) as [string, boolean][]).map(([key, value]) =>
      db
        .insert(appSettings)
        .values({ key, value: JSON.stringify(value) })
        .onConflictDoUpdate({
          target: appSettings.key,
          set: {
            value: JSON.stringify(value),
            updatedAt: new Date().toISOString(),
          },
        })
    )
  );

  return NextResponse.json({ success: true });
}
