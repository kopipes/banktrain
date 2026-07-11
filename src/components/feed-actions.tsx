"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { GitFork, BookmarkPlus, Check } from "lucide-react";
import { buildStudioUrl } from "@/lib/utils";

interface Generation {
  id: string;
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

export function FeedActions({ generation }: { generation: Generation }) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

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
    const title = prompt("Enter a title for this prompt:");
    if (!title) return;
    setSaving(true);
    await fetch("/api/library", {
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
        forkedFromId: generation.id,
      }),
    });
    setSaving(false);
    setSaved(true);
  }

  return (
    <div className="flex gap-2 mt-2">
      <Button variant="ghost" size="sm" onClick={handleRemix} className="flex-1 text-xs h-7">
        <GitFork className="h-3 w-3" />
        Remix
      </Button>
      {saved ? (
        <div
          className="flex-1 flex items-center justify-center gap-1 h-7 rounded-lg text-xs font-medium"
          style={{ background: "rgba(67,233,123,0.1)", color: "var(--success)", border: "1px solid rgba(67,233,123,0.2)" }}
        >
          <Check className="h-3 w-3" />
          Saved
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
    </div>
  );
}
