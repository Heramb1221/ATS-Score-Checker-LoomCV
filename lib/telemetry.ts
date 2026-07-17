/**
 * Per Phase 4 task 2: track event counts and model/failure rates to
 * understand real-world reliability across model families — WITHOUT ever
 * logging resume or job description content. Every event payload here is
 * deliberately restricted to non-identifying, non-content fields.
 *
 * Ships as a console-log stub. Swap the body of `send()` for your actual
 * analytics provider (PostHog, Plausible, a simple internal endpoint,
 * etc.) — the event shape and privacy boundary are the part that matters,
 * not the transport.
 */

type EventName =
  | "analysis_started"
  | "analysis_completed"
  | "analysis_failed"
  | "analysis_timed_out"
  | "ollama_unreachable"
  | "app_crashed"
  | "path_a_used"
  | "path_b_used";

interface EventPayload {
  model?: string;
  matchScore?: number;
  confidenceScore?: number;
  durationMs?: number;
  message?: string; // safe: error messages here are our own strings, never model output
}

export function logEvent(name: EventName, payload: EventPayload = {}) {
  const event = { name, payload, timestamp: new Date().toISOString() };
  send(event);
}

function send(event: { name: EventName; payload: EventPayload; timestamp: string }) {
  if (process.env.NODE_ENV !== "production") {
    console.debug("[telemetry]", event);
    return;
  }
  // TODO: replace with your analytics provider, e.g.:
  // fetch("/api/telemetry", { method: "POST", body: JSON.stringify(event), keepalive: true });
}
