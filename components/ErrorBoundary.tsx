"use client";

import { Component, type ReactNode } from "react";
import { logEvent } from "@/lib/telemetry";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Class component is required here — React error boundaries can't be
 * written as hooks/function components as of React 18.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    // No resume/JD content in this event — see telemetry.ts for what's
    // actually collected.
    logEvent("app_crashed", { message: error.message });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto max-w-md rounded-lg border border-match-weak/40 bg-match-weakSoft p-6 text-center">
          <p className="font-display text-lg text-ink">Something went wrong</p>
          <p className="mt-2 text-sm text-graphite">
            This page hit an unexpected error. Reloading usually fixes it — your resume text and results weren&apos;t lost
            if they were already saved locally.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded bg-signal px-4 py-2 text-sm font-medium text-white hover:bg-signal/90"
          >
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
