"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  X, Copy, Check, GitFork, BookOpen,
  Calendar, Hash, Sliders, Layers, Palette,
  Sun, MapPin, Zap, Target, Tag,
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
}

interface Props {
  entry: LibraryEntry | null;
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

export function LibraryDetailModal({ entry, onClose }: Props) {
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

  if (!entry) return null;

  const tags: string[] = (() => {
    try { return JSON.parse(entry.tags ?? "[]"); } catch { return []; }
  })();

  const date = entry.createdAt
    ? new Date(entry.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl max-h-[90vh] rounded-2xl overflow-hidden flex flex-col shadow-2xl"
        style={{ background: "var(--surface)", border: "1px solid var(--border-bright)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
          style={{ background: "var(--surface-2)", color: "var(--foreground-muted)" }}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="overflow-y-auto flex flex-col md:flex-row">
          {/* Image */}
          {entry.imageUrl && (
            <div className="md:w-[45%] flex-shrink-0 bg-black flex items-center justify-center min-h-[200px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={entry.imageUrl}
                alt={entry.title}
                className="w-full h-full object-contain max-h-[60vh]"
              />
            </div>
          )}

          {/* Info */}
          <div className="flex-1 flex flex-col overflow-y-auto">
            {/* Title */}
            <div className="p-5 border-b" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-start gap-2 pr-8">
                <div className="w-8 h-8 rounded-xl bg-[var(--accent-dim)] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <BookOpen className="h-4 w-4 text-[var(--accent)]" />
                </div>
                <div>
                  <h2 className="text-base font-bold" style={{ color: "var(--foreground)" }}>{entry.title}</h2>
                  {entry.description && (
                    <p className="text-xs mt-0.5" style={{ color: "var(--foreground-muted)" }}>{entry.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 mt-3">
                {entry.userName && (
                  <span className="text-xs" style={{ color: "var(--foreground-subtle)" }}>{entry.userName}</span>
                )}
                {date && (
                  <div className="flex items-center gap-1" style={{ color: "var(--foreground-subtle)" }}>
                    <Calendar className="h-3 w-3" />
                    <span className="text-xs">{date}</span>
                  </div>
                )}
                {entry.likes != null && entry.likes > 0 && (
                  <span className="text-xs" style={{ color: "var(--accent)" }}>♥ {entry.likes}</span>
                )}
              </div>
            </div>

            {/* Full prompt */}
            <div className="p-5 border-b" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--foreground-subtle)" }}>
                  Full Prompt
                </span>
                <CopyButton text={entry.fullPrompt} label="Copy" />
              </div>
              <p className="text-sm leading-relaxed font-mono whitespace-pre-wrap" style={{ color: "var(--foreground-muted)" }}>
                {entry.fullPrompt}
              </p>
            </div>

            {/* Negative prompt */}
            {entry.negativePrompt && (
              <div className="px-5 py-3 border-b" style={{ borderColor: "var(--border)" }}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--foreground-subtle)" }}>
                    Negative Prompt
                  </span>
                  <CopyButton text={entry.negativePrompt} label="Copy" />
                </div>
                <p className="text-xs leading-relaxed font-mono" style={{ color: "var(--foreground-muted)" }}>
                  {entry.negativePrompt}
                </p>
              </div>
            )}

            {/* Style & params */}
            <div className="px-5 py-3 border-b flex flex-wrap gap-2" style={{ borderColor: "var(--border)" }}>
              {entry.style && <Badge variant="secondary">{entry.style}</Badge>}
              {entry.aspectRatio && <Badge variant="outline">{entry.aspectRatio}</Badge>}
              {entry.cfgScale != null && <Badge variant="secondary">CFG {entry.cfgScale}</Badge>}
              {entry.steps != null && <Badge variant="secondary">{entry.steps} steps</Badge>}
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
