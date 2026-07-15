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
    <div className="min-h-full bg-[var(--background)]">
      {/* Header */}
      <div
        className="px-8 pt-8 pb-6 border-b border-[var(--border)]"
        style={{ background: "linear-gradient(180deg, var(--surface) 0%, var(--background) 100%)" }}
      >
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Concept Creator</h1>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            {creating ? "Creating…" : "New Concept"}
          </button>
        </div>
        <p className="text-sm text-[var(--muted-foreground)]">
          Your saved concept projects — pick up where you left off
        </p>
      </div>

      {/* Content */}
      <div className="px-8 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-[var(--muted-foreground)] text-sm">
            Loading projects…
          </div>
        ) : projects.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Folder className="w-12 h-12 text-[var(--muted-foreground)] opacity-40" />
            <p className="text-[var(--muted-foreground)] text-sm">No projects yet</p>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 disabled:opacity-50 transition-opacity"
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
                className="group relative text-left rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 hover:border-[var(--primary)] hover:shadow-md transition-all"
              >
                {/* Delete button */}
                <button
                  onClick={(e) => handleDelete(e, p.id)}
                  disabled={deletingId === p.id}
                  className="absolute top-3 right-3 p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-[var(--destructive)]/10 hover:text-[var(--destructive)] text-[var(--muted-foreground)] transition-all"
                  title="Delete project"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                {/* Status badge */}
                <div className="flex items-center gap-1.5 mb-3">
                  {p.status === "completed" ? (
                    <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                  ) : (
                    <Clock className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
                  )}
                  <span
                    className={`text-xs font-medium ${
                      p.status === "completed"
                        ? "text-green-600 dark:text-green-400"
                        : "text-[var(--muted-foreground)]"
                    }`}
                  >
                    {phaseLabel(p.currentPhase, p.status)}
                  </span>
                </div>

                {/* Phase progress bar */}
                <div className="flex gap-1 mb-4">
                  {PHASE_LABELS.map((_, i) => {
                    const phaseNum = i + 1;
                    const filled =
                      p.status === "completed" || phaseNum < p.currentPhase;
                    const active = phaseNum === p.currentPhase && p.status !== "completed";
                    return (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          filled
                            ? "bg-[var(--primary)]"
                            : active
                            ? "bg-[var(--primary)]/50"
                            : "bg-[var(--border)]"
                        }`}
                      />
                    );
                  })}
                </div>

                {/* Title */}
                <p className="text-sm font-semibold text-[var(--foreground)] line-clamp-2 mb-2 pr-6">
                  {p.title}
                </p>

                {/* Timestamp */}
                <p className="text-xs text-[var(--muted-foreground)]">
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
