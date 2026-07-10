/**
 * Telemetry lib — logs user behaviour events to user_telemetry table.
 * Called fire-and-forget after successful generation or other key actions.
 */
import { db } from "@/db";
import { userTelemetry } from "@/db/schema";
import { generateId } from "@/lib/utils";

export type TelemetryEvent =
  | "generation_success"
  | "style_used"
  | "aspect_ratio_used"
  | "cfg_scale_used"
  | "steps_used"
  | "negative_prompt_used"
  | "remix_used"
  | "challenge_submitted"
  | "library_saved";

export async function logTelemetry(
  userId: string,
  event: TelemetryEvent,
  payload?: Record<string, unknown>
): Promise<void> {
  try {
    await db.insert(userTelemetry).values({
      id: generateId(),
      userId,
      event,
      payload: payload ? JSON.stringify(payload) : null,
    });
  } catch {
    // Telemetry is non-critical — never block user actions on failure
  }
}
