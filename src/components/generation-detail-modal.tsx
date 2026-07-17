"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatIdr } from "@/lib/utils";
import { buildStudioUrl } from "@/lib/utils";
import {
  X, Copy, Check, GitFork, BookmarkPlus, Images,
  User, Calendar, Hash, Sliders, Layers, Palette,
  Sun, MapPin, Zap, Target,
} from "lucide-react";

export interface FeedGeneration {
  id: string;
  userId?: string | null;
  fullPrompt?: string | null;
  imageUrl?: string | null;
  style?: string | null;
  aspectRatio?: string | null;
  cfgScale?: number | null;
  seed?: number | null;
  steps?: number | null;
  negativePrompt?: string | null;
  subject?: string | null;
  action?: string | null;
  environment?: string | null;
  lighting?: string | null;
  colorPalette?: string | null;
  costIdr?: number | null;
  createdAt?: string | null;
  userName?: string | null;
  userDivision?: string | null;
}

interface Props {
  generation: FeedGeneration | null;
  onClose: () => void;
  savedGenIds?: Set<string>;
  onSaved?: (genId: string) => void;
}

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all duration-150"
      style={{
        background: copied ? "rgba(67,233,123,0.12)" : "var(--surface-2)",
        color: copied ? "var(--success)" : "var(--foreground-muted)",
        border: copied ? "1px solid rgba(67,233,123,0.2)" : "1px solid var(--border)",
      }}
      title={`Copy ${label ?? "text"}`}
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {label && <span>{copied ? "Copied!" : label}</span>}
    </button>
  );
}

export function GenerationDetailModal({ generation, onClose, savedGenIds, onSaved }: Props) {
  const router = useRouter();
  const [saveLoading, setSaveLoading] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  if (!generation) return null;

  const isSaved = savedIds.has(generation.id) || (savedGenIds?.has(generation.id) ?? false);

  function handleRemix() {
    if (!generation) return;
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
    onClose();
  }

  async function handleSaveToLibrary() {
    if (!generation) return;
    const title = window.prompt("Enter a title for this prompt:");
    if (!title) return;
    setSaveLoading(true);
    await fetch("/api/library", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        fullPrompt: generation.fullPrompt,
        negativePrompt: generation.negativePrompt,
        style: generation.style,
        cfgScale: generation.cfgScale,
        steps: generation.steps,
        aspectRatio: generation.aspectRatio,
        imageUrl: generation.imageUrl,
        forkedFromId: generation.id,
      }),
    });
    setSaveLoading(false);
    setSavedIds((prev) => new Set(prev).add(generation.id));
    onSaved?.(generation.id);
  }

  const date = generation.createdAt
    ? new Date(generation.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] rounded-2xl overflow-hidden flex flex-col md:flex-row shadow-2xl"
        style={{ background: "var(--surface)", border: "1px solid var(--border-bright)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
          style={{ background: "rgba(0,0,0,0.5)", color: "white" }}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Image panel */}
        <div className="md:w-[55%] flex-shrink-0 bg-black flex items-center justify-center min-h-[260px]">
          {generation.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={generation.imageUrl}
              alt={generation.fullPrompt ?? "Generated image"}
              className="w-full h-full object-contain max-h-[90vh]"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 p-8" style={{ color: "var(--foreground-subtle)" }}>
              <Images className="h-12 w-12" />
              <span className="text-sm">No image</span>
            </div>
          )}
        </div>

        {/* Info panel */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          {/* Header */}
          <div className="p-5 border-b" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-[var(--accent)] to-[var(--accent-2)] flex items-center justify-center">
                <span className="text-[11px] font-bold text-white">
                  {generation.userName?.[0]?.toUpperCase() ?? "?"}
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                  {generation.userName ?? "Unknown"}
                </p>
                {generation.userDivision && (
                  <p className="text-xs capitalize" style={{ color: "var(--foreground-subtle)" }}>
                    {generation.userDivision}
                  </p>
                )}
              </div>
            </div>
            {date && (
              <div className="flex items-center gap-1 mt-2" style={{ color: "var(--foreground-subtle)" }}>
                <Calendar className="h-3 w-3" />
                <span className="text-xs">{date}</span>
              </div>
            )}
          </div>

          {/* Prompt */}
          <div className="p-5 border-b" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--foreground-subtle)" }}>
                Full Prompt
              </span>
              {generation.fullPrompt && (
                <CopyButton text={generation.fullPrompt} label="Copy" />
              )}
            </div>
            <p className="text-sm leading-relaxed font-mono" style={{ color: "var(--foreground-muted)" }}>
              {generation.fullPrompt ?? "—"}
            </p>
          </div>

          {/* Negative prompt */}
          {generation.negativePrompt && (
            <div className="px-5 py-3 border-b" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--foreground-subtle)" }}>
                  Negative Prompt
                </span>
                <CopyButton text={generation.negativePrompt} label="Copy" />
              </div>
              <p className="text-xs leading-relaxed font-mono" style={{ color: "var(--foreground-muted)" }}>
                {generation.negativePrompt}
              </p>
            </div>
          )}

          {/* Breakdown fields */}
          <div className="px-5 py-3 border-b grid grid-cols-2 gap-x-4 gap-y-2" style={{ borderColor: "var(--border)" }}>
            {[
              { icon: Target, label: "Subject", value: generation.subject },
              { icon: Zap, label: "Action", value: generation.action },
              { icon: MapPin, label: "Environment", value: generation.environment },
              { icon: Sun, label: "Lighting", value: generation.lighting },
              { icon: Palette, label: "Style", value: generation.style },
              { icon: Layers, label: "Color Palette", value: generation.colorPalette },
            ].filter((f) => f.value).map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-1.5 min-w-0">
                <Icon className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" style={{ color: "var(--accent)" }} />
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--foreground-subtle)" }}>{label}</p>
                  <p className="text-xs truncate" style={{ color: "var(--foreground-muted)" }}>{value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Parameters */}
          <div className="px-5 py-3 border-b flex flex-wrap gap-2" style={{ borderColor: "var(--border)" }}>
            {generation.aspectRatio && <Badge variant="outline">{generation.aspectRatio}</Badge>}
            {generation.cfgScale != null && <Badge variant="secondary">CFG {generation.cfgScale}</Badge>}
            {generation.steps != null && <Badge variant="secondary">{generation.steps} steps</Badge>}
            {generation.seed != null && (
              <Badge variant="outline" className="font-mono text-[10px]">
                <Hash className="h-2.5 w-2.5 mr-1" />
                {generation.seed}
              </Badge>
            )}
            {generation.costIdr != null && generation.costIdr > 0 && (
              <Badge variant="default">{formatIdr(generation.costIdr)}</Badge>
            )}
          </div>

          {/* Actions */}
          <div className="p-5 flex gap-2 mt-auto">
            <Button
              variant="outline"
              className={`h-9 text-sm ${isSaved ? "flex-1" : "flex-1"}`}
              onClick={handleRemix}
            >
              <GitFork className="h-4 w-4" />
              Remix
            </Button>
            {!isSaved && (
              <Button
                variant="gradient"
                className="flex-1 h-9 text-sm"
                onClick={handleSaveToLibrary}
                isLoading={saveLoading}
              >
                <BookmarkPlus className="h-4 w-4" />
                Save to Library
              </Button>
            )}
            {isSaved && (
              <div
                className="flex-1 h-9 flex items-center justify-center gap-1.5 rounded-xl text-sm font-medium"
                style={{ background: "rgba(67,233,123,0.1)", color: "var(--success)", border: "1px solid rgba(67,233,123,0.2)" }}
              >
                <Check className="h-4 w-4" />
                Saved to Library
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
