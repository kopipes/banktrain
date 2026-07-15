"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { ConceptSession } from "../types";
import { createDefaultSession } from "../types";

/** Merge stored session with fresh defaults to handle missing fields after upgrades */
function migrateSession(stored: ConceptSession): ConceptSession {
  const fresh = createDefaultSession();
  return {
    ...fresh,
    ...stored,
    phase1: {
      ...fresh.phase1,
      ...stored.phase1,
      briefMode: stored.phase1?.briefMode ?? "structured",
      rawBrief: stored.phase1?.rawBrief ?? "",
    },
    phase3: {
      ...fresh.phase3,
      ...stored.phase3,
      envBlueprintUrl: stored.phase3?.envBlueprintUrl ?? "",
      envRender3dUrl: stored.phase3?.envRender3dUrl ?? "",
    },
  };
}

async function loadProject(projectId: string): Promise<ConceptSession | null> {
  try {
    const res = await fetch(`/api/concept/projects/${projectId}`);
    if (!res.ok) return null;
    const data = await res.json();
    return migrateSession(data.sessionData as ConceptSession);
  } catch {
    return null;
  }
}

async function saveProject(projectId: string, session: ConceptSession): Promise<void> {
  try {
    await fetch(`/api/concept/projects/${projectId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionData: session }),
    });
  } catch {
    // best-effort — silent failure so the user isn't blocked
  }
}

export function useConceptSession(projectId: string) {
  const [session, setSession] = useState<ConceptSession>(createDefaultSession);
  const [isLoading, setIsLoading] = useState(true);

  // Ref to debounce server saves
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestSession = useRef<ConceptSession>(session);

  // Load from server on mount
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    loadProject(projectId).then((loaded) => {
      if (cancelled) return;
      if (loaded) {
        setSession(loaded);
        latestSession.current = loaded;
      }
      setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, [projectId]);

  // Debounced server save on every session change (skip initial empty state)
  useEffect(() => {
    if (isLoading) return;
    latestSession.current = session;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveProject(projectId, latestSession.current);
    }, 800);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [session, isLoading, projectId]);

  const updatePhase1 = useCallback((data: Partial<ConceptSession["phase1"]>) => {
    setSession((prev) => ({ ...prev, phase1: { ...prev.phase1, ...data } }));
  }, []);

  const updatePhase2 = useCallback((data: Partial<ConceptSession["phase2"]>) => {
    setSession((prev) => ({ ...prev, phase2: { ...prev.phase2, ...data } }));
  }, []);

  const updatePhase3 = useCallback((data: Partial<ConceptSession["phase3"]>) => {
    setSession((prev) => ({ ...prev, phase3: { ...prev.phase3, ...data } }));
  }, []);

  const updatePhase4 = useCallback((data: Partial<ConceptSession["phase4"]>) => {
    setSession((prev) => ({ ...prev, phase4: { ...prev.phase4, ...data } }));
  }, []);

  const updatePhase5 = useCallback((data: Partial<ConceptSession["phase5"]>) => {
    setSession((prev) => ({ ...prev, phase5: { ...prev.phase5, ...data } }));
  }, []);

  const goToPhase = useCallback((phase: ConceptSession["currentPhase"]) => {
    setSession((prev) => ({ ...prev, currentPhase: phase }));
  }, []);

  // resetSession is no longer used from the hook — the wizard navigates back to the list instead
  const resetSession = useCallback(() => {
    const fresh = createDefaultSession();
    setSession(fresh);
  }, []);

  return {
    session,
    isLoading,
    updatePhase1,
    updatePhase2,
    updatePhase3,
    updatePhase4,
    updatePhase5,
    goToPhase,
    resetSession,
  };
}
