"use client";

import { useState } from "react";

const MIN_CHARS = 100;

export function JDInput({ onAnalyze, disabled }: { onAnalyze: (jd: string) => void; disabled?: boolean }) {
  const [jd, setJd] = useState("");
  const ready = jd.trim().length >= MIN_CHARS;

  return (
    <div className="flex flex-col gap-3">
      <label className="font-mono text-xs uppercase tracking-wide text-graphite">
        Paste the job description you&apos;re targeting
      </label>
      <textarea
        value={jd}
        onChange={(e) => setJd(e.target.value)}
        placeholder="Paste the full job description here…"
        className="h-56 w-full resize-none rounded border border-line bg-white p-3 text-sm leading-relaxed text-ink focus:border-signal focus:outline-none"
      />
      <div className="flex items-center justify-between">
        <span className={`font-mono text-xs ${ready ? "text-match-strong" : "text-graphite"}`}>
          {jd.trim().length} / {MIN_CHARS} min characters
        </span>
        <button
          onClick={() => onAnalyze(jd)}
          disabled={!ready || disabled}
          className="rounded bg-signal px-5 py-2 text-sm font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40 hover:bg-signal/90"
        >
          Analyze
        </button>
      </div>
    </div>
  );
}
