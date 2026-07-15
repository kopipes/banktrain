"use client";

import { useState } from "react";
import { ConceptProjectList } from "./concept-project-list";
import { ConceptWizard } from "./concept-wizard";
import type { AiModel } from "@/db/schema";
import type { ConceptCreatorModelSettings } from "@/lib/concept-creator-settings";

interface Props {
  imageModels: AiModel[];
  llmModels: AiModel[];
  conceptSettings: ConceptCreatorModelSettings;
}

export function ConceptCreatorShell({ imageModels, llmModels, conceptSettings }: Props) {
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  if (activeProjectId) {
    return (
      <ConceptWizard
        projectId={activeProjectId}
        imageModels={imageModels}
        llmModels={llmModels}
        conceptSettings={conceptSettings}
        onExit={() => setActiveProjectId(null)}
      />
    );
  }

  return (
    <ConceptProjectList
      onCreate={(id) => setActiveProjectId(id)}
      onOpen={(id) => setActiveProjectId(id)}
    />
  );
}
