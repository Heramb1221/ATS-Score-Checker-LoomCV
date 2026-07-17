"use client";

import clsx from "clsx";

interface OverlapScoreProps {
  matchScore: number;
  confidenceScore: number;
}

function scoreBand(score: number): "strong" | "mid" | "weak" {
  if (score >= 80) return "strong";
  if (score >= 50) return "mid";
  return "weak";
}

const BAND_COLORS = {
  strong: { fill: "fill-match-strong", text: "text-match-strong", soft: "bg-match-strongSoft" },
  mid: { fill: "fill-match-mid", text: "text-match-mid", soft: "bg-match-midSoft" },
  weak: { fill: "fill-match-weak", text: "text-match-weak", soft: "bg-match-weakSoft" },
};

/**
 * The overlap between the two circles is literal, not decorative: at 0 the
 * circles sit fully apart, at 100 they sit fully concentric. This is the
 * page's signature element — the score isn't just a number, it's a picture
 * of the thing being measured (resume vs. job description intersection).
 */
export function OverlapScore({ matchScore, confidenceScore }: OverlapScoreProps) {
  const band = scoreBand(matchScore);
  const colors = BAND_COLORS[band];

  const r = 46;
  const maxSeparation = 60; // px between circle centers at score = 0
  const separation = maxSeparation * (1 - matchScore / 100);
  const cx1 = 90 - separation / 2;
  const cx2 = 90 + separation / 2;
  const lowConfidence = confidenceScore < 50;

  return (
    <div className="flex flex-col items-center gap-3">
      <svg viewBox="0 0 180 130" className="w-56 h-40" role="img" aria-label={`ATS match score ${matchScore} out of 100`}>
        <circle cx={cx1} cy={60} r={r} className={clsx(colors.fill, "opacity-30")} />
        <circle cx={cx2} cy={60} r={r} className={clsx(colors.fill, "opacity-30")} />
        <circle cx={cx1} cy={60} r={r} fill="none" className={colors.text} strokeWidth={1.5} stroke="currentColor" />
        <circle cx={cx2} cy={60} r={r} fill="none" className={colors.text} strokeWidth={1.5} stroke="currentColor" />
        <text x="90" y="66" textAnchor="middle" className={clsx("font-mono font-medium text-3xl", colors.text)} fill="currentColor">
          {matchScore}
        </text>
        <text x="55" y="118" textAnchor="middle" className="fill-graphite font-mono text-[9px] uppercase tracking-wide">
          resume
        </text>
        <text x="125" y="118" textAnchor="middle" className="fill-graphite font-mono text-[9px] uppercase tracking-wide">
          role
        </text>
      </svg>

      <div className={clsx("flex items-center gap-2 rounded-full px-3 py-1 text-xs font-mono", lowConfidence ? "bg-line text-graphite" : colors.soft, lowConfidence ? "" : colors.text)}>
        <span>Confidence {confidenceScore}</span>
        {lowConfidence && <span className="text-graphite">— treat this score as a rough read</span>}
      </div>
    </div>
  );
}
