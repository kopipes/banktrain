import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { getFeatureFlags } from "@/lib/feature-flags";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as { id?: string; name?: string; role?: string; division?: string };
  const flags = await getFeatureFlags();

  return (
    <div className="flex min-h-screen bg-[var(--background)]">
      <Sidebar
        role={user.role}
        userName={user.name ?? ""}
        userDivision={user.division ?? ""}
        showLibrary={flags.showLibrary}
        showChallenges={flags.showChallenges}
      />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
