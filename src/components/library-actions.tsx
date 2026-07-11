"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { GitFork, Trash2 } from "lucide-react";
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
}

interface LibraryActionsProps {
  entry: LibraryEntry;
  currentUserId: string;
}

export function LibraryActions({ entry, currentUserId }: LibraryActionsProps) {
  const router = useRouter();

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
    await fetch(`/api/library/${entry.id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="flex gap-1">
      <Button variant="ghost" size="sm" onClick={handleFork} className="text-xs h-7">
        <GitFork className="h-3 w-3" />
        Fork
      </Button>
      {entry.userId === currentUserId && (
        <Button variant="ghost" size="sm" onClick={handleDelete} className="text-xs h-7 text-red-500 hover:text-red-700">
          <Trash2 className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
