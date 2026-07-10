import { auth } from "@/lib/auth";
import { db } from "@/db";
import { aiModels } from "@/db/schema";
import { eq } from "drizzle-orm";
import { CreatorStudio } from "@/components/creator-studio";

export default async function StudioPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const session = await auth();
  const user = session!.user as { id: string; name?: string; role?: string; division?: string };
  const params = await searchParams;

  const models = await db
    .select()
    .from(aiModels)
    .where(eq(aiModels.isActive, true));

  const imageModels = models.filter((m) => m.type === "image");
  const llmModels = models.filter((m) => m.type === "llm");

  return (
    <CreatorStudio
      userId={user.id}
      userName={user.name ?? ""}
      division={user.division ?? "general"}
      imageModels={imageModels}
      llmModels={llmModels}
      initialInputImageUrl={params.inputImageUrl}
      initialGenerationType={params.generationType as "text-to-image" | "image-to-image" | undefined}
    />
  );
}
