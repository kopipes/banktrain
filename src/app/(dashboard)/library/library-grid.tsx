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

              <div
                className="font-mono text-xs text-[var(--foreground-muted)] rounded-xl p-2.5 line-clamp-2 mb-3 leading-relaxed"
                style={{ background: "var(--surface-2)" }}
              >
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
        onClose={() => setSelected(null)}
      />
    </>
  );
}
