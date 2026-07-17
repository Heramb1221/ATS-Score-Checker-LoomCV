interface KeywordChipsProps {
  matched: string[];
  missing: string[];
}

export function KeywordChips({ matched, missing }: KeywordChipsProps) {
  return (
    <div className="grid grid-cols-2 gap-6">
      <div>
        <h3 className="font-mono text-xs uppercase tracking-wide text-match-strong mb-2">
          Matched · {matched.length}
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {matched.length === 0 && <p className="text-sm text-graphite">No overlap found.</p>}
          {matched.map((kw) => (
            <span key={kw} className="rounded-full border border-match-strong/40 bg-match-strongSoft px-2.5 py-1 text-xs text-match-strong">
              {kw}
            </span>
          ))}
        </div>
      </div>
      <div>
        <h3 className="font-mono text-xs uppercase tracking-wide text-match-weak mb-2">
          Missing · {missing.length}
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {missing.length === 0 && <p className="text-sm text-graphite">Nothing missing — strong coverage.</p>}
          {missing.map((kw) => (
            <span key={kw} className="rounded-full border border-match-weak/40 bg-match-weakSoft px-2.5 py-1 text-xs text-match-weak">
              {kw}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
