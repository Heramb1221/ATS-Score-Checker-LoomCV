"use client";

import { useState, useCallback, useRef } from "react";
import clsx from "clsx";

interface ResumeDropzoneProps {
  onConfirm: (text: string, fileName: string) => void;
}

type State = "idle" | "uploading" | "confirming" | "error";

export function ResumeDropzone({ onConfirm }: ResumeDropzoneProps) {
  const [state, setState] = useState<State>("idle");
  const [extractedText, setExtractedText] = useState("");
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = useCallback(async (file: File) => {
    setState("uploading");
    setError("");
    setFileName(file.name);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload-resume", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 429) {
          setError("This connection has made a lot of upload requests recently — please wait a bit and try again.");
        } else {
          setError(data.error || "Upload failed.");
        }
        setState("error");
        return;
      }
      setExtractedText(data.text);
      setState("confirming");
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
      setState("error");
    }
  }, []);

  if (state === "confirming") {
    return (
      <div className="rounded-lg border border-line bg-white p-5">
        <p className="font-mono text-xs uppercase tracking-wide text-graphite">Extracted from {fileName}</p>
        <p className="mt-1 text-xs text-graphite/70">
          PDF text extraction isn&apos;t always perfect — check this looks right before analyzing.
        </p>
        <textarea
          value={extractedText}
          onChange={(e) => setExtractedText(e.target.value)}
          className="mt-3 h-64 w-full resize-none rounded border border-line bg-paper p-3 font-mono text-xs leading-relaxed text-ink focus:border-signal focus:outline-none"
        />
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => onConfirm(extractedText, fileName)}
            className="rounded bg-signal px-4 py-2 text-sm font-medium text-white hover:bg-signal/90"
          >
            Looks right — continue
          </button>
          <button
            onClick={() => setState("idle")}
            className="rounded border border-line px-4 py-2 text-sm text-graphite hover:bg-paper"
          >
            Try a different file
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) upload(file);
      }}
      onClick={() => inputRef.current?.click()}
      className={clsx(
        "cursor-pointer rounded-lg border-2 border-dashed p-10 text-center transition-colors",
        dragOver ? "border-signal bg-signal-soft" : "border-line bg-white hover:border-graphite"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
        }}
      />
      {state === "uploading" ? (
        <p className="font-mono text-sm text-graphite">Reading {fileName}…</p>
      ) : (
        <>
          <p className="font-display text-lg text-ink">Upload your resume</p>
          <p className="mt-1 text-sm text-graphite">PDF or DOCX, up to 5MB. Drag and drop, or click to browse.</p>
        </>
      )}
      {state === "error" && <p className="mt-3 text-sm text-match-weak">{error}</p>}
    </div>
  );
}
