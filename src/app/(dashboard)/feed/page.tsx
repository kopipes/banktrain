import { auth } from "@/lib/auth";
import { db } from "@/db";
import { generations, users } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { Sparkles } from "lucide-react";
import { FeedGrid } from "./feed-grid";

export default async function FeedPage() {
  const session = await auth();
  const currentUser = session?.user as { id?: string } | undefined;

  const publicGens = await db
    .select({
      id: generations.id,
      fullPrompt: generations.fullPrompt,
      imageUrl: generations.imageUrl,
      style: generations.style,
      aspectRatio: generations.aspectRatio,
      cfgScale: generations.cfgScale,
      seed: generations.seed,
      steps: generations.steps,
      negativePrompt: generations.negativePrompt,
      subject: generations.subject,
      action: generations.action,
      environment: generations.environment,
      lighting: generations.lighting,
      colorPalette: generations.colorPalette,
      costIdr: generations.costIdr,
      createdAt: generations.createdAt,
      userId: generations.userId,
      userName: users.name,
      userDivision: users.division,
    })
    .from(generations)
    .innerJoin(users, eq(generations.userId, users.id))
    .where(and(eq(generations.isPublic, true), eq(generations.status, "success")))
    .orderBy(desc(generations.createdAt))
    .limit(48);

  return (
    <div className="min-h-full bg-[var(--background)]">
      {/* Header */}
      <div
        className="px-8 pt-8 pb-6 border-b border-[var(--border)]"
        style={{ background: "linear-gradient(180deg, var(--surface) 0%, var(--background) 100%)" }}
      >
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-4 w-4 text-[var(--accent)]" />
          <span className="text-xs text-[var(--foreground-muted)] font-semibold uppercase tracking-widest">Community</span>
        </div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Global Feed</h1>
        <p className="text-[var(--foreground-muted)] text-sm mt-1">
          Team&apos;s best creations — click any image to view details or remix.
        </p>
      </div>

      <div className="p-8">
        <FeedGrid generations={publicGens} currentUserId={currentUser?.id} />
      </div>
    </div>
  );
}
