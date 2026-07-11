"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { FeedActions } from "@/components/feed-actions";
import { GenerationDetailModal, type FeedGeneration } from "@/components/generation-detail-modal";
import { Images } from "lucide-react";
import Link from "next/link";

interface Props {
  generations: FeedGeneration[];
}

export function FeedGrid({ generations }: Props) {
  const [selected, setSelected] = useState<FeedGeneration | null>(null);
  // Set of generation IDs already saved to library (matched via forkedFromId)
  const [savedGenIds, setSavedGenIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/library")
      .then((r) => r.json())
      .then((entries: Array<{ forkedFromId?: string | null }>) => {
        const ids = new Set(
          entries
            .map((e) => e.forkedFromId)
            .filter((id): id is string => !!id)
        );
        setSavedGenIds(ids);
      })
      .catch(() => {/* silently fail */});
  }, []);

  function markSaved(genId: string) {
    setSavedGenIds((prev) => new Set(prev).add(genId));
  }

  if (generations.length === 0) {
    return (
      <div
        className="rounded-2xl border border-[var(--border)] border-dashed p-16 text-center"
        style={{ background: "var(--surface)" }}
      >
        <div className="w-14 h-14 rounded-2xl bg-[var(--accent-dim)] flex items-center justify-center mx-auto mb-4">
          <Images className="h-6 w-6 text-[var(--accent)]" />
        </div>
        <p className="text-[var(--foreground-muted)] font-medium mb-1">No public generations yet</p>
        <p className="text-xs text-[var(--foreground-subtle)] mb-4">
          Generate an image and enable &ldquo;Share to Feed&rdquo; to appear here.
        </p>
        <Link
          href="/studio"
          className="text-sm text-[var(--accent)] hover:text-[var(--accent-hover)] font-medium transition-colors"
        >
          Open Creator Studio →
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="columns-2 sm:columns-3 lg:columns-4 gap-4 space-y-4">
        {generations.map((gen) => (
          <div
            key={gen.id}
            className="break-inside-avoid rounded-2xl overflow-hidden border border-[var(--border)] group transition-all duration-300 hover:border-[var(--border-bright)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.5)] cursor-pointer"
            style={{ background: "var(--surface)" }}
            onClick={() => setSelected(gen)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && setSelected(gen)}
            aria-label={`View details: ${gen.fullPrompt?.slice(0, 60) ?? "generation"}`}
          >
            {gen.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={gen.imageUrl}
                alt={gen.fullPrompt ?? "Generated image"}
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
              {/* Stop propagation on FeedActions so clicks don't open modal */}
              <div onClick={(e) => e.stopPropagation()}>
                <FeedActions
                  generation={gen}
                  alreadySaved={savedGenIds.has(gen.id)}
                  onSaved={() => markSaved(gen.id)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <GenerationDetailModal
        generation={selected}
        savedGenIds={savedGenIds}
        onSaved={markSaved}
        onClose={() => setSelected(null)}
      />
    </>
  );
}
