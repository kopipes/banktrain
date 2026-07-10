"use client";

import { formatIdr } from "@/lib/utils";

interface DivisionEntry {
  division: string;
  used: number;
  budget: number;
  totalTokens: number;
  generationCount: number;
  pct: number;
  overBudget: boolean;
}

/**
 * Client component for visual analytics charts.
 * Uses pure CSS/HTML bars (no external chart lib required).
 */
export function AnalyticsCharts({ divisionData }: { divisionData: DivisionEntry[] }) {
  if (divisionData.length === 0) return null;

  const maxSpend = Math.max(...divisionData.map((d) => d.used), 1);

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Spend Comparison</h2>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="space-y-4">
          {[...divisionData]
            .sort((a, b) => b.used - a.used)
            .map((d) => (
              <div key={d.division}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700 capitalize w-32 truncate">
                    {d.division}
                  </span>
                  <span className="text-gray-500 text-xs">{formatIdr(d.used)}</span>
                </div>
                <div className="h-6 w-full bg-gray-100 rounded overflow-hidden relative">
                  {/* Budget marker */}
                  {d.budget > 0 && (
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-gray-400 z-10"
                      style={{ left: `${Math.min((d.budget / maxSpend) * 100, 100)}%` }}
                      title={`Budget: ${formatIdr(d.budget)}`}
                    />
                  )}
                  {/* Spend bar */}
                  <div
                    className={`h-full rounded transition-all ${
                      d.overBudget
                        ? "bg-red-400"
                        : d.pct > 80
                        ? "bg-amber-400"
                        : "bg-indigo-400"
                    }`}
                    style={{ width: `${(d.used / maxSpend) * 100}%` }}
                  />
                </div>
              </div>
            ))}
        </div>
        <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded bg-indigo-400" />
            Under 80%
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded bg-amber-400" />
            80–100%
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded bg-red-400" />
            Over budget
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-0.5 h-3 bg-gray-400" />
            Budget limit
          </span>
        </div>
      </div>
    </div>
  );
}
