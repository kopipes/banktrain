"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Phase3Data, Phase4Data, GeneratedVisual } from "../types";
import { RefreshCw, Lock, Unlock, CheckCircle, PenLine } from "lucide-react";

interface Props {
  phase1Theme: string;
  phase1BrandColors: string;
  phase3: Phase3Data;
  data: Phase4Data;
  imageModelId: string;
  onChange: (data: Partial<Phase4Data>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function Phase4Iteration({ phase1Theme, phase1BrandColors, phase3, data, imageModelId, onChange, onNext, onBack }: Props) {
  const [selectedVisualIdx, setSelectedVisualIdx] = useState(0);
  const [isIterating, setIsIterating] = useState(false);
  const [iterError, setIterError] = useState("");

  const visuals = data.revisedVisuals.length > 0 ? data.revisedVisuals : phase3.visuals;
  const currentVisual = visuals[selectedVisualIdx];
  const canProceed = data.locked;

  async function handleIterate() {
    if (!currentVisual || !data.revisionPrompt.trim()) return;
    if (!imageModelId) { setIterError("No image model configured."); return; }
    setIsIterating(true);
    setIterError("");

    try {
      const res = await fetch("/api/concept/iterate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageModelId,
          originalImageUrl: currentVisual.imageUrl,
          revisionPrompt: data.revisionPrompt,
          type: currentVisual.type,
          theme: phase1Theme,
          brandColors: phase1BrandColors,
        }),
      });

      const json = await res.json();
      if (!res.ok) { setIterError(json.error ?? "Iteration failed."); return; }

      const updated: GeneratedVisual = {
        ...currentVisual,
        imageUrl: json.imageUrl,
        generationId: json.generationId,
        prompt: json.prompt,
      };

      const newVisuals = [...visuals];
      newVisuals[selectedVisualIdx] = updated;

      const annotation = {
        visualIndex: selectedVisualIdx,
        note: data.revisionPrompt,
        timestamp: new Date().toISOString(),
      };

      onChange({
        revisedVisuals: newVisuals,
        annotations: [...data.annotations, annotation],
        revisionPrompt: "",
      });
    } catch {
      setIterError("Network error. Please try again.");
    } finally {
      setIsIterating(false);
    }
  }

  function handleLock() {
    onChange({ locked: true });
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h2 className="text-xl font-bold text-[var(--foreground)] mb-1">Phase 4 — Iteration Engine</h2>
        <p className="text-sm text-[var(--foreground-muted)]">
          Annotate and revise your visuals. Lock to finalize before generating the deck.
        </p>
      </div>

      {data.locked && (
        <div className="rounded-2xl border border-[rgba(67,233,123,0.3)] p-4 mb-6 flex items-center gap-3" style={{ background: "rgba(67,233,123,0.05)" }}>
          <Lock className="h-5 w-5 flex-shrink-0" style={{ color: "var(--success)" }} />
          <p className="text-sm font-medium" style={{ color: "var(--success)" }}>Visuals locked and finalized.</p>
          <Button variant="outline" size="sm" className="ml-auto" onClick={() => onChange({ locked: false })}>
            <Unlock className="h-3 w-3" /> Unlock to edit
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Visual selector */}
        <div>
          <p className="text-xs font-bold text-[var(--foreground-subtle)] uppercase tracking-widest mb-3">Select Visual</p>
          <div className="space-y-2">
            {visuals.map((v, i) => (
              <button
                key={i}
                onClick={() => setSelectedVisualIdx(i)}
                className="w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all duration-150"
                style={{
                  borderColor: selectedVisualIdx === i ? "rgba(108,99,255,0.3)" : "var(--border)",
                  background: selectedVisualIdx === i ? "rgba(108,99,255,0.06)" : "var(--surface-2)",
                }}
              >
                {v.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={v.imageUrl} alt={v.label} className="w-16 h-10 object-cover rounded-lg flex-shrink-0" />
                ) : (
                  <div className="w-16 h-10 rounded-lg bg-[var(--border)] flex-shrink-0" />
                )}
                <span className="text-sm font-medium text-[var(--foreground)]">{v.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Current visual + revision */}
        <div>
          {currentVisual?.imageUrl && (
            <div className="rounded-xl overflow-hidden mb-3 aspect-video">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={currentVisual.imageUrl} alt={currentVisual.label} className="w-full h-full object-cover" />
            </div>
          )}

          {!data.locked && (
            <div>
              <Label htmlFor="revision">Revision Note</Label>
              <Textarea
                id="revision"
                className="mt-1"
                rows={3}
                placeholder='e.g. "Change the main stage color to gold, add more dramatic lighting"'
                value={data.revisionPrompt}
                onChange={(e) => onChange({ revisionPrompt: e.target.value })}
              />
              {iterError && <p className="text-xs mt-1" style={{ color: "var(--danger)" }}>{iterError}</p>}
              <Button
                className="mt-2 w-full"
                variant="outline"
                onClick={handleIterate}
                disabled={!data.revisionPrompt.trim() || isIterating || !currentVisual}
                isLoading={isIterating}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Apply Revision
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Revision history */}
      {data.annotations.length > 0 && (
        <div className="rounded-2xl border border-[var(--border)] p-4 mb-6" style={{ background: "var(--surface)" }}>
          <p className="text-xs font-bold text-[var(--foreground-subtle)] uppercase tracking-widest mb-3">Revision History</p>
          <div className="space-y-2">
            {data.annotations.map((a, i) => (
              <div key={i} className="flex items-start gap-2">
                <PenLine className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-[var(--accent)]" />
                <div>
                  <p className="text-xs text-[var(--foreground-muted)]">{a.note}</p>
                  <p className="text-[10px] text-[var(--foreground-subtle)]">{new Date(a.timestamp).toLocaleTimeString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!data.locked && visuals.length > 0 && (
        <div className="rounded-2xl border border-[rgba(108,99,255,0.2)] p-4 mb-6" style={{ background: "rgba(108,99,255,0.04)" }}>
          <p className="text-sm font-semibold text-[var(--foreground)] mb-1">Ready to finalize?</p>
          <p className="text-xs text-[var(--foreground-muted)] mb-3">Lock your visuals to proceed to deck generation.</p>
          <Button onClick={handleLock} variant="gradient" size="sm">
            <Lock className="h-3.5 w-3.5" /> Lock & Finalize Visuals
          </Button>
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>← Back</Button>
        <Button onClick={onNext} disabled={!canProceed} variant="gradient" className="h-10 px-6">
          Continue to Deck →
        </Button>
      </div>
    </div>
  );
}
