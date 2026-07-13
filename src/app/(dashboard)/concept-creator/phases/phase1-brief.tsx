"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { Phase1Data, EventBrief, ConceptParadigm } from "../types";
import { Sparkles, Zap, DollarSign, RefreshCw, Check } from "lucide-react";

interface Props {
  data: Phase1Data;
  llmModelId: string;
  onChange: (data: Partial<Phase1Data>) => void;
  onNext: () => void;
}

const BRIEF_FIELDS: Array<{ key: keyof EventBrief; label: string; placeholder: string; type?: string; rows?: number }> = [
  { key: "eventName", label: "Event Name *", placeholder: "e.g. Tech Summit 2026" },
  { key: "objective", label: "Event Objective *", placeholder: "e.g. Launch new product line, build brand awareness", type: "textarea", rows: 2 },
  { key: "targetAudience", label: "Target Audience *", placeholder: "e.g. C-level executives, 25-45 year old tech professionals" },
  { key: "brandName", label: "Brand / Client Name *", placeholder: "e.g. Acme Corporation" },
  { key: "brandValues", label: "Brand Values", placeholder: "e.g. Innovation, Trust, Sustainability" },
  { key: "brandColors", label: "Brand Colors", placeholder: "e.g. Navy blue, gold, white" },
  { key: "expectedAttendees", label: "Expected Attendees", placeholder: "e.g. 500" },
  { key: "eventDate", label: "Event Date", placeholder: "e.g. September 2026", type: "text" },
  { key: "eventDuration", label: "Duration", placeholder: "e.g. 1 day, 3 days" },
  { key: "additionalNotes", label: "Additional Notes", placeholder: "Special requirements, venue preferences, VIP arrangements...", type: "textarea", rows: 3 },
];

export function Phase1Brief({ data, llmModelId, onChange, onNext }: Props) {
  const [isGeneratingThemes, setIsGeneratingThemes] = useState(false);
  const [themeError, setThemeError] = useState("");

  const canGenerateThemes = data.brief.eventName && data.brief.objective && data.brief.targetAudience && data.brief.brandName;
  const canProceed = canGenerateThemes && data.paradigm && data.selectedTheme;

  function updateBrief(key: keyof EventBrief, value: string) {
    onChange({ brief: { ...data.brief, [key]: value } });
  }

  async function handleGenerateThemes() {
    if (!llmModelId) { setThemeError("No LLM model configured. Ask admin to add one."); return; }
    setIsGeneratingThemes(true);
    setThemeError("");
    try {
      const res = await fetch("/api/concept/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief: data.brief, modelId: llmModelId }),
      });
      const json = await res.json();
      if (!res.ok) { setThemeError(json.error ?? "Failed to generate themes."); return; }
      onChange({ suggestedThemes: json.themes ?? [], selectedTheme: "" });
    } catch {
      setThemeError("Network error. Please try again.");
    } finally {
      setIsGeneratingThemes(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h2 className="text-xl font-bold text-[var(--foreground)] mb-1">Phase 1 — Brief & Paradigm</h2>
        <p className="text-sm text-[var(--foreground-muted)]">
          Fill in the event brief. The AI will suggest narrative themes based on your inputs.
        </p>
      </div>

      {/* Brief form */}
      <div className="rounded-2xl border border-[var(--border)] p-6 mb-6" style={{ background: "var(--surface)" }}>
        <p className="text-xs font-bold text-[var(--foreground-subtle)] uppercase tracking-widest mb-4">Event Brief</p>
        <div className="space-y-4">
          {BRIEF_FIELDS.map((f) => (
            <div key={f.key}>
              <Label htmlFor={f.key}>{f.label}</Label>
              {f.type === "textarea" ? (
                <Textarea
                  id={f.key}
                  className="mt-1"
                  rows={f.rows ?? 2}
                  placeholder={f.placeholder}
                  value={data.brief[f.key]}
                  onChange={(e) => updateBrief(f.key, e.target.value)}
                />
              ) : (
                <Input
                  id={f.key}
                  className="mt-1"
                  placeholder={f.placeholder}
                  value={data.brief[f.key]}
                  onChange={(e) => updateBrief(f.key, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Theme generation */}
      <div className="rounded-2xl border border-[var(--border)] p-6 mb-6" style={{ background: "var(--surface)" }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-bold text-[var(--foreground-subtle)] uppercase tracking-widest">Narrative Theme</p>
            <p className="text-xs text-[var(--foreground-muted)] mt-0.5">AI suggests themes based on your brief</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerateThemes}
            disabled={!canGenerateThemes || isGeneratingThemes}
            isLoading={isGeneratingThemes}
          >
            <Sparkles className="h-3.5 w-3.5" />
            {data.suggestedThemes.length > 0 ? "Regenerate" : "Suggest Themes"}
          </Button>
        </div>

        {themeError && (
          <div className="mb-3 p-3 rounded-xl text-sm" style={{ background: "rgba(255,101,132,0.08)", color: "var(--danger)", border: "1px solid rgba(255,101,132,0.2)" }}>
            {themeError}
          </div>
        )}

        {!canGenerateThemes && (
          <p className="text-xs text-[var(--foreground-subtle)]">Fill in Event Name, Objective, Target Audience and Brand Name first.</p>
        )}

        {data.suggestedThemes.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {data.suggestedThemes.map((theme) => (
              <button
                key={theme}
                onClick={() => onChange({ selectedTheme: theme })}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-150"
                style={{
                  background: data.selectedTheme === theme ? "rgba(108,99,255,0.12)" : "var(--surface-2)",
                  color: data.selectedTheme === theme ? "var(--accent)" : "var(--foreground-muted)",
                  border: data.selectedTheme === theme ? "1px solid rgba(108,99,255,0.3)" : "1px solid var(--border)",
                }}
              >
                {data.selectedTheme === theme && <Check className="h-3 w-3" />}
                {theme}
              </button>
            ))}
          </div>
        )}

        <div className="mt-3">
          <Label htmlFor="custom-theme">Or enter a custom theme</Label>
          <Input
            id="custom-theme"
            className="mt-1"
            placeholder="e.g. The Future is Now"
            value={data.suggestedThemes.includes(data.selectedTheme) ? "" : data.selectedTheme}
            onChange={(e) => onChange({ selectedTheme: e.target.value })}
          />
        </div>
      </div>

      {/* Paradigm selection */}
      <div className="rounded-2xl border border-[var(--border)] p-6 mb-6" style={{ background: "var(--surface)" }}>
        <p className="text-xs font-bold text-[var(--foreground-subtle)] uppercase tracking-widest mb-4">Concept Paradigm</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {([
            {
              value: "full_concept" as ConceptParadigm,
              label: "Full Concept",
              subtitle: "Blue Sky Exploration",
              desc: "No budget constraints. Explore the most impactful, creative vision possible.",
              icon: Sparkles,
              color: "rgba(108,99,255,",
            },
            {
              value: "budget_fit" as ConceptParadigm,
              label: "Budget Fit",
              subtitle: "Value-Engineered",
              desc: "Strictly tied to structural scale and material constraints. Maximise ROI.",
              icon: DollarSign,
              color: "rgba(247,151,30,",
            },
          ] as const).map(({ value, label, subtitle, desc, icon: Icon, color }) => {
            const selected = data.paradigm === value;
            return (
              <button
                key={value}
                onClick={() => onChange({ paradigm: value })}
                className="text-left p-4 rounded-xl border transition-all duration-200"
                style={{
                  background: selected ? `${color}0.08)` : "var(--surface-2)",
                  borderColor: selected ? `${color}0.4)` : "var(--border)",
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}0.12)` }}>
                    <Icon className="h-4 w-4" style={{ color: selected ? `${color}1)` : "var(--foreground-muted)" }} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[var(--foreground)]">{label}</p>
                    <p className="text-xs text-[var(--foreground-subtle)]">{subtitle}</p>
                  </div>
                  {selected && (
                    <div className="ml-auto w-5 h-5 rounded-full flex items-center justify-center" style={{ background: `${color}0.2)` }}>
                      <Check className="h-3 w-3" style={{ color: `${color}1)` }} />
                    </div>
                  )}
                </div>
                <p className="text-xs text-[var(--foreground-muted)]">{desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={onNext} disabled={!canProceed} variant="gradient" className="h-10 px-6">
          Continue to Infrastructure →
        </Button>
      </div>
    </div>
  );
}
