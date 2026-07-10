import { auth } from "@/lib/auth";
import { db } from "@/db";
import { generations, tokenLogs, users, challenges } from "@/db/schema";
import { eq, desc, count, sum, and } from "drizzle-orm";
import { currentMonthYear, formatIdr, formatNumber } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Wand2, Images, Coins, Trophy, ArrowRight, Sparkles, Zap } from "lucide-react";
import { RecentGenerationsGrid } from "./recent-generations";

export default async function DashboardPage() {
  const session = await auth();
  const user = session!.user as { id: string; name?: string; role?: string; division?: string };
  const monthYear = currentMonthYear();
  const firstName = user.name?.split(" ")[0] ?? "there";

  const [myGenerations, monthlyTokens, recentGenerations, activeChallenges] =
    await Promise.all([
      db.select({ count: count() }).from(generations).where(eq(generations.userId, user.id)).get(),
      db
        .select({ total: sum(tokenLogs.costIdr) })
        .from(tokenLogs)
        .where(and(eq(tokenLogs.userId, user.id), eq(tokenLogs.monthYear, monthYear)))
        .get(),
      db
        .select()
        .from(generations)
        .where(eq(generations.userId, user.id))
        .orderBy(desc(generations.createdAt))
        .limit(8),
      db.select({ count: count() }).from(challenges).where(eq(challenges.isActive, true)).get(),
    ]);

  const stats = [
    {
      title: "My Generations",
      value: formatNumber(myGenerations?.count ?? 0),
      icon: Images,
      gradient: "from-[#6c63ff] to-[#8b84ff]",
      glow: "rgba(108,99,255,0.3)",
      change: "all time",
    },
    {
      title: "This Month's Spend",
      value: formatIdr(Number(monthlyTokens?.total ?? 0)),
      icon: Coins,
      gradient: "from-[#f7971e] to-[#ffd200]",
      glow: "rgba(247,151,30,0.3)",
      change: monthYear,
    },
    {
      title: "Active Challenges",
      value: formatNumber(activeChallenges?.count ?? 0),
      icon: Trophy,
      gradient: "from-[#43e97b] to-[#38f9d7]",
      glow: "rgba(67,233,123,0.3)",
      change: "available now",
    },
  ];

  const quickActions = [
    {
      label: "Start Creating",
      desc: "Open Creator Studio",
      href: "/studio",
      icon: Wand2,
      gradient: "from-[#6c63ff] to-[#ff6584]",
      glow: "rgba(108,99,255,0.4)",
    },
    {
      label: "Take a Challenge",
      desc: "Practice your skills",
      href: "/challenges",
      icon: Zap,
      gradient: "from-[#43e97b] to-[#38f9d7]",
      glow: "rgba(67,233,123,0.3)",
    },
    {
      label: "Browse Feed",
      desc: "Explore team creations",
      href: "/feed",
      icon: Images,
      gradient: "from-[#f7971e] to-[#ff6584]",
      glow: "rgba(255,101,132,0.3)",
    },
  ];

  return (
    <div className="min-h-full bg-[var(--background)]">
      {/* Header */}
      <div className="relative overflow-hidden px-8 pt-10 pb-8 border-b border-[var(--border)]"
        style={{ background: "linear-gradient(180deg, var(--surface) 0%, var(--background) 100%)" }}
      >
        {/* Glow */}
        <div className="absolute top-0 left-0 w-64 h-64 rounded-full blur-[120px] opacity-10 pointer-events-none"
          style={{ background: "radial-gradient(circle, #6c63ff, transparent)" }} />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-[var(--accent)]" />
              <span className="text-xs text-[var(--foreground-muted)] font-medium uppercase tracking-widest">
                Welcome back
              </span>
            </div>
            <h1 className="text-3xl font-bold text-[var(--foreground)]">
              Hey, <span className="gradient-text">{firstName}</span> 👋
            </h1>
            <p className="text-[var(--foreground-muted)] mt-1 text-sm">
              <span className="capitalize font-medium text-[var(--foreground)]">{user.division}</span>
              {" · "}
              <span className="capitalize">{user.role}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="px-8 py-8 space-y-10">
        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {stats.map((stat) => (
            <div key={stat.title}
              className="relative overflow-hidden rounded-2xl border border-[var(--border)] p-6 transition-all duration-300 hover:scale-[1.02] hover:border-[var(--border-bright)]"
              style={{
                background: "var(--surface)",
                boxShadow: `0 4px 24px ${stat.glow}`
              }}
            >
              {/* Icon */}
              <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${stat.gradient} mb-4 shadow-lg`}>
                <stat.icon className="h-5 w-5 text-white" />
              </div>
              <p className="text-xs text-[var(--foreground-muted)] uppercase tracking-wider font-semibold mb-1">
                {stat.title}
              </p>
              <p className="text-2xl font-bold text-[var(--foreground)]">{stat.value}</p>
              <p className="text-xs text-[var(--foreground-subtle)] mt-1">{stat.change}</p>
              {/* Subtle gradient corner */}
              <div className={`absolute -bottom-4 -right-4 w-24 h-24 rounded-full blur-2xl opacity-20 bg-gradient-to-br ${stat.gradient}`} />
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-sm font-bold text-[var(--foreground-muted)] uppercase tracking-widest mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="group relative overflow-hidden rounded-2xl border border-[var(--border)] p-5 transition-all duration-300 hover:border-[var(--border-bright)] hover:scale-[1.02]"
                style={{ background: "var(--surface-2)" }}
              >
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${action.gradient} mb-3 shadow-lg transition-transform duration-300 group-hover:scale-110`}
                  style={{ boxShadow: `0 0 16px ${action.glow}` }}>
                  <action.icon className="h-5 w-5 text-white" />
                </div>
                <p className="font-semibold text-[var(--foreground)] text-sm">{action.label}</p>
                <p className="text-xs text-[var(--foreground-muted)] mt-0.5">{action.desc}</p>
                <ArrowRight className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--foreground-subtle)] transition-all duration-300 group-hover:text-[var(--accent)] group-hover:translate-x-1" />
                <div className={`absolute -bottom-6 -right-6 w-24 h-24 rounded-full blur-2xl opacity-10 bg-gradient-to-br ${action.gradient} transition-opacity duration-300 group-hover:opacity-20`} />
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Generations */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-[var(--foreground-muted)] uppercase tracking-widest">
              Recent Generations
            </h2>
            <Link href="/studio"
              className="flex items-center gap-1 text-xs text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors font-medium">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {recentGenerations.length === 0 ? (
            <div className="rounded-2xl border border-[var(--border)] border-dashed bg-[var(--surface)] p-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[var(--accent-dim)] flex items-center justify-center mx-auto mb-4">
                <Wand2 className="h-6 w-6 text-[var(--accent)]" />
              </div>
              <p className="text-[var(--foreground-muted)] font-medium mb-1">No generations yet</p>
              <p className="text-xs text-[var(--foreground-subtle)] mb-4">Create your first image in the Creator Studio</p>
              <Link href="/studio"
                className="inline-flex items-center gap-2 text-sm font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors">
                Open Studio <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          ) : (
            <RecentGenerationsGrid
              generations={recentGenerations}
              isAdmin={user.role === "admin"}
            />
          )}
        </div>
      </div>
    </div>
  );
}
