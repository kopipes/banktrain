import { requireAdmin } from "@/lib/auth-utils";
import { getFeatureFlags } from "@/lib/feature-flags";
import { getConceptCreatorSettings } from "@/lib/concept-creator-settings";
import { db } from "@/db";
import { aiModels } from "@/db/schema";
import { SettingsClient } from "./settings-client";

export default async function AdminSettingsPage() {
  await requireAdmin();
  const [flags, conceptSettings, allModels] = await Promise.all([
    getFeatureFlags(),
    getConceptCreatorSettings(),
    db.select().from(aiModels).all(),
  ]);

  const imageModels = allModels.filter((m) => m.isActive && m.type === "image");
  const llmModels = allModels.filter((m) => m.isActive && m.type === "llm");

  // Strip API keys
  const safeImageModels = imageModels.map(({ apiKey: _, ...m }) => ({ ...m, apiKey: "" }));
  const safeLlmModels = llmModels.map(({ apiKey: _, ...m }) => ({ ...m, apiKey: "" }));

  return (
    <SettingsClient
      initialFlags={flags}
      conceptSettings={conceptSettings}
      imageModels={safeImageModels}
      llmModels={safeLlmModels}
    />
  );
}
