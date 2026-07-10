"use client";

import { useEffect, useState } from "react";

interface UserDefaults {
  defaultAspectRatio: string;
  defaultStyle: string;
  defaultCfgScale: number;
  defaultSteps: number;
  negativeKeywords: string[];
  sampleCount: number;
}

const FALLBACK: UserDefaults = {
  defaultAspectRatio: "1:1",
  defaultStyle: "",
  defaultCfgScale: 7,
  defaultSteps: 30,
  negativeKeywords: [],
  sampleCount: 0,
};

/**
 * Hook that fetches personalised default parameters for the Creator Studio.
 * Falls back to static defaults immediately, then updates when data arrives.
 */
export function useUserDefaults(): UserDefaults & { isLoaded: boolean } {
  const [defaults, setDefaults] = useState<UserDefaults>(FALLBACK);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/user/defaults")
      .then((r) => r.json())
      .then((data: UserDefaults) => {
        if (data && data.sampleCount > 0) {
          setDefaults(data);
        }
        setIsLoaded(true);
      })
      .catch(() => setIsLoaded(true));
  }, []);

  return { ...defaults, isLoaded };
}
