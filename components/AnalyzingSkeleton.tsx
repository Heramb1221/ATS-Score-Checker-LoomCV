export function AnalyzingSkeleton({ stageMessage }: { stageMessage: string }) {
  return (
    <div className="flex flex-col items-center gap-4 py-12">
      <div className="relative h-16 w-16">
        <div className="absolute inset-0 rounded-full border-2 border-line" />
        <div className="absolute inset-0 rounded-full border-2 border-t-signal animate-spin" />
      </div>
      <p className="font-mono text-sm text-graphite">{stageMessage || "Starting local analysis…"}</p>
      <p className="max-w-xs text-center text-xs text-graphite/70">
        Running entirely on your machine — this can take up to a minute or two depending on your hardware.
      </p>
    </div>
  );
}
