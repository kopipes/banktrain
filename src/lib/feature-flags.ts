import { db } from "@/db";
import { appSettings } from "@/db/schema";

export interface FeatureFlags {
  showLibrary: boolean;
  showChallenges: boolean;
}

const DEFAULTS: FeatureFlags = {
  showLibrary: true,
  showChallenges: true,
};

/**
 * Server-side helper — reads feature flags from the DB.
 * Falls back to defaults for any missing key.
 */
export async function getFeatureFlags(): Promise<FeatureFlags> {
  const rows = await db.select().from(appSettings).all();

  const result: FeatureFlags = { ...DEFAULTS };
  for (const row of rows) {
    if (row.key in result) {
      try {
        (result as unknown as Record<string, boolean>)[row.key] = JSON.parse(row.value) as boolean;
      } catch {
        // keep default
      }
    }
  }
  return result;
}
