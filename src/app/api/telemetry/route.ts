import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { userTelemetry } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { logTelemetry, type TelemetryEvent } from "@/lib/telemetry";
import { z } from "zod";

const telemetrySchema = z.object({
  event: z.string().min(1),
  payload: z.record(z.string(), z.unknown()).optional().default({}),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as { id: string };
  const body = await req.json();
  const parsed = telemetrySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  await logTelemetry(user.id, parsed.data.event as TelemetryEvent, parsed.data.payload);
  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as { id: string };
  const events = await db
    .select()
    .from(userTelemetry)
    .where(eq(userTelemetry.userId, user.id))
    .orderBy(desc(userTelemetry.createdAt))
    .limit(200);

  return NextResponse.json(events);
}
