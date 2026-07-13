"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Phase5Data, ConceptSession } from "../types";
import { FileText, Download, RefreshCw, Check, ChevronDown, ChevronUp } from "lucide-react";

interface Props {
  session: ConceptSession;
  llmModelId: string;
  data: Phase5Data;
  onChange: (data: Partial<Phase5Data>) => void;
  onBack: () => void;
  onReset: () => void;
}

const SLIDE_TYPE_COLORS: Record<string, string> = {
  title: "#6c63ff",
  background: "#f7971e",
  narrative: "#43e97b",
  overall_layout: "#38b2ff",
  zone_detail: "#ff6584",
  budget: "#ffd200",
  closing: "#a78bfa",
};

export function Phase5Deck({ session, llmModelId, data, onChange, onBack, onReset }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState("");
  const [expandedSlide, setExpandedSlide] = useState<number | null>(0);

  const visuals = session.phase4.revisedVisuals.length > 0
    ? session.phase4.revisedVisuals
    : session.phase3.visuals;

  async function handleGenerateDeck() {
    if (!llmModelId) { setGenError("No LLM model configured."); return; }
    setIsGenerating(true);
    setGenError("");

    try {
      const res = await fetch("/api/concept/deck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          llmModelId,
          paradigm: session.phase1.paradigm,
          brief: {
            eventName: session.phase1.brief.eventName,
            objective: session.phase1.brief.objective,
            targetAudience: session.phase1.brief.targetAudience,
            brandName: session.phase1.brief.brandName,
            brandValues: session.phase1.brief.brandValues,
          },
          theme: session.phase1.selectedTheme,
          visualCount: visuals.length,
        }),
      });

      const json = await res.json();
      if (!res.ok) { setGenError(json.error ?? "Failed to generate deck."); return; }

      // Inject visual images into matching slides
      const slides = (json.slides ?? []).map((slide: { type: string; title: string; body: string }) => {
        const matchVisual = visuals.find((v) =>
          (slide.type === "overall_layout" && v.type === "overall") ||
          (slide.type === "zone_detail" && (v.type === "booth" || v.type === "stage")) ||
          (slide.type === "title" && v.type === "overall")
        );
        return { ...slide, imageUrl: matchVisual?.imageUrl };
      });

      onChange({ slides, generatedAt: new Date().toISOString() });
    } catch {
      setGenError("Network error. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }

  function handleExportJSON() {
    const exportData = {
      session: {
        id: session.id,
        eventName: session.phase1.brief.eventName,
        theme: session.phase1.selectedTheme,
        paradigm: session.phase1.paradigm,
        generatedAt: data.generatedAt,
      },
      brief: session.phase1.brief,
      venue: session.phase2.venue,
      components: session.phase2.components.filter((c) => c.enabled),
      visuals: visuals.map((v) => ({ type: v.type, label: v.label, imageUrl: v.imageUrl })),
      slides: data.slides,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `concept_${session.phase1.brief.eventName.replace(/\s+/g, "_") || "event"}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h2 className="text-xl font-bold text-[var(--foreground)] mb-1">Phase 5 — Narrative Deck</h2>
        <p className="text-sm text-[var(--foreground-muted)]">
          Generate the structured pitch deck narrative and export your concept.
        </p>
      </div>

      {/* Summary */}
      <div className="rounded-2xl border border-[var(--border)] p-5 mb-6" style={{ background: "var(--surface)" }}>
        <p className="text-xs font-bold text-[var(--foreground-subtle)] uppercase tracking-widest mb-3">Concept Summary</p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="text-[var(--foreground-muted)]">Event:</span> <span className="font-medium text-[var(--foreground)]">{session.phase1.brief.eventName}</span></div>
          <div><span className="text-[var(--foreground-muted)]">Theme:</span> <span className="font-medium text-[var(--foreground)]">{session.phase1.selectedTheme}</span></div>
          <div><span className="text-[var(--foreground-muted)]">Paradigm:</span> <span className="font-medium text-[var(--foreground)] capitalize">{session.phase1.paradigm?.replace("_", " ")}</span></div>
          <div><span className="text-[var(--foreground-muted)]">Visuals:</span> <span className="font-medium text-[var(--foreground)]">{visuals.length} generated</span></div>
        </div>
      </div>

      {/* Generate button */}
      {!data.generatedAt && (
        <div className="rounded-2xl border border-[rgba(108,99,255,0.2)] p-5 mb-6" style={{ background: "rgba(108,99,255,0.04)" }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[var(--foreground)]">Generate Narrative</p>
              <p className="text-xs text-[var(--foreground-muted)] mt-0.5">AI will write slide copy for your full pitch deck.</p>
            </div>
            <Button onClick={handleGenerateDeck} isLoading={isGenerating} variant="gradient" className="h-9 px-5">
              <FileText className="h-4 w-4" />
              Generate Deck
            </Button>
          </div>
          {genError && <p className="mt-3 text-xs" style={{ color: "var(--danger)" }}>{genError}</p>}
        </div>
      )}

      {/* Slides */}
      {data.slides.length > 0 && (
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-[var(--foreground-subtle)] uppercase tracking-widest">
              Slides ({data.slides.length})
            </p>
            <Button variant="outline" size="sm" onClick={handleGenerateDeck} isLoading={isGenerating}>
              <RefreshCw className="h-3 w-3" /> Regenerate
            </Button>
          </div>

          {data.slides.map((slide, i) => {
            const color = SLIDE_TYPE_COLORS[slide.type] ?? "#6c63ff";
            const expanded = expandedSlide === i;
            return (
              <div key={i} className="rounded-2xl border overflow-hidden transition-all" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                <button
                  className="w-full flex items-center gap-3 p-4 text-left"
                  onClick={() => setExpandedSlide(expanded ? null : i)}
                >
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
                    style={{ background: color }}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--foreground)] truncate">{slide.title}</p>
                    <p className="text-xs text-[var(--foreground-subtle)] capitalize">{slide.type.replace("_", " ")}</p>
                  </div>
                  {expanded ? <ChevronUp className="h-4 w-4 text-[var(--foreground-subtle)]" /> : <ChevronDown className="h-4 w-4 text-[var(--foreground-subtle)]" />}
                </button>

                {expanded && (
                  <div className="px-4 pb-4">
                    {slide.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={slide.imageUrl} alt={slide.title} className="w-full aspect-video object-cover rounded-xl mb-3" />
                    )}
                    <p className="text-sm text-[var(--foreground-muted)] leading-relaxed whitespace-pre-wrap">{slide.body}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Export actions */}
      {data.slides.length > 0 && (
        <div className="rounded-2xl border border-[var(--border)] p-5 mb-6" style={{ background: "var(--surface)" }}>
          <p className="text-xs font-bold text-[var(--foreground-subtle)] uppercase tracking-widest mb-3">Export</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleExportJSON}>
              <Download className="h-3.5 w-3.5" /> Export JSON
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Download className="h-3.5 w-3.5" /> Print / Save PDF
            </Button>
          </div>
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>← Back</Button>
        <Button variant="outline" onClick={onReset} className="text-[var(--danger)] border-[var(--danger)] hover:bg-[rgba(220,38,38,0.06)]">
          Start New Concept
        </Button>
      </div>
    </div>
  );
}
