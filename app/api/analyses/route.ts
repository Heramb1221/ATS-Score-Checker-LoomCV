import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { createHash } from "crypto";
import { AtsResultSchema } from "@/lib/schema";
import { verifyHandoffToken, InvalidHandoffTokenError } from "@/lib/handoff-token";

const prisma = new PrismaClient();

/**
 * Path A only — see the "Anonymous storage boundedness" NFR for why Path B
 * (anonymous) results are never written here. The client only calls this
 * route when it has a verified handoff token in memory.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { token, jobDescription, result } = body;

  if (!token) {
    return NextResponse.json({ error: "Missing token — anonymous results are not persisted server-side." }, { status: 400 });
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

  const parsedResult = AtsResultSchema.safeParse(result);
  if (!parsedResult.success) {
    return NextResponse.json({ error: "Result payload failed schema validation." }, { status: 400 });
  }

  const jdHash = createHash("sha256").update(jobDescription).digest("hex");

  const saved = await prisma.atsAnalysis.upsert({
    where: { resumeId_jdHash: { resumeId: payload.resumeId, jdHash } },
    create: {
      resumeId: payload.resumeId,
      userId: payload.userId,
      jdHash,
      matchScore: parsedResult.data.matchScore,
      confidence: parsedResult.data.confidenceScore,
      resultJson: parsedResult.data,
    },
    update: {
      matchScore: parsedResult.data.matchScore,
      confidence: parsedResult.data.confidenceScore,
      resultJson: parsedResult.data,
    },
  });

  return NextResponse.json({ id: saved.id, savedAt: saved.createdAt });
}
