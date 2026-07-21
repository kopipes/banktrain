"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Upload, ImageOff, Download, ArrowRight, Loader2, Scissors, RefreshCw } from "lucide-react";
import { buildStudioUrl } from "@/lib/utils";

type ProcessingState = "idle" | "loading-model" | "processing" | "done" | "error";

export function RemoveBgClient() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const handleRemoveBg = async () => {
    if (!originalFile) return;
    setState("loading-model");
    setProgress("Loading AI model…");
    setError("");
    setResultUrl(null);

    try {
      // Dynamic import so the heavy WASM bundle is only loaded on this page
      const { removeBackground } = await import("@imgly/background-removal");

      setState("processing");
      setProgress("Removing background…");

      const resultBlob = await removeBackground(originalFile, {
        progress: (key: string, current: number, total: number) => {
          if (total > 0) {
            const pct = Math.round((current / total) * 100);
            setProgress(`${key === "compute:inference" ? "Running AI" : "Loading"}: ${pct}%`);
          }
        },
        output: { format: "image/png" as const, quality: 1 },
      });

      const url = URL.createObjectURL(resultBlob);
      setResultUrl(url);
      setState("done");
      setProgress("");
    } catch (err) {
      console.error(err);
      setError("Failed to remove background. Try a different image or browser.");
      setState("error");
      setProgress("");
    }
  };

  const handleDownload = () => {
    if (!resultUrl) return;
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = `removed-bg-${originalFile?.name?.replace(/\.[^.]+$/, "") ?? "image"}.png`;
    a.click();
  };

  const handleSendToStudio = () => {
    if (!resultUrl) return;
    router.push(buildStudioUrl({
      inputImageUrl: resultUrl,
      generationType: "image-to-image",
    }));
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

  const isProcessing = state === "loading-model" || state === "processing";

  return (
    <div className="min-h-full" style={{ background: "var(--background)" }}>
      {/* Header */}
      <div
        className="px-8 pt-8 pb-6 border-b"
        style={{
          borderColor: "var(--border)",
          background: "linear-gradient(180deg, var(--surface) 0%, var(--background) 100%)",
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <Scissors className="h-4 w-4" style={{ color: "var(--accent)" }} />
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--foreground-muted)" }}>
            Tools
          </span>
        </div>
        <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--foreground)" }}>
          Remove Background
        </h1>
        <p className="text-sm" style={{ color: "var(--foreground-muted)" }}>
          100% on-device — no uploads, no API cost. Powered by ISNet AI model.
        </p>
      </div>

      <div className="px-8 py-6 max-w-5xl">
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
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: "var(--accent-dim)" }}
            >
              <Upload className="h-8 w-8" style={{ color: "var(--accent)" }} />
            </div>
            <div className="text-center">
              <p className="font-semibold text-sm mb-1" style={{ color: "var(--foreground)" }}>
                Drop an image here or click to upload
              </p>
              <p className="text-xs" style={{ color: "var(--foreground-muted)" }}>
                PNG, JPG, WebP — processed entirely in your browser
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileInput}
            />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Before / After */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Original */}
              <div
                className="rounded-2xl overflow-hidden border"
                style={{ borderColor: "var(--border)", background: "var(--surface)" }}
              >
                <div className="px-4 py-2.5 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--foreground-subtle)" }}>
                    Original
                  </span>
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-all"
                    style={{ color: "var(--foreground-muted)", background: "var(--surface-2)" }}
                  >
                    <RefreshCw className="h-3 w-3" />
                    New image
                  </button>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={originalUrl} alt="Original" className="w-full object-contain max-h-80" />
              </div>

              {/* Result */}
              <div
                className="rounded-2xl overflow-hidden border"
                style={{ borderColor: resultUrl ? "var(--accent)" : "var(--border)", background: "var(--surface)" }}
              >
                <div className="px-4 py-2.5 border-b flex items-center gap-2" style={{ borderColor: "var(--border)" }}>
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--foreground-subtle)" }}>
                    Result
                  </span>
                  {state === "done" && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: "rgba(67,233,123,0.12)", color: "var(--success)" }}>
                      Done
                    </span>
                  )}
                </div>
                {resultUrl ? (
                  /* Checkerboard background to show transparency */
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
                  <div
                    className="flex flex-col items-center justify-center h-64 gap-3"
                    style={{ background: "var(--surface-2)" }}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--accent)" }} />
                        <p className="text-sm" style={{ color: "var(--foreground-muted)" }}>{progress}</p>
                      </>
                    ) : (
                      <>
                        <ImageOff className="h-8 w-8 opacity-30" style={{ color: "var(--foreground-subtle)" }} />
                        <p className="text-sm" style={{ color: "var(--foreground-muted)" }}>
                          Click &ldquo;Remove Background&rdquo; to process
                        </p>
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
                  onClick={handleRemoveBg}
                  disabled={isProcessing}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-60"
                  style={{ background: "var(--accent)", color: "#ffffff" }}
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Scissors className="h-4 w-4" />
                  )}
                  {isProcessing ? progress || "Processing…" : "Remove Background"}
                </button>
              ) : (
                <>
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-80"
                    style={{ background: "var(--accent)", color: "#ffffff" }}
                  >
                    <Download className="h-4 w-4" />
                    Download PNG
                  </button>
                  <button
                    onClick={handleSendToStudio}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-80"
                    style={{ background: "var(--surface-2)", color: "var(--foreground)", border: "1px solid var(--border)" }}
                  >
                    <ArrowRight className="h-4 w-4" />
                    Use in Creator Studio
                  </button>
                  <button
                    onClick={handleRemoveBg}
                    disabled={isProcessing}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-80 disabled:opacity-60"
                    style={{ background: "var(--surface-2)", color: "var(--foreground-muted)", border: "1px solid var(--border)" }}
                  >
                    <RefreshCw className="h-4 w-4" />
                    Retry
                  </button>
                </>
              )}
            </div>

            {/* Info note */}
            <p className="text-xs" style={{ color: "var(--foreground-subtle)" }}>
              First run downloads the AI model (~12MB) and caches it in your browser. Subsequent runs are instant.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
