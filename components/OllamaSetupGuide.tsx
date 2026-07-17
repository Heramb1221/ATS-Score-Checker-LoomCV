"use client";

import { useState } from "react";

const STEPS = [
  { label: "Install Ollama", command: "curl -fsSL https://ollama.com/install.sh | sh" },
  { label: "Pull the recommended model", command: "ollama pull llama3:8b" },
  { label: "Allow this site to reach it, then start Ollama", command: 'export OLLAMA_ORIGINS="*"\nollama serve' },
];

export function OllamaSetupGuide({ onRetry }: { onRetry: () => void }) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  return (
    <div className="mx-auto max-w-lg rounded-lg border border-line bg-white p-6">
      <h2 className="font-display text-xl text-ink">Set up local AI</h2>
      <p className="mt-1 text-sm text-graphite">
        This tool scores your resume using AI that runs on your own machine — nothing is uploaded to a server for
        analysis. It needs Ollama installed and running once.
      </p>

      <ol className="mt-5 flex flex-col gap-4">
        {STEPS.map((step, i) => (
          <li key={i}>
            <p className="text-sm font-medium text-ink">
              {i + 1}. {step.label}
            </p>
            <div className="mt-1.5 flex items-center justify-between rounded bg-ink px-3 py-2">
              <code className="whitespace-pre-wrap font-mono text-xs text-paper">{step.command}</code>
              <button
                onClick={() => copy(step.command, i)}
                className="ml-3 shrink-0 font-mono text-[10px] uppercase tracking-wide text-paper/70 hover:text-paper"
              >
                {copiedIndex === i ? "Copied" : "Copy"}
              </button>
            </div>
          </li>
        ))}
      </ol>

      <button
        onClick={onRetry}
        className="mt-6 w-full rounded bg-signal py-2.5 text-sm font-medium text-white hover:bg-signal/90"
      >
        Retry connection
      </button>
    </div>
  );
}
