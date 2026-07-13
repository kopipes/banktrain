"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { Phase1Data, EventBrief, ConceptParadigm } from "../types";
import { Sparkles, DollarSign, Check, MessageSquare, X, AlignLeft, LayoutList } from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  data: Phase1Data;
  llmModelId: string;
  onChange: (data: Partial<Phase1Data>) => void;
  onNext: () => void;
}

const BRIEF_FIELDS: Array<{ key: keyof EventBrief; label: string; placeholder: string; type?: string; rows?: number }> = [
  { key: "eventName", label: "Event Name *", placeholder: "e.g. Tech Summit 2026" },
  { key: "objective", label: "Event Objective *", placeholder: "e.g. Launch new product line, build brand awareness", type: "textarea", rows: 2 },
  { key: "targetAudience", label: "Target Audience *", placeholder: "e.g. C-level executives, 25-45 year old tech professionals" },
  { key: "brandName", label: "Brand / Client Name *", placeholder: "e.g. Acme Corporation" },
  { key: "brandValues", label: "Brand Values", placeholder: "e.g. Innovation, Trust, Sustainability" },
  { key: "brandColors", label: "Brand Colors", placeholder: "e.g. Navy blue, gold, white" },
  { key: "expectedAttendees", label: "Expected Attendees", placeholder: "e.g. 500" },
  { key: "eventDate", label: "Event Date", placeholder: "e.g. September 2026", type: "text" },
  { key: "eventDuration", label: "Duration", placeholder: "e.g. 1 day, 3 days" },
  { key: "additionalNotes", label: "Additional Notes", placeholder: "Special requirements, venue preferences, VIP arrangements...", type: "textarea", rows: 3 },
];

export function Phase1Brief({ data, llmModelId, onChange, onNext }: Props) {
  const [isGeneratingThemes, setIsGeneratingThemes] = useState(false);
  const [themeError, setThemeError] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Hi! I'm your Brief Advisor. Share your event idea in any form — rough notes, a few sentences, or a full paragraph — and I'll help you refine it into a strong brief." },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const briefMode = data.briefMode ?? "structured";
  const canGenerateThemes = briefMode === "freetext"
    ? data.rawBrief.trim().length > 20
    : !!(data.brief.eventName && data.brief.objective && data.brief.targetAudience && data.brief.brandName);
  const canProceed = canGenerateThemes && data.paradigm && data.selectedTheme;

  function updateBrief(key: keyof EventBrief, value: string) {
    onChange({ brief: { ...data.brief, [key]: value } });
  }

  async function handleGenerateThemes() {
    if (!llmModelId) { setThemeError("No LLM model configured. Ask admin to add one."); return; }
    setIsGeneratingThemes(true);
    setThemeError("");
    try {
      const res = await fetch("/api/concept/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief: data.brief,
          rawBrief: briefMode === "freetext" ? data.rawBrief : undefined,
          briefMode,
          modelId: llmModelId,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setThemeError(json.error ?? "Failed to generate themes."); return; }
      onChange({ suggestedThemes: json.themes ?? [], selectedTheme: "" });
    } catch {
      setThemeError("Network error. Please try again.");
    } finally {
      setIsGeneratingThemes(false);
    }
  }

  async function handleSendChat() {
    const msg = chatInput.trim();
    if (!msg || !llmModelId) return;
    const userMsg: ChatMessage = { role: "user", content: msg };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setIsChatLoading(true);
    try {
      const res = await fetch("/api/mentor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...chatMessages, userMsg],
          currentPrompt: briefMode === "freetext" ? data.rawBrief : `Event: ${data.brief.eventName}\nObjective: ${data.brief.objective}\nAudience: ${data.brief.targetAudience}\nBrand: ${data.brief.brandName}`,
          modelId: llmModelId,
          systemOverride: "You are an expert event concept strategist. Help the user refine their event brief — clarify objectives, sharpen the target audience, strengthen the brand narrative, and identify the right conceptual direction. Ask one clarifying question at a time. Be concise and practical.",
        }),
      });
      const json = await res.json();
      setChatMessages((prev) => [...prev, { role: "assistant", content: json.content ?? "Sorry, I could not respond." }]);
    } catch {
      setChatMessages((prev) => [...prev, { role: "assistant", content: "Error reaching Mentor. Try again." }]);
    } finally {
      setIsChatLoading(false);
    }
  }

  return (
    <div className="flex gap-6">
      {/* Main content */}
      <div className="flex-1 max-w-2xl">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-[var(--foreground)] mb-1">Phase 1 — Brief & Paradigm</h2>
          <p className="text-sm text-[var(--foreground-muted)]">
            Describe your event. The AI will suggest narrative themes based on your inputs.
          </p>
        </div>

        {/* Brief mode toggle */}
        <div className="flex items-center gap-2 mb-5">
          {([
            { mode: "structured" as const, label: "Structured Form", icon: LayoutList },
            { mode: "freetext" as const, label: "Free Text", icon: AlignLeft },
          ]).map(({ mode, label, icon: Icon }) => (
            <button
              key={mode}
              onClick={() => onChange({ briefMode: mode })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150"
              style={{
                background: briefMode === mode ? "var(--accent)" : "var(--surface-2)",
                color: briefMode === mode ? "white" : "var(--foreground-muted)",
                border: briefMode === mode ? "1px solid var(--accent)" : "1px solid var(--border)",
              }}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
          <button
            onClick={() => setChatOpen((v) => !v)}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150"
            style={{
              background: chatOpen ? "rgba(108,99,255,0.12)" : "var(--surface-2)",
              color: chatOpen ? "var(--accent)" : "var(--foreground-muted)",
              border: chatOpen ? "1px solid rgba(108,99,255,0.3)" : "1px solid var(--border)",
            }}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Brief Advisor
          </button>
        </div>

        {/* Brief input */}
        <div className="rounded-2xl border border-[var(--border)] p-6 mb-6" style={{ background: "var(--surface)" }}>
          {briefMode === "freetext" ? (
            <div>
              <p className="text-xs font-bold text-[var(--foreground-subtle)] uppercase tracking-widest mb-3">Free Text Brief</p>
              <p className="text-xs text-[var(--foreground-muted)] mb-3">
                Write your event brief as a paragraph — rough notes, ideas, client quotes, anything goes. The AI will extract themes from it.
              </p>
              <Textarea
                id="raw-brief"
                rows={8}
                placeholder="e.g. We need a grand annual gala for PT Maju Bersama, about 300 guests from the banking sector. The theme should feel prestigious and forward-looking. The venue is at Ritz-Carlton Jakarta, 20x30m ballroom. Client wants to showcase their new digital banking platform and reward top partners..."
                value={data.rawBrief}
                onChange={(e) => onChange({ rawBrief: e.target.value })}
              />
              <p className="text-xs text-[var(--foreground-subtle)] mt-2">{data.rawBrief.length} characters</p>
            </div>
          ) : (
            <div>
              <p className="text-xs font-bold text-[var(--foreground-subtle)] uppercase tracking-widest mb-4">Event Brief</p>
              <div className="space-y-4">
                {BRIEF_FIELDS.map((f) => (
                  <div key={f.key}>
                    <Label htmlFor={f.key}>{f.label}</Label>
                    {f.type === "textarea" ? (
                      <Textarea id={f.key} className="mt-1" rows={f.rows ?? 2} placeholder={f.placeholder}
                        value={data.brief[f.key]} onChange={(e) => updateBrief(f.key, e.target.value)} />
                    ) : (
                      <Input id={f.key} className="mt-1" placeholder={f.placeholder}
                        value={data.brief[f.key]} onChange={(e) => updateBrief(f.key, e.target.value)} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Theme generation */}
        <div className="rounded-2xl border border-[var(--border)] p-6 mb-6" style={{ background: "var(--surface)" }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-bold text-[var(--foreground-subtle)] uppercase tracking-widest">Narrative Theme</p>
              <p className="text-xs text-[var(--foreground-muted)] mt-0.5">AI suggests themes based on your brief</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleGenerateThemes}
              disabled={!canGenerateThemes || isGeneratingThemes} isLoading={isGeneratingThemes}>
              <Sparkles className="h-3.5 w-3.5" />
              {data.suggestedThemes.length > 0 ? "Regenerate" : "Suggest Themes"}
            </Button>
          </div>
          {themeError && (
            <div className="mb-3 p-3 rounded-xl text-sm" style={{ background: "rgba(255,101,132,0.08)", color: "var(--danger)", border: "1px solid rgba(255,101,132,0.2)" }}>
              {themeError}
            </div>
          )}
          {!canGenerateThemes && (
            <p className="text-xs text-[var(--foreground-subtle)]">
              {briefMode === "freetext" ? "Write at least 20 characters in your brief first." : "Fill in Event Name, Objective, Target Audience and Brand Name first."}
            </p>
          )}
          {data.suggestedThemes.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {data.suggestedThemes.map((theme) => (
                <button key={theme} onClick={() => onChange({ selectedTheme: theme })}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-150"
                  style={{
                    background: data.selectedTheme === theme ? "rgba(108,99,255,0.12)" : "var(--surface-2)",
                    color: data.selectedTheme === theme ? "var(--accent)" : "var(--foreground-muted)",
                    border: data.selectedTheme === theme ? "1px solid rgba(108,99,255,0.3)" : "1px solid var(--border)",
                  }}>
                  {data.selectedTheme === theme && <Check className="h-3 w-3" />}
                  {theme}
                </button>
              ))}
            </div>
          )}
          <div className="mt-3">
            <Label htmlFor="custom-theme">Or enter a custom theme</Label>
            <Input id="custom-theme" className="mt-1" placeholder="e.g. The Future is Now"
              value={data.suggestedThemes.includes(data.selectedTheme) ? "" : data.selectedTheme}
              onChange={(e) => onChange({ selectedTheme: e.target.value })} />
          </div>
        </div>

        {/* Paradigm */}
        <div className="rounded-2xl border border-[var(--border)] p-6 mb-6" style={{ background: "var(--surface)" }}>
          <p className="text-xs font-bold text-[var(--foreground-subtle)] uppercase tracking-widest mb-4">Concept Paradigm</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {([
              { value: "full_concept" as ConceptParadigm, label: "Full Concept", subtitle: "Blue Sky Exploration", desc: "No budget constraints. Explore the most impactful, creative vision possible.", icon: Sparkles, color: "rgba(108,99,255," },
              { value: "budget_fit" as ConceptParadigm, label: "Budget Fit", subtitle: "Value-Engineered", desc: "Strictly tied to structural scale and material constraints. Maximise ROI.", icon: DollarSign, color: "rgba(247,151,30," },
            ] as const).map(({ value, label, subtitle, desc, icon: Icon, color }) => {
              const selected = data.paradigm === value;
              return (
                <button key={value} onClick={() => onChange({ paradigm: value })}
                  className="text-left p-4 rounded-xl border transition-all duration-200"
                  style={{ background: selected ? `${color}0.08)` : "var(--surface-2)", borderColor: selected ? `${color}0.4)` : "var(--border)" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}0.12)` }}>
                      <Icon className="h-4 w-4" style={{ color: selected ? `${color}1)` : "var(--foreground-muted)" }} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[var(--foreground)]">{label}</p>
                      <p className="text-xs text-[var(--foreground-subtle)]">{subtitle}</p>
                    </div>
                    {selected && (
                      <div className="ml-auto w-5 h-5 rounded-full flex items-center justify-center" style={{ background: `${color}0.2)` }}>
                        <Check className="h-3 w-3" style={{ color: `${color}1)` }} />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-[var(--foreground-muted)]">{desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={onNext} disabled={!canProceed} variant="gradient" className="h-10 px-6">
            Continue to Infrastructure →
          </Button>
        </div>
      </div>

      {/* Mentor chat panel */}
      {chatOpen && (
        <div className="w-80 flex-shrink-0 flex flex-col rounded-2xl border border-[var(--border)] overflow-hidden" style={{ background: "var(--surface)", height: "fit-content", position: "sticky", top: "1rem" }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
            <div>
              <p className="text-sm font-semibold text-[var(--foreground)]">Brief Advisor</p>
              <p className="text-xs text-[var(--foreground-muted)]">AI concept strategist</p>
            </div>
            <button onClick={() => setChatOpen(false)} className="text-[var(--foreground-subtle)] hover:text-[var(--foreground)]">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3 max-h-[480px]" aria-live="polite">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className="max-w-[90%] rounded-xl px-3 py-2 text-xs leading-relaxed"
                  style={{ background: msg.role === "user" ? "var(--accent)" : "var(--surface-2)", color: msg.role === "user" ? "white" : "var(--foreground)" }}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isChatLoading && (
              <div className="flex justify-start">
                <div className="bg-[var(--surface-2)] rounded-xl px-3 py-2 text-xs text-[var(--foreground-muted)]">Thinking...</div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <div className="p-3 border-t border-[var(--border)]">
            <div className="flex gap-2">
              <Input className="text-xs h-8 flex-1" placeholder="Ask the advisor..."
                value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendChat()}
                disabled={isChatLoading || !llmModelId} />
              <Button size="sm" className="h-8 px-3" onClick={handleSendChat}
                disabled={isChatLoading || !chatInput.trim() || !llmModelId}>→</Button>
            </div>
            {!llmModelId && <p className="text-xs text-[var(--foreground-subtle)] mt-1">No LLM model configured.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
