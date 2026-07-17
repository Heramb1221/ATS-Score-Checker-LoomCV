import { NextRequest, NextResponse } from "next/server";
import {
  parseResumeFile,
  UnsupportedFileTypeError,
  FileTooLargeError,
  ParsingFailedError,
} from "@/lib/parse-resume";
import { checkRateLimit, getClientIdentifier } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const clientId = getClientIdentifier(req.headers);
  const { allowed } = checkRateLimit(`upload:${clientId}`);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many uploads from this connection. Try again in a bit." },
      { status: 429 }
    );
  }

  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  try {
    const text = await parseResumeFile(file);
    return NextResponse.json({ text });
  } catch (err) {
    if (err instanceof UnsupportedFileTypeError) {
      return NextResponse.json({ error: err.message }, { status: 415 });
    }
    if (err instanceof FileTooLargeError) {
      return NextResponse.json({ error: err.message }, { status: 413 });
    }
    if (err instanceof ParsingFailedError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    return NextResponse.json({ error: "Unexpected error while parsing the file." }, { status: 500 });
  }
}
