"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Trash2, Pencil, X, Check, Wifi, WifiOff, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { AiModel } from "@/db/schema";

type SafeModel = Omit<AiModel, "apiKey"> & { apiKey: string };

type ModelForm = {
  name: string;
  provider: string;
  baseUrl: string;
  apiKey: string;
  modelId: string;
  type: "image" | "llm";
  pricePerToken: number;
  pricePerImage: number;
  isDefault: boolean;
};

type TestResult = {
  ok: boolean;
  message: string;
  latencyMs?: number;
  modelFound?: boolean;
  tokens?: number | null;
  error?: string;
  status?: number;
};

const emptyForm: ModelForm = {
  name: "", provider: "", baseUrl: "", apiKey: "", modelId: "",
  type: "image", pricePerToken: 0, pricePerImage: 0, isDefault: false,
};

function modelToForm(m: SafeModel): ModelForm {
  return {
    name: m.name,
    provider: m.provider,
    baseUrl: m.baseUrl,
    apiKey: m.apiKey,
    modelId: m.modelId,
    type: m.type as "image" | "llm",
    pricePerToken: m.pricePerToken,
    pricePerImage: m.pricePerImage,
    isDefault: m.isDefault,
  };
}

function ModelFormFields({
  form,
  setForm,
  isEdit = false,
  savedModelId,
}: {
  form: ModelForm;
  setForm: (f: ModelForm) => void;
  isEdit?: boolean;
  savedModelId?: string;
}) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  async function handleTest() {
    if (!form.baseUrl || !form.modelId) {
      setTestResult({ ok: false, message: "Fill in Base URL, API Key, and Model ID before testing." });
      return;
    }
    if (!form.apiKey) {
      setTestResult({ ok: false, message: "API Key is required to test." });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/admin/models/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl: form.baseUrl,
          apiKey: form.apiKey,
          modelIdentifier: form.modelId,
          type: form.type,
          ...(isEdit && savedModelId ? { modelId: savedModelId } : {}),
        }),
      });
      const data: TestResult = await res.json();
      setTestResult(data);
    } catch {
      setTestResult({ ok: false, message: "Network error — could not reach the test endpoint." });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="mf-name">Display Name</Label>
          <Input id="mf-name" className="mt-1" required value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="mf-provider">Provider</Label>
          <Input id="mf-provider" className="mt-1" required placeholder="openai, together, custom"
            value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="mf-baseurl">Base URL</Label>
          <Input id="mf-baseurl" className="mt-1" required placeholder="https://api.openai.com/v1"
            value={form.baseUrl} onChange={(e) => { setForm({ ...form, baseUrl: e.target.value }); setTestResult(null); }} />
        </div>
        <div>
          <Label htmlFor="mf-modelid">Model ID</Label>
          <Input id="mf-modelid" className="mt-1" required placeholder="dall-e-3, gpt-4o-mini..."
            value={form.modelId} onChange={(e) => { setForm({ ...form, modelId: e.target.value }); setTestResult(null); }} />
        </div>
        <div>
          <Label htmlFor="mf-apikey">
            API Key
            {isEdit && (
              <span className="ml-1 text-[var(--foreground-subtle)] font-normal normal-case tracking-normal">
                (leave unchanged to keep existing)
              </span>
            )}
          </Label>
          <Input
            id="mf-apikey"
            type="password"
            className="mt-1"
            required={!isEdit}
            placeholder={isEdit ? "Leave blank to keep existing key" : "sk-..."}
            value={form.apiKey}
            onChange={(e) => { setForm({ ...form, apiKey: e.target.value }); setTestResult(null); }}
          />
        </div>
        <div>
          <Label htmlFor="mf-type">Type</Label>
          <Select id="mf-type" className="mt-1" value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value as "image" | "llm" })}>
            <option value="image">Image Generation</option>
            <option value="llm">LLM (AI Mentor)</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="mf-price-token">Price per Token (IDR)</Label>
          <Input id="mf-price-token" type="number" step="0.001" min="0" className="mt-1"
            value={form.pricePerToken}
            onChange={(e) => setForm({ ...form, pricePerToken: Number(e.target.value) })} />
        </div>
        <div>
          <Label htmlFor="mf-price-image">Price per Image (IDR)</Label>
          <Input id="mf-price-image" type="number" step="1" min="0" className="mt-1"
            value={form.pricePerImage}
            onChange={(e) => setForm({ ...form, pricePerImage: Number(e.target.value) })} />
        </div>
        <div className="flex items-center gap-2 md:col-span-2">
          <input type="checkbox" id="mf-default" checked={form.isDefault}
            onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} />
          <Label htmlFor="mf-default" className="cursor-pointer normal-case tracking-normal font-medium">
            Set as default for this type
          </Label>
        </div>
      </div>

      {/* Test Connection */}
      <div className="pt-2 border-t border-[var(--border)]">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleTest}
            disabled={testing || !form.baseUrl || !form.modelId || !form.apiKey}
            className="flex items-center gap-2"
          >
            {testing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Wifi className="h-3.5 w-3.5" />
            )}
            {testing ? "Testing..." : "Test Connection"}
          </Button>
          <span className="text-xs text-[var(--foreground-subtle)]">
            Validates credentials and connectivity before saving
          </span>
        </div>

        {/* Test result */}
        {testResult && (
          <div
            className="mt-3 flex items-start gap-3 p-3 rounded-xl text-sm"
            style={{
              background: testResult.ok
                ? "rgba(34, 197, 94, 0.08)"
                : "rgba(220, 38, 38, 0.08)",
              border: `1px solid ${testResult.ok ? "rgba(34, 197, 94, 0.25)" : "rgba(220, 38, 38, 0.25)"}`,
            }}
          >
            {testResult.ok ? (
              <Check className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: "var(--success)" }} />
            ) : (
              <WifiOff className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: "var(--danger)" }} />
            )}
            <div className="flex-1 min-w-0">
              <p
                className="font-medium leading-snug"
                style={{ color: testResult.ok ? "var(--success)" : "var(--danger)" }}
              >
                {testResult.message}
              </p>
              {/* Extra details */}
              <div className="flex flex-wrap gap-3 mt-1.5">
                {testResult.latencyMs !== undefined && (
                  <span className="text-xs text-[var(--foreground-muted)]">
                    Latency: <strong>{testResult.latencyMs}ms</strong>
                  </span>
                )}
                {testResult.tokens !== null && testResult.tokens !== undefined && (
                  <span className="text-xs text-[var(--foreground-muted)]">
                    Tokens used: <strong>{testResult.tokens}</strong>
                  </span>
                )}
                {testResult.status !== undefined && (
                  <span className="text-xs text-[var(--foreground-muted)]">
                    HTTP: <strong>{testResult.status}</strong>
                  </span>
                )}
                {testResult.modelFound === false && (
                  <span className="text-xs" style={{ color: "var(--warning)" }}>
                    Model ID not confirmed — double check it
                  </span>
                )}
              </div>
              {testResult.error && (
                <p className="text-xs text-[var(--foreground-muted)] mt-1 font-mono break-all">
                  {testResult.error}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function AdminModelsClient({ initialModels }: { initialModels: SafeModel[] }) {
  const router = useRouter();

  // Create state
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<ModelForm>(emptyForm);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");

  // Edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ModelForm>(emptyForm);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError("");
    const res = await fetch("/api/admin/models", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createForm),
    });
    const data = await res.json();
    setCreateLoading(false);
    if (!res.ok) { setCreateError(data.error); return; }
    setShowCreate(false);
    setCreateForm(emptyForm);
    router.refresh();
  }

  function startEdit(m: SafeModel) {
    setEditId(m.id);
    setEditForm(modelToForm(m));
    setEditError("");
    setShowCreate(false); // close create form if open
  }

  function cancelEdit() {
    setEditId(null);
    setEditError("");
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editId) return;
    setEditLoading(true);
    setEditError("");

    const payload: Record<string, unknown> = { id: editId, ...editForm };
    // If api key was not changed (still masked), don't send it
    if (!editForm.apiKey || editForm.apiKey.startsWith("***")) {
      delete payload.apiKey;
    }

    const res = await fetch("/api/admin/models", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setEditLoading(false);
    if (!res.ok) { setEditError(data.error); return; }
    setEditId(null);
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Deactivate this model?")) return;
    await fetch(`/api/admin/models?id=${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">AI Models</h1>
          <p className="text-[var(--foreground-muted)] mt-1 text-sm">
            Configure image generation and LLM models. Supports any OpenAI-compatible API via custom base URL.
          </p>
        </div>
        <Button onClick={() => { setShowCreate(!showCreate); setShowCreate(v => v); cancelEdit(); }}>
          <PlusCircle className="h-4 w-4" />
          Add Model
        </Button>
      </div>

      {/* Create form */}
      {showCreate && (
        <Card className="mb-6 border-[var(--accent-dim)]">
          <CardHeader>
            <CardTitle className="text-base">New Model</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate}>
              <ModelFormFields form={createForm} setForm={setCreateForm} />
              {createError && (
                <p className="text-sm text-[var(--danger)] mt-3">{createError}</p>
              )}
              <div className="flex gap-2 mt-4">
                <Button type="submit" isLoading={createLoading}>Add Model</Button>
                <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Model cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {initialModels.map((m) => (
          <Card key={m.id} className={!m.isActive ? "opacity-50" : ""}>
            <CardContent className="pt-4">
              {editId === m.id ? (
                /* ── Inline edit form ── */
                <form onSubmit={handleUpdate}>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-semibold text-[var(--foreground)]">Edit Model</span>
                    <button type="button" onClick={cancelEdit}
                      className="text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <ModelFormFields form={editForm} setForm={setEditForm} isEdit savedModelId={editId ?? undefined} />
                  {editError && (
                    <p className="text-sm text-[var(--danger)] mt-3">{editError}</p>
                  )}
                  <div className="flex gap-2 mt-4">
                    <Button type="submit" size="sm" isLoading={editLoading}>
                      <Check className="h-3.5 w-3.5" />
                      Save Changes
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={cancelEdit}>
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                /* ── Card display view ── */
                <>
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-[var(--foreground)]">{m.name}</h3>
                        {m.isDefault && <Badge variant="success">Default</Badge>}
                        {!m.isActive && <Badge variant="secondary">Inactive</Badge>}
                      </div>
                      <p className="text-xs text-[var(--foreground-muted)] mt-0.5">
                        {m.provider} · {m.modelId}
                      </p>
                    </div>
                    <Badge variant={m.type === "image" ? "default" : "secondary"} className="flex-shrink-0 ml-2">
                      {m.type}
                    </Badge>
                  </div>

                  <p className="text-xs text-[var(--foreground-subtle)] font-mono truncate mb-3">
                    {m.baseUrl}
                  </p>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[var(--foreground-muted)]">
                      {m.type === "image" ? `Rp${m.pricePerImage}/img` : `Rp${m.pricePerToken}/token`}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost" size="icon"
                        onClick={() => startEdit(m)}
                        className="h-7 w-7 text-[var(--foreground-muted)] hover:text-[var(--accent)]"
                        aria-label="Edit model"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        onClick={() => handleDelete(m.id)}
                        className="h-7 w-7 text-[var(--foreground-muted)] hover:text-[var(--danger)]"
                        aria-label="Deactivate model"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ))}

        {initialModels.length === 0 && (
          <p className="text-[var(--foreground-muted)] col-span-2 py-8 text-center">
            No models configured yet.
          </p>
        )}
      </div>
    </div>
  );
}
