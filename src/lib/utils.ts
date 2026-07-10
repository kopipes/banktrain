import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Generate a random UUID */
export function generateId(): string {
  return crypto.randomUUID();
}

/** Get current YYYY-MM string */
export function currentMonthYear(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** Format IDR currency */
export function formatIdr(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Format a number with thousands separator */
export function formatNumber(n: number): string {
  return new Intl.NumberFormat("id-ID").format(n);
}

/** Build a full prompt string from hybrid prompt components */
export function buildFullPrompt(parts: {
  subject?: string;
  action?: string;
  environment?: string;
  lighting?: string;
  style?: string;
  colorPalette?: string;
}): string {
  return [
    parts.subject,
    parts.action,
    parts.environment,
    parts.lighting,
    parts.style,
    parts.colorPalette,
  ]
    .filter(Boolean)
    .join(", ");
}

export interface StudioUrlParams {
  subject?: string;
  action?: string;
  environment?: string;
  lighting?: string;
  style?: string;
  colorPalette?: string;
  negativePrompt?: string;
  fullPrompt?: string;
  seed?: string | number;
  cfgScale?: string | number;
  steps?: string | number;
  aspectRatio?: string;
  challengeId?: string;
}

/** Build a canonical /studio URL with pre-filled prompt params */
export function buildStudioUrl(params: StudioUrlParams): string {
  const p = new URLSearchParams();
  const entries: Array<[string, string | number | undefined]> = [
    ["subject", params.subject],
    ["action", params.action],
    ["environment", params.environment],
    ["lighting", params.lighting],
    ["style", params.style],
    ["colorPalette", params.colorPalette],
    ["negativePrompt", params.negativePrompt],
    ["fullPrompt", params.fullPrompt],
    ["seed", params.seed],
    ["cfgScale", params.cfgScale],
    ["steps", params.steps],
    ["aspectRatio", params.aspectRatio],
    ["challenge", params.challengeId],
  ];
  for (const [key, val] of entries) {
    if (val !== undefined && val !== "") p.set(key, String(val));
  }
  return `/studio?${p.toString()}`;
}

/** Extract token usage from various API response shapes */
export function extractTokenUsage(responseData: Record<string, unknown>): {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costIncurred?: number;
} {
  const usage = responseData?.usage as Record<string, unknown> | undefined;
  if (!usage) {
    // Fallback: image generation (no token metadata)
    return { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
  }

  // Together AI shape — has input_tokens / output_tokens instead of prompt_tokens
  if (usage.input_tokens !== undefined) {
    const input = (usage.input_tokens as number) ?? 0;
    const output = (usage.output_tokens as number) ?? 0;
    return {
      promptTokens: input,
      completionTokens: output,
      totalTokens: input + output,
    };
  }

  // OpenAI / OpenAI-compatible shape
  return {
    promptTokens: (usage.prompt_tokens as number) ?? 0,
    completionTokens: (usage.completion_tokens as number) ?? 0,
    totalTokens: (usage.total_tokens as number) ?? 0,
    costIncurred: usage.cost_incurred as number | undefined,
  };
}
