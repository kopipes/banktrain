import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { aiModels } from "@/db/schema";
import { AdminModelsClient } from "./models-client";

export default async function AdminModelsPage() {
  const session = await auth();
  const user = session?.user as { role?: string } | undefined;
  if (user?.role !== "admin") redirect("/dashboard");

  const models = await db.select().from(aiModels).orderBy(aiModels.createdAt);
  const safeModels = models.map((m) => ({
    ...m,
    apiKey: m.apiKey ? "***" + m.apiKey.slice(-4) : "",
  }));

  return <AdminModelsClient initialModels={safeModels} />;
}
