"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { GitFork, BookmarkPlus, Check, GlobeLock, Loader2 } from "lucide-react";
import { buildStudioUrl } from "@/lib/utils";

interface Generation {
  id: string;
  userId?: string | null;
  fullPrompt?: string | null;
  style?: string | null;
  cfgScale?: number | null;
  seed?: number | null;
  steps?: number | null;
  aspectRatio?: string | null;
  negativePrompt?: string | null;
  subject?: string | null;
  action?: string | null;
  environment?: string | null;
  lighting?: string | null;
  colorPalette?: string | null;
  imageUrl?: string | null;
}

interface FeedActionsProps {
  generation: Generation;
  currentUserId?: string;
  alreadySaved?: boolean;
  onSaved?: () => void;
  onRemovedFromFeed?: () => void;
}

export function FeedActions({
  generation,
  currentUserId,
  alreadySaved = false,
  onSaved,
  onRemovedFromFeed,
}: FeedActionsProps) {
  const router = useRouter();
  const [saved, setSaved] = useState(alreadySaved);
  const [saving, setSaving] = useState(false);
  const [alreadyExists, setAlreadyExists] = useState(false);
  const [removing, setRemoving] = useState(false);

  const isOwner = !!currentUserId && generation.userId === currentUserId;

  function handleRemix() {
    router.push(
      buildStudioUrl({
        subject: generation.subject ?? "",
        action: generation.action ?? "",
        environment: generation.environment ?? "",
        lighting: generation.lighting ?? "",
        style: generation.style ?? "",
        colorPalette: generation.colorPalette ?? "",
        negativePrompt: generation.negativePrompt ?? "",
        seed: generation.seed ?? undefined,
        cfgScale: generation.cfgScale ?? 7,
        steps: generation.steps ?? 30,
        aspectRatio: generation.aspectRatio ?? "1:1",
        inputImageUrl: generation.imageUrl ?? undefined,
        generationType: generation.imageUrl ? "image-to-image" : "text-to-image",
      })
    );
  }

  async function handleSaveToLibrary() {
    if (saved || alreadyExists) return;
    const title = prompt("Enter a title for this prompt:");
    if (!title) return;
    setSaving(true);
    const res = await fetch("/api/library", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        fullPrompt: generation.fullPrompt ?? "",
        negativePrompt: generation.negativePrompt,
        style: generation.style,
        cfgScale: generation.cfgScale,
        steps: generation.steps,
        aspectRatio: generation.aspectRatio,
        imageUrl: generation.imageUrl,
        generationId: generation.id,
        forkedFromId: generation.id,
      }),
    });
    setSaving(false);
    if (res.status === 409) {
      setAlreadyExists(true);
    } else if (res.ok) {
      setSaved(true);
      onSaved?.();
    }
  }

  async function handleRemoveFromFeed() {
    if (removing) return;
    if (!confirm("Remove this image from the Global Feed?")) return;
    setRemoving(true);
    try {
      await fetch(`/api/generations/${generation.id}/visibility`, { method: "PATCH" });
      onRemovedFromFeed?.();
      router.refresh();
    } finally {
      setRemoving(false);
    }
  }

  const isSaved = saved || alreadyExists;

  return (
    <div className="flex gap-1.5 mt-2 flex-wrap">
      <Button variant="ghost" size="sm" onClick={handleRemix} className="flex-1 text-xs h-7">
        <GitFork className="h-3 w-3" />
        Remix
      </Button>

      {isSaved ? (
        <div
          className="flex-1 flex items-center justify-center gap-1 h-7 rounded-lg text-xs font-medium"
          style={{ background: "rgba(67,233,123,0.1)", color: "var(--success)", border: "1px solid rgba(67,233,123,0.2)" }}
        >
          <Check className="h-3 w-3" />
          {alreadyExists && !saved ? "In Library" : "Saved"}
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSaveToLibrary}
          disabled={saving}
          className="flex-1 text-xs h-7"
        >
          <BookmarkPlus className="h-3 w-3" />
          {saving ? "Saving..." : "Save"}
        </Button>
      )}

      {/* Remove from feed — only for the owner */}
      {isOwner && (
        <button
          onClick={handleRemoveFromFeed}
          disabled={removing}
          title="Remove from Global Feed"
          className="inline-flex items-center gap-1 px-2 h-7 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
          style={{
            background: "rgba(220,38,38,0.07)",
            color: "var(--danger)",
            border: "1px solid rgba(220,38,38,0.15)",
          }}
        >
          {removing
            ? <Loader2 className="h-3 w-3 animate-spin" />
            : <GlobeLock className="h-3 w-3" />
          }
          Remove
        </button>
      )}
    </div>
  );
}
