import type { AtsResult } from "@/lib/schema";
import { OverlapScore } from "./OverlapScore";
import { KeywordChips } from "./KeywordChips";
import { ImprovementsList } from "./ImprovementsList";
import type { EntryPath } from "@/hooks/useAtsAnalysis";

interface ResultsViewProps {
  result: AtsResult;
  path: EntryPath;
  resumeId?: string;
  isPremium: boolean;
  token?: string;
  jobDescription: string;
  onReanalyze: () => void;
}

export function ResultsView({ result, path, resumeId, isPremium, token, jobDescription, onReanalyze }: ResultsViewProps) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <OverlapScore matchScore={result.matchScore} confidenceScore={result.confidenceScore} />
        <button onClick={onReanalyze} className="font-mono text-xs uppercase tracking-wide text-signal hover:underline">
          Re-analyze
        </button>
      </div>

      <KeywordChips matched={result.matchedKeywords} missing={result.missingKeywords} />

      <div>
        <h3 className="font-mono text-xs uppercase tracking-wide text-graphite mb-2">Suggested fixes</h3>
        <ImprovementsList items={result.improvements} isPremium={isPremium} token={token} jobDescription={jobDescription} />
      </div>

      {path === "loomcv" && resumeId ? (
        <a
          href={`${process.env.NEXT_PUBLIC_LOOMCV_EDITOR_URL || ""}/resumes/${resumeId}`}
          className="rounded border border-signal px-4 py-2.5 text-center text-sm font-medium text-signal hover:bg-signal-soft"
        >
          Edit this resume in LoomCV
        </a>
      ) : (
        <a
          href={process.env.NEXT_PUBLIC_LOOMCV_SIGNUP_URL || "#"}
          className="rounded border border-signal px-4 py-2.5 text-center text-sm font-medium text-signal hover:bg-signal-soft"
        >
          Build and refine this resume properly in LoomCV
        </a>
      )}
    </div>
  );
}
