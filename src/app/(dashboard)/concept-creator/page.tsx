import { auth } from "@/lib/auth";
import { db } from "@/db";
import { aiModels } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getFeatureFlags } from "@/lib/feature-flags";
import { getConceptCreatorSettings } from "@/lib/concept-creator-settings";
import { redirect } from "next/navigation";
import { ConceptWizard } from "./concept-wizard";

export default async function ConceptCreatorPage() {
  const flags = await getFeatureFlags();
  if (!flags.showConceptCreator) redirect("/dashboard");

  const session = await auth();
  if (!session?.user) redirect("/login");

  const [allImageModels, allLlmModels, conceptSettings] = await Promise.all([
    db.select().from(aiModels).where(eq(aiModels.type, "image")).all(),
    db.select().from(aiModels).where(eq(aiModels.type, "llm")).all(),
    getConceptCreatorSettings(),
  ]);

  const imageModels = allImageModels.filter((x) => x.isActive);
  const llmModels = allLlmModels.filter((x) => x.isActive);

  // Strip API keys before sending to client
  const safeImageModels = imageModels.map(({ apiKey: _, ...m }) => ({ ...m, apiKey: "" }));
  const safeLlmModels = llmModels.map(({ apiKey: _, ...m }) => ({ ...m, apiKey: "" }));

  return (
    <ConceptWizard
      imageModels={safeImageModels}
      llmModels={safeLlmModels}
      conceptSettings={conceptSettings}
    />
  );
}
