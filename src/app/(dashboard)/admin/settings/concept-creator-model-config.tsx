"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { AiModel } from "@/db/schema";
import type { ConceptCreatorModelSettings } from "@/lib/concept-creator-settings";
import {
  Lightbulb, Wand2, Map, Box, Upload, X, Check, RefreshCw, Info,
} from "lucide-react";

interface TaskConfig {
  key: keyof Pick<ConceptCreatorModelSettings, "concepting" | "prompting" | "blueprint" | "render3d">;
  label: string;
  description: string;
  modelType: "llm" | "image";
  icon: React.ComponentType<{ className?: string }>;
  hasEnvImage?: boolean;
  envKey?: "blueprint" | "render3d";
}

const TASK_CONFIGS: TaskConfig[] = [
  {
    key: "concepting",
    label: "Creative Concepting",
    description: "Theme suggestion and narrative copy generation (Phase 1 & 5).",
    modelType: "llm",
    icon: Lightbulb,
  },
  {
    key: "prompting",
    label: "Creative Prompting",
    description: "Deck narrative and slide copy generation (Phase 5).",
    modelType: "llm",
    icon: Wand2,
  },
  {
    key: "blueprint",
    label: "Blueprint & Storyboard",
    description: "Overall venue floor plan, zoning blueprint, storyboard panels (Phase 3 overall visual).",
    modelType: "image",
    icon: Map,
    hasEnvImage: true,
    envKey: "blueprint",
  },
  {
    key: "render3d",
    label: "3D Stage / Booth Render",
    description: "Photorealistic 3D renders of stages and exhibition booths (Phase 3 booth & stage visuals).",
    modelType: "image",
    icon: Box,
    hasEnvImage: true,
    envKey: "render3d",
  },
];

interface Props {
  initialSettings: ConceptCreatorModelSettings;
  imageModels: AiModel[];
  llmModels: AiModel[];
}

export function ConceptCreatorModelConfig({ initialSettings, imageModels, llmModels }: Props) {
  const [settings, setSettings] = useState<ConceptCreatorModelSettings>(initialSettings);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState<string | null>(null);
  const blueprintInputRef = useRef<HTMLInputElement>(null);
  const render3dInputRef = useRef<HTMLInputElement>(null);

  async function handleSaveModel(key: keyof Pick<ConceptCreatorModelSettings, "concepting" | "prompting" | "blueprint" | "render3d">, value: string) {
    setSaving(key);
    setError("");
    const res = await fetch("/api/admin/concept-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: value }),
    });
    setSaving(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to save.");
      return;
    }
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(key);
    setTimeout(() => setSaved(null), 2000);
  }

  async function handleEnvImageUpload(envKey: "blueprint" | "render3d", file: File) {
    setUploading(envKey);
    setError("");
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      try {
        const res = await fetch("/api/admin/concept-env-image", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: envKey, imageData: dataUrl }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error ?? "Upload failed."); return; }
        const urlKey = envKey === "blueprint" ? "envBlueprintUrl" : "envRender3dUrl";
        setSettings((prev) => ({ ...prev, [urlKey]: data.url }));
      } catch {
        setError("Upload failed. Please try again.");
      } finally {
        setUploading(null);
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleRemoveEnvImage(envKey: "blueprint" | "render3d") {
    setUploading(envKey);
    await fetch(`/api/admin/concept-env-image?type=${envKey}`, { method: "DELETE" });
    const urlKey = envKey === "blueprint" ? "envBlueprintUrl" : "envRender3dUrl";
    setSettings((prev) => ({ ...prev, [urlKey]: "" }));
    setUploading(null);
  }

  return (
    <div className="mt-8">
      <p className="text-xs font-bold text-[var(--foreground-subtle)] uppercase tracking-widest mb-1">
        Concept Creator — AI Model Assignment
      </p>
      <p className="text-xs text-[var(--foreground-muted)] mb-4">
        Assign specific AI models to each task in the Concept Creator workflow.
      </p>

      {error && (
        <div className="mb-4 p-3 rounded-xl text-sm" style={{ background: "rgba(255,101,132,0.08)", color: "var(--danger)", border: "1px solid rgba(255,101,132,0.2)" }}>
          {error}
        </div>
      )}

      <div className="space-y-3">
        {TASK_CONFIGS.map(({ key, label, description, modelType, icon: Icon, hasEnvImage, envKey }) => {
          const models = modelType === "llm" ? llmModels : imageModels;
          const currentValue = settings[key];
          const isSaving = saving === key;
          const isSaved = saved === key;
          const envUrl = envKey === "blueprint" ? settings.envBlueprintUrl : settings.envRender3dUrl;
          const isUploading = uploading === envKey;
          const inputRef = envKey === "blueprint" ? blueprintInputRef : render3dInputRef;

          return (
            <div
              key={key}
              className="rounded-2xl border p-5 transition-all duration-200"
              style={{
                background: "var(--surface)",
                borderColor: currentValue ? "rgba(108,99,255,0.2)" : "var(--border)",
              }}
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{
                    background: currentValue ? "rgba(108,99,255,0.12)" : "var(--surface-2)",
                    border: currentValue ? "1px solid rgba(108,99,255,0.2)" : "1px solid var(--border)",
                  }}
                >
                  <Icon className={`h-5 w-5 ${currentValue ? "text-[var(--accent)]" : "text-[var(--foreground-subtle)]"}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-[var(--foreground)]">{label}</p>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium uppercase" style={{ background: modelType === "llm" ? "rgba(108,99,255,0.1)" : "rgba(247,151,30,0.1)", color: modelType === "llm" ? "var(--accent)" : "var(--warning)" }}>
                      {modelType === "llm" ? "LLM" : "Image"}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--foreground-muted)] mb-3">{description}</p>

                  {/* Model selector */}
                  <div className="flex items-center gap-2">
                    <Select
                      className="flex-1"
                      value={currentValue}
                      onChange={(e) => handleSaveModel(key, e.target.value)}
                      disabled={isSaving}
                    >
                      <option value="">— Select {modelType === "llm" ? "LLM" : "image"} model —</option>
                      {models.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.provider})
                        </option>
                      ))}
                    </Select>
                    <div className="w-7 h-7 flex items-center justify-center flex-shrink-0">
                      {isSaving && <RefreshCw className="h-4 w-4 animate-spin text-[var(--foreground-subtle)]" />}
                      {isSaved && <Check className="h-4 w-4 text-[var(--success)]" />}
                    </div>
                  </div>

                  {models.length === 0 && (
                    <p className="text-xs mt-1.5 flex items-center gap-1" style={{ color: "var(--warning)" }}>
                      <Info className="h-3 w-3" />
                      No active {modelType === "llm" ? "LLM" : "image"} models. Add one in Admin → AI Models.
                    </p>
                  )}

                  {/* Environment image upload (for image tasks) */}
                  {hasEnvImage && envKey && (
                    <div className="mt-4 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
                      <p className="text-xs font-semibold text-[var(--foreground-muted)] mb-1">
                        Reference Environment Image
                        <span className="ml-1 font-normal text-[var(--foreground-subtle)]">(optional — used for image-to-image)</span>
                      </p>
                      <p className="text-xs text-[var(--foreground-subtle)] mb-2">
                        Upload a base image (venue photo, mood board, floor plan scan) to guide the AI.
                      </p>

                      {envUrl ? (
                        <div className="flex items-center gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={envUrl} alt="Environment" className="w-20 h-14 object-cover rounded-lg border" style={{ borderColor: "var(--border)" }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-[var(--foreground-muted)] truncate">{envUrl}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-[var(--danger)] h-7 px-2"
                            onClick={() => handleRemoveEnvImage(envKey)}
                            disabled={isUploading}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <div>
                          <input
                            ref={inputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleEnvImageUpload(envKey, file);
                            }}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => inputRef.current?.click()}
                            disabled={isUploading}
                            isLoading={isUploading}
                          >
                            <Upload className="h-3 w-3" />
                            {isUploading ? "Uploading..." : "Upload reference image"}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
