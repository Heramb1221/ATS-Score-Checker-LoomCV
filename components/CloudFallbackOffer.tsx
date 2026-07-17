"use client";

import { JDInput } from "./JDInput";

interface CloudFallbackOfferProps {
  onUseCloud: (jd: string) => void;
}

/**
 * Shown alongside the Ollama setup guide for premium sessions only — gives
 * them the option to skip local setup entirely and run via the server-side
 * Gemini fallback instead. Free/anonymous visitors never see this, since
 * the underlying API route (app/api/premium/cloud-analyze) rejects
 * non-premium tokens regardless of what the UI shows.
 */
export function CloudFallbackOffer({ onUseCloud }: CloudFallbackOfferProps) {
  return (
    <div className="mt-4 rounded-lg border border-signal/30 bg-signal-soft p-5">
      <p className="font-mono text-xs uppercase tracking-wide text-signal">Premium</p>
      <p className="mt-1 text-sm text-ink">Don&apos;t want to install Ollama? Skip local setup and analyze in the cloud instead.</p>
      <div className="mt-3">
        <JDInput onAnalyze={onUseCloud} />
      </div>
    </div>
  );
}
