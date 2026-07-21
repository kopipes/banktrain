"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Upload, ImageOff, Download, ArrowRight, Loader2, Scissors, RefreshCw, Sparkles, BookOpen } from "lucide-react";
import { buildStudioUrl } from "@/lib/utils";

type Tool = "remove-bg" | "gemini-wm" | "notebooklm-wm";
type ProcessingState = "idle" | "loading-model" | "processing" | "done" | "error";

// ── Watermark removal via Canvas API ────────────────────────────────────────
// Gemini: logo bottom-right, size based on image dimensions
// NotebookLM: footer bar at bottom spanning full width, ~40px tall

function detectGeminiWatermark(w: number, h: number): { x: number; y: number; size: number } {
  const size = (w > 1024 && h > 1024) ? 96 : 48;
  const margin = size === 96 ? 64 : 32;
  return { x: w - margin - size, y: h - margin - size, size };
}

function removeGeminiWatermark(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  const { width: w, height: h } = canvas;
  const { x, y, size } = detectGeminiWatermark(w, h);

  // Sample surrounding area to inpaint — use pixels from just outside the watermark region
  // Strategy: fill with averaged pixels from a border band around the watermark
  const pad = Math.round(size * 0.4);
  const srcX = Math.max(0, x - pad);
  const srcY = Math.max(0, y - pad);
  const srcW = Math.min(w - srcX, size + pad * 2);
  const srcH = Math.min(h - srcY, size + pad * 2);

  const srcData = ctx.getImageData(srcX, srcY, srcW, srcH);
  const targetData = ctx.getImageData(x, y, size, size);

  // For each pixel in the watermark area, blend from surrounding non-watermark pixels
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      // Collect neighbor samples from outside the watermark region
      const samples: number[][] = [];

      for (let dy = -pad; dy <= size + pad; dy += 2) {
        for (let dx = -pad; dx <= size + pad; dx += 2) {
          if (dx >= 0 && dx < size && dy >= 0 && dy < size) continue; // skip interior
          const sx = (px + dx - (-pad));
          const sy = (py + dy - (-pad));
          if (sx < 0 || sy < 0 || sx >= srcW || sy >= srcH) continue;
          const i = (sy * srcW + sx) * 4;
          samples.push([srcData.data[i], srcData.data[i + 1], srcData.data[i + 2], srcData.data[i + 3]]);
        }
      }

      if (samples.length === 0) continue;

      // Average neighbors
      const r = samples.reduce((s, c) => s + c[0], 0) / samples.length;
      const g = samples.reduce((s, c) => s + c[1], 0) / samples.length;
      const b = samples.reduce((s, c) => s + c[2], 0) / samples.length;

      const ti = (py * size + px) * 4;
      targetData.data[ti] = Math.round(r);
      targetData.data[ti + 1] = Math.round(g);
      targetData.data[ti + 2] = Math.round(b);
      targetData.data[ti + 3] = 255;
    }
  }

  ctx.putImageData(targetData, x, y);
}

function removeNotebookLMWatermark(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  const { width: w, height: h } = canvas;

  // NotebookLM puts a footer bar: typically last ~5% of height or ~40px, whichever is smaller
  const barH = Math.min(Math.round(h * 0.05), 48);
  const y = h - barH;

  // Sample from just above the bar to fill it
  const refY = Math.max(0, y - barH);
  const refData = ctx.getImageData(0, refY, w, barH);
  const targetData = ctx.getImageData(0, y, w, barH);

  // Copy reference band down, with slight blur
  for (let py = 0; py < barH; py++) {
    for (let px = 0; px < w; px++) {
      const ti = (py * w + px) * 4;
      const ri = (py * w + px) * 4;
      targetData.data[ti] = refData.data[ri];
      targetData.data[ti + 1] = refData.data[ri + 1];
      targetData.data[ti + 2] = refData.data[ri + 2];
      targetData.data[ti + 3] = 255;
    }
  }

  ctx.putImageData(targetData, 0, y);
}

async function processWatermark(file: File, type: "gemini-wm" | "notebooklm-wm"): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);

      if (type === "gemini-wm") removeGeminiWatermark(canvas);
      else removeNotebookLMWatermark(canvas);

      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to export canvas"));
      }, "image/png");
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = url;
  });
}

// ── Tab definitions ──────────────────────────────────────────────────────────

const TABS: { id: Tool; label: string; icon: React.ReactNode; description: string }[] = [
  {
    id: "remove-bg",
    label: "Remove Background",
    icon: <Scissors className="h-4 w-4" />,
    description: "AI-powered background removal. First run downloads ~12MB model, cached after.",
  },
  {
    id: "gemini-wm",
    label: "Gemini Watermark",
    icon: <Sparkles className="h-4 w-4" />,
    description: "Strip the Gemini AI watermark (bottom-right logo) from generated images.",
  },
  {
    id: "notebooklm-wm",
    label: "NotebookLM Watermark",
    icon: <BookOpen className="h-4 w-4" />,
    description: "Remove the NotebookLM footer bar watermark from exported images.",
  },
];

// ── Main component ───────────────────────────────────────────────────────────

export function RemoveBgClient() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTool, setActiveTool] = useState<Tool>("remove-bg");
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [state, setState] = useState<ProcessingState>("idle");
  const [progress, setProgress] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [dragging, setDragging] = useState(false);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }
    setError("");
    setResultUrl(null);
    setOriginalFile(file);
    const url = URL.createObjectURL(file);
    setOriginalUrl(url);
    setState("idle");
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleProcess = async () => {
    if (!originalFile) return;
    setState(activeTool === "remove-bg" ? "loading-model" : "processing");
    setProgress(activeTool === "remove-bg" ? "Loading AI model…" : "Processing…");
    setError("");
    setResultUrl(null);

    try {
      let resultBlob: Blob;

      if (activeTool === "remove-bg") {
        const { removeBackground } = await import("@imgly/background-removal");
        setState("processing");
        setProgress("Removing background…");
        resultBlob = await removeBackground(originalFile, {
          progress: (key: string, current: number, total: number) => {
            if (total > 0) {
              const pct = Math.round((current / total) * 100);
              setProgress(`${key === "compute:inference" ? "Running AI" : "Loading"}: ${pct}%`);
            }
          },
          output: { format: "image/png" as const, quality: 1 },
        });
      } else {
        resultBlob = await processWatermark(originalFile, activeTool);
      }

      const url = URL.createObjectURL(resultBlob);
      setResultUrl(url);
      setState("done");
      setProgress("");
    } catch (err) {
      console.error(err);
      setError("Processing failed. Try a different image or browser.");
      setState("error");
      setProgress("");
    }
  };

  const handleDownload = () => {
    if (!resultUrl) return;
    const suffix = activeTool === "remove-bg" ? "no-bg" : activeTool === "gemini-wm" ? "no-gemini-wm" : "no-notebooklm-wm";
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = `${originalFile?.name?.replace(/\.[^.]+$/, "") ?? "image"}-${suffix}.png`;
    a.click();
  };

  const handleSendToStudio = () => {
    if (!resultUrl) return;
    router.push(buildStudioUrl({ inputImageUrl: resultUrl, generationType: "image-to-image" }));
  };

  const handleReset = () => {
    setOriginalUrl(null);
    setOriginalFile(null);
    setResultUrl(null);
    setState("idle");
    setProgress("");
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleTabChange = (tool: Tool) => {
    setActiveTool(tool);
    setResultUrl(null);
    setState("idle");
    setProgress("");
    setError("");
  };

  const isProcessing = state === "loading-model" || state === "processing";
  const activeDef = TABS.find((t) => t.id === activeTool)!;

  const getButtonLabel = () => {
    if (isProcessing) return progress || "Processing…";
    if (activeTool === "remove-bg") return "Remove Background";
    if (activeTool === "gemini-wm") return "Remove Gemini Watermark";
    return "Remove NotebookLM Watermark";
  };

  return (
    <div className="min-h-full" style={{ background: "var(--background)" }}>
      {/* Header */}
      <div
        className="px-8 pt-8 pb-6 border-b"
        style={{ borderColor: "var(--border)", background: "linear-gradient(180deg, var(--surface) 0%, var(--background) 100%)" }}
      >
        <div className="flex items-center gap-2 mb-1">
          <Scissors className="h-4 w-4" style={{ color: "var(--accent)" }} />
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--foreground-muted)" }}>Tools</span>
        </div>
        <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--foreground)" }}>Image Tools</h1>
        <p className="text-sm" style={{ color: "var(--foreground-muted)" }}>
          100% on-device — no uploads, no API cost.
        </p>
      </div>

      <div className="px-8 py-6 max-w-5xl">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit" style={{ background: "var(--surface-2)" }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                background: activeTool === tab.id ? "var(--surface)" : "transparent",
                color: activeTool === tab.id ? "var(--foreground)" : "var(--foreground-muted)",
                boxShadow: activeTool === tab.id ? "var(--shadow)" : "none",
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tool description */}
        <p className="text-sm mb-5" style={{ color: "var(--foreground-muted)" }}>{activeDef.description}</p>

        {/* Upload area */}
        {!originalUrl ? (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="rounded-2xl border-2 border-dashed cursor-pointer transition-all flex flex-col items-center justify-center py-20 gap-4"
            style={{
              borderColor: dragging ? "var(--accent)" : "var(--border)",
              background: dragging ? "var(--accent-dim)" : "var(--surface)",
            }}
          >
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "var(--accent-dim)" }}>
              <Upload className="h-8 w-8" style={{ color: "var(--accent)" }} />
            </div>
            <div className="text-center">
              <p className="font-semibold text-sm mb-1" style={{ color: "var(--foreground)" }}>Drop an image here or click to upload</p>
              <p className="text-xs" style={{ color: "var(--foreground-muted)" }}>PNG, JPG, WebP — processed entirely in your browser</p>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileInput} />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Before / After */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Original */}
              <div className="rounded-2xl overflow-hidden border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                <div className="px-4 py-2.5 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--foreground-subtle)" }}>Original</span>
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg"
                    style={{ color: "var(--foreground-muted)", background: "var(--surface-2)" }}
                  >
                    <RefreshCw className="h-3 w-3" /> New image
                  </button>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={originalUrl} alt="Original" className="w-full object-contain max-h-80" />
              </div>

              {/* Result */}
              <div className="rounded-2xl overflow-hidden border" style={{ borderColor: resultUrl ? "var(--accent)" : "var(--border)", background: "var(--surface)" }}>
                <div className="px-4 py-2.5 border-b flex items-center gap-2" style={{ borderColor: "var(--border)" }}>
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--foreground-subtle)" }}>Result</span>
                  {state === "done" && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: "rgba(67,233,123,0.12)", color: "var(--success)" }}>Done</span>
                  )}
                </div>
                {resultUrl ? (
                  <div
                    className="flex items-center justify-center max-h-80 overflow-hidden"
                    style={{
                      backgroundImage: "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)",
                      backgroundSize: "16px 16px",
                      backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0",
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={resultUrl} alt="Result" className="w-full object-contain max-h-80" />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 gap-3" style={{ background: "var(--surface-2)" }}>
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--accent)" }} />
                        <p className="text-sm" style={{ color: "var(--foreground-muted)" }}>{progress}</p>
                      </>
                    ) : (
                      <>
                        <ImageOff className="h-8 w-8 opacity-30" style={{ color: "var(--foreground-subtle)" }} />
                        <p className="text-sm" style={{ color: "var(--foreground-muted)" }}>Click the button below to process</p>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-xl px-4 py-3 text-sm" style={{ background: "rgba(220,38,38,0.08)", color: "var(--danger)", border: "1px solid rgba(220,38,38,0.2)" }}>
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              {!resultUrl ? (
                <button
                  onClick={handleProcess}
                  disabled={isProcessing}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-60"
                  style={{ background: "var(--accent)", color: "#ffffff" }}
                >
                  {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : activeDef.icon}
                  {getButtonLabel()}
                </button>
              ) : (
                <>
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-80"
                    style={{ background: "var(--accent)", color: "#ffffff" }}
                  >
                    <Download className="h-4 w-4" /> Download PNG
                  </button>
                  <button
                    onClick={handleSendToStudio}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-80"
                    style={{ background: "var(--surface-2)", color: "var(--foreground)", border: "1px solid var(--border)" }}
                  >
                    <ArrowRight className="h-4 w-4" /> Use in Creator Studio
                  </button>
                  <button
                    onClick={handleProcess}
                    disabled={isProcessing}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-80 disabled:opacity-60"
                    style={{ background: "var(--surface-2)", color: "var(--foreground-muted)", border: "1px solid var(--border)" }}
                  >
                    <RefreshCw className="h-4 w-4" /> Retry
                  </button>
                </>
              )}
            </div>

            {activeTool === "remove-bg" && (
              <p className="text-xs" style={{ color: "var(--foreground-subtle)" }}>
                First run downloads the AI model (~12MB) and caches it in your browser. Subsequent runs are instant.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
