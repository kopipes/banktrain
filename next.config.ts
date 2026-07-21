import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [
      {
        // Scope COOP/COEP to /remove-bg only — required for SharedArrayBuffer (WASM)
        source: "/remove-bg",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
        ],
      },
    ];
  },
};

export default nextConfig;
