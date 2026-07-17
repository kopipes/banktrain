"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { GitFork, Trash2, Globe, GlobeLock, Loader2 } from "lucide-react";
import { buildStudioUrl } from "@/lib/utils";

interface LibraryEntry {
  id: string;
  title: string;
  fullPrompt?: string | null;
  negativePrompt?: string | null;
  style?: string | null;
  cfgScale?: number | null;
  steps?: number | null;
  aspectRatio?: string | null;
  imageUrl?: string | null;
  userId?: string | null;
  // Feed visibility — only present when entry has a linked generation owned by current user
  generationId?: string | null;
  isPublic?: boolean | null;
}

interface LibraryActionsProps {
  entry: LibraryEntry;
  currentUserId: string;
}

export function LibraryActions({ entry, currentUserId }: LibraryActionsProps) {
  const router = useRouter();
  const [isPublic, setIsPublic] = useState<boolean>(entry.isPublic ?? false);
  const [toggling, setToggling] = useState(false);

  // Only show feed toggle if this entry belongs to current user AND has a linked generation
  const canToggleFeed = entry.userId === currentUserId && !!entry.generationId;

  function handleFork() {
    router.push(
      buildStudioUrl({
        fullPrompt: entry.fullPrompt ?? undefined,
        negativePrompt: entry.negativePrompt ?? "",
        style: entry.style ?? "",
        cfgScale: entry.cfgScale ?? 7,
        steps: entry.steps ?? 30,
        aspectRatio: entry.aspectRatio ?? "1:1",
      })
    );
  }

  async function handleDelete() {
    if (!confirm("Delete this library entry?")) return;
    await fetch(`/api/library?id=${entry.id}`, { method: "DELETE" });
    router.refresh();
  }

  async function handleToggleFeed() {
    if (!entry.generationId || toggling) return;
    setToggling(true);
    try {
      const res = await fetch(`/api/generations/${entry.generationId}/visibility`, {
        method: "PATCH",
      });
      if (res.ok) {
        const data = await res.json();
        setIsPublic(data.isPublic);
        router.refresh();
      }
    } finally {
      setToggling(false);
    }
  }

  return (
    <div className="flex items-center gap-1">
      {/* Feed visibility toggle — only for own entries with linked generation */}
      {canToggleFeed && (
        <div className="relative group/feed">
          <button
            onClick={handleToggleFeed}
            disabled={toggling}
            title={isPublic ? "Remove from Global Feed" : "Share to Global Feed"}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all duration-150 disabled:opacity-50"
            style={{
              background: isPublic ? "rgba(67,233,123,0.1)" : "var(--surface-2)",
              color: isPublic ? "var(--success)" : "var(--foreground-muted)",
              border: isPublic
                ? "1px solid rgba(67,233,123,0.25)"
                : "1px solid var(--border)",
            }}
          >
            {toggling ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : isPublic ? (
              <Globe className="h-3 w-3" />
            ) : (
              <GlobeLock className="h-3 w-3" />
            )}
            <span>{isPublic ? "In Feed" : "Share"}</span>
          </button>
          {/* Tooltip */}
          <div
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 rounded-md text-xs whitespace-nowrap pointer-events-none opacity-0 group-hover/feed:opacity-100 transition-opacity z-10"
            style={{ background: "var(--surface-3)", color: "var(--foreground)", border: "1px solid var(--border)" }}
          >
            {isPublic ? "Click to remove from Global Feed" : "Click to share to Global Feed"}
          </div>
        </div>
      )}

      <Button variant="ghost" size="sm" onClick={handleFork} className="text-xs h-7">
        <GitFork className="h-3 w-3" />
        Fork
      </Button>

      {entry.userId === currentUserId && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          className="text-xs h-7"
          style={{ color: "var(--danger)" }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
