import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users, tokenLogs, divisionQuotas } from "@/db/schema";
import { eq, sum, count } from "drizzle-orm";
import { currentMonthYear, formatIdr, formatNumber } from "@/lib/utils";
import { AdminQuotasClient } from "./quotas-client";

export default async function AdminQuotasPage() {
  const session = await auth();
  const user = session?.user as { role?: string } | undefined;
  if (user?.role !== "admin") redirect("/dashboard");

  const monthYear = currentMonthYear();

  const divisionRows = await db.selectDistinct({ division: users.division }).from(users);
  const quotas = await db.select().from(divisionQuotas).where(eq(divisionQuotas.monthYear, monthYear));
  const totals = await db
    .select({
      division: tokenLogs.division,
      totalCost: sum(tokenLogs.costIdr),
      totalTokens: sum(tokenLogs.totalTokens),
      count: count(),
    })
    .from(tokenLogs)
    .where(eq(tokenLogs.monthYear, monthYear))
    .groupBy(tokenLogs.division);

  const data = divisionRows.map(({ division }) => {
    const quota = quotas.find((q) => q.division === division);
    const total = totals.find((t) => t.division === division);
    return {
      division,
      monthlyBudgetIdr: quota?.monthlyBudgetIdr ?? 0,
      usedBudgetIdr: Number(total?.totalCost ?? 0),
      totalTokens: Number(total?.totalTokens ?? 0),
      generationCount: total?.count ?? 0,
    };
  });

  return <AdminQuotasClient data={data} monthYear={monthYear} />;
}
