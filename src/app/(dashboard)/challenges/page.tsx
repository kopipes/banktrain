import { auth } from "@/lib/auth";
import { db } from "@/db";
import { challenges, challengeSubmissions } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { ChallengeCard } from "@/components/challenge-card";
import { Trophy, Sparkles, Plus } from "lucide-react";
import Link from "next/link";

export default async function ChallengesPage() {
  const session = await auth();
  const user = session!.user as { id: string; role?: string };

  const [allChallenges, mySubmissions] = await Promise.all([
    db
      .select()
      .from(challenges)
      .where(eq(challenges.isActive, true))
      .orderBy(desc(challenges.createdAt)),
    db
      .select()
      .from(challengeSubmissions)
      .where(eq(challengeSubmissions.userId, user.id)),
  ]);

  const submittedIds = new Set(mySubmissions.map((s) => s.challengeId));

  const byCategory: Record<string, typeof allChallenges> = {};
  for (const c of allChallenges) {
    if (!byCategory[c.category]) byCategory[c.category] = [];
    byCategory[c.category].push(c);
  }

  return (
    <div className="min-h-full bg-[var(--background)]">
      {/* Header */}
      <div className="px-8 pt-8 pb-6 border-b border-[var(--border)]"
        style={{ background: "linear-gradient(180deg, var(--surface) 0%, var(--background) 100%)" }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-[var(--accent)]" />
              <span className="text-xs text-[var(--foreground-muted)] font-semibold uppercase tracking-widest">Learning</span>
            </div>
            <h1 className="text-2xl font-bold text-[var(--foreground)]">Challenges</h1>
            <p className="text-[var(--foreground-muted)] text-sm mt-1">
              Practice structured prompting skills with guided case studies.
            </p>
          </div>
          {(user.role === "admin" || user.role === "mentor") && (
            <Link
              href="/challenges/manage"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-[var(--accent-dim)] text-[var(--accent)] border border-[rgba(108,99,255,0.2)] hover:bg-[rgba(108,99,255,0.2)] transition-colors"
            >
              <Plus className="h-4 w-4" />
              New Challenge
            </Link>
          )}
        </div>
      </div>

      <div className="p-8">
        {allChallenges.length === 0 ? (
          <div className="rounded-2xl border border-[var(--border)] border-dashed p-16 text-center"
            style={{ background: "var(--surface)" }}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "rgba(247,151,30,0.12)", border: "1px solid rgba(247,151,30,0.2)" }}>
              <Trophy className="h-6 w-6" style={{ color: "var(--warning)" }} />
            </div>
            <p className="text-[var(--foreground-muted)] font-medium mb-1">No challenges yet</p>
            <p className="text-xs text-[var(--foreground-subtle)]">
              Mentors and admins can create challenges from this page.
            </p>
          </div>
        ) : (
          Object.entries(byCategory).map(([category, items]) => (
            <div key={category} className="mb-10">
              <div className="flex items-center gap-3 mb-5">
                <h2 className="text-sm font-bold text-[var(--foreground)] capitalize">{category}</h2>
                <div className="flex-1 h-px bg-[var(--border)]" />
                <span className="text-xs text-[var(--foreground-subtle)]">{items.length} challenge{items.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((challenge) => (
                  <ChallengeCard
                    key={challenge.id}
                    challenge={challenge}
                    submitted={submittedIds.has(challenge.id)}
                    userId={user.id}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
