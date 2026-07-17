import { NextRequest, NextResponse } from "next/server";
import { verifyHandoffToken, InvalidHandoffTokenError } from "@/lib/handoff-token";
import { isPremiumPayload } from "@/lib/premium";
import { generateRewrite } from "@/lib/cloud-fallback";
import { checkRateLimit, getClientIdentifier } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const clientId = getClientIdentifier(req.headers);
  const { allowed } = checkRateLimit(`rewrite:${clientId}`);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
  }

  const { token, originalBullet, jobDescription } = await req.json();

  if (!token) {
    return NextResponse.json({ error: "AI rewrite requires a LoomCV account." }, { status: 401 });
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
    return NextResponse.json({ error: "AI rewrite is a Premium feature." }, { status: 403 });
  }

  if (typeof originalBullet !== "string" || typeof jobDescription !== "string") {
    return NextResponse.json({ error: "Missing originalBullet or jobDescription." }, { status: 400 });
  }

  try {
    const rewrite = await generateRewrite(originalBullet, jobDescription);
    return NextResponse.json({ rewrite });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Rewrite failed." }, { status: 502 });
  }
}
