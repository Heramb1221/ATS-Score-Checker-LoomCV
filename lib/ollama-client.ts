import { buildAtsPrompt } from "./prompt";
import { parseAtsResult, type AtsResult } from "./schema";
import { logEvent } from "./telemetry";

const OLLAMA_URL = process.env.NEXT_PUBLIC_OLLAMA_URL || "http://localhost:11434";
const DEFAULT_MODEL = process.env.NEXT_PUBLIC_OLLAMA_MODEL || "llama3:8b";
const TIMEOUT_MS = 120_000; // hard client-side timeout per NFRs

export class OllamaUnreachableError extends Error {}
export class OllamaTimeoutError extends Error {}
export class OllamaSchemaError extends Error {}

/** Lightweight probe run on page load / drawer open, per Phase 2 task 9. */
export async function checkOllamaConnection(): Promise<{ connected: boolean; models: string[] }> {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return { connected: false, models: [] };
    const data = await res.json();
    const models: string[] = (data.models || []).map((m: { name: string }) => m.name);
    if (models.length === 0) logEvent("ollama_unreachable", { message: "connected but no models pulled" });
    return { connected: true, models };
  } catch {
    logEvent("ollama_unreachable");
    return { connected: false, models: [] };
  }
}

async function callOllamaOnce(prompt: string, model: string, signal: AbortSignal): Promise<string> {
  const res = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      prompt,
      format: "json", // Ollama's structured-output constraint, see Phase 1
      stream: false,
      options: { temperature: 0.2 },
    }),
    signal,
  });

  if (!res.ok) {
    throw new OllamaUnreachableError(`Ollama responded with status ${res.status}`);
  }

  const data = await res.json();
  return data.response as string;
}

/**
 * Runs the full analysis with one automatic re-prompt retry on schema
 * failure (per NFRs: local models are more prone to malformed/incomplete
 * JSON than cloud APIs, so a single silent retry meaningfully improves the
 * success rate without making the user wait through two full failures).
 */
export async function runAtsAnalysis(
  resumeText: string,
  jobDescription: string,
  onStage?: (stage: string) => void,
  model: string = DEFAULT_MODEL
): Promise<AtsResult> {
  const startedAt = Date.now();
  logEvent("analysis_started", { model });

  const prompt = buildAtsPrompt(resumeText, jobDescription);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    onStage?.("Reading resume and job description…");
    let raw: string;
    try {
      raw = await callOllamaOnce(prompt, model, controller.signal);
    } catch (err) {
      if (controller.signal.aborted) {
        logEvent("analysis_timed_out", { model, durationMs: Date.now() - startedAt });
        throw new OllamaTimeoutError("Analysis timed out after 120s.");
      }
      throw err;
    }

    onStage?.("Scoring the match…");
    let parsed = parseAtsResult(raw);

    if (!parsed.ok) {
      // Single retry with an explicit correction instruction appended.
      onStage?.("Re-checking output format…");
      const correctionPrompt = `${prompt}\n\nYour previous response was invalid: ${parsed.error}. Return ONLY the corrected raw JSON object, matching the exact shape above.`;
      const retryRaw = await callOllamaOnce(correctionPrompt, model, controller.signal);
      parsed = parseAtsResult(retryRaw);
    }

    if (!parsed.ok) {
      logEvent("analysis_failed", { model, message: parsed.error });
      throw new OllamaSchemaError(
        `The local model couldn't produce a valid result after retrying (${parsed.error}). Try a different model in Settings, or shorten the job description.`
      );
    }

    logEvent("analysis_completed", {
      model,
      matchScore: parsed.data.matchScore,
      confidenceScore: parsed.data.confidenceScore,
      durationMs: Date.now() - startedAt,
    });

    return parsed.data;
  } finally {
    clearTimeout(timeout);
  }
}
