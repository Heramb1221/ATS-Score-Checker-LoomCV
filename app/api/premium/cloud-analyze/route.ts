import { NextRequest, NextResponse } from "next/server";
import { verifyHandoffToken, InvalidHandoffTokenError } from "@/lib/handoff-token";
import { isPremiumPayload } from "@/lib/premium";
import { runCloudAnalysis } from "@/lib/cloud-fallback";
import { checkRateLimit, getClientIdentifier } from "@/lib/rate-limit";

/**
 * Premium-gated: requires a valid Path A handoff token with
 * subscriptionTier "premium". Path B (anonymous) visitors can never reach
 * this route since they have no token to present — this is enforced here,
 * not just hidden in the UI, so it can't be bypassed by calling the API
 * directly.
 */
export async function POST(req: NextRequest) {
  const clientId = getClientIdentifier(req.headers);
  const { allowed } = checkRateLimit(`cloud-analyze:${clientId}`);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
  }

  const { token, resumeText, jobDescription } = await req.json();

  if (!token) {
    return NextResponse.json({ error: "Cloud fallback requires a LoomCV account." }, { status: 401 });
  }

  let payload;
  try {
    payload = await verifyHandoffToken(token);
  } catch (err) {
    if (err instanceof InvalidHandoffTokenError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    throw err;
  }

  if (!isPremiumPayload(payload)) {
    return NextResponse.json({ error: "Cloud fallback is a Premium feature." }, { status: 403 });
  }

  if (typeof resumeText !== "string" || typeof jobDescription !== "string") {
    return NextResponse.json({ error: "Missing resumeText or jobDescription." }, { status: 400 });
  }

  try {
    const result = await runCloudAnalysis(resumeText, jobDescription);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Cloud analysis failed." },
      { status: 502 }
    );
  }
}
