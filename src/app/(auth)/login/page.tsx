import { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";
import { Sparkles, Wand2, Image, Zap } from "lucide-react";

export const metadata: Metadata = { title: "Login — TrainBank" };

export default function LoginPage() {
  return (
    <div className="min-h-screen flex bg-[var(--background)]">
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #0f0f1a 0%, #1a0f2e 50%, #0f1a1a 100%)"
        }}
      >
        {/* Glow orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-[120px] opacity-20"
          style={{ background: "radial-gradient(circle, #6c63ff, transparent)" }} />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full blur-[100px] opacity-15"
          style={{ background: "radial-gradient(circle, #ff6584, transparent)" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full blur-[80px] opacity-10"
          style={{ background: "radial-gradient(circle, #43e97b, transparent)" }} />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-[#6c63ff] to-[#ff6584] shadow-[0_0_24px_rgba(108,99,255,0.6)]">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">TrainBank</span>
        </div>

        {/* Headline */}
        <div className="relative z-10 space-y-6">
          <div className="space-y-3">
            <h1 className="text-4xl font-bold text-white leading-tight">
              Master AI Image
              <br />
              <span className="gradient-text">Generation.</span>
            </h1>
            <p className="text-[var(--foreground-muted)] text-lg leading-relaxed max-w-sm">
              Your team's structured platform for learning, creating, and tracking AI-generated visuals.
            </p>
          </div>

          {/* Feature pills */}
          <div className="flex flex-col gap-3">
            {[
              { icon: Wand2, label: "Hybrid Prompt Builder", color: "#6c63ff" },
              { icon: Image, label: "Team Image Bank & Feed", color: "#ff6584" },
              { icon: Zap, label: "Real-time Cost Tracking", color: "#43e97b" },
            ].map(({ icon: Icon, label, color }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: `${color}20`, border: `1px solid ${color}40` }}>
                  <Icon className="h-4 w-4" style={{ color }} />
                </div>
                <span className="text-sm text-[var(--foreground-muted)]">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <div className="relative z-10">
          <p className="text-xs text-[var(--foreground-subtle)]">
            Internal platform · Enterprise use only
          </p>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center p-8 relative">
        {/* Subtle bg pattern */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.8) 1px, transparent 0)",
            backgroundSize: "32px 32px"
          }}
        />

        <div className="relative z-10 w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center justify-center gap-3 mb-8">
            <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-[#6c63ff] to-[#ff6584] shadow-[0_0_24px_rgba(108,99,255,0.5)]">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-[var(--foreground)] tracking-tight">TrainBank</span>
          </div>

          <div className="space-y-2 mb-8">
            <h2 className="text-2xl font-bold text-[var(--foreground)]">Welcome back</h2>
            <p className="text-sm text-[var(--foreground-muted)]">
              Sign in to your account to continue
            </p>
          </div>

          {/* Card */}
          <div className="rounded-2xl border border-[var(--border)] p-7 shadow-[var(--shadow-lg)]"
            style={{ background: "var(--surface)" }}>
            <Suspense fallback={<div className="h-40" />}>
              <LoginForm />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
