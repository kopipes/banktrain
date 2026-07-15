"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Folder, CheckCircle, Clock, Trash2 } from "lucide-react";

interface ProjectSummary {
  id: string;
  title: string;
  currentPhase: number;
  status: "in_progress" | "completed";
  createdAt: string;
  updatedAt: string;
}

const PHASE_LABELS = ["Brief", "Infrastructure", "Visuals", "Iteration", "Deck"];

function phaseLabel(phase: number, status: string) {
  if (status === "completed") return "Completed";
  const label = PHASE_LABELS[phase - 1] ?? `Phase ${phase}`;
  return `Phase ${phase} — ${label}`;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

interface Props {
  onCreate: (id: string) => void;
  onOpen: (id: string) => void;
}

export function ConceptProjectList({ onCreate, onOpen }: Props) {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/concept/projects");
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/concept/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled Project" }),
      });
      if (res.ok) {
        const data = await res.json();
        onCreate(data.id as string);
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Delete this project? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      await fetch(`/api/concept/projects/${id}`, { method: "DELETE" });
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-full" style={{ background: "var(--background)" }}>
      {/* Header */}
      <div
        className="px-8 pt-8 pb-6"
        style={{
          borderBottom: "1px solid var(--border)",
          background: "linear-gradient(180deg, var(--surface) 0%, var(--background) 100%)",
        }}
      >
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
            Concept Creator
          </h1>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-opacity disabled:opacity-50 hover:opacity-80"
            style={{ background: "var(--accent)", color: "#ffffff" }}
          >
            <Plus className="w-4 h-4" />
            {creating ? "Creating…" : "New Concept"}
          </button>
        </div>
        <p className="text-sm" style={{ color: "var(--foreground-muted)" }}>
          Your saved concept projects — pick up where you left off
        </p>
      </div>

      {/* Content */}
      <div className="px-8 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-sm" style={{ color: "var(--foreground-muted)" }}>
            Loading projects…
          </div>
        ) : projects.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Folder className="w-12 h-12 opacity-30" style={{ color: "var(--foreground-subtle)" }} />
            <p className="text-sm" style={{ color: "var(--foreground-muted)" }}>No projects yet</p>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-opacity disabled:opacity-50 hover:opacity-80"
              style={{ background: "var(--accent)", color: "#ffffff" }}
            >
              <Plus className="w-4 h-4" />
              {creating ? "Creating…" : "Start your first concept"}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl">
            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => onOpen(p.id)}
                className="group relative text-left rounded-xl p-5 transition-all hover:shadow-lg"
                style={{
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                }}
              >
                {/* Delete button */}
                <button
                  onClick={(e) => handleDelete(e, p.id)}
                  disabled={deletingId === p.id}
                  className="absolute top-3 right-3 p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                  style={{ color: "var(--foreground-muted)" }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.color = "var(--danger)";
                    (e.currentTarget as HTMLElement).style.background = "rgba(220,38,38,0.08)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.color = "var(--foreground-muted)";
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                  }}
                  title="Delete project"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                {/* Status badge */}
                <div className="flex items-center gap-1.5 mb-3">
                  {p.status === "completed" ? (
                    <CheckCircle className="w-3.5 h-3.5" style={{ color: "var(--success)" }} />
                  ) : (
                    <Clock className="w-3.5 h-3.5" style={{ color: "var(--foreground-subtle)" }} />
                  )}
                  <span
                    className="text-xs font-medium"
                    style={{ color: p.status === "completed" ? "var(--success)" : "var(--foreground-muted)" }}
                  >
                    {phaseLabel(p.currentPhase, p.status)}
                  </span>
                </div>

                {/* Phase progress bar */}
                <div className="flex gap-1 mb-4">
                  {PHASE_LABELS.map((_, i) => {
                    const phaseNum = i + 1;
                    const filled = p.status === "completed" || phaseNum < p.currentPhase;
                    const active = phaseNum === p.currentPhase && p.status !== "completed";
                    return (
                      <div
                        key={i}
                        className="h-1 flex-1 rounded-full transition-colors"
                        style={{
                          background: filled
                            ? "var(--accent)"
                            : active
                            ? "var(--accent-dim)"
                            : "var(--surface-3)",
                        }}
                      />
                    );
                  })}
                </div>

                {/* Title */}
                <p
                  className="text-sm font-semibold line-clamp-2 mb-2 pr-6"
                  style={{ color: "var(--foreground)" }}
                >
                  {p.title}
                </p>

                {/* Timestamp */}
                <p className="text-xs" style={{ color: "var(--foreground-subtle)" }}>
                  Updated {timeAgo(p.updatedAt)}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
