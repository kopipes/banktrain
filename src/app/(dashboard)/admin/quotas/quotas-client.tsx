"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatIdr, formatNumber } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";

interface DivisionData {
  division: string;
  monthlyBudgetIdr: number;
  usedBudgetIdr: number;
  totalTokens: number;
  generationCount: number;
}

export function AdminQuotasClient({
  data,
  monthYear,
}: {
  data: DivisionData[];
  monthYear: string;
}) {
  const router = useRouter();
  const [budgets, setBudgets] = useState<Record<string, number>>(
    Object.fromEntries(data.map((d) => [d.division, d.monthlyBudgetIdr]))
  );
  const [saving, setSaving] = useState<string | null>(null);

  async function handleSave(division: string) {
    setSaving(division);
    await fetch("/api/admin/quotas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ division, monthlyBudgetIdr: budgets[division] ?? 0 }),
    });
    setSaving(null);
    router.refresh();
  }

  return (
    <div className="min-h-full p-8" style={{ background: "var(--background)" }}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Quotas &amp; Budget</h1>
        <p className="text-gray-500 mt-1">
          Division spending for <strong>{monthYear}</strong>. Set monthly budget limits per division.
          Setting to 0 means unlimited.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.map((d) => {
          const pct =
            d.monthlyBudgetIdr > 0
              ? Math.min(100, (d.usedBudgetIdr / d.monthlyBudgetIdr) * 100)
              : 0;
          const overBudget = d.monthlyBudgetIdr > 0 && d.usedBudgetIdr > d.monthlyBudgetIdr;

          return (
            <Card key={d.division} className={overBudget ? "border-red-300" : ""}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base capitalize">{d.division}</CardTitle>
                  {overBudget && <Badge variant="destructive">Over Budget</Badge>}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3 text-sm mb-4">
                  <div>
                    <p className="text-gray-500 text-xs">Used</p>
                    <p className="font-semibold">{formatIdr(d.usedBudgetIdr)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Tokens</p>
                    <p className="font-semibold">{formatNumber(d.totalTokens)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Generations</p>
                    <p className="font-semibold">{d.generationCount}</p>
                  </div>
                </div>

                {d.monthlyBudgetIdr > 0 && (
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>{pct.toFixed(0)}% used</span>
                      <span>{formatIdr(d.monthlyBudgetIdr)}</span>
                    </div>
                    <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${overBudget ? "bg-red-500" : pct > 80 ? "bg-amber-500" : "bg-green-500"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Label htmlFor={`budget-${d.division}`} className="text-xs">
                      Monthly Budget (IDR)
                    </Label>
                    <Input
                      id={`budget-${d.division}`}
                      type="number"
                      min="0"
                      step="10000"
                      className="mt-1 h-8 text-sm"
                      value={budgets[d.division] ?? 0}
                      onChange={(e) =>
                        setBudgets((prev) => ({ ...prev, [d.division]: Number(e.target.value) }))
                      }
                    />
                  </div>
                  <Button
                    size="sm"
                    className="mt-5"
                    onClick={() => handleSave(d.division)}
                    isLoading={saving === d.division}
                  >
                    <Save className="h-3.5 w-3.5" />
                    Save
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {data.length === 0 && (
          <p className="text-gray-500 col-span-2 py-12 text-center">
            No users found. Add users first to see divisions here.
          </p>
        )}
      </div>
    </div>
  );
}
