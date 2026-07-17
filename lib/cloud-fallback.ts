import { buildAtsPrompt } from "./prompt";
import { parseAtsResult, type AtsResult } from "./schema";

/**
 * Premium-only alternative to local Ollama inference — runs server-side via
 * Gemini instead of the visitor's own machine. Requires GEMINI_API_KEY.
 *
 * This is the ONE place in the codebase where resume/JD content leaves the
 * visitor's machine for the actual AI call — only ever invoked for verified
 * premium sessions (see app/api/premium/cloud-analyze/route.ts for the
 * gating check), and only when the visitor explicitly opts into the cloud
 * fallback rather than setting up Ollama.
 */
export async function runCloudAnalysis(resumeText: string, jobDescription: string): Promise<AtsResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured — cloud fallback is unavailable.");
  }

  const prompt = buildAtsPrompt(resumeText, jobDescription);

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
      }),
      signal: AbortSignal.timeout(30_000), // cloud inference is fast — no need for the 120s local budget
    }
  );

  if (!res.ok) {
    throw new Error(`Gemini request failed with status ${res.status}`);
  }

  const data = await res.json();
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) throw new Error("Gemini returned an empty response.");

  const parsed = parseAtsResult(raw);
  if (!parsed.ok) throw new Error(`Gemini response failed schema validation: ${parsed.error}`);
  return parsed.data;
}

/**
 * Premium-only bullet rewrite — takes a single flagged improvement and asks
 * for a stronger, ready-to-paste replacement. Local 7-8B models are weaker
 * at high-quality generative rewrites than a cloud model at this scale,
 * which is the product rationale for gating this specifically (see PRD
 * Section 4), not an arbitrary paywall.
 */
export async function generateRewrite(originalBullet: string, jobDescription: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured — rewrite is unavailable.");
  }

  const prompt = `Rewrite this resume bullet point to be stronger, more specific, and better aligned with the target job description. Use active voice and a strong action verb. Return ONLY the rewritten bullet point text, nothing else — no quotes, no explanation.

Original bullet: "${originalBullet}"

Target job description context:
"""
${jobDescription.slice(0, 2000)}
"""`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4 },
      }),
      signal: AbortSignal.timeout(20_000),
    }
  );

  if (!res.ok) throw new Error(`Gemini request failed with status ${res.status}`);
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) throw new Error("Gemini returned an empty rewrite.");
  return text;
}
