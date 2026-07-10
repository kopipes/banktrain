"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Hook that fetches keyword suggestions from the user's generation history
 * for a given prompt field.
 *
 * Usage:
 *   const { suggestions, fetchSuggestions, isLoading } = useAutocomplete("style");
 */
export function useAutocomplete(field: string) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const fetchSuggestions = useCallback(
    async (q: string) => {
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      if (!q.trim()) {
        setSuggestions([]);
        return;
      }

      setIsLoading(true);
      try {
        const res = await fetch(
          `/api/autocomplete?q=${encodeURIComponent(q)}&field=${field}`,
          { signal: controller.signal }
        );
        const data = await res.json();
        setSuggestions(data.suggestions ?? []);
      } catch {
        // ignore abort errors
      } finally {
        setIsLoading(false);
      }
    },
    [field]
  );

  const clear = useCallback(() => setSuggestions([]), []);

  return { suggestions, fetchSuggestions, isLoading, clear };
}
