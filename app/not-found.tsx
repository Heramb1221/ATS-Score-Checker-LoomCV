import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      <p className="font-mono text-xs uppercase tracking-widest text-signal">404</p>
      <h1 className="mt-2 font-display text-2xl text-ink">Page not found</h1>
      <p className="mt-2 text-sm text-graphite">
        This page doesn&apos;t exist, or a link may have expired. If you came from LoomCV, go back and click
        &ldquo;Check ATS Score&rdquo; again.
      </p>
      <Link href="/" className="mt-5 rounded bg-signal px-4 py-2 text-sm font-medium text-white hover:bg-signal/90">
        Start over
      </Link>
    </main>
  );
}
