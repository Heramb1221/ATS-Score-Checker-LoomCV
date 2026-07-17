import { z } from "zod";

/**
 * This is the single source of truth for what the model is allowed to
 * return. Every prompt, every UI component, and every retry decision is
 * downstream of this schema — change it here first, then update the prompt
 * in lib/prompt.ts to match.
 */
export const ImprovementSchema = z.object({
  type: z.enum(["passive_voice", "weak_verb", "missing_keyword", "formatting"]),
  original: z.string().min(1).max(400),
  suggestion: z.string().min(1).max(400),
});

export const AtsResultSchema = z.object({
  matchScore: z.number().int().min(0).max(100),
  confidenceScore: z.number().int().min(0).max(100),
  matchedKeywords: z.array(z.string().min(1).max(60)).max(40),
  missingKeywords: z.array(z.string().min(1).max(60)).max(40),
  improvements: z.array(ImprovementSchema).max(15),
});

export type Improvement = z.infer<typeof ImprovementSchema>;
export type AtsResult = z.infer<typeof AtsResultSchema>;

/**
 * Ollama's `format: "json"` mode guarantees syntactically valid JSON but NOT
 * that it matches our shape (models can still omit fields, wrap numbers as
 * strings, etc). This does the semantic validation on top and normalizes a
 * couple of common near-misses before rejecting outright, so a real parse
 * failure and a "close enough" response aren't treated identically.
 */
export function parseAtsResult(raw: string): { ok: true; data: AtsResult } | { ok: false; error: string } {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ok: false, error: "Model output was not valid JSON." };
  }

  // Common near-miss: numeric fields returned as strings ("85" instead of 85).
  if (json && typeof json === "object") {
    const obj = json as Record<string, unknown>;
    for (const key of ["matchScore", "confidenceScore"]) {
      if (typeof obj[key] === "string" && /^\d+$/.test(obj[key] as string)) {
        obj[key] = Number(obj[key]);
      }
    }
  }

  const result = AtsResultSchema.safeParse(json);
  if (!result.success) {
    return { ok: false, error: result.error.issues.map((i) => i.message).join("; ") };
  }
  return { ok: true, data: result.data };
}
