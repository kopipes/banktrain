"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import type { Generation } from "@/db/schema";

export function RecentGenerationsGrid({
  generations,
  isAdmin,
}: {
  generations: Generation[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Delete this error entry?")) return;
    setDeletingId(id);
    const res = await fetch(`/api/generations?id=${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error ?? "Failed to delete.");
    }
    setDeletingId(null);
    router.refresh();
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
      {generations.map((gen) => (
        <div
          key={gen.id}
          className="group relative aspect-square rounded-xl overflow-hidden border border-[var(--border)] transition-all duration-300 hover:border-[var(--accent)] hover:scale-105 hover:shadow-[0_0_16px_rgba(108,99,255,0.3)] cursor-pointer"
          style={{ background: "var(--surface-2)" }}
        >
          {gen.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={gen.imageUrl}
              alt={gen.fullPrompt}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-[10px] text-[var(--foreground-subtle)] capitalize">
                {gen.status}
              </span>
            </div>
          )}

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-2 flex items-end justify-between">
            {gen.style && (
              <Badge variant="secondary" className="text-[10px] truncate max-w-[70%]">
                {gen.style}
              </Badge>
            )}
            {/* Delete button for error entries — admin sees all, users see own */}
            {gen.status === "error" && (
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(gen.id); }}
                disabled={deletingId === gen.id}
                className="ml-auto flex items-center justify-center w-6 h-6 rounded-full bg-red-600 hover:bg-red-700 text-white transition-colors flex-shrink-0"
                aria-label="Delete error entry"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Error indicator */}
          {gen.status === "error" && (
            <div className="absolute top-1 right-1">
              <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
