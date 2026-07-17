"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAtsAnalysis, type AtsSession } from "@/hooks/useAtsAnalysis";
import { useIsMobileViewport } from "@/hooks/useIsMobileViewport";
import { ResumeDropzone } from "./ResumeDropzone";
import { JDInput } from "./JDInput";
import { OllamaSetupGuide } from "./OllamaSetupGuide";
import { AnalyzingSkeleton } from "./AnalyzingSkeleton";
import { ResultsView } from "./ResultsView";
import { DesktopOnlyGate } from "./DesktopOnlyGate";
import { ModelSelector } from "./ModelSelector";
import { logEvent } from "@/lib/telemetry";
import { isPremiumSession } from "@/lib/premium";
import { CloudFallbackOffer } from "./CloudFallbackOffer";

type HandoffState = "checking" | "invalid" | "ready" | "none";

export function AtsApp() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const isMobile = useIsMobileViewport();

  const [handoffState, setHandoffState] = useState<HandoffState>(token ? "checking" : "none");
  const [session, setSession] = useState<AtsSession | null>(null);
  const [handoffError, setHandoffError] = useState("");
  const [jobDescription, setJobDescription] = useState("");

  // Path A: verify the token on load.
  useEffect(() => {
    if (!token) return;
    fetch("/api/verify-handoff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setHandoffError(data.error || "This link has expired.");
          setHandoffState("invalid");
          return;
        }
        setSession({
          path: "loomcv",
          token,
          resumeId: data.resumeId,
          subscriptionTier: data.subscriptionTier,
          resumeText: data.resumeText,
          resumeTitle: data.resumeTitle,
        });
        setHandoffState("ready");
        logEvent("path_a_used");
      })
      .catch(() => {
        setHandoffError("Couldn't verify this link.");
        setHandoffState("invalid");
      });
  }, [token]);

  const {
    status,
    stageMessage,
    result,
    error,
    availableModels,
    selectedModel,
    setSelectedModel,
    analyze,
    retryConnection,
    reset,
    runCloudAnalyze,
  } = useAtsAnalysis(session);

  const isPremium = isPremiumSession(session);

  const handleAnalyze = (jd: string) => {
    setJobDescription(jd);
    analyze(jd);
  };

  const handleCloudAnalyze = (jd: string) => {
    setJobDescription(jd);
    runCloudAnalyze(jd);
  };

  // Path B: user uploads and confirms a resume directly.
  const handleUploadConfirm = (text: string, fileName: string) => {
    setSession({ path: "direct", resumeText: text, resumeTitle: fileName });
    logEvent("path_b_used");
  };

  // Wait for the viewport check before rendering anything, to avoid a flash
  // of desktop content on mobile before the gate kicks in.
  if (isMobile === null) return null;
  if (isMobile) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-6">
        <DesktopOnlyGate />
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-14">
      <header className="mb-10">
        <p className="font-mono text-xs uppercase tracking-widest text-signal">LoomCV</p>
        <h1 className="mt-1 font-display text-3xl text-ink">ATS Scorer</h1>
        <p className="mt-2 text-sm text-graphite">
          See how well your resume matches a role — analyzed locally on your own machine, never uploaded for scoring.
        </p>
      </header>

      {/* Path A: token present but not yet resolved */}
      {handoffState === "checking" && <p className="font-mono text-sm text-graphite">Loading your resume from LoomCV…</p>}

      {handoffState === "invalid" && (
        <div className="rounded-lg border border-match-weak/40 bg-match-weakSoft p-5">
          <p className="text-sm text-ink">{handoffError}</p>
          <p className="mt-1 text-sm text-graphite">Go back to LoomCV and click &ldquo;Check ATS Score&rdquo; again.</p>
        </div>
      )}

      {/* Path B: no token, no session yet — show upload */}
      {handoffState === "none" && !session && <ResumeDropzone onConfirm={handleUploadConfirm} />}

      {/* Common path once a session exists (either path) */}
      {session && (
        <div className="flex flex-col gap-8">
          <div className="rounded border border-line bg-white/60 px-4 py-2.5">
            <p className="font-mono text-xs text-graphite">
              Resume loaded: <span className="text-ink">{session.resumeTitle}</span>
            </p>
          </div>

          {status === "checking-ollama" && <p className="font-mono text-sm text-graphite">Checking for local AI…</p>}

          {status === "ollama-unreachable" && (
            <div>
              <OllamaSetupGuide onRetry={retryConnection} />
              {isPremium && <CloudFallbackOffer onUseCloud={handleCloudAnalyze} />}
            </div>
          )}

          {status === "idle" && (
            <div className="flex flex-col gap-3">
              <div className="flex justify-end">
                <ModelSelector availableModels={availableModels} selectedModel={selectedModel} onChange={setSelectedModel} />
              </div>
              <JDInput onAnalyze={handleAnalyze} />
            </div>
          )}

          {status === "analyzing" && <AnalyzingSkeleton stageMessage={stageMessage} />}

          {status === "error" && (
            <div className="rounded-lg border border-match-weak/40 bg-match-weakSoft p-5">
              <p className="text-sm text-ink">{error}</p>
              <button onClick={reset} className="mt-3 font-mono text-xs uppercase tracking-wide text-signal hover:underline">
                Try again
              </button>
            </div>
          )}

          {status === "done" && result && (
            <ResultsView
              result={result}
              path={session.path}
              resumeId={session.resumeId}
              isPremium={isPremium}
              token={session.token}
              jobDescription={jobDescription}
              onReanalyze={reset}
            />
          )}
        </div>
      )}
    </main>
  );
}
