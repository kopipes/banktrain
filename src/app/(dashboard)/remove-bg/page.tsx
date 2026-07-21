import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { RemoveBgClient } from "./remove-bg-client";

export default async function RemoveBgPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return <RemoveBgClient />;
}
