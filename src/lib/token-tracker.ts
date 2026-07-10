import { db } from "@/db";
import { tokenLogs, divisionQuotas } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { generateId, currentMonthYear, extractTokenUsage } from "@/lib/utils";

export interface TokenTrackingInput {
  userId: string;
  division: string;
  modelId: string;
  generationId?: string;
  type: "image" | "llm";
  pricePerToken: number;   // IDR per token
  pricePerImage: number;   // IDR per image (for image generation)
  rawApiResponse: Record<string, unknown>;
}

export interface TokenTrackingResult {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costIdr: number;
  rawUsageMetadata: string;
}

/**
 * Core Token Tracker Engine.
 * Extracts usage metadata directly from the API response payload (never estimates),
 * calculates IDR cost, writes a token log, and updates the division quota.
 */
export async function trackTokenUsage(
  input: TokenTrackingInput
): Promise<TokenTrackingResult> {
  const { promptTokens, completionTokens, totalTokens, costIncurred } =
    extractTokenUsage(input.rawApiResponse);

  // Calculate cost in IDR
  // If the provider already returns a cost_incurred field, use it as-is (converted from USD if needed)
  // Otherwise calculate from token price. For image generation, count as 1 image.
  let costIdr: number;
  if (costIncurred !== undefined && costIncurred > 0) {
    costIdr = costIncurred;
  } else if (input.type === "image") {
    costIdr = input.pricePerImage;
  } else {
    costIdr = totalTokens * input.pricePerToken;
  }

  const monthYear = currentMonthYear();
  const rawUsageMetadata = JSON.stringify(
    (input.rawApiResponse as Record<string, unknown>)?.usage ?? input.rawApiResponse
  );

  // Write token log
  await db.insert(tokenLogs).values({
    id: generateId(),
    userId: input.userId,
    generationId: input.generationId,
    division: input.division,
    modelId: input.modelId,
    totalTokens,
    costIdr,
    type: input.type,
    monthYear,
  });

  // Atomic upsert: single statement increments usedBudgetIdr without a read-then-write race
  await db
    .insert(divisionQuotas)
    .values({
      id: generateId(),
      division: input.division,
      monthlyBudgetIdr: 0,
      usedBudgetIdr: costIdr,
      monthYear,
    })
    .onConflictDoUpdate({
      target: [divisionQuotas.division, divisionQuotas.monthYear],
      set: {
        usedBudgetIdr: sql`used_budget_idr + ${costIdr}`,
        updatedAt: new Date().toISOString(),
      },
    });

  return { promptTokens, completionTokens, totalTokens, costIdr, rawUsageMetadata };
}

/**
 * Check if a division has exceeded its monthly budget.
 */
export async function checkQuota(
  division: string
): Promise<{ allowed: boolean; used: number; budget: number; remaining: number }> {
  const monthYear = currentMonthYear();
  const quota = await db
    .select()
    .from(divisionQuotas)
    .where(
      and(
        eq(divisionQuotas.division, division),
        eq(divisionQuotas.monthYear, monthYear)
      )
    )
    .get();

  if (!quota || quota.monthlyBudgetIdr === 0) {
    // No quota set means unlimited
    return { allowed: true, used: quota?.usedBudgetIdr ?? 0, budget: 0, remaining: Infinity };
  }

  const remaining = quota.monthlyBudgetIdr - quota.usedBudgetIdr;
  return {
    allowed: remaining > 0,
    used: quota.usedBudgetIdr,
    budget: quota.monthlyBudgetIdr,
    remaining: Math.max(0, remaining),
  };
}
