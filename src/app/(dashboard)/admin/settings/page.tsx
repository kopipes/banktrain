import { requireAdmin } from "@/lib/auth-utils";
import { getFeatureFlags } from "@/lib/feature-flags";
import { SettingsClient } from "./settings-client";

export default async function AdminSettingsPage() {
  await requireAdmin();
  const flags = await getFeatureFlags();

  return <SettingsClient initialFlags={flags} />;
}
