"use client";

import { Badge } from "@/components/ui/badge";
import type { Challenge } from "@/db/schema";
import { Zap, CheckCircle2, Clock } from "lucide-react";
import Link from "next/link";

interface ChallengeCardProps {
  challenge: Challenge;
  submitted: boolean;
  userId: string;
}

const difficultyConfig = {
  beginner: {
    label: "Beginner",
    gradientCss: "linear-gradient(135deg, #43e97b, #38f9d7)",
    glow: "rgba(67,233,123,0.3)",
    badge: "success" as const,
  },
  intermediate: {
    label: "Intermediate",
    gradientCss: "linear-gradient(135deg, #f7971e, #ffd200)",
    glow: "rgba(247,151,30,0.3)",
    badge: "warning" as const,
  },
  advanced: {
    label: "Advanced",
    gradientCss: "linear-gradient(135deg, #ff6584, #ff8c69)",
    glow: "rgba(255,101,132,0.3)",
    badge: "destructive" as const,
  },
};

export function ChallengeCard({ challenge, submitted, userId }: ChallengeCardProps) {
  const config = difficultyConfig[challenge.difficulty] ?? difficultyConfig.beginner;

  return (
    <div
      className={`group flex flex-col rounded-2xl border overflow-hidden transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_8px_32px_rgba(0,0,0,0.5)] ${
        submitted
          ? "border-[rgba(67,233,123,0.3)]"
          : "border-[var(--border)] hover:border-[var(--border-bright)]"
      }`}
      style={{
        background: submitted
          ? "linear-gradient(135deg, var(--surface) 0%, rgba(67,233,123,0.05) 100%)"
          : "var(--surface)",
        boxShadow: submitted ? `0 4px 24px rgba(67,233,123,0.1)` : undefined,
      }}
    >
      {/* Image */}
      {challenge.referenceImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={challenge.referenceImageUrl}
          alt={challenge.title}
          className="w-full aspect-video object-cover"
        />
      ) : (
        <div
          className="w-full aspect-video flex items-center justify-center opacity-10"
          style={{ background: `linear-gradient(135deg, ${config.glow}, transparent)` }}
        >
          <Zap className="h-8 w-8 text-[var(--foreground-subtle)]" />
        </div>
      )}

      <div className="flex-1 flex flex-col p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-[var(--foreground)] leading-snug text-sm flex-1">
            {challenge.title}
          </h3>
          <Badge variant={config.badge} className="flex-shrink-0 text-[10px]">
            {config.label}
          </Badge>
        </div>

        {/* Category */}
        <div className="mb-3">
          <span className="text-[10px] font-semibold text-[var(--foreground-subtle)] uppercase tracking-widest capitalize">
            {challenge.category}
          </span>
        </div>

        <p className="text-xs text-[var(--foreground-muted)] mb-4 line-clamp-3 leading-relaxed flex-1">
          {challenge.description}
        </p>

        {/* CTA */}
        {submitted ? (
          <div className="flex items-center gap-2 py-2 px-3 rounded-xl text-sm font-medium"
            style={{ background: "rgba(67,233,123,0.1)", color: "var(--success)", border: "1px solid rgba(67,233,123,0.2)" }}>
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            Submitted
          </div>
        ) : (
          <Link
            href={`/studio?challenge=${challenge.id}`}
            className={`flex items-center justify-center gap-2 h-9 px-4 text-sm rounded-xl font-medium text-white transition-all duration-200 hover:opacity-90 hover:scale-[0.98] active:scale-[0.97]`}
            style={{
              background: config.gradientCss,
              boxShadow: `0 4px 16px ${config.glow}`,
            }}
          >
            <Zap className="h-3.5 w-3.5" />
            Start Challenge
          </Link>
        )}
      </div>
    </div>
  );
}
