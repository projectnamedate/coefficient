"use client";

import { useState } from "react";

interface EmbedPreviewProps {
  pools: { id: string; name: string }[];
}

export function EmbedPreview({ pools }: EmbedPreviewProps) {
  const [selectedPool, setSelectedPool] = useState(pools[0]?.id ?? "");
  const [copied, setCopied] = useState(false);

  const embedUrl = `https://coefficient.mythx.art/api/embed/${selectedPool}`;
  const poolUrl = `https://coefficient.mythx.art/pool/${selectedPool}`;

  const embedCode = `<a href="${poolUrl}" target="_blank" rel="noopener noreferrer">
  <img src="${embedUrl}" alt="Coefficient Score" width="320" height="160" />
</a>`;

  const markdownCode = `[![Coefficient Score](${embedUrl})](${poolUrl})`;

  async function copyToClipboard(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      {/* Pool selector */}
      <div>
        <label className="block text-xs text-beige/40 uppercase tracking-wider mb-2">
          Select Pool
        </label>
        <select
          value={selectedPool}
          onChange={(e) => setSelectedPool(e.target.value)}
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-lavender/40 transition-colors"
        >
          {pools.map((p) => (
            <option key={p.id} value={p.id} className="bg-dark text-white">
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Preview */}
      <div className="gradient-border bg-white/[0.02] rounded-xl p-6 backdrop-blur-sm">
        <h2 className="text-sm font-medium text-beige/50 uppercase tracking-wider mb-4">
          Preview
        </h2>
        <div className="flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={selectedPool}
            src={`/api/embed/${selectedPool}`}
            alt="Coefficient Score Badge"
            width={320}
            height={160}
            className="rounded-xl"
          />
        </div>
      </div>

      {/* HTML embed code */}
      <div className="gradient-border bg-white/[0.02] rounded-xl p-6 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-beige/50 uppercase tracking-wider">
            HTML Embed Code
          </h2>
          <button
            onClick={() => copyToClipboard(embedCode)}
            className="text-xs text-lavender/60 hover:text-lavender transition-colors font-mono"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <pre className="bg-dark-deep rounded-lg p-4 text-xs text-beige/60 font-mono overflow-x-auto whitespace-pre-wrap break-all">
          {embedCode}
        </pre>
      </div>

      {/* Markdown code */}
      <div className="gradient-border bg-white/[0.02] rounded-xl p-6 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-beige/50 uppercase tracking-wider">
            Markdown
          </h2>
          <button
            onClick={() => copyToClipboard(markdownCode)}
            className="text-xs text-lavender/60 hover:text-lavender transition-colors font-mono"
          >
            Copy
          </button>
        </div>
        <pre className="bg-dark-deep rounded-lg p-4 text-xs text-beige/60 font-mono overflow-x-auto">
          {markdownCode}
        </pre>
      </div>
    </div>
  );
}
