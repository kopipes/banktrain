import { requireAdmin } from "@/lib/auth-utils";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getConceptCreatorSettings,
  saveConceptCreatorModels,
} from "@/lib/concept-creator-settings";

const updateSchema = z.object({
  concepting: z.string().optional(),
  prompting: z.string().optional(),
  blueprint: z.string().optional(),
  render3d: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const settings = await getConceptCreatorSettings();
  return NextResponse.json(settings);
}

export async function PUT(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  await saveConceptCreatorModels(parsed.data);
  return NextResponse.json({ success: true });
}
