"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  X, Copy, Check, GitFork, BookOpen,
  Calendar, Hash, Sliders, Layers, Palette,
  Sun, MapPin, Zap, Target, Tag, Globe, GlobeLock, Loader2,
} from "lucide-react";

export interface LibraryEntry {
  id: string;
  userId?: string | null;
  title: string;
  description?: string | null;
  fullPrompt: string;
  negativePrompt?: string | null;
  tags?: string | null;
  style?: string | null;
  cfgScale?: number | null;
  steps?: number | null;
  aspectRatio?: string | null;
  imageUrl?: string | null;
  likes?: number | null;
  createdAt?: string | null;
  userName?: string | null;
  forkedFromId?: string | null;
  generationId?: string | null;
  isPublic?: boolean | null;
}

interface Props {
  entry: LibraryEntry | null;
  currentUserId?: string;
  onClose: () => void;
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

export function LibraryDetailModal({ entry, currentUserId, onClose }: Props) {
  const router = useRouter();
  const [isPublic, setIsPublic] = useState<boolean>(false);
  const [toggling, setToggling] = useState(false);

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

  useEffect(() => {
    setIsPublic(entry?.isPublic ?? false);
  }, [entry]);

  if (!entry) return null;

  const canToggleFeed = currentUserId && entry.userId === currentUserId && !!entry.generationId;

  async function handleToggleFeed() {
    if (!entry?.generationId || toggling) return;
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

  const tags: string[] = (() => {
    try { return JSON.parse(entry.tags ?? "[]"); } catch { return []; }
  })();

  const date = entry.createdAt
    ? new Date(entry.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg z-10 transition-colors"
          style={{ color: "var(--foreground-muted)", background: "var(--surface-2)" }}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col md:flex-row">
          {/* Left: image */}
          {entry.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={entry.imageUrl}
              alt={entry.title}
              className="w-full md:w-64 md:flex-shrink-0 object-cover rounded-t-2xl md:rounded-l-2xl md:rounded-tr-none"
              style={{ maxHeight: "320px" }}
            />
          ) : (
            <div
              className="w-full md:w-64 md:flex-shrink-0 flex items-center justify-center rounded-t-2xl md:rounded-l-2xl md:rounded-tr-none"
              style={{ background: "var(--surface-2)", minHeight: "180px" }}
            >
              <BookOpen className="h-12 w-12 text-[var(--foreground-subtle)]" />
            </div>
          )}

          {/* Right: details */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
              <h2 className="text-lg font-bold text-[var(--foreground)] pr-8 mb-0.5">{entry.title}</h2>
              {entry.userName && (
                <p className="text-xs text-[var(--foreground-muted)]">by {entry.userName}</p>
              )}
              {entry.description && (
                <p className="text-sm text-[var(--foreground-muted)] mt-1">{entry.description}</p>
              )}
            </div>

            {/* Feed visibility notice */}
            {canToggleFeed && (
              <div
                className="px-5 py-3 flex items-center justify-between border-b"
                style={{
                  borderColor: "var(--border)",
                  background: isPublic ? "rgba(67,233,123,0.05)" : "var(--surface-2)",
                }}
              >
                <div className="flex items-center gap-2">
                  {isPublic ? (
                    <Globe className="h-4 w-4" style={{ color: "var(--success)" }} />
                  ) : (
                    <GlobeLock className="h-4 w-4" style={{ color: "var(--foreground-muted)" }} />
                  )}
                  <span
                    className="text-xs font-medium"
                    style={{ color: isPublic ? "var(--success)" : "var(--foreground-muted)" }}
                  >
                    {isPublic ? "Visible in Global Feed" : "Not shared to Global Feed"}
                  </span>
                </div>
                <button
                  onClick={handleToggleFeed}
                  disabled={toggling}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
                  style={{
                    background: isPublic ? "rgba(220,38,38,0.08)" : "var(--accent-dim)",
                    color: isPublic ? "var(--danger)" : "var(--accent)",
                    border: isPublic ? "1px solid rgba(220,38,38,0.2)" : "1px solid rgba(108,99,255,0.2)",
                  }}
                >
                  {toggling ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                  {isPublic ? "Remove from Feed" : "Share to Feed"}
                </button>
              </div>
            )}

            {/* Prompt */}
            <div className="px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Target className="h-3.5 w-3.5 text-[var(--accent)]" />
                  <span className="text-xs font-semibold text-[var(--foreground-subtle)] uppercase tracking-wider">Prompt</span>
                </div>
                <CopyButton text={entry.fullPrompt} label="Copy" />
              </div>
              <p className="text-sm text-[var(--foreground)] leading-relaxed">{entry.fullPrompt}</p>
            </div>

            {/* Negative prompt */}
            {entry.negativePrompt && (
              <div className="px-5 py-3 border-b" style={{ borderColor: "var(--border)" }}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Zap className="h-3.5 w-3.5 text-[var(--accent-2)]" />
                  <span className="text-xs font-semibold text-[var(--foreground-subtle)] uppercase tracking-wider">Negative Prompt</span>
                </div>
                <p className="text-xs text-[var(--foreground-muted)] leading-relaxed">{entry.negativePrompt}</p>
              </div>
            )}

            {/* Meta */}
            <div className="px-5 py-3 border-b flex flex-wrap gap-2" style={{ borderColor: "var(--border)" }}>
              {entry.style && (
                <Badge variant="default">
                  <Palette className="h-2.5 w-2.5 mr-1" />{entry.style}
                </Badge>
              )}
              {entry.aspectRatio && (
                <Badge variant="outline">
                  <Layers className="h-2.5 w-2.5 mr-1" />{entry.aspectRatio}
                </Badge>
              )}
              {entry.cfgScale && (
                <Badge variant="secondary">
                  <Sliders className="h-2.5 w-2.5 mr-1" />CFG {entry.cfgScale}
                </Badge>
              )}
              {entry.steps && (
                <Badge variant="secondary">
                  <Hash className="h-2.5 w-2.5 mr-1" />{entry.steps} steps
                </Badge>
              )}
              {date && (
                <Badge variant="outline">
                  <Calendar className="h-2.5 w-2.5 mr-1" />{date}
                </Badge>
              )}
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div className="px-5 py-3 border-b flex flex-wrap gap-1.5" style={{ borderColor: "var(--border)" }}>
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs"
                    style={{ background: "var(--accent-dim)", color: "var(--accent)", border: "1px solid rgba(108,99,255,0.2)" }}
                  >
                    <Tag className="h-2.5 w-2.5" />
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="p-5">
              <CopyButton text={entry.fullPrompt} label="Copy Full Prompt" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
