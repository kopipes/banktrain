import { auth } from "@/lib/auth";
import type { NextRequest } from "next/server";

/**
 * Shared admin guard. Returns the session if the user is an admin, null otherwise.
 * Import this in all admin API routes instead of copy-pasting the same check.
 */
export async function requireAdmin(_req?: NextRequest) {
  const session = await auth();
  if (!session?.user) return null;
  const role = (session.user as { role?: string }).role;
  if (role !== "admin") return null;
  return session;
}

/**
 * Returns the session if the user is admin or mentor, null otherwise.
 */
export async function requireMentorOrAdmin(_req?: NextRequest) {
  const session = await auth();
  if (!session?.user) return null;
  const role = (session.user as { role?: string }).role;
  if (role !== "admin" && role !== "mentor") return null;
  return session;
}
