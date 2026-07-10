import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { AdminUsersClient } from "./users-client";

export default async function AdminUsersPage() {
  const session = await auth();
  const user = session?.user as { role?: string } | undefined;
  if (user?.role !== "admin") redirect("/dashboard");

  const allUsers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      division: users.division,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(users.createdAt);

  return <AdminUsersClient initialUsers={allUsers} />;
}
