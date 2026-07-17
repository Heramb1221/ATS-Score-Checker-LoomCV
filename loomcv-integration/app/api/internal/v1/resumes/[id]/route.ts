import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
// import { prisma } from "@/lib/prisma"; // adjust to LoomCV's actual Prisma client path
// import { resumeToPlainText } from "@/lib/resume-serializer"; // convert LoomCV's structured resume JSON to plain text for the LLM prompt

const secret = () => new TextEncoder().encode(process.env.ATS_HANDOFF_SECRET!);

/**
 * Versioned (v1) so the ATS Scorer and LoomCV can be deployed independently
 * without breaking each other — see the "Two-codebase versioning
 * discipline" NFR.
 *
 * Authenticated by the SAME handoff token minted in ../ats-handoff/route.ts,
 * passed as a Bearer header. This route intentionally does not accept a
 * regular LoomCV session cookie — only the scoped, short-lived token.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json({ error: "Missing token." }, { status: 401 });
  }

  let payload;
  try {
    ({ payload } = await jwtVerify(token, secret()));
  } catch {
    return NextResponse.json({ error: "Invalid or expired token." }, { status: 401 });
  }

  if (payload.resumeId !== params.id) {
    return NextResponse.json({ error: "Token does not match requested resume." }, { status: 403 });
  }

  // const resume = await prisma.resume.findFirst({
  //   where: { id: params.id, userId: payload.userId as string },
  // });
  // if (!resume) return NextResponse.json({ error: "Resume not found." }, { status: 404 });

  // return NextResponse.json({
  //   title: resume.title,
  //   text: resumeToPlainText(resume.content),
  // });

  // Placeholder response — wire up the two blocks above to LoomCV's actual
  // Resume model and content-to-plain-text serializer.
  return NextResponse.json({ title: "Untitled Resume", text: "" }, { status: 501 });
}
