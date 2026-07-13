"use client";

import { useState, useCallback, useEffect } from "react";
import type { ConceptSession } from "../types";
import { createDefaultSession } from "../types";

const STORAGE_KEY = "concept_creator_session";

/** Merge stored session with fresh defaults to handle missing fields after upgrades */
function migrateSession(stored: ConceptSession): ConceptSession {
  const fresh = createDefaultSession();
  return {
    ...fresh,
    ...stored,
    phase1: {
      ...fresh.phase1,
      ...stored.phase1,
      // Ensure new fields exist
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

export function useConceptSession() {
  const [session, setSession] = useState<ConceptSession>(() => {
    if (typeof window === "undefined") return createDefaultSession();
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) return migrateSession(JSON.parse(stored) as ConceptSession);
    } catch {
      // ignore
    }
    return createDefaultSession();
  });

  // Persist to sessionStorage on every change
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch {
      // ignore quota errors
    }
  }, [session]);

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

  const resetSession = useCallback(() => {
    const fresh = createDefaultSession();
    setSession(fresh);
    try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }, []);

  return {
    session,
    updatePhase1,
    updatePhase2,
    updatePhase3,
    updatePhase4,
    updatePhase5,
    goToPhase,
    resetSession,
  };
}
