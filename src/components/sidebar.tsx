"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme-provider";
import {
  LayoutDashboard,
  Wand2,
  Images,
  BookOpen,
  Trophy,
  Users,
  LogOut,
  Cpu,
  BarChart3,
  TrendingUp,
  Sparkles,
  Sun,
  Moon,
  Settings,
  Lightbulb,
  Scissors,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Creator Studio", href: "/studio", icon: Wand2 },
  { label: "Global Feed", href: "/feed", icon: Images },
  { label: "Library", href: "/library", icon: BookOpen },
  { label: "Challenges", href: "/challenges", icon: Trophy },
  { label: "Concept Creator", href: "/concept-creator", icon: Lightbulb },
  { label: "Remove BG", href: "/remove-bg", icon: Scissors },
  { label: "Analytics", href: "/analytics", icon: TrendingUp },
];

const adminNavItems: NavItem[] = [
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "AI Models", href: "/admin/models", icon: Cpu },
  { label: "Quotas & Budget", href: "/admin/quotas", icon: BarChart3 },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

interface SidebarProps {
  role?: string;
  userName?: string;
  userDivision?: string;
  showLibrary?: boolean;
  showChallenges?: boolean;
  showConceptCreator?: boolean;
}

export function Sidebar({ role, userName, userDivision, showLibrary = true, showChallenges = true, showConceptCreator = false }: SidebarProps) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  const initials = userName
    ? userName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  const visibleNavItems = navItems.filter((item) => {
    if (item.href === "/library") return showLibrary;
    if (item.href === "/challenges") return showChallenges;
    if (item.href === "/concept-creator") return showConceptCreator;
    return true;
  });

  return (
    <aside
      className="flex flex-col w-64 h-full overflow-y-auto px-3 py-4 border-r border-[var(--border)]"
      style={{ background: "linear-gradient(180deg, var(--surface) 0%, var(--background) 100%)" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-3 py-4 mb-4">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-[#6c63ff] to-[#ff6584] shadow-[0_0_16px_rgba(108,99,255,0.4)]">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div>
          <span className="font-bold text-base tracking-tight text-[var(--foreground)]">TrainBank</span>
          <p className="text-xs text-[var(--foreground-subtle)] leading-none mt-0.5">AI Creator Hub</p>
        </div>
      </div>

      {/* Main nav */}
      <nav className="flex-1 space-y-0.5" aria-label="Main navigation">
        {visibleNavItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                active
                  ? "bg-[var(--accent-dim)] text-[var(--accent)] border border-[rgba(108,99,255,0.15)]"
                  : "text-[var(--foreground-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
              )}
              aria-current={active ? "page" : undefined}
            >
              <item.icon className={cn(
                "h-4 w-4 flex-shrink-0 transition-colors duration-200",
                active ? "text-[var(--accent)]" : "group-hover:text-[var(--foreground)]"
              )} />
              {item.label}
              {active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
              )}
            </Link>
          );
        })}

        {/* Admin section */}
        {role === "admin" && (
          <>
            <div className="pt-5 pb-1.5 px-3">
              <span className="text-[10px] font-bold text-[var(--foreground-subtle)] uppercase tracking-widest">
                Admin
              </span>
            </div>
            {adminNavItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                    active
                      ? "bg-[var(--accent-dim)] text-[var(--accent)] border border-[rgba(108,99,255,0.15)]"
                      : "text-[var(--foreground-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* Bottom section */}
      <div className="mt-4 pt-4 border-t border-[var(--border)] space-y-1">

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[var(--foreground-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)] transition-all duration-200"
          aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
        >
          {theme === "light" ? (
            <Moon className="h-4 w-4 flex-shrink-0" />
          ) : (
            <Sun className="h-4 w-4 flex-shrink-0 text-[var(--warning)]" />
          )}
          <span>{theme === "light" ? "Dark mode" : "Light mode"}</span>
          {/* Toggle pill */}
          <div className={cn(
            "ml-auto relative w-9 h-5 rounded-full transition-colors duration-300 flex-shrink-0",
            theme === "dark" ? "bg-[var(--accent)]" : "bg-[var(--border-bright)]"
          )}>
            <div className={cn(
              "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-300",
              theme === "dark" ? "translate-x-4" : "translate-x-0.5"
            )} />
          </div>
        </button>

        {/* User info */}
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl">
          <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-2)] flex items-center justify-center text-xs font-bold text-white shadow-sm">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[var(--foreground)] truncate leading-tight">{userName}</p>
            <p className="text-xs text-[var(--foreground-subtle)] capitalize leading-tight truncate">
              {role} · {userDivision}
            </p>
          </div>
        </div>

        {/* Sign out */}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[var(--foreground-muted)] hover:bg-[rgba(220,38,38,0.08)] hover:text-[var(--danger)] transition-all duration-200"
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
