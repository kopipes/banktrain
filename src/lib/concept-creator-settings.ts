import { db } from "@/db";
import { appSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

export interface ConceptCreatorModelSettings {
  // Model IDs assigned to each task
  concepting: string;    // LLM: theme suggestions, narrative
  prompting: string;     // LLM: deck copy generation
  blueprint: string;     // Image: overall blueprint + storyboard
  render3d: string;      // Image: 3D stage/booth renders

  // Optional reference image URLs for image-to-image
  envBlueprintUrl: string;   // reference image for blueprint/storyboard
  envRender3dUrl: string;    // reference image for 3D renders
}

const SETTINGS_KEY = "conceptCreatorModels";
const ENV_BLUEPRINT_KEY = "conceptCreatorEnvBlueprint";
const ENV_RENDER3D_KEY = "conceptCreatorEnvRender3d";

const EMPTY: ConceptCreatorModelSettings = {
  concepting: "",
  prompting: "",
  blueprint: "",
  render3d: "",
  envBlueprintUrl: "",
  envRender3dUrl: "",
};

export async function getConceptCreatorSettings(): Promise<ConceptCreatorModelSettings> {
  const rows = await db.select().from(appSettings).all();

  const result: ConceptCreatorModelSettings = { ...EMPTY };

  for (const row of rows) {
    if (row.key === SETTINGS_KEY) {
      try {
        const parsed = JSON.parse(row.value) as Partial<ConceptCreatorModelSettings>;
        result.concepting = parsed.concepting ?? "";
        result.prompting = parsed.prompting ?? "";
        result.blueprint = parsed.blueprint ?? "";
        result.render3d = parsed.render3d ?? "";
      } catch { /* keep defaults */ }
    }
    if (row.key === ENV_BLUEPRINT_KEY) result.envBlueprintUrl = row.value;
    if (row.key === ENV_RENDER3D_KEY) result.envRender3dUrl = row.value;
  }

  return result;
}

export async function saveConceptCreatorModels(models: Partial<Pick<ConceptCreatorModelSettings, "concepting" | "prompting" | "blueprint" | "render3d">>) {
  const current = await getConceptCreatorSettings();
  const merged = { ...current, ...models };
  const value = JSON.stringify({
    concepting: merged.concepting,
    prompting: merged.prompting,
    blueprint: merged.blueprint,
    render3d: merged.render3d,
  });

  await db
    .insert(appSettings)
    .values({ key: SETTINGS_KEY, value })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value, updatedAt: new Date().toISOString() },
    });
}

export async function saveConceptCreatorEnvImage(type: "blueprint" | "render3d", url: string) {
  const key = type === "blueprint" ? ENV_BLUEPRINT_KEY : ENV_RENDER3D_KEY;
  await db
    .insert(appSettings)
    .values({ key, value: url })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value: url, updatedAt: new Date().toISOString() },
    });
}
