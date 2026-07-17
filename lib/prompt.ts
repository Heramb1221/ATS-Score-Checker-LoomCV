/**
 * Prompt design notes (see blueprint Phase 1):
 * - Local 7–8B models drift toward chattiness and markdown fences even when
 *   told not to. The instruction below is deliberately repetitive about
 *   "JSON only" because redundancy measurably helps compliance at this model
 *   size — it's not sloppy, it's the finding from the POC test matrix.
 * - temperature is set low (0.2) at the call site (lib/ollama-client.ts) to
 *   reduce score variance across repeated runs of the same input.
 * - Confidence score is asked for explicitly, not derived after the fact —
 *   we want the model's own uncertainty, not a heuristic guess at it.
 */
export function buildAtsPrompt(resumeText: string, jobDescription: string): string {
  return `You are an ATS (Applicant Tracking System) resume analyzer. You compare a resume against a job description and output a single JSON object — nothing else.

CRITICAL OUTPUT RULES:
- Respond with ONLY a raw JSON object. No markdown code fences, no backticks, no preamble, no explanation before or after.
- Do not wrap the JSON in \`\`\`json or any other formatting.
- The JSON object must exactly match this shape:

{
  "matchScore": <integer 0-100, overall fit between resume and job description>,
  "confidenceScore": <integer 0-100, how confident YOU are in this specific scoring, given the length/clarity of the inputs>,
  "matchedKeywords": [<strings — skills/terms present in BOTH the resume and job description>],
  "missingKeywords": [<strings — important skills/terms in the job description that are ABSENT from the resume>],
  "improvements": [
    {
      "type": "passive_voice" | "weak_verb" | "missing_keyword" | "formatting",
      "original": "<the exact problematic phrase from the resume>",
      "suggestion": "<a concrete, rewritten replacement>"
    }
  ]
}

SCORING GUIDANCE:
- matchScore should weigh both explicit keyword overlap AND semantic relevance (e.g. "led a team" satisfies a "leadership" requirement even without the literal word).
- confidenceScore should be LOWER when the job description is vague or very short, when the resume has little relevant detail to judge, or when the required skill area is ambiguous. Do not default to a high confidence score — actually assess uncertainty.
- List at most 15 improvements, prioritizing the highest-impact ones first.
- For "passive_voice" and "weak_verb" types, only flag bullet points from the resume's experience section, not headers or contact info.

RESUME:
"""
${resumeText.slice(0, 8000)}
"""

JOB DESCRIPTION:
"""
${jobDescription.slice(0, 4000)}
"""

Respond with the JSON object now. Nothing else.`;
}
