"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Phase1Data, Phase2Data, Phase3Data, GeneratedVisual } from "../types";
import { Wand2, RefreshCw, CheckCircle, Images, AlertCircle } from "lucide-react";

interface Props {
  phase1: Phase1Data;
  phase2: Phase2Data;
  data: Phase3Data;
  imageModelId: string;
  onChange: (data: Partial<Phase3Data>) => void;
  onNext: () => void;
  onBack: () => void;
}

const VISUAL_TYPES: Array<{ type: GeneratedVisual["type"]; label: string; desc: string }> = [
  { type: "overall", label: "Overall Blueprint", desc: "Aerial zoning floor plan with traffic flow" },
  { type: "booth", label: "Booth Layout", desc: "4×4m modular booth 3D render" },
  { type: "stage", label: "Stage Render", desc: "Technical 3D main stage visualization" },
];

export function Phase3Visuals({ phase1, phase2, data, imageModelId, onChange, onNext, onBack }: Props) {
  const [generating, setGenerating] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [approved, setApproved] = useState(data.approved);

  const enabledComponents = phase2.components.filter((c) => c.enabled).map((c) => ({ name: c.name, enabled: c.enabled, area: c.area }));
  const canProceed = approved && data.visuals.length > 0;

  async function generateVisual(type: GeneratedVisual["type"]) {
    if (!imageModelId) { setErrors((e) => ({ ...e, [type]: "No image model configured." })); return; }
    setGenerating((g) => ({ ...g, [type]: true }));
    setErrors((e) => ({ ...e, [type]: "" }));

    try {
      const res = await fetch("/api/concept/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageModelId,
          theme: phase1.selectedTheme,
          paradigm: phase1.paradigm,
          brief: {
            eventName: phase1.brief.eventName,
            objective: phase1.brief.objective,
            brandName: phase1.brief.brandName,
            brandColors: phase1.brief.brandColors,
            expectedAttendees: phase1.brief.expectedAttendees,
          },
          venue: {
            venueWidth: phase2.venue.venueWidth,
            venueLength: phase2.venue.venueLength,
            venueType: phase2.venue.venueType,
          },
          components: enabledComponents,
          type,
        }),
      });

      const json = await res.json();
      if (!res.ok) { setErrors((e) => ({ ...e, [type]: json.error ?? "Generation failed." })); return; }

      const newVisual: GeneratedVisual = {
        type,
        imageUrl: json.imageUrl,
        label: VISUAL_TYPES.find((v) => v.type === type)?.label ?? type,
        prompt: json.prompt,
        generationId: json.generationId,
      };

      const updated = [...data.visuals.filter((v) => v.type !== type), newVisual];
      onChange({ visuals: updated });
      setApproved(false);
      onChange({ approved: false });
    } catch {
      setErrors((e) => ({ ...e, [type]: "Network error. Please try again." }));
    } finally {
      setGenerating((g) => ({ ...g, [type]: false }));
    }
  }

  function handleApprove() {
    setApproved(true);
    onChange({ approved: true });
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h2 className="text-xl font-bold text-[var(--foreground)] mb-1">Phase 3 — Visual Generation</h2>
        <p className="text-sm text-[var(--foreground-muted)]">
          Generate visuals for your concept. Review and approve before proceeding.
        </p>
      </div>

      {/* Context summary */}
      <div className="rounded-2xl border border-[var(--border)] p-4 mb-6 flex flex-wrap gap-4" style={{ background: "var(--surface)" }}>
        <div><p className="text-[10px] text-[var(--foreground-subtle)] uppercase tracking-wider">Theme</p><p className="text-sm font-semibold text-[var(--foreground)]">{phase1.selectedTheme}</p></div>
        <div><p className="text-[10px] text-[var(--foreground-subtle)] uppercase tracking-wider">Paradigm</p><p className="text-sm font-semibold text-[var(--foreground)] capitalize">{phase1.paradigm?.replace("_", " ")}</p></div>
        <div><p className="text-[10px] text-[var(--foreground-subtle)] uppercase tracking-wider">Venue</p><p className="text-sm font-semibold text-[var(--foreground)]">{phase2.venue.venueName} ({phase2.venue.venueWidth}×{phase2.venue.venueLength}m)</p></div>
      </div>

      {/* Visual generation cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {VISUAL_TYPES.map(({ type, label, desc }) => {
          const visual = data.visuals.find((v) => v.type === type);
          const isGenerating = generating[type];
          const error = errors[type];

          return (
            <div key={type} className="rounded-2xl border border-[var(--border)] overflow-hidden" style={{ background: "var(--surface)" }}>
              {/* Image preview */}
              <div className="aspect-video bg-[var(--surface-2)] flex items-center justify-center relative">
                {visual?.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={visual.imageUrl} alt={label} className="w-full h-full object-cover" />
                ) : isGenerating ? (
                  <div className="flex flex-col items-center gap-2 text-[var(--foreground-subtle)]">
                    <RefreshCw className="h-6 w-6 animate-spin text-[var(--accent)]" />
                    <p className="text-xs">Generating...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-[var(--foreground-subtle)]">
                    <Images className="h-6 w-6 opacity-30" />
                    <p className="text-xs">Not generated</p>
                  </div>
                )}
              </div>

              <div className="p-3">
                <p className="text-sm font-semibold text-[var(--foreground)] mb-0.5">{label}</p>
                <p className="text-xs text-[var(--foreground-muted)] mb-3">{desc}</p>
                {error && (
                  <div className="flex items-start gap-1.5 mb-2 text-xs" style={{ color: "var(--danger)" }}>
                    <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    {error}
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs h-7"
                  onClick={() => generateVisual(type)}
                  disabled={isGenerating || !imageModelId}
                  isLoading={isGenerating}
                >
                  <Wand2 className="h-3 w-3" />
                  {visual ? "Regenerate" : "Generate"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Approval checkpoint */}
      {data.visuals.length > 0 && !approved && (
        <div className="rounded-2xl border border-[rgba(247,151,30,0.3)] p-5 mb-6" style={{ background: "rgba(247,151,30,0.05)" }}>
          <p className="text-sm font-semibold text-[var(--foreground)] mb-1">Concept Direction Checkpoint</p>
          <p className="text-xs text-[var(--foreground-muted)] mb-4">
            Review the generated visuals above. Approve to proceed to the iteration phase.
          </p>
          <Button onClick={handleApprove} variant="gradient" size="sm">
            <CheckCircle className="h-4 w-4" /> Approve Direction
          </Button>
        </div>
      )}

      {approved && (
        <div className="rounded-2xl border border-[rgba(67,233,123,0.3)] p-4 mb-6 flex items-center gap-3" style={{ background: "rgba(67,233,123,0.05)" }}>
          <CheckCircle className="h-5 w-5 flex-shrink-0" style={{ color: "var(--success)" }} />
          <p className="text-sm font-medium" style={{ color: "var(--success)" }}>Concept direction approved.</p>
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>← Back</Button>
        <Button onClick={onNext} disabled={!canProceed} variant="gradient" className="h-10 px-6">
          Continue to Iterations →
        </Button>
      </div>
    </div>
  );
}
