export function DesktopOnlyGate() {
  return (
    <div className="mx-auto max-w-sm rounded-lg border border-line bg-white p-6 text-center">
      <p className="font-display text-lg text-ink">Best on desktop</p>
      <p className="mt-2 text-sm text-graphite">
        ATS Scorer runs AI locally on your machine via Ollama, which doesn&apos;t have a mobile equivalent yet. Open this
        page on a desktop or laptop browser to continue.
      </p>
    </div>
  );
}
