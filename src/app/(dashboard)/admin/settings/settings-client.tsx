"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Settings, BookOpen, Trophy, Eye, EyeOff, Lightbulb } from "lucide-react";
import type { FeatureFlags } from "@/lib/feature-flags";
import type { ConceptCreatorModelSettings } from "@/lib/concept-creator-settings";
import type { AiModel } from "@/db/schema";
import { ConceptCreatorModelConfig } from "./concept-creator-model-config";

interface SettingsClientProps {
  initialFlags: FeatureFlags;
  conceptSettings: ConceptCreatorModelSettings;
  imageModels: AiModel[];
  llmModels: AiModel[];
}

interface FlagConfig {
  key: keyof FeatureFlags;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const FLAG_CONFIGS: FlagConfig[] = [
  {
    key: "showLibrary",
    label: "Prompt Library",
    description: "Allow users to save and browse shared prompt entries.",
    icon: BookOpen,
  },
  {
    key: "showChallenges",
    label: "Challenges",
    description: "Allow users to access structured prompting challenges.",
    icon: Trophy,
  },
  {
    key: "showConceptCreator",
    label: "Concept Creator",
    description: "AI-powered event concept wizard — brief ingestion, visual generation, and pitch deck export.",
    icon: Lightbulb,
  },
];

export function SettingsClient({ initialFlags, conceptSettings, imageModels, llmModels }: SettingsClientProps) {
  const router = useRouter();
  const [flags, setFlags] = useState<FeatureFlags>(initialFlags);
  const [saving, setSaving] = useState<keyof FeatureFlags | null>(null);
  const [error, setError] = useState("");

  async function handleToggle(key: keyof FeatureFlags) {
    const next = !flags[key];
    setSaving(key);
    setError("");

    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: next }),
    });

    setSaving(null);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to save setting.");
      return;
    }

    setFlags((prev) => ({ ...prev, [key]: next }));
    router.refresh();
  }

  return (
    <div className="bg-[var(--background)]">
      {/* Header */}
      <div
        className="px-8 pt-8 pb-6 border-b border-[var(--border)]"
        style={{ background: "linear-gradient(180deg, var(--surface) 0%, var(--background) 100%)" }}
      >
        <div className="flex items-center gap-2 mb-1">
          <Settings className="h-4 w-4 text-[var(--accent)]" />
          <span className="text-xs text-[var(--foreground-muted)] font-semibold uppercase tracking-widest">Admin</span>
        </div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">App Settings</h1>
        <p className="text-[var(--foreground-muted)] text-sm mt-1">
          Control which features are visible to users and configure AI models.
        </p>
      </div>

      <div className="p-8 max-w-2xl">
        {error && (
          <div className="mb-6 p-3 rounded-xl bg-[rgba(255,101,132,0.08)] border border-[rgba(255,101,132,0.2)] text-sm text-[var(--danger)]">
            {error}
          </div>
        )}

        {/* Menu visibility toggles */}
        <div className="space-y-3">
          <p className="text-xs font-bold text-[var(--foreground-subtle)] uppercase tracking-widest mb-4">
            Menu Visibility
          </p>

          {FLAG_CONFIGS.map(({ key, label, description, icon: Icon }) => {
            const enabled = flags[key];
            const isSaving = saving === key;

            return (
              <div
                key={key}
                className="flex items-center justify-between gap-4 p-5 rounded-2xl border transition-all duration-200"
                style={{
                  background: "var(--surface)",
                  borderColor: enabled ? "rgba(108,99,255,0.2)" : "var(--border)",
                }}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200"
                    style={{
                      background: enabled ? "rgba(108,99,255,0.12)" : "var(--surface-2)",
                      border: enabled ? "1px solid rgba(108,99,255,0.2)" : "1px solid var(--border)",
                    }}
                  >
                    <Icon className={`h-5 w-5 transition-colors duration-200 ${enabled ? "text-[var(--accent)]" : "text-[var(--foreground-subtle)]"}`} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">{label}</p>
                    <p className="text-xs text-[var(--foreground-muted)] mt-0.5">{description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs font-medium" style={{ color: enabled ? "var(--success)" : "var(--foreground-subtle)" }}>
                    {enabled ? "Visible" : "Hidden"}
                  </span>
                  <button
                    onClick={() => handleToggle(key)}
                    disabled={isSaving}
                    aria-label={`${enabled ? "Hide" : "Show"} ${label}`}
                    className="relative w-11 h-6 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--surface)] disabled:opacity-60 disabled:cursor-wait"
                    style={{ background: enabled ? "var(--accent)" : "var(--border-bright)" }}
                  >
                    <div
                      className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-300"
                      style={{ transform: enabled ? "translateX(1.25rem)" : "translateX(0.125rem)" }}
                    />
                  </button>
                  {enabled ? (
                    <Eye className="h-4 w-4 text-[var(--foreground-subtle)]" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-[var(--foreground-subtle)]" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Concept Creator model configuration */}
        <ConceptCreatorModelConfig
          initialSettings={conceptSettings}
          imageModels={imageModels}
          llmModels={llmModels}
        />
      </div>
    </div>
  );
}
