"use client";

import { useConceptSession } from "./hooks/use-concept-session";
import { Phase1Brief } from "./phases/phase1-brief";
import { Phase2Infrastructure } from "./phases/phase2-infrastructure";
import { Phase3Visuals } from "./phases/phase3-visuals";
import { Phase4Iteration } from "./phases/phase4-iteration";
import { Phase5Deck } from "./phases/phase5-deck";
import type { AiModel } from "@/db/schema";
import type { ConceptCreatorModelSettings } from "@/lib/concept-creator-settings";
import { Check } from "lucide-react";

interface Props {
  imageModels: AiModel[];
  llmModels: AiModel[];
  conceptSettings: ConceptCreatorModelSettings;
}

const PHASES = [
  { label: "Brief", num: 1 },
  { label: "Infrastructure", num: 2 },
  { label: "Visuals", num: 3 },
  { label: "Iteration", num: 4 },
  { label: "Deck", num: 5 },
] as const;

export function ConceptWizard({ imageModels, llmModels, conceptSettings }: Props) {
  const { session, updatePhase1, updatePhase2, updatePhase3, updatePhase4, updatePhase5, goToPhase, resetSession } = useConceptSession();

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

  return (
    <div className="min-h-full bg-[var(--background)]">
      {/* Header */}
      <div className="px-8 pt-8 pb-6 border-b border-[var(--border)]"
        style={{ background: "linear-gradient(180deg, var(--surface) 0%, var(--background) 100%)" }}>
        <h1 className="text-2xl font-bold text-[var(--foreground)] mb-4">Concept Creator</h1>

        {/* Phase stepper */}
        <div className="flex items-center gap-0">
          {PHASES.map(({ label, num }, i) => {
            const isComplete = phase > num;
            const isActive = phase === num;
            return (
              <div key={num} className="flex items-center">
                <button
                  onClick={() => isComplete && goToPhase(num)}
                  disabled={!isComplete}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all duration-150"
                  style={{
                    background: isActive ? "rgba(108,99,255,0.12)" : "transparent",
                    cursor: isComplete ? "pointer" : "default",
                  }}
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{
                      background: isComplete ? "var(--success)" : isActive ? "var(--accent)" : "var(--surface-2)",
                      color: isComplete || isActive ? "white" : "var(--foreground-subtle)",
                      border: isActive ? "2px solid var(--accent)" : "none",
                    }}
                  >
                    {isComplete ? <Check className="h-3 w-3" /> : num}
                  </div>
                  <span
                    className="text-xs font-medium hidden sm:block"
                    style={{ color: isActive ? "var(--accent)" : isComplete ? "var(--foreground-muted)" : "var(--foreground-subtle)" }}
                  >
                    {label}
                  </span>
                </button>
                {i < PHASES.length - 1 && (
                  <div className="w-6 h-px mx-1" style={{ background: phase > num ? "var(--success)" : "var(--border)" }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="p-8">
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
            envBlueprintUrl={conceptSettings.envBlueprintUrl}
            envRender3dUrl={conceptSettings.envRender3dUrl}
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
            envBlueprintUrl={conceptSettings.envBlueprintUrl}
            envRender3dUrl={conceptSettings.envRender3dUrl}
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
            onReset={resetSession}
          />
        )}
      </div>
    </div>
  );
}
