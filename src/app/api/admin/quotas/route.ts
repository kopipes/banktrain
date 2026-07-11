import { requireAdmin } from "@/lib/auth-utils";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { divisionQuotas, tokenLogs, users } from "@/db/schema";
import { eq, sum, count, sql } from "drizzle-orm";
import { generateId, currentMonthYear } from "@/lib/utils";
import { z } from "zod";

const quotaSchema = z.object({
  division: z.string().min(1),
  monthlyBudgetIdr: z.number().min(0),
  monthYear: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const monthYear = currentMonthYear();

  // Run all three queries in parallel — they are fully independent
  const [divisionRows, quotas, totals] = await Promise.all([
    db.selectDistinct({ division: users.division }).from(users),
    db.select().from(divisionQuotas).where(eq(divisionQuotas.monthYear, monthYear)),
    db
      .select({
        division: tokenLogs.division,
        totalCost: sum(tokenLogs.costIdr),
        totalTokens: sum(tokenLogs.totalTokens),
        count: count(),
      })
      .from(tokenLogs)
      .where(eq(tokenLogs.monthYear, monthYear))
      .groupBy(tokenLogs.division),
  ]);

  const result = divisionRows.map(({ division }) => {
    const quota = quotas.find((q) => q.division === division);
    const total = totals.find((t) => t.division === division);
    return {
      division,
      monthYear,
      monthlyBudgetIdr: quota?.monthlyBudgetIdr ?? 0,
      usedBudgetIdr: Number(total?.totalCost ?? 0),
      totalTokens: Number(total?.totalTokens ?? 0),
      generationCount: total?.count ?? 0,
    };
  });

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = quotaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { division, monthlyBudgetIdr, monthYear: myr } = parsed.data;
  const monthYear = myr ?? currentMonthYear();

  // Upsert: match on both division AND monthYear to avoid corrupting prior-month records
  await db
    .insert(divisionQuotas)
    .values({
      id: generateId(),
      division,
      monthlyBudgetIdr,
      usedBudgetIdr: 0,
      monthYear,
    })
    .onConflictDoUpdate({
      target: [divisionQuotas.division, divisionQuotas.monthYear],
      set: {
        monthlyBudgetIdr,
        updatedAt: new Date().toISOString(),
      },
    });

  return NextResponse.json({ success: true });
}
