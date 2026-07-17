"use client";

import { useState, useCallback, useEffect } from "react";
import { checkOllamaConnection, runAtsAnalysis } from "@/lib/ollama-client";
import type { AtsResult } from "@/lib/schema";

export type EntryPath = "loomcv" | "direct";

export interface AtsSession {
  path: EntryPath;
  token?: string; // present only for Path A
  resumeId?: string; // present only for Path A
  subscriptionTier?: "free" | "premium"; // present only for Path A
  resumeText: string;
  resumeTitle: string;
}

type Status = "checking-ollama" | "ollama-unreachable" | "idle" | "analyzing" | "done" | "error";

const localCacheKey = (resumeText: string, jd: string) =>
  `ats-result:${simpleHash(resumeText)}:${simpleHash(jd)}`;

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString(36);
}

export function useAtsAnalysis(session: AtsSession | null) {
  const [status, setStatus] = useState<Status>("checking-ollama");
  const [stageMessage, setStageMessage] = useState<string>("");
  const [result, setResult] = useState<AtsResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>(process.env.NEXT_PUBLIC_OLLAMA_MODEL || "llama3:8b");

  useEffect(() => {
    checkOllamaConnection().then(({ connected, models }) => {
      setAvailableModels(models);
      if (models.length > 0 && !models.includes(selectedModel)) {
        setSelectedModel(models[0]);
      }
      setStatus(connected ? "idle" : "ollama-unreachable");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const retryConnection = useCallback(async () => {
    setStatus("checking-ollama");
    const { connected, models } = await checkOllamaConnection();
    setAvailableModels(models);
    setStatus(connected ? "idle" : "ollama-unreachable");
  }, []);

  const analyze = useCallback(
    async (jobDescription: string) => {
      if (!session) return;

      // Path B: check localStorage first — no server round-trip needed,
      // and nothing about this touches the database (see storage NFR).
      if (session.path === "direct") {
        const cached = localStorage.getItem(localCacheKey(session.resumeText, jobDescription));
        if (cached) {
          setResult(JSON.parse(cached));
          setStatus("done");
          return;
        }
      }

      setStatus("analyzing");
      setError(null);
      try {
        const analysisResult = await runAtsAnalysis(session.resumeText, jobDescription, setStageMessage, selectedModel);
        await handleAnalysisSuccess(session, jobDescription, analysisResult);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong during analysis.");
        setStatus("error");
      }
    },
    [session, selectedModel]
  );

  /**
   * Premium-only path: skips local Ollama entirely and runs via the server
   * (Gemini, see lib/cloud-fallback.ts), gated server-side by the handoff
   * token's subscriptionTier claim. Only reachable for Path A sessions —
   * Path B has no token to authorize this with.
   */
  const runCloudAnalyze = useCallback(
    async (jobDescription: string) => {
      if (!session || session.path !== "loomcv" || !session.token) return;

      setStatus("analyzing");
      setStageMessage("Analyzing via cloud AI…");
      setError(null);
      try {
        const res = await fetch("/api/premium/cloud-analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: session.token, resumeText: session.resumeText, jobDescription }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Cloud analysis failed.");
        await handleAnalysisSuccess(session, jobDescription, data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong during cloud analysis.");
        setStatus("error");
      }
    },
    [session]
  );

  async function handleAnalysisSuccess(activeSession: AtsSession, jobDescription: string, analysisResult: AtsResult) {
    setResult(analysisResult);
    setStatus("done");

    if (activeSession.path === "direct") {
      localStorage.setItem(localCacheKey(activeSession.resumeText, jobDescription), JSON.stringify(analysisResult));
    } else if (activeSession.token) {
      // Path A: persist server-side, fire-and-forget — a failed save
      // shouldn't block the user from seeing their result.
      fetch("/api/analyses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: activeSession.token, jobDescription, result: analysisResult }),
      }).catch(() => {
        /* non-fatal — result is still shown to the user */
      });
    }
  }

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setStatus("idle");
  }, []);

  return {
    status,
    stageMessage,
    result,
    error,
    availableModels,
    selectedModel,
    setSelectedModel,
    analyze,
    runCloudAnalyze,
    retryConnection,
    reset,
  };
}
