import { auth } from "@/lib/auth";
import { db } from "@/db";
import { generations, users } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { FeedActions } from "@/components/feed-actions";
import { Images, Sparkles } from "lucide-react";
import Link from "next/link";

export default async function FeedPage() {
  const session = await auth();

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
      <div className="px-8 pt-8 pb-6 border-b border-[var(--border)]"
        style={{ background: "linear-gradient(180deg, var(--surface) 0%, var(--background) 100%)" }}>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-4 w-4 text-[var(--accent)]" />
          <span className="text-xs text-[var(--foreground-muted)] font-semibold uppercase tracking-widest">Community</span>
        </div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Global Feed</h1>
        <p className="text-[var(--foreground-muted)] text-sm mt-1">
          Team&apos;s best creations — remix any image to use it in your studio.
        </p>
      </div>

      <div className="p-8">
        {publicGens.length === 0 ? (
          <div className="rounded-2xl border border-[var(--border)] border-dashed p-16 text-center"
            style={{ background: "var(--surface)" }}>
            <div className="w-14 h-14 rounded-2xl bg-[var(--accent-dim)] flex items-center justify-center mx-auto mb-4">
              <Images className="h-6 w-6 text-[var(--accent)]" />
            </div>
            <p className="text-[var(--foreground-muted)] font-medium mb-1">No public generations yet</p>
            <p className="text-xs text-[var(--foreground-subtle)] mb-4">
              Generate an image and enable &ldquo;Share to Feed&rdquo; to appear here.
            </p>
            <Link href="/studio"
              className="text-sm text-[var(--accent)] hover:text-[var(--accent-hover)] font-medium transition-colors">
              Open Creator Studio →
            </Link>
          </div>
        ) : (
          <div className="columns-2 sm:columns-3 lg:columns-4 gap-4 space-y-4">
            {publicGens.map((gen) => (
              <div
                key={gen.id}
                className="break-inside-avoid rounded-2xl overflow-hidden border border-[var(--border)] group transition-all duration-300 hover:border-[var(--border-bright)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
                style={{ background: "var(--surface)" }}
              >
                {gen.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={gen.imageUrl}
                    alt={gen.fullPrompt}
                    className="w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                  />
                )}
                <div className="p-3">
                  <p className="text-xs text-[var(--foreground-muted)] line-clamp-2 mb-2 leading-relaxed">
                    {gen.fullPrompt}
                  </p>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-[var(--accent)] to-[var(--accent-2)] flex items-center justify-center flex-shrink-0">
                        <span className="text-[10px] font-bold text-white">
                          {gen.userName?.[0]?.toUpperCase() ?? "?"}
                        </span>
                      </div>
                      <span className="text-xs text-[var(--foreground-muted)] truncate">{gen.userName}</span>
                    </div>
                    {gen.style && (
                      <Badge variant="default" className="text-[10px] flex-shrink-0">{gen.style}</Badge>
                    )}
                  </div>
                  <FeedActions generation={gen} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
