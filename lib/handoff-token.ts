import { jwtVerify } from "jose";

export interface HandoffTokenPayload {
  resumeId: string;
  userId: string;
  subscriptionTier: "free" | "premium";
}

export class InvalidHandoffTokenError extends Error {}

const secret = () => {
  const raw = process.env.ATS_HANDOFF_SECRET;
  if (!raw) throw new Error("ATS_HANDOFF_SECRET is not set — see .env.example.");
  return new TextEncoder().encode(raw);
};

/**
 * Verifies the short-lived token LoomCV mints when a user clicks
 * "Check ATS Score". Scoped to a single resumeId (never a general-purpose
 * auth token) and expires in 5 minutes — see blueprint Section 3.1a / NFRs.
 */
export async function verifyHandoffToken(token: string): Promise<HandoffTokenPayload> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (typeof payload.resumeId !== "string" || typeof payload.userId !== "string") {
      throw new InvalidHandoffTokenError("Token is missing required claims.");
    }
    return {
      resumeId: payload.resumeId,
      userId: payload.userId,
      subscriptionTier: payload.subscriptionTier === "premium" ? "premium" : "free",
    };
  } catch (err) {
    if (err instanceof InvalidHandoffTokenError) throw err;
    throw new InvalidHandoffTokenError("Token is invalid or has expired. Go back to LoomCV and click the button again.");
  }
}
