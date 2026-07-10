import { auth } from "@/lib/auth";
import { db } from "@/db";
import { tokenLogs, divisionQuotas, users } from "@/db/schema";
import { eq, sum, count, desc } from "drizzle-orm";
import { currentMonthYear, formatIdr, formatNumber } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AnalyticsCharts } from "./analytics-charts";
import { redirect } from "next/navigation";
import { BarChart3 } from "lucide-react";

export default async function AnalyticsPage() {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string; division?: string } | undefined;
  if (!user?.id) redirect("/login");

  const isAdmin = user.role === "admin";
  const monthYear = currentMonthYear();

  // For admin: all divisions. For trainee/mentor: only their division.
  const [divisionRows, quotas, monthlySummary, topUsers] = await Promise.all([
    isAdmin
      ? db.selectDistinct({ division: users.division }).from(users)
      : Promise.resolve([{ division: user.division ?? "general" }]),

    db.select().from(divisionQuotas).where(eq(divisionQuotas.monthYear, monthYear)),

    // Monthly totals per division
    db
      .select({
        division: tokenLogs.division,
        totalCost: sum(tokenLogs.costIdr),
        totalTokens: sum(tokenLogs.totalTokens),
        count: count(),
      })
      .from(tokenLogs)
      .where(eq(tokenLogs.monthYear, monthYear))
      .groupBy(tokenLogs.division),

    // Top 5 users by cost this month (admin only)
    isAdmin
      ? db
          .select({
            userId: tokenLogs.userId,
            totalCost: sum(tokenLogs.costIdr),
            count: count(),
            userName: users.name,
            division: users.division,
          })
          .from(tokenLogs)
          .innerJoin(users, eq(tokenLogs.userId, users.id))
          .where(eq(tokenLogs.monthYear, monthYear))
          .groupBy(tokenLogs.userId)
          .orderBy(desc(sum(tokenLogs.costIdr)))
          .limit(5)
      : Promise.resolve([]),
  ]);

  const divisionData = divisionRows.map(({ division }) => {
    const quota = quotas.find((q) => q.division === division);
    const total = monthlySummary.find((t) => t.division === division);
    const used = Number(total?.totalCost ?? 0);
    const budget = quota?.monthlyBudgetIdr ?? 0;
    return {
      division,
      used,
      budget,
      totalTokens: Number(total?.totalTokens ?? 0),
      generationCount: total?.count ?? 0,
      pct: budget > 0 ? Math.min(100, (used / budget) * 100) : 0,
      overBudget: budget > 0 && used > budget,
    };
  });

  const totalSpend = divisionData.reduce((s, d) => s + d.used, 0);
  const totalGenerations = divisionData.reduce((s, d) => s + d.generationCount, 0);

  return (
    <div className="min-h-full bg-[var(--background)]">
      {/* Header */}
      <div className="px-8 pt-8 pb-6 border-b border-[var(--border)]"
        style={{ background: "linear-gradient(180deg, var(--surface) 0%, var(--background) 100%)" }}>
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 className="h-4 w-4 text-[var(--accent)]" />
          <span className="text-xs text-[var(--foreground-muted)] font-semibold uppercase tracking-widest">Insights</span>
        </div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Analytics &amp; Budget</h1>
        <p className="text-[var(--foreground-muted)] text-sm mt-1">
          Division spending for <span className="font-semibold text-[var(--foreground)]">{monthYear}</span>
          {!isAdmin && <span className="text-[var(--accent)]"> — {user.division}</span>}
        </p>
      </div>

      <div className="p-8 space-y-8">
        {/* Summary stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Total Spend", value: formatIdr(totalSpend), gradient: "from-[#6c63ff] to-[#8b84ff]", glow: "rgba(108,99,255,0.25)" },
            { label: "Total Generations", value: formatNumber(totalGenerations), gradient: "from-[#43e97b] to-[#38f9d7]", glow: "rgba(67,233,123,0.25)" },
            { label: "Divisions Tracked", value: String(divisionData.length), gradient: "from-[#f7971e] to-[#ffd200]", glow: "rgba(247,151,30,0.25)" },
          ].map((s) => (
            <div key={s.label}
              className="relative overflow-hidden rounded-2xl border border-[var(--border)] p-6"
              style={{ background: "var(--surface)", boxShadow: `0 4px 24px ${s.glow}` }}>
              <p className="text-xs text-[var(--foreground-muted)] uppercase tracking-wider font-semibold mb-2">{s.label}</p>
              <p className="text-2xl font-bold text-[var(--foreground)]">{s.value}</p>
              <div className={`absolute -bottom-4 -right-4 w-20 h-20 rounded-full blur-2xl opacity-20 bg-gradient-to-br ${s.gradient}`} />
            </div>
          ))}
        </div>

        {/* Per-division budget cards */}
        <div>
          <h2 className="text-xs font-bold text-[var(--foreground-muted)] uppercase tracking-widest mb-4">
            Division Budget Usage
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {divisionData.map((d) => (
              <div key={d.division}
                className="rounded-2xl border p-5 transition-all duration-200"
                style={{
                  background: "var(--surface)",
                  borderColor: d.overBudget ? "rgba(255,101,132,0.4)" : "var(--border)",
                  boxShadow: d.overBudget ? "0 4px 24px rgba(255,101,132,0.1)" : undefined,
                }}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-[var(--foreground)] capitalize">{d.division}</h3>
                  <div className="flex items-center gap-2">
                    {d.overBudget && <Badge variant="destructive">Over Budget</Badge>}
                    <span className="text-xs text-[var(--foreground-subtle)]">
                      {d.generationCount} gen{d.generationCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm mb-4">
                  {[
                    { label: "Used", val: formatIdr(d.used) },
                    { label: "Budget", val: d.budget > 0 ? formatIdr(d.budget) : "Unlimited" },
                    { label: "Tokens", val: formatNumber(d.totalTokens) },
                    d.budget > 0 ? {
                      label: "Remaining",
                      val: d.overBudget ? `-${formatIdr(d.used - d.budget)}` : formatIdr(d.budget - d.used),
                      color: d.overBudget ? "var(--danger)" : "var(--success)",
                    } : null,
                  ].filter(Boolean).map((item) => (
                    <div key={item!.label}>
                      <span className="text-[var(--foreground-subtle)] text-xs">{item!.label} </span>
                      <span className="font-medium text-[var(--foreground)]"
                        style={item!.color ? { color: item!.color } : undefined}>
                        {item!.val}
                      </span>
                    </div>
                  ))}
                </div>

                {d.budget > 0 && (
                  <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: "var(--surface-3)" }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(d.pct, 100)}%`,
                        background: d.overBudget
                          ? "var(--danger)"
                          : d.pct > 80
                          ? "var(--warning)"
                          : "linear-gradient(90deg, #43e97b, #38f9d7)",
                        boxShadow: d.overBudget ? "0 0 8px rgba(255,101,132,0.5)" : undefined,
                      }}
                      role="progressbar"
                      aria-valuenow={d.pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${d.division} budget usage ${d.pct.toFixed(0)}%`}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Charts */}
        <AnalyticsCharts divisionData={divisionData} />

        {/* Top users (admin only) */}
        {isAdmin && topUsers.length > 0 && (
          <div>
            <h2 className="text-xs font-bold text-[var(--foreground-muted)] uppercase tracking-widest mb-4">
              Top Users This Month
            </h2>
            <div className="rounded-2xl border border-[var(--border)] overflow-hidden" style={{ background: "var(--surface)" }}>
              <table className="w-full text-sm">
                <thead className="border-b border-[var(--border)]" style={{ background: "var(--surface-2)" }}>
                  <tr>
                    {["Name", "Division", "Generations", "Cost"].map((h) => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-bold text-[var(--foreground-muted)] uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {topUsers.map((u, i) => (
                    <tr key={u.userId ?? i}
                      className="transition-colors"
                      style={{ ["--hover-bg" as string]: "var(--surface-2)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                    >
                      <td className="px-5 py-3 font-medium text-[var(--foreground)]">{u.userName}</td>
                      <td className="px-5 py-3 capitalize text-[var(--foreground-muted)]">{u.division}</td>
                      <td className="px-5 py-3 text-[var(--foreground-muted)]">{u.count}</td>
                      <td className="px-5 py-3 font-semibold text-[var(--accent)]">{formatIdr(Number(u.totalCost ?? 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
