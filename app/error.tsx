"use client";

import { useEffect } from "react";
import { logEvent } from "@/lib/telemetry";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    logEvent("app_crashed", { message: error.message });
  }, [error]);

  return (
    <html>
      <body>
        <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
          <p className="font-display text-lg">Something went wrong</p>
          <p className="mt-2 text-sm text-gray-500">
            An unexpected error occurred loading this page. Try reloading — your results weren&apos;t lost if they were
            already saved locally.
          </p>
          <button onClick={reset} className="mt-4 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white">
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
