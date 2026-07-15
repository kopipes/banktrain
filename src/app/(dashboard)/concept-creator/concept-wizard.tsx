"use client";

import { useConceptSession } from "./hooks/use-concept-session";
import { Phase1Brief } from "./phases/phase1-brief";
import { Phase2Infrastructure } from "./phases/phase2-infrastructure";
import { Phase3Visuals } from "./phases/phase3-visuals";
import { Phase4Iteration } from "./phases/phase4-iteration";
import { Phase5Deck } from "./phases/phase5-deck";
import type { AiModel } from "@/db/schema";
import type { ConceptCreatorModelSettings } from "@/lib/concept-creator-settings";
import { Check, ArrowLeft } from "lucide-react";

interface Props {
  projectId: string;
  imageModels: AiModel[];
  llmModels: AiModel[];
  conceptSettings: ConceptCreatorModelSettings;
  onExit: () => void;
}

const PHASES = [
  { label: "Brief", num: 1 },
  { label: "Infrastructure", num: 2 },
  { label: "Visuals", num: 3 },
  { label: "Iteration", num: 4 },
  { label: "Deck", num: 5 },
] as const;

export function ConceptWizard({ projectId, imageModels, llmModels, conceptSettings, onExit }: Props) {
  const { session, isLoading, updatePhase1, updatePhase2, updatePhase3, updatePhase4, updatePhase5, goToPhase } = useConceptSession(projectId);

  // Resolve model IDs — prefer admin-assigned, fall back to default/first
  const resolveModel = (assignedId: string, models: AiModel[]) => {
    if (assignedId && models.find((m) => m.id === assignedId)) return assignedId;
    return models.find((m) => m.isDefault)?.id ?? models[0]?.id ?? "";
  };

  const conceptingModelId = resolveModel(conceptSettings.concepting, llmModels);
  const promptingModelId = resolveModel(conceptSettings.prompting, llmModels);
  const blueprintModelId = resolveModel(conceptSettings.blueprint, imageModels);
  const render3dModelId = resolveModel(conceptSettings.render3d, imageModels);

  const phase = session.currentPhase;

  if (isLoading) {
    return (
      <div className="min-h-full flex items-center justify-center" style={{ background: "var(--background)" }}>
        <p className="text-sm" style={{ color: "var(--foreground-muted)" }}>Loading project…</p>
      </div>
    );
  }

  return (
    <div className="min-h-full" style={{ background: "var(--background)" }}>
      {/* Header */}
      <div
        className="px-8 pt-8 pb-6"
        style={{
          borderBottom: "1px solid var(--border)",
          background: "linear-gradient(180deg, var(--surface) 0%, var(--background) 100%)",
        }}
      >
        {/* Back to projects */}
        <button
          onClick={onExit}
          className="flex items-center gap-1.5 text-sm mb-4 transition-colors hover:opacity-80"
          style={{ color: "var(--foreground-muted)" }}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          All projects
        </button>

        <h1 className="text-2xl font-bold mb-4" style={{ color: "var(--foreground)" }}>
          Concept Creator
        </h1>

        {/* Phase stepper */}
        <div className="flex items-center gap-0">
          {PHASES.map(({ label, num }, i) => {
            const isComplete = phase > num;
            const isActive = phase === num;
            return (
              <div key={num} className="flex items-center">
                <button
                  onClick={() => isComplete ? goToPhase(num) : undefined}
                  disabled={!isComplete}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    background: isActive ? "var(--accent)" : "transparent",
                    color: isActive
                      ? "#ffffff"
                      : isComplete
                      ? "var(--accent)"
                      : "var(--foreground-muted)",
                    cursor: isComplete ? "pointer" : "default",
                  }}
                >
                  {isComplete ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <span
                      className="w-5 h-5 rounded-full border flex items-center justify-center text-xs"
                      style={{
                        borderColor: isActive ? "#ffffff" : "currentColor",
                        color: isActive ? "#ffffff" : "currentColor",
                      }}
                    >
                      {num}
                    </span>
                  )}
                  {label}
                </button>
                {i < PHASES.length - 1 && (
                  <div
                    className="w-6 h-px mx-1"
                    style={{ background: phase > num ? "var(--accent)" : "var(--border)" }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Phase content */}
      <div className="flex-1">
        {phase === 1 && (
          <Phase1Brief
            data={session.phase1}
            llmModelId={conceptingModelId}
            onChange={updatePhase1}
            onNext={() => goToPhase(2)}
          />
        )}
        {phase === 2 && (
          <Phase2Infrastructure
            data={session.phase2}
            onChange={updatePhase2}
            onNext={() => goToPhase(3)}
            onBack={() => goToPhase(1)}
          />
        )}
        {phase === 3 && (
          <Phase3Visuals
            phase1={session.phase1}
            phase2={session.phase2}
            data={session.phase3}
            blueprintModelId={blueprintModelId}
            render3dModelId={render3dModelId}
            onChange={updatePhase3}
            onNext={() => goToPhase(4)}
            onBack={() => goToPhase(2)}
          />
        )}
        {phase === 4 && (
          <Phase4Iteration
            phase1Theme={session.phase1.selectedTheme}
            phase1BrandColors={session.phase1.brief.brandColors}
            phase3={session.phase3}
            data={session.phase4}
            blueprintModelId={blueprintModelId}
            render3dModelId={render3dModelId}
            envBlueprintUrl={session.phase3.envBlueprintUrl ?? ""}
            envRender3dUrl={session.phase3.envRender3dUrl ?? ""}
            onChange={updatePhase4}
            onNext={() => goToPhase(5)}
            onBack={() => goToPhase(3)}
          />
        )}
        {phase === 5 && (
          <Phase5Deck
            session={session}
            llmModelId={promptingModelId || conceptingModelId}
            data={session.phase5}
            onChange={updatePhase5}
            onBack={() => goToPhase(4)}
            onReset={onExit}
          />
        )}
      </div>
    </div>
  );
}
