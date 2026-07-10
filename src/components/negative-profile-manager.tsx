"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Plus } from "lucide-react";

/**
 * Negative Prompt Profile Manager.
 * Displays the user's saved negative keywords and allows adding/removing them.
 * Can be embedded in settings or studio sidebar.
 */
export function NegativeProfileManager() {
  const [keywords, setKeywords] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/user/negative-profile")
      .then((r) => r.json())
      .then((data) => {
        setKeywords(data.keywords ?? []);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  async function handleAdd() {
    const kw = input.trim();
    if (!kw || keywords.includes(kw)) return;
    const res = await fetch("/api/user/negative-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keywords: [kw] }),
    });
    const data = await res.json();
    setKeywords(data.keywords ?? []);
    setInput("");
  }

  async function handleRemove(kw: string) {
    const res = await fetch(
      `/api/user/negative-profile?keyword=${encodeURIComponent(kw)}`,
      { method: "DELETE" }
    );
    const data = await res.json();
    setKeywords(data.keywords ?? []);
  }

  if (isLoading) {
    return <p className="text-sm text-gray-400">Loading profile...</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Negative Prompt Profile</CardTitle>
        <p className="text-xs text-gray-500">
          These keywords are auto-suggested in your negative prompt when generating.
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 mb-3 min-h-[32px]">
          {keywords.length === 0 && (
            <span className="text-xs text-gray-400">No keywords saved yet.</span>
          )}
          {keywords.map((kw) => (
            <span
              key={kw}
              className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 rounded-full px-2.5 py-0.5 text-xs"
            >
              {kw}
              <button
                onClick={() => handleRemove(kw)}
                className="text-gray-400 hover:text-red-500 transition-colors"
                aria-label={`Remove ${kw}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            className="h-8 text-xs"
            placeholder="Add keyword..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <Button size="sm" onClick={handleAdd} disabled={!input.trim()}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
