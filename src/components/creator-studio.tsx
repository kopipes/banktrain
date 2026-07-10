"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buildFullPrompt, formatIdr } from "@/lib/utils";
import type { AiModel } from "@/db/schema";
import {
  Wand2, RefreshCw, BookmarkPlus, Globe, Copy,
  MessageSquare, X, ChevronDown, ChevronUp, Info, Upload, ImageIcon,
} from "lucide-react";

interface CreatorStudioProps {
  userId: string;
  userName: string;
  division: string;
  imageModels: AiModel[];
  llmModels: AiModel[];
  initialInputImageUrl?: string;
  initialGenerationType?: "text-to-image" | "image-to-image";
}

interface GenerationResult {
  id: string;
  imageUrl: string;
  fullPrompt: string;
  seed: number;
  cfgScale: number;
  steps: number;
  aspectRatio: string;
  totalTokens: number;
  costIdr: number;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const ASPECT_RATIOS = ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"];
const STYLE_PRESETS = [
  "photorealistic", "cinematic", "anime", "digital art", "oil painting",
  "watercolor", "sketch", "3D render", "flat design", "concept art",
];
const LIGHTING_PRESETS = [
  "natural light", "golden hour", "studio lighting", "dramatic lighting",
  "soft diffused light", "neon light", "backlight", "low key", "high key",
];

// Lightweight markdown renderer for chat messages
// Handles: headings, bold, italic, inline code, code blocks, bullet lists, numbered lists, hr
function MarkdownMessage({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <pre key={i} className="bg-gray-900 text-green-300 rounded p-2 my-1.5 overflow-x-auto text-[10px] leading-relaxed">
          {lang && <span className="text-gray-500 text-[9px] block mb-1">{lang}</span>}
          <code>{codeLines.join("\n")}</code>
        </pre>
      );
      i++;
      continue;
    }

    // Heading h1/h2/h3
    if (line.startsWith("### ")) {
      elements.push(<p key={i} className="font-semibold text-gray-800 mt-2 mb-0.5">{inlineFormat(line.slice(4))}</p>);
    } else if (line.startsWith("## ")) {
      elements.push(<p key={i} className="font-bold text-gray-900 mt-2 mb-0.5">{inlineFormat(line.slice(3))}</p>);
    } else if (line.startsWith("# ")) {
      elements.push(<p key={i} className="font-bold text-gray-900 mt-2 mb-1 text-sm">{inlineFormat(line.slice(2))}</p>);
    }
    // Horizontal rule
    else if (/^---+$/.test(line.trim())) {
      elements.push(<hr key={i} className="border-gray-200 my-2" />);
    }
    // Bullet list
    else if (/^[-*+] /.test(line)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^[-*+] /.test(lines[i])) {
        items.push(<li key={i}>{inlineFormat(lines[i].replace(/^[-*+] /, ""))}</li>);
        i++;
      }
      elements.push(<ul key={`ul-${i}`} className="list-disc list-inside space-y-0.5 my-1 pl-1">{items}</ul>);
      continue;
    }
    // Numbered list
    else if (/^\d+\. /.test(line)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(<li key={i}>{inlineFormat(lines[i].replace(/^\d+\. /, ""))}</li>);
        i++;
      }
      elements.push(<ol key={`ol-${i}`} className="list-decimal list-inside space-y-0.5 my-1 pl-1">{items}</ol>);
      continue;
    }
    // Empty line — small gap
    else if (line.trim() === "") {
      elements.push(<div key={i} className="h-1" />);
    }
    // Normal paragraph
    else {
      elements.push(<p key={i} className="leading-relaxed">{inlineFormat(line)}</p>);
    }

    i++;
  }

  return <div className="space-y-0.5">{elements}</div>;
}

// Inline formatting: **bold**, *italic*, `code`
function inlineFormat(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`)/g;
  let last = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    if (match[2] !== undefined) {
      parts.push(<strong key={match.index}>{match[2]}</strong>);
    } else if (match[3] !== undefined) {
      parts.push(<em key={match.index}>{match[3]}</em>);
    } else if (match[4] !== undefined) {
      parts.push(<code key={match.index} className="bg-gray-200 text-gray-800 rounded px-1 font-mono text-[10px]">{match[4]}</code>);
    }
    last = match.index + match[0].length;
  }

  if (last < text.length) parts.push(text.slice(last));
  return parts.length === 1 ? parts[0] : parts;
}

export function CreatorStudio({
  userId, userName, division, imageModels, llmModels,
  initialInputImageUrl, initialGenerationType,
}: CreatorStudioProps) {
  // Hybrid prompt fields
  const [subject, setSubject] = useState("");
  const [action, setAction] = useState("");
  const [environment, setEnvironment] = useState("");
  const [lighting, setLighting] = useState("");
  const [style, setStyle] = useState("");
  const [colorPalette, setColorPalette] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [fullPromptOverride, setFullPromptOverride] = useState("");
  const [useFullPrompt, setUseFullPrompt] = useState(false);

  // Parameters
  const [seed, setSeed] = useState<number>(-1);
  const [cfgScale, setCfgScale] = useState(7);
  const [steps, setSteps] = useState(30);
  const [aspectRatio, setAspectRatio] = useState("1:1");

  // Auto-select the best model for the initial generation type
  // For image-to-image, prefer a model whose modelId contains image-to-image/edit/remix/kontext
  const defaultImageModel = (() => {
    if (initialGenerationType === "image-to-image") {
      const img2imgModel = imageModels.find((m) =>
        m.provider === "kie.ai" && (
          m.modelId.includes("image-to-image") ||
          m.modelId.includes("edit") ||
          m.modelId.includes("remix") ||
          m.modelId.includes("kontext")
        )
      );
      if (img2imgModel) return img2imgModel.id;
    }
    return imageModels.find((m) => m.isDefault)?.id ?? imageModels[0]?.id ?? "";
  })();

  const [selectedImageModel, setSelectedImageModel] = useState(defaultImageModel);
  const [selectedLlmModel, setSelectedLlmModel] = useState(
    llmModels.find((m) => m.isDefault)?.id ?? llmModels[0]?.id ?? ""
  );

  // Generation type + image-to-image input
  const [generationType, setGenerationType] = useState<"text-to-image" | "image-to-image">(
    initialGenerationType ?? "text-to-image"
  );
  const [inputImageUrl, setInputImageUrl] = useState<string>(initialInputImageUrl ?? "");
  const [inputImagePreview, setInputImagePreview] = useState<string>(initialInputImageUrl ?? "");
  const imageInputRef = useRef<HTMLInputElement>(null);

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setInputImageUrl(dataUrl);
      setInputImagePreview(dataUrl);
    };
    reader.readAsDataURL(file);
  }

  // State
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState("");
  const [showXray, setShowXray] = useState(false);
  const [isPublic, setIsPublic] = useState(false);

  // AI Mentor chat
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm your Creative Director AI. Ask me anything about prompting, styles, or techniques — or share your current prompt and I'll help you improve it.",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const computedPrompt = useFullPrompt
    ? fullPromptOverride
    : buildFullPrompt({ subject, action, environment, lighting, style, colorPalette });

  const selectedModel = imageModels.find((m) => m.id === selectedImageModel);
  const estimatedCost = selectedModel?.pricePerImage ?? 0;

  // Derive supported generation types from the model's modelId and provider
  // kie.ai encodes the type in the model ID (e.g. "gpt-image-2-image-to-image")
  // For OpenAI-compatible models, only text-to-image is supported
  const supportsImageToImage = selectedModel
    ? selectedModel.provider === "kie.ai"
      ? selectedModel.modelId.includes("image-to-image") ||
        selectedModel.modelId.includes("edit") ||
        selectedModel.modelId.includes("remix") ||
        selectedModel.modelId.includes("kontext")
      : false
    : false;

  // If model changes and no longer supports current generation type, reset to text-to-image
  useEffect(() => {
    if (!supportsImageToImage && generationType === "image-to-image") {
      setGenerationType("text-to-image");
      setInputImageUrl("");
      setInputImagePreview("");
    }
  }, [selectedImageModel, supportsImageToImage, generationType]);

  async function handleGenerate() {
    if (!computedPrompt.trim()) {
      setError("Please fill in at least the subject field.");
      return;
    }
    if (!selectedImageModel) {
      setError("No image model selected. Ask your admin to add one.");
      return;
    }
    setIsGenerating(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject, action, environment, lighting, style, colorPalette,
          negativePrompt, fullPrompt: computedPrompt,
          seed: seed === -1 ? undefined : seed,
          cfgScale, steps, aspectRatio,
          modelId: selectedImageModel,
          isPublic,
          generationType,
          inputImageUrl: generationType === "image-to-image" ? inputImageUrl : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Generation failed."); return; }
      setResult(data);
      setSeed(data.seed);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleSaveToLibrary() {
    if (!result) return;
    const title = prompt("Enter a title for this prompt:");
    if (!title) return;
    await fetch("/api/library", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        generationId: result.id, title,
        fullPrompt: result.fullPrompt, negativePrompt, style,
        cfgScale: result.cfgScale, steps: result.steps,
        aspectRatio: result.aspectRatio, imageUrl: result.imageUrl,
      }),
    });
    alert("Saved to library!");
  }

  async function handleSendChat() {
    const msg = chatInput.trim();
    if (!msg || !selectedLlmModel) return;
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
          currentPrompt: computedPrompt,
          modelId: selectedLlmModel,
        }),
      });
      const data = await res.json();
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.content ?? "Sorry, I could not respond." },
      ]);
    } catch {
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Error reaching AI Mentor. Try again." },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  }

  function handleCopyPrompt() {
    navigator.clipboard.writeText(computedPrompt);
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Left: Controls ─────────────────────────────────────────────── */}
      <div className="w-96 flex-shrink-0 overflow-y-auto border-r border-gray-200 bg-white p-6">
        <h1 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Wand2 className="h-5 w-5 text-indigo-600" />
          Creator Studio
        </h1>

        {/* Model */}
        <div className="mb-4">
          <Label htmlFor="image-model">Image Model</Label>
          <Select
            id="image-model"
            className="mt-1"
            value={selectedImageModel}
            onChange={(e) => setSelectedImageModel(e.target.value)}
          >
            {imageModels.length === 0 && <option value="">No models configured</option>}
            {imageModels.map((m) => (
              <option key={m.id} value={m.id}>{m.name} ({m.provider})</option>
            ))}
          </Select>
        </div>

        {/* Generation Type — only shown when model supports image-to-image */}
        {supportsImageToImage && (
          <div className="mb-4">
            <Label>Generation Type</Label>
            <div className="flex gap-2 mt-1">
              {(["text-to-image", "image-to-image"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    setGenerationType(type);
                    if (type === "text-to-image") {
                      setInputImageUrl("");
                      setInputImagePreview("");
                    }
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                    generationType === type
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"
                  }`}
                >
                  {type === "text-to-image" ? <Wand2 className="h-3.5 w-3.5" /> : <ImageIcon className="h-3.5 w-3.5" />}
                  {type === "text-to-image" ? "Text to Image" : "Image to Image"}
                </button>
              ))}
            </div>
          </div>
        )}
        {/* Image upload — only for image-to-image */}
        {generationType === "image-to-image" && (
          <div className="mb-4">
            <Label>Input Image</Label>
            <div className="mt-1">
              {inputImagePreview ? (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={inputImagePreview}
                    alt="Input"
                    className="w-full h-40 object-cover rounded-lg border border-gray-200"
                  />
                  <button
                    onClick={() => { setInputImageUrl(""); setInputImagePreview(""); }}
                    className="absolute top-1.5 right-1.5 bg-white rounded-full p-0.5 shadow hover:bg-red-50"
                    aria-label="Remove image"
                  >
                    <X className="h-3.5 w-3.5 text-gray-600" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="w-full h-32 border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-indigo-300 hover:text-indigo-400 transition-colors"
                >
                  <Upload className="h-5 w-5" />
                  <span className="text-sm">Click to upload image</span>
                  <span className="text-xs">PNG, JPG, WEBP up to 30MB</span>
                </button>
              )}
              <input
                ref={imageInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleImageUpload}
              />
            </div>
          </div>
        )}

        {/* Prompt mode */}
        <div className="flex items-center gap-2 mb-4">
          {["Hybrid Builder", "Free Text"].map((label, i) => (
            <button
              key={label}
              onClick={() => setUseFullPrompt(i === 1)}
              className={`text-sm px-3 py-1 rounded-full ${
                useFullPrompt === (i === 1)
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {useFullPrompt ? (
          <div className="mb-4">
            <Label htmlFor="full-prompt">Prompt</Label>
            <Textarea
              id="full-prompt"
              className="mt-1"
              rows={5}
              placeholder="Describe your image in detail..."
              value={fullPromptOverride}
              onChange={(e) => setFullPromptOverride(e.target.value)}
            />
          </div>
        ) : (
          <div className="space-y-3 mb-4">
            {[
              { id: "subject", label: "Subject *", placeholder: "e.g. a young woman, a futuristic city", val: subject, set: setSubject },
              { id: "action", label: "Action / Pose", placeholder: "e.g. walking in rain, sitting at a cafe", val: action, set: setAction },
              { id: "environment", label: "Environment / Background", placeholder: "e.g. Tokyo alley, forest at dusk", val: environment, set: setEnvironment },
              { id: "color", label: "Color Palette", placeholder: "e.g. warm earth tones, muted pastels", val: colorPalette, set: setColorPalette },
            ].map((f) => (
              <div key={f.id}>
                <Label htmlFor={f.id}>{f.label}</Label>
                <Input id={f.id} className="mt-1" placeholder={f.placeholder} value={f.val} onChange={(e) => f.set(e.target.value)} />
              </div>
            ))}
            <div>
              <Label htmlFor="lighting">Lighting</Label>
              <Select id="lighting" className="mt-1" value={lighting} onChange={(e) => setLighting(e.target.value)}>
                <option value="">Select lighting...</option>
                {LIGHTING_PRESETS.map((l) => <option key={l} value={l}>{l}</option>)}
              </Select>
            </div>
            <div>
              <Label htmlFor="style">Style</Label>
              <Select id="style" className="mt-1" value={style} onChange={(e) => setStyle(e.target.value)}>
                <option value="">Select style...</option>
                {STYLE_PRESETS.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
            </div>
          </div>
        )}

        {/* Negative prompt */}
        <div className="mb-4">
          <Label htmlFor="negative">Negative Prompt</Label>
          <Textarea
            id="negative"
            className="mt-1"
            rows={2}
            placeholder="e.g. blurry, low quality, extra limbs..."
            value={negativePrompt}
            onChange={(e) => setNegativePrompt(e.target.value)}
          />
        </div>

        {/* Prompt preview */}
        {computedPrompt && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-500">Assembled Prompt</span>
              <button onClick={handleCopyPrompt} className="text-gray-400 hover:text-gray-600" aria-label="Copy prompt">
                <Copy className="h-3 w-3" />
              </button>
            </div>
            <p className="text-xs text-gray-700 font-mono leading-relaxed">{computedPrompt}</p>
          </div>
        )}

        {/* Advanced toggle */}
        <button
          onClick={() => setShowXray(!showXray)}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3"
        >
          {showXray ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          Advanced Parameters (X-Ray)
        </button>

        {showXray && (
          <div className="space-y-3 mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div>
              <Label htmlFor="aspect">Aspect Ratio</Label>
              <Select id="aspect" className="mt-1" value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)}>
                {ASPECT_RATIOS.map((r) => <option key={r} value={r}>{r}</option>)}
              </Select>
            </div>
            <div>
              <div className="flex justify-between">
                <Label htmlFor="cfg">CFG Scale</Label>
                <span className="text-xs text-gray-500">{cfgScale}</span>
              </div>
              <input id="cfg" type="range" min={1} max={20} step={0.5} value={cfgScale}
                onChange={(e) => setCfgScale(Number(e.target.value))} className="w-full mt-1" />
            </div>
            <div>
              <div className="flex justify-between">
                <Label htmlFor="steps-range">Steps</Label>
                <span className="text-xs text-gray-500">{steps}</span>
              </div>
              <input id="steps-range" type="range" min={10} max={150} step={5} value={steps}
                onChange={(e) => setSteps(Number(e.target.value))} className="w-full mt-1" />
            </div>
            <div>
              <Label htmlFor="seed">Seed (-1 = random)</Label>
              <Input id="seed" type="number" className="mt-1" value={seed}
                onChange={(e) => setSeed(Number(e.target.value))} />
            </div>
          </div>
        )}

        {/* Public toggle */}
        <div className="flex items-center gap-2 mb-4">
          <input type="checkbox" id="is-public" checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)} className="rounded border-gray-300" />
          <Label htmlFor="is-public" className="cursor-pointer">Share to Global Feed</Label>
          <Globe className="h-3 w-3 text-gray-400" />
        </div>

        {/* Cost estimate */}
        {estimatedCost > 0 && (
          <div className="flex items-center gap-1 text-xs text-gray-500 mb-4">
            <Info className="h-3 w-3" />
            Estimated cost: {formatIdr(estimatedCost)}
          </div>
        )}

        {error && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700" role="alert">
            {error}
          </div>
        )}

        <Button
          className="w-full"
          onClick={handleGenerate}
          isLoading={isGenerating}
          disabled={!computedPrompt.trim() || imageModels.length === 0}
        >
          <Wand2 className="h-4 w-4" />
          {isGenerating ? "Generating..." : "Generate"}
        </Button>
      </div>

      {/* ── Center: Result ──────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto bg-gray-50 p-8">
        {!result && !isGenerating && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-gray-400">
              <Wand2 className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">Your generation will appear here</p>
              <p className="text-sm mt-1">Fill in the fields on the left and click Generate</p>
            </div>
          </div>
        )}

        {isGenerating && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-gray-500">
              <RefreshCw className="h-10 w-10 mx-auto mb-4 animate-spin text-indigo-500" />
              <p className="text-sm">Generating your image...</p>
            </div>
          </div>
        )}

        {result && !isGenerating && (
          <div className="max-w-2xl mx-auto">
            <div className="rounded-2xl overflow-hidden shadow-lg mb-4 bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={result.imageUrl} alt={result.fullPrompt} className="w-full object-contain" />
            </div>

            {/* X-Ray card */}
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Info className="h-4 w-4 text-indigo-500" />
                  Generation Parameters (X-Ray)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    ["Seed", result.seed],
                    ["CFG Scale", result.cfgScale],
                    ["Steps", result.steps],
                    ["Ratio", result.aspectRatio],
                    ["Tokens", result.totalTokens],
                    ["Cost", formatIdr(result.costIdr)],
                  ].map(([label, val]) => (
                    <div key={String(label)}>
                      <span className="text-gray-500">{label}:</span>{" "}
                      <span className="font-mono">{String(val)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3">
                  <span className="text-gray-500 text-xs">Full prompt:</span>
                  <p className="text-xs font-mono mt-1 text-gray-700 bg-gray-50 p-2 rounded">
                    {result.fullPrompt}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleGenerate}>
                <RefreshCw className="h-3 w-3" /> Regenerate
              </Button>
              <Button variant="outline" size="sm" onClick={handleSaveToLibrary}>
                <BookmarkPlus className="h-3 w-3" /> Save to Library
              </Button>
              <Button variant="outline" size="sm" onClick={handleCopyPrompt}>
                <Copy className="h-3 w-3" /> Copy Prompt
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Right: AI Mentor Chat ───────────────────────────────────────── */}
      <div
        className={`flex flex-col border-l border-gray-200 bg-white transition-all duration-300 ${
          chatOpen ? "w-80" : "w-12"
        }`}
      >
        <button
          onClick={() => setChatOpen(!chatOpen)}
          className="flex items-center justify-center h-12 border-b border-gray-200 hover:bg-gray-50 transition-colors"
          aria-label={chatOpen ? "Close AI Mentor" : "Open AI Mentor"}
        >
          {chatOpen ? <X className="h-4 w-4 text-gray-600" /> : <MessageSquare className="h-4 w-4 text-indigo-600" />}
        </button>

        {chatOpen && (
          <>
            <div className="px-3 py-2 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-700">AI Mentor</p>
              <p className="text-xs text-gray-400">Creative Director</p>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3" aria-live="polite" aria-label="Chat messages">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
                      msg.role === "user" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {msg.role === "assistant"
                      ? <MarkdownMessage content={msg.content} />
                      : msg.content}
                  </div>
                </div>
              ))}
              {isChatLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg px-3 py-2 text-xs text-gray-500">Thinking...</div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="p-3 border-t border-gray-100">
              <div className="flex gap-2">
                <Input
                  className="text-xs h-8"
                  placeholder="Ask the mentor..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendChat()}
                  disabled={isChatLoading || !selectedLlmModel}
                />
                <Button size="sm" onClick={handleSendChat} disabled={isChatLoading || !chatInput.trim()}>
                  →
                </Button>
              </div>
              {!selectedLlmModel && (
                <p className="text-xs text-gray-400 mt-1">No LLM model configured.</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
