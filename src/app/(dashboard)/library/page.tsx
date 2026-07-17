import { auth } from "@/lib/auth";
import { db } from "@/db";
import { promptLibrary, users, generations } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { Sparkles } from "lucide-react";
import { getFeatureFlags } from "@/lib/feature-flags";
import { redirect } from "next/navigation";
import { LibraryGrid } from "./library-grid";

export default async function LibraryPage() {
  const flags = await getFeatureFlags();
  if (!flags.showLibrary) redirect("/dashboard");

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
      generationId: promptLibrary.generationId,
      likes: promptLibrary.likes,
      createdAt: promptLibrary.createdAt,
      userId: promptLibrary.userId,
      userName: users.name,
      isPublic: generations.isPublic,
    })
    .from(promptLibrary)
    .innerJoin(users, eq(promptLibrary.userId, users.id))
    .leftJoin(generations, eq(promptLibrary.generationId, generations.id))
    .orderBy(desc(promptLibrary.likes), desc(promptLibrary.createdAt))
    .limit(60);

  return (
    <div className="min-h-full bg-[var(--background)]">
      {/* Header */}
      <div
        className="px-8 pt-8 pb-6 border-b border-[var(--border)]"
        style={{ background: "linear-gradient(180deg, var(--surface) 0%, var(--background) 100%)" }}
      >
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-4 w-4 text-[var(--accent)]" />
          <span className="text-xs text-[var(--foreground-muted)] font-semibold uppercase tracking-widest">Resources</span>
        </div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Master Prompt Library</h1>
        <p className="text-[var(--foreground-muted)] text-sm mt-1">
          Curated prompts and proven techniques — click any card to view details.
        </p>
      </div>

      <div className="p-8">
        <LibraryGrid entries={entries} currentUserId={user.id} />
      </div>
    </div>
  );
}
