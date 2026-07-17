"use client";

interface ModelSelectorProps {
  availableModels: string[];
  selectedModel: string;
  onChange: (model: string) => void;
}

/**
 * Only renders once we know what's actually pulled locally (availableModels
 * comes from the /api/tags probe in lib/ollama-client.ts) — no point
 * offering a model the visitor doesn't have.
 */
export function ModelSelector({ availableModels, selectedModel, onChange }: ModelSelectorProps) {
  if (availableModels.length <= 1) return null;

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="model-select" className="font-mono text-xs uppercase tracking-wide text-graphite">
        Model
      </label>
      <select
        id="model-select"
        value={selectedModel}
        onChange={(e) => onChange(e.target.value)}
        className="rounded border border-line bg-white px-2 py-1 font-mono text-xs text-ink focus:border-signal focus:outline-none"
      >
        {availableModels.map((model) => (
          <option key={model} value={model}>
            {model}
          </option>
        ))}
      </select>
    </div>
  );
}
