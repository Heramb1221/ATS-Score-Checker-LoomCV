"use client";

import { useState } from "react";
import type { Improvement } from "@/lib/schema";

const TYPE_LABELS: Record<Improvement["type"], string> = {
  passive_voice: "Passive voice",
  weak_verb: "Weak verb",
  missing_keyword: "Missing keyword",
  formatting: "Formatting",
};

interface ImprovementsListProps {
  items: Improvement[];
  isPremium: boolean;
  token?: string;
  jobDescription: string;
}

export function ImprovementsList({ items, isPremium, token, jobDescription }: ImprovementsListProps) {
  if (items.length === 0) {
    return <p className="text-sm text-graphite">No specific rewrite suggestions — this resume reads well against the role.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {items.map((item, i) => (
        <ImprovementCard key={i} item={item} isPremium={isPremium} token={token} jobDescription={jobDescription} />
      ))}
    </ul>
  );
}

function ImprovementCard({
  item,
  isPremium,
  token,
  jobDescription,
}: {
  item: Improvement;
  isPremium: boolean;
  token?: string;
  jobDescription: string;
}) {
  const [aiRewrite, setAiRewrite] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [rewriteError, setRewriteError] = useState("");

  const getRewrite = async () => {
    setLoading(true);
    setRewriteError("");
    try {
      const res = await fetch("/api/premium/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, originalBullet: item.original, jobDescription }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRewriteError(data.error || "Rewrite failed.");
        return;
      }
      setAiRewrite(data.rewrite);
    } catch {
      setRewriteError("Couldn't reach the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <li className="rounded border border-line bg-white/60 px-4 py-3">
      <span className="font-mono text-[10px] uppercase tracking-wide text-signal">{TYPE_LABELS[item.type]}</span>
      <p className="mt-1.5 text-sm text-graphite line-through decoration-match-weak/60">{item.original}</p>
      <p className="mt-1 text-sm text-ink">{aiRewrite || item.suggestion}</p>

      {isPremium && !aiRewrite && (
        <button
          onClick={getRewrite}
          disabled={loading}
          className="mt-2 font-mono text-[10px] uppercase tracking-wide text-signal hover:underline disabled:opacity-50"
        >
          {loading ? "Generating…" : "Get a stronger AI rewrite"}
        </button>
      )}
      {rewriteError && <p className="mt-1 text-xs text-match-weak">{rewriteError}</p>}
    </li>
  );
}
