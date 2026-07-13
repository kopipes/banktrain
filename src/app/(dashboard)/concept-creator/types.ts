// ── Shared types for the Concept Creator wizard ───────────────────────────────

export type ConceptParadigm = "full_concept" | "budget_fit";

export type PhaseStatus = "pending" | "active" | "completed" | "locked";

// ── Phase 1: Brief ────────────────────────────────────────────────────────────
export interface EventBrief {
  eventName: string;
  objective: string;
  targetAudience: string;
  brandName: string;
  brandValues: string;
  brandColors: string;
  expectedAttendees: string;
  eventDate: string;
  eventDuration: string;
  additionalNotes: string;
}

export interface Phase1Data {
  brief: EventBrief;
  paradigm: ConceptParadigm | null;
  suggestedThemes: string[];
  selectedTheme: string;
}

// ── Phase 2: Infrastructure ───────────────────────────────────────────────────
export interface VenueSpec {
  venueName: string;
  venueWidth: string;
  venueLength: string;
  venueHeight: string;
  venueType: string;
  loadingDock: boolean;
  powerCapacity: string;
  additionalConstraints: string;
}

export interface EventComponent {
  id: string;
  name: string;
  enabled: boolean;
  area: string; // e.g. "200sqm"
  notes: string;
}

export interface Phase2Data {
  venue: VenueSpec;
  components: EventComponent[];
}

// ── Phase 3: Visuals ──────────────────────────────────────────────────────────
export interface GeneratedVisual {
  type: "blueprint" | "booth" | "stage" | "overall";
  imageUrl: string;
  label: string;
  prompt: string;
  generationId: string;
}

export interface Phase3Data {
  approved: boolean;
  visuals: GeneratedVisual[];
}

// ── Phase 4: Iteration ────────────────────────────────────────────────────────
export interface Annotation {
  visualIndex: number;
  note: string;
  timestamp: string;
}

export interface Phase4Data {
  annotations: Annotation[];
  revisionPrompt: string;
  locked: boolean;
  revisedVisuals: GeneratedVisual[];
}

// ── Phase 5: Deck ─────────────────────────────────────────────────────────────
export interface DeckSlide {
  type:
    | "title"
    | "background"
    | "narrative"
    | "overall_layout"
    | "zone_detail"
    | "budget"
    | "closing";
  title: string;
  body: string;
  imageUrl?: string;
}

export interface Phase5Data {
  narrative: string;
  slides: DeckSlide[];
  generatedAt: string | null;
}

// ── Full session ──────────────────────────────────────────────────────────────
export interface ConceptSession {
  id: string;
  currentPhase: 1 | 2 | 3 | 4 | 5;
  phase1: Phase1Data;
  phase2: Phase2Data;
  phase3: Phase3Data;
  phase4: Phase4Data;
  phase5: Phase5Data;
}

export const DEFAULT_COMPONENTS: EventComponent[] = [
  { id: "main_stage", name: "Main Stage", enabled: true, area: "", notes: "" },
  { id: "registration", name: "Registration Desk", enabled: true, area: "", notes: "" },
  { id: "commercial", name: "Commercial Zone", enabled: false, area: "", notes: "" },
  { id: "vip_lounge", name: "VIP Lounge", enabled: false, area: "", notes: "" },
  { id: "media_center", name: "Media Center", enabled: false, area: "", notes: "" },
  { id: "exhibition", name: "Exhibition Hall", enabled: false, area: "", notes: "" },
  { id: "catering", name: "Catering Area", enabled: false, area: "", notes: "" },
  { id: "backstage", name: "Backstage / Production", enabled: false, area: "", notes: "" },
];

export function createDefaultSession(): ConceptSession {
  return {
    id: crypto.randomUUID(),
    currentPhase: 1,
    phase1: {
      brief: {
        eventName: "",
        objective: "",
        targetAudience: "",
        brandName: "",
        brandValues: "",
        brandColors: "",
        expectedAttendees: "",
        eventDate: "",
        eventDuration: "",
        additionalNotes: "",
      },
      paradigm: null,
      suggestedThemes: [],
      selectedTheme: "",
    },
    phase2: {
      venue: {
        venueName: "",
        venueWidth: "",
        venueLength: "",
        venueHeight: "",
        venueType: "indoor",
        loadingDock: false,
        powerCapacity: "",
        additionalConstraints: "",
      },
      components: DEFAULT_COMPONENTS.map((c) => ({ ...c })),
    },
    phase3: {
      approved: false,
      visuals: [],
    },
    phase4: {
      annotations: [],
      revisionPrompt: "",
      locked: false,
      revisedVisuals: [],
    },
    phase5: {
      narrative: "",
      slides: [],
      generatedAt: null,
    },
  };
}
