import { NextRequest, NextResponse } from "next/server";
import { verifyHandoffToken, InvalidHandoffTokenError } from "@/lib/handoff-token";

/**
 * Called by the client on page load when a `?token=` param is present.
 * Verifies the token, then calls back into LoomCV's own internal API to
 * fetch the resume — this route never touches LoomCV's database directly,
 * it just relays through LoomCV's own authenticated endpoint. See
 * loomcv-integration/ for the matching route that must exist on the LoomCV
 * side.
 */
export async function POST(req: NextRequest) {
  const { token } = await req.json();

  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "Missing token." }, { status: 400 });
  }

  let payload;
  try {
    payload = await verifyHandoffToken(token);
  } catch (err) {
    if (err instanceof InvalidHandoffTokenError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    return NextResponse.json({ error: "Token verification failed." }, { status: 401 });
  }

  const loomcvBase = process.env.LOOMCV_BASE_URL;
  if (!loomcvBase) {
    return NextResponse.json({ error: "LOOMCV_BASE_URL is not configured." }, { status: 500 });
  }

  try {
    const resumeRes = await fetch(`${loomcvBase}/api/internal/v1/resumes/${payload.resumeId}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8000),
    });

    if (!resumeRes.ok) {
      return NextResponse.json({ error: "Couldn't fetch the resume from LoomCV." }, { status: 502 });
    }

    const resume = await resumeRes.json();
    return NextResponse.json({
      resumeId: payload.resumeId,
      userId: payload.userId,
      subscriptionTier: payload.subscriptionTier,
      resumeText: resume.text as string,
      resumeTitle: resume.title as string,
    });
  } catch {
    return NextResponse.json({ error: "LoomCV did not respond in time." }, { status: 504 });
  }
}
