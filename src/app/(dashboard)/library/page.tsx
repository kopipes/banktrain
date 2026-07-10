import { auth } from "@/lib/auth";
import { db } from "@/db";
import { promptLibrary, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { LibraryActions } from "@/components/library-actions";
import { BookOpen, Sparkles, GitFork } from "lucide-react";

export default async function LibraryPage() {
  const session = await auth();
  const user = session!.user as { id: string };

  const entries = await db
    .select({
      id: promptLibrary.id,
      title: promptLibrary.title,
      description: promptLibrary.description,
      fullPrompt: promptLibrary.fullPrompt,
      negativePrompt: promptLibrary.negativePrompt,
      tags: promptLibrary.tags,
      style: promptLibrary.style,
      cfgScale: promptLibrary.cfgScale,
      steps: promptLibrary.steps,
      aspectRatio: promptLibrary.aspectRatio,
      imageUrl: promptLibrary.imageUrl,
      forkedFromId: promptLibrary.forkedFromId,
      likes: promptLibrary.likes,
      createdAt: promptLibrary.createdAt,
      userId: promptLibrary.userId,
      userName: users.name,
    })
    .from(promptLibrary)
    .innerJoin(users, eq(promptLibrary.userId, users.id))
    .orderBy(desc(promptLibrary.likes), desc(promptLibrary.createdAt))
    .limit(60);

  return (
    <div className="min-h-full bg-[var(--background)]">
      {/* Header */}
      <div className="px-8 pt-8 pb-6 border-b border-[var(--border)]"
        style={{ background: "linear-gradient(180deg, var(--surface) 0%, var(--background) 100%)" }}>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-4 w-4 text-[var(--accent)]" />
          <span className="text-xs text-[var(--foreground-muted)] font-semibold uppercase tracking-widest">Resources</span>
        </div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Master Prompt Library</h1>
        <p className="text-[var(--foreground-muted)] text-sm mt-1">
          Curated prompts and proven techniques. Fork any entry to remix in studio.
        </p>
      </div>

      <div className="p-8">
        {entries.length === 0 ? (
          <div className="rounded-2xl border border-[var(--border)] border-dashed p-16 text-center"
            style={{ background: "var(--surface)" }}>
            <div className="w-14 h-14 rounded-2xl bg-[var(--accent-dim)] flex items-center justify-center mx-auto mb-4">
              <BookOpen className="h-6 w-6 text-[var(--accent)]" />
            </div>
            <p className="text-[var(--foreground-muted)] font-medium mb-1">Library is empty</p>
            <p className="text-xs text-[var(--foreground-subtle)]">
              Save a prompt from Creator Studio to start building the library.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {entries.map((entry) => (
              <div key={entry.id}
                className="group flex flex-col rounded-2xl border border-[var(--border)] overflow-hidden transition-all duration-300 hover:border-[var(--border-bright)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
                style={{ background: "var(--surface)" }}
              >
                {entry.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={entry.imageUrl}
                    alt={entry.title}
                    className="w-full aspect-video object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                  />
                ) : (
                  <div className="w-full aspect-video flex items-center justify-center"
                    style={{ background: "var(--surface-2)" }}>
                    <BookOpen className="h-8 w-8 text-[var(--foreground-subtle)]" />
                  </div>
                )}

                <div className="flex-1 flex flex-col p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-[var(--foreground)] leading-snug text-sm">{entry.title}</h3>
                    <div className="flex items-center gap-1 flex-shrink-0 text-[var(--foreground-muted)]">
                      <span className="text-xs">♥</span>
                      <span className="text-xs">{entry.likes}</span>
                    </div>
                  </div>

                  {entry.description && (
                    <p className="text-xs text-[var(--foreground-muted)] mb-3 line-clamp-2 leading-relaxed">
                      {entry.description}
                    </p>
                  )}

                  <div className="font-mono text-xs text-[var(--foreground-muted)] rounded-xl p-2.5 line-clamp-2 mb-3 leading-relaxed"
                    style={{ background: "var(--surface-2)" }}>
                    {entry.fullPrompt}
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {entry.style && <Badge variant="default">{entry.style}</Badge>}
                    {entry.aspectRatio && <Badge variant="outline">{entry.aspectRatio}</Badge>}
                    {entry.cfgScale && <Badge variant="secondary">CFG {entry.cfgScale}</Badge>}
                    {entry.forkedFromId && (
                      <Badge variant="warning">
                        <GitFork className="h-2.5 w-2.5 mr-1" />
                        Forked
                      </Badge>
                    )}
                  </div>

                  <div className="mt-auto flex items-center justify-between">
                    <span className="text-xs text-[var(--foreground-subtle)]">{entry.userName}</span>
                    <LibraryActions entry={entry} currentUserId={user.id} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
