import mammoth from "mammoth";

export class UnsupportedFileTypeError extends Error {}
export class FileTooLargeError extends Error {}
export class ParsingFailedError extends Error {}

const MAX_BYTES = 5 * 1024 * 1024; // 5MB, per NFRs
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
]);

/**
 * Validates MIME type server-side (never trust the file extension alone —
 * a renamed .exe with a .pdf extension would sail through extension-only
 * checks) and extracts plain text.
 *
 * Both extraction paths run with a bounded timeout so a malformed/adversarial
 * file fails fast instead of hanging the request, per the "Upload safety" NFR.
 */
export async function parseResumeFile(file: File): Promise<string> {
  if (file.size > MAX_BYTES) {
    throw new FileTooLargeError(`File is ${(file.size / 1024 / 1024).toFixed(1)}MB — the limit is 5MB.`);
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new UnsupportedFileTypeError("Only PDF and DOCX files are supported.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const withTimeout = <T>(promise: Promise<T>, ms = 15_000): Promise<T> =>
    Promise.race([
      promise,
      new Promise<T>((_, reject) => setTimeout(() => reject(new ParsingFailedError("Parsing timed out.")), ms)),
    ]);

  try {
    if (file.type === "application/pdf") {
      // Lazy import: pdf-parse touches the filesystem on module load in some
      // environments, so it's kept out of the module's top-level scope.
      const pdfParse = (await import("pdf-parse")).default;
      const result = await withTimeout(pdfParse(buffer));
      const text = result.text.trim();
      if (!text) throw new ParsingFailedError("No extractable text found — this may be a scanned image PDF.");
      return text;
    }

    // DOCX
    const result = await withTimeout(mammoth.extractRawText({ buffer }));
    const text = result.value.trim();
    if (!text) throw new ParsingFailedError("No extractable text found in this document.");
    return text;
  } catch (err) {
    if (err instanceof ParsingFailedError) throw err;
    throw new ParsingFailedError(
      "Couldn't read this file. It may be corrupted, password-protected, or an image-based scan."
    );
  }
}
