import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { userTelemetry, negativePromptProfiles } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { generateId } from "@/lib/utils";

/**
 * GET  /api/user/defaults — returns personalized default parameters derived
 *      from the user's successful generation history (telemetry).
 *
 * POST /api/user/defaults — manually save preferred defaults (future use).
 */
export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as { id: string };

  // Pull last 50 generation_success events for this user
  const events = await db
    .select()
    .from(userTelemetry)
    .where(eq(userTelemetry.userId, user.id))
    .orderBy(desc(userTelemetry.createdAt))
    .limit(50);

  const genEvents = events.filter((e) => e.event === "generation_success" && e.payload);

  type GenPayload = {
    cfgScale?: number;
    aspectRatio?: string;
    style?: string;
    steps?: number;
  };

  const payloads: GenPayload[] = genEvents
    .map((e) => {
      try { return JSON.parse(e.payload!) as GenPayload; } catch { return null; }
    })
    .filter(Boolean) as GenPayload[];

  // Most frequent aspect ratio
  const ratioFreq: Record<string, number> = {};
  for (const p of payloads) {
    if (p.aspectRatio) ratioFreq[p.aspectRatio] = (ratioFreq[p.aspectRatio] ?? 0) + 1;
  }
  const defaultAspectRatio =
    Object.entries(ratioFreq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "1:1";

  // Most frequent style
  const styleFreq: Record<string, number> = {};
  for (const p of payloads) {
    if (p.style) styleFreq[p.style] = (styleFreq[p.style] ?? 0) + 1;
  }
  const defaultStyle =
    Object.entries(styleFreq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";

  // Average CFG scale (rounded to nearest 0.5)
  const cfgValues = payloads.map((p) => p.cfgScale).filter((v): v is number => typeof v === "number");
  const avgCfg = cfgValues.length
    ? Math.round((cfgValues.reduce((a, b) => a + b, 0) / cfgValues.length) * 2) / 2
    : 7;

  // Average steps (rounded to nearest 5)
  const stepValues = payloads.map((p) => p.steps).filter((v): v is number => typeof v === "number");
  const avgSteps = stepValues.length
    ? Math.round((stepValues.reduce((a, b) => a + b, 0) / stepValues.length) / 5) * 5
    : 30;

  // Fetch negative prompt profile
  const negProfile = await db
    .select()
    .from(negativePromptProfiles)
    .where(eq(negativePromptProfiles.userId, user.id))
    .get();

  let negativeKeywords: string[] = [];
  if (negProfile?.keywords) {
    try { negativeKeywords = JSON.parse(negProfile.keywords); } catch { /**/ }
  }

  return NextResponse.json({
    defaultAspectRatio,
    defaultStyle,
    defaultCfgScale: avgCfg,
    defaultSteps: avgSteps,
    negativeKeywords,
    sampleCount: payloads.length,
  });
}
