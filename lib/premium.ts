import type { AtsSession } from "@/hooks/useAtsAnalysis";
import type { HandoffTokenPayload } from "./handoff-token";

/**
 * Path B (anonymous) visitors are never premium — there's no account to
 * check a subscription against. Only Path A sessions carry a tier, taken
 * from the handoff token's `subscriptionTier` claim (see loomcv-integration/
 * app/api/internal/ats-handoff/route.ts for where LoomCV sets this).
 */
export function isPremiumSession(session: AtsSession | null): boolean {
  return session?.path === "loomcv" && session.subscriptionTier === "premium";
}

export function isPremiumPayload(payload: HandoffTokenPayload): boolean {
  return payload.subscriptionTier === "premium";
}
