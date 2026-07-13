"use client";

import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { Phase2Data, EventComponent } from "../types";
import { MapPin, CheckSquare, Square } from "lucide-react";

interface Props {
  data: Phase2Data;
  onChange: (data: Partial<Phase2Data>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function Phase2Infrastructure({ data, onChange, onNext, onBack }: Props) {
  const canProceed = data.venue.venueName && data.venue.venueWidth && data.venue.venueLength &&
    data.components.some((c) => c.enabled);

  function updateVenue(key: keyof Phase2Data["venue"], value: string | boolean) {
    onChange({ venue: { ...data.venue, [key]: value } });
  }

  function toggleComponent(id: string) {
    onChange({
      components: data.components.map((c) =>
        c.id === id ? { ...c, enabled: !c.enabled } : c
      ),
    });
  }

  function updateComponent(id: string, key: keyof EventComponent, value: string) {
    onChange({
      components: data.components.map((c) =>
        c.id === id ? { ...c, [key]: value } : c
      ),
    });
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h2 className="text-xl font-bold text-[var(--foreground)] mb-1">Phase 2 — Event Infrastructure</h2>
        <p className="text-sm text-[var(--foreground-muted)]">Define your venue specifications and event components.</p>
      </div>

      {/* Venue specs */}
      <div className="rounded-2xl border border-[var(--border)] p-6 mb-6" style={{ background: "var(--surface)" }}>
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="h-4 w-4 text-[var(--accent)]" />
          <p className="text-xs font-bold text-[var(--foreground-subtle)] uppercase tracking-widest">Venue Specifications</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label htmlFor="venueName">Venue Name *</Label>
            <Input id="venueName" className="mt-1" placeholder="e.g. Jakarta Convention Center" value={data.venue.venueName} onChange={(e) => updateVenue("venueName", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="venueWidth">Width (meters) *</Label>
            <Input id="venueWidth" type="number" className="mt-1" placeholder="e.g. 80" value={data.venue.venueWidth} onChange={(e) => updateVenue("venueWidth", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="venueLength">Length (meters) *</Label>
            <Input id="venueLength" type="number" className="mt-1" placeholder="e.g. 120" value={data.venue.venueLength} onChange={(e) => updateVenue("venueLength", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="venueHeight">Ceiling Height (meters)</Label>
            <Input id="venueHeight" type="number" className="mt-1" placeholder="e.g. 8" value={data.venue.venueHeight} onChange={(e) => updateVenue("venueHeight", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="venueType">Venue Type</Label>
            <Select id="venueType" className="mt-1" value={data.venue.venueType} onChange={(e) => updateVenue("venueType", e.target.value)}>
              <option value="indoor">Indoor</option>
              <option value="outdoor">Outdoor</option>
              <option value="hybrid">Indoor/Outdoor Hybrid</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="powerCapacity">Power Capacity (kVA)</Label>
            <Input id="powerCapacity" className="mt-1" placeholder="e.g. 500" value={data.venue.powerCapacity} onChange={(e) => updateVenue("powerCapacity", e.target.value)} />
          </div>
          <div className="md:col-span-2 flex items-center gap-3">
            <button
              onClick={() => updateVenue("loadingDock", !data.venue.loadingDock)}
              className="flex items-center gap-2 text-sm text-[var(--foreground-muted)]"
            >
              {data.venue.loadingDock
                ? <CheckSquare className="h-4 w-4 text-[var(--accent)]" />
                : <Square className="h-4 w-4" />}
              Loading dock available
            </button>
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="additionalConstraints">Structural Constraints</Label>
            <Textarea id="additionalConstraints" className="mt-1" rows={2} placeholder="e.g. No drilling, max 2T floor load, restricted zones..." value={data.venue.additionalConstraints} onChange={(e) => updateVenue("additionalConstraints", e.target.value)} />
          </div>
        </div>
      </div>

      {/* Event components */}
      <div className="rounded-2xl border border-[var(--border)] p-6 mb-6" style={{ background: "var(--surface)" }}>
        <p className="text-xs font-bold text-[var(--foreground-subtle)] uppercase tracking-widest mb-4">Event Components *</p>
        <p className="text-xs text-[var(--foreground-muted)] mb-4">Select the zones and components your event needs.</p>
        <div className="space-y-3">
          {data.components.map((comp) => (
            <div key={comp.id} className="rounded-xl border transition-all duration-150" style={{ borderColor: comp.enabled ? "rgba(108,99,255,0.25)" : "var(--border)", background: comp.enabled ? "rgba(108,99,255,0.04)" : "var(--surface-2)" }}>
              <div className="flex items-center gap-3 p-3">
                <button onClick={() => toggleComponent(comp.id)} className="flex-shrink-0">
                  {comp.enabled
                    ? <CheckSquare className="h-4 w-4 text-[var(--accent)]" />
                    : <Square className="h-4 w-4 text-[var(--foreground-subtle)]" />}
                </button>
                <span className="text-sm font-medium text-[var(--foreground)] flex-1">{comp.name}</span>
              </div>
              {comp.enabled && (
                <div className="px-3 pb-3 grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Area (sqm)</Label>
                    <Input className="mt-0.5 h-7 text-xs" placeholder="e.g. 200" value={comp.area} onChange={(e) => updateComponent(comp.id, "area", e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Notes</Label>
                    <Input className="mt-0.5 h-7 text-xs" placeholder="Special requirements..." value={comp.notes} onChange={(e) => updateComponent(comp.id, "notes", e.target.value)} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>← Back</Button>
        <Button onClick={onNext} disabled={!canProceed} variant="gradient" className="h-10 px-6">
          Continue to Visuals →
        </Button>
      </div>
    </div>
  );
}
