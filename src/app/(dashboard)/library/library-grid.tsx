"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { LibraryActions } from "@/components/library-actions";
import { LibraryDetailModal, type LibraryEntry } from "@/components/library-detail-modal";
import { BookOpen, GitFork } from "lucide-react";

interface Props {
  entries: LibraryEntry[];
  currentUserId: string;
}

export function LibraryGrid({ entries, currentUserId }: Props) {
  const [selected, setSelected] = useState<LibraryEntry | null>(null);

  if (entries.length === 0) {
    return (
      <div
        className="rounded-2xl border border-[var(--border)] border-dashed p-16 text-center"
        style={{ background: "var(--surface)" }}
      >
        <div className="w-14 h-14 rounded-2xl bg-[var(--accent-dim)] flex items-center justify-center mx-auto mb-4">
          <BookOpen className="h-6 w-6 text-[var(--accent)]" />
        </div>
        <p className="text-[var(--foreground-muted)] font-medium mb-1">Library is empty</p>
        <p className="text-xs text-[var(--foreground-subtle)]">
          Save a prompt from Creator Studio to start building the library.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="group flex flex-col rounded-2xl border border-[var(--border)] overflow-hidden transition-all duration-300 hover:border-[var(--border-bright)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)] cursor-pointer"
            style={{ background: "var(--surface)" }}
            onClick={() => setSelected(entry)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && setSelected(entry)}
            aria-label={`View details: ${entry.title}`}
          >
            {entry.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={entry.imageUrl}
                alt={entry.title}
                className="w-full aspect-video object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              />
            ) : (
              <div
                className="w-full aspect-video flex items-center justify-center"
                style={{ background: "var(--surface-2)" }}
              >
                <BookOpen className="h-8 w-8 text-[var(--foreground-subtle)]" />
              </div>
            )}

            <div className="p-4 flex flex-col flex-1">
              <p className="text-sm font-semibold text-[var(--foreground)] mb-1 line-clamp-1">{entry.title}</p>
              {entry.description && (
                <p className="text-xs text-[var(--foreground-muted)] mb-2 line-clamp-2">{entry.description}</p>
              )}
              <p className="text-xs text-[var(--foreground-subtle)] line-clamp-3 mb-3 leading-relaxed flex-1">
                {entry.fullPrompt}
              </p>

              <div className="flex flex-wrap gap-1 mb-3">
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

              <div
                className="mt-auto flex items-center justify-between"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="text-xs text-[var(--foreground-subtle)]">{entry.userName}</span>
                <LibraryActions entry={entry} currentUserId={currentUserId} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <LibraryDetailModal
        entry={selected}
        currentUserId={currentUserId}
        onClose={() => setSelected(null)}
      />
    </>
  );
}
