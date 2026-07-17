# LoomCV — Local AI-Powered ATS Scorer
### Product Requirements Document & Phased Implementation Blueprint

**Author:** Heramb | **Project:** LoomCV | **Status:** Draft v1.0
**Stack context:** Next.js 15, Prisma + PostgreSQL, Clerk (auth), Stripe (billing), Tailwind CSS, existing Gemini AI integration

---

## Architecture Decision (read this first)

Two decisions stack together here:

**1. Deployment topology: separate site, not an embedded drawer.**
The ATS Scorer is a **standalone, independently hosted web app** (e.g. `ats.loomcv.app` or similar). LoomCV's editor only shows a **"Check ATS Score" button that navigates the user there** — it is not a `Sheet`/modal/drawer living inside the LoomCV codebase. This decouples release cycles (you can ship ATS Scorer updates without touching LoomCV's deploy) and keeps LoomCV's bundle lean, but it introduces two problems the old in-app-drawer plan didn't have, both addressed below:
- **How does the resume data get to the separate site?** (Section 6.1)
- **How does the user stay authenticated / on the right subscription tier across two domains?** (Section 6.2)

**2. Inference topology: Ollama runs on the end-user's own machine**, not on your servers. The browser (on the *ATS Scorer site*, now) talks to `http://localhost:11434`, where Ollama exposes its REST API once installed. This means:

- **Cost to you: $0.** No GPU box to rent, no inference bill, no scaling problem.
- **Privacy is a selling point.** The resume and JD never leave the user's machine for the actual AI call — a genuine differentiator vs. cloud-ATS-checkers.
- **Friction:** the user must install Ollama once. This is the natural fork point for monetization later — free tier requires local Ollama, Premium tier offers a "we run it for you" cloud fallback (using your existing Gemini pipeline, running server-side on the ATS Scorer site itself).
- **This is a desktop-browser feature only.** Ollama has no mobile equivalent, so the "Check ATS Score" button in LoomCV should be gracefully hidden or disabled with an explanatory tooltip on mobile viewports, and the ATS Scorer site itself should show a "please open on desktop" state if landed on from mobile.

---

# PART 1: Product Requirements Document

## 1. Problem Statement & Objective

Job seekers using LoomCV build well-formatted resumes but have no way to know if their resume will actually pass an employer's ATS filter for a *specific* job before applying. Today they either guess, or use third-party ATS checkers that require re-uploading their resume to a different site, breaking the LoomCV editing flow and often gating results behind a paywall or an email capture.

**Objective:** Let a LoomCV user paste a target Job Description and get an instant, privately-computed ATS match score and actionable gap analysis — without leaving the editor, and without LoomCV paying a cent in inference costs.

## 2. Target Audience

- **Primary:** Active job seekers mid-application, editing a resume in LoomCV, who have a specific JD open in another tab.
- **Secondary:** Students/early-career users (RCPIT-style audience) applying to many roles and needing fast iteration feedback across multiple JDs.
- **Tertiary:** Power users who want to A/B test different resume phrasing against the same JD.
- **New — Direct visitors with a non-LoomCV resume.** Because the ATS Scorer is a separate, independently hosted site, it can be entered two ways: (a) via the signed handoff from LoomCV, or (b) directly, by anyone who lands on the site and uploads a resume built elsewhere (Word, another builder, a PDF export). This turns the tool into a standalone acquisition channel in its own right — someone who discovers it and likes it becomes a LoomCV signup candidate later, not just an existing user's utility.

## 3. Core Features (MVP)

| # | Feature | Detail |
|---|---|---|
| 3.1 | **"Check ATS Score" trigger** | Button in the LoomCV editor toolbar, always visible on desktop, opens a side drawer. |
| 3.2 | **JD input** | Plain textarea, paste-only (no file upload in MVP), min. 100 characters validation, character counter. |
| 3.3 | **Ollama connectivity check** | Before running analysis, ping `localhost:11434/api/tags`. If unreachable, show a setup guide (see Section 6 below) instead of a spinner that hangs forever. |
| 3.4 | **ATS Match Score (0–100)** | Single headline number, derived from weighted keyword/skill overlap + semantic relevance judged by the LLM. |
| 3.5 | **Confidence Score** | A secondary score (0–100) representing how *certain* the model is in its own scoring — critical because local 7–8B models are noisier than GPT-4-class models. Low confidence should visually de-emphasize the headline score and prompt the user to re-run or shorten the JD. |
| 3.6 | **Gap Analysis** | Two-column badge list: ✅ Matched Keywords (present in both resume & JD) vs. ❌ Missing Keywords (in JD, absent from resume). |
| 3.7 | **Actionable Improvements** | Bullet list of concrete fixes: passive-voice sentences flagged with a suggested active-voice rewrite; weak verbs flagged with 2–3 stronger alternatives. Not full rewrites in MVP — just pointers. |
| 3.8 | **Structured JSON contract** | The LLM must return a strict, schema-validated JSON object — no freeform prose leaking into the UI (see Phase 1). |
| 3.9 | **Result persistence** | **Path A (LoomCV-linked):** store the last analysis result in Postgres via Prisma, scoped to `resumeId` + a hash of the JD, so revisiting doesn't force a re-run. **Path B (anonymous):** persist client-side only (`localStorage`/`sessionStorage`, keyed by a hash of the uploaded resume text + JD), never as a permanent DB row — see 6 (NFRs) for rationale. |
| 3.10 | **Resume handoff on redirect** | LoomCV must pass the resume content to the ATS Scorer site on click — see Section 6.1 for the mechanism. This is a first-class MVP requirement, not an implementation detail. |
| 3.11 | **Direct resume upload (new)** | For visitors who arrive without a handoff token, the ATS Scorer site must accept a resume upload directly — PDF and DOCX at minimum. This is now **MVP scope**, not a future/premium feature, because it's the only way non-LoomCV visitors can use the tool at all. |

**Explicitly out of scope for MVP:** full AI resume rewriting, multi-resume batch comparison, ATS score history/trends dashboard, plain-text/RTF resume upload (PDF + DOCX cover the vast majority of real-world resumes).

### 3.1a Two Entry Paths Into the ATS Scorer Site

The site now needs to handle **two distinct entry flows** cleanly, sharing the same downstream analysis UI:

**Path A — From LoomCV (handoff token).**
1. **Recommended for MVP — Signed short-lived token in the URL.** LoomCV generates a signed, short-expiry JWT (e.g. `resumeId` + `userId`, signed with a shared secret env var, 5-minute expiry) and redirects to `https://ats.loomcv.app?token=<jwt>`. The ATS Scorer site verifies the token server-side, then calls back into a LoomCV internal API endpoint (`GET /api/internal/resumes/:id`) to fetch the actual resume JSON, authenticated by that same token.
2. **Alternative — Direct API call, shared auth cookie.** If both sites are subdomains of the same root domain, Clerk's session cookie can be scoped to the root domain and read by both — cleanest UX if DNS allows it.

**Path B — Direct visit, upload own resume (new).**
3. Visitor lands on `ats.loomcv.app` with no token present.
4. Site shows a **file dropzone** ("Upload your resume — PDF or DOCX") instead of the read-only LoomCV-sourced preview.
5. Server-side parsing extracts plain text from the upload (see Phase 1/2 for library choice) and normalizes it into the **same internal resume-text shape** the LoomCV-sourced path produces, so the downstream analysis/prompt logic doesn't need to know or care which path the resume came from.
6. Once parsed, the flow rejoins the common path: JD textarea → Analyze → results.
7. **Soft upsell, not a hard gate:** after showing results, display a "Want to keep editing this resume with real-time formatting? Build it in LoomCV" call-to-action. This is your acquisition funnel — don't gate the free analysis behind a LoomCV signup, or you kill the standalone-tool value entirely.

## 4. Future / Premium Features (Monetization)

| Feature | Tier | Rationale |
|---|---|---|
| **One-click AI rewrite** of flagged bullet points (uses your existing Gemini pipeline) | Premium | Local Ollama models are good at *flagging* issues but weaker at high-quality generative rewrites at 7–8B scale. Cloud model = better output = paid feature. |
| **Cloud fallback** (skip Ollama install entirely, run scoring via Gemini API) | Premium | Removes the installation friction for users who'd rather pay than set up Ollama. |
| **JD file upload** (paste-only in MVP, PDF/DOCX JD upload later) | Premium or Free-with-limit | Convenience feature, cheap to gate. Distinct from *resume* upload (3.11), which is core/free MVP scope since it's required for non-LoomCV visitors to use the tool at all. |
| **Score history & trend tracking** across multiple applications | Premium | Turns a one-off utility into a retention feature — dashboard of "average ATS score improving over time." Naturally requires an account, so this is also where anonymous Path-B visitors get nudged toward creating a LoomCV account. |
| **Bulk JD comparison** — paste 5 JDs, get ranked fit | Premium | High-value for active job seekers, computationally heavier (justifies paywall). |
| **Export gap analysis as PDF/checklist** | Free | Low cost, drives shareability/virality. |
| **Unlimited anonymous uploads** | Free — no usage cap by design | Analyses are fully unlimited for every visitor, including anonymous Path-B users. Rate limiting exists purely as an **abuse/scraping guard** (e.g. a generous threshold like 20+ requests/hour per IP), not a monetization lever — local Ollama inference costs you nothing, so there's no cost basis to gate on. The upsell to LoomCV (3.1a, step 7) is the only conversion mechanism; it's never paywalled. |

## 5. User Experience (UX) Flow

**Entry Path A — From LoomCV:**
1. User is editing a resume in LoomCV, clicks **"Check ATS Score"** in the toolbar.
2. LoomCV generates the signed handoff token (Section 3.1a) and **navigates the browser** to the ATS Scorer site — recommended as a **new tab** (`target="_blank"`) rather than a full redirect, so the user doesn't lose their place in the LoomCV editor.
3. ATS Scorer site loads, verifies the token, fetches the resume content from LoomCV's internal API, and renders the **resume in a read-only left pane** it owns.

**Entry Path B — Direct visit:**
3a. Visitor lands on `ats.loomcv.app` directly (no token) — e.g. via search, a shared link, or word of mouth.
3b. Site shows a **file dropzone** ("Upload your resume — PDF or DOCX, max 5MB") in place of the read-only preview.
3c. On upload, the site parses the file server-side, shows a plain-text preview for the user to sanity-check extraction quality (parsing PDFs is imperfect — this confirmation step avoids silently scoring against garbled text), and proceeds once confirmed.

**Common path from here:**
4. **First-run only:** the site checks Ollama connectivity in the background.
   - If not detected → show the inline "Set up Ollama" guide (Section 6) with a "Retry" button.
   - If detected → proceed to step 5.
5. Right pane shows a textarea: *"Paste the Job Description you're targeting."*
6. User pastes JD, clicks **"Analyze."**
7. Button enters a loading state with a **progress-aware skeleton** (see NFRs — local inference can take 15–90s, so a plain spinner is not acceptable UX).
8. Result renders progressively:
   - Score badge animates in first (feels fast).
   - Confidence indicator appears next to it.
   - Matched/Missing keyword chips populate below.
   - Actionable improvements list renders last (most token-heavy part of the LLM output).
9. **Path A only:** the improvements list includes a **"Edit this resume in LoomCV" deep link** back to the specific resume, closing the loop between the two sites.
   **Path B only:** the results view instead shows the soft upsell (3.1a, step 7) — "Build and refine this resume properly in LoomCV" — since there's no live resume to link back to.
10. Result persists per Section 3.9: **Path A** saves to Postgres (survives across devices/sessions since it's tied to the LoomCV account); **Path B** saves to `localStorage` only (survives a page refresh in the same browser, but is not recoverable elsewhere) — no anonymous data is ever written to the server-side database.

## 6. Non-Functional Requirements

- **Latency tolerance:** Local LLM inference on consumer hardware (no dedicated GPU) can realistically take 20–90 seconds for a ~500-token structured JSON response on a 7–8B model. The UI must:
  - Never show an indefinite spinner with no context.
  - Show a multi-stage skeleton ("Reading resume…" → "Comparing against JD…" → "Scoring…") even if these stages aren't literally instrumented — it manages perceived wait time.
  - Have a hard client-side timeout (e.g., 120s) with a friendly "This is taking longer than expected — your machine's Ollama may be under load" message and a retry option.
- **Graceful degradation:** If Ollama is not installed/running, the feature must not crash the editor. Show a first-class "Set up local AI" onboarding card instead of an error toast.
- **JSON reliability:** Local models are more prone to malformed JSON than GPT-4-class APIs. Every response must be schema-validated (Zod) with at least one automatic re-prompt retry on parse failure before falling back to an error state.
- **Privacy:** No resume or JD text is ever sent to LoomCV's servers for this feature (MVP, free tier) — reinforce this in the UI copy as a trust signal.
- **Model portability:** Prompt design should be tested against at least two model families (Llama 3 8B, Mistral 7B) so users aren't locked into one pull.
- **Mobile handling:** Feature is desktop-only in MVP; hide/disable the trigger button on small viewports with an explanatory tooltip rather than silently failing.
- **Cross-site security (from 3.1a):** The handoff token must be short-lived (≤5 min), single-purpose (scoped to one `resumeId`, not a general-purpose auth token), and verified server-side on the ATS Scorer site before any resume data is fetched. Never put raw resume content in the URL/query string itself — only the token.
- **Two-codebase versioning discipline:** Since the sites deploy independently, the internal handoff API contract (token shape, resume JSON shape) needs versioning from day one (e.g. `/api/internal/v1/resumes/:id`) so LoomCV and ATS Scorer can be deployed out of lockstep without breaking each other.
- **Upload safety (new, Path B):** Uploaded files need server-side MIME-type validation (don't trust the file extension), a hard size cap (e.g. 5MB), and parsing must run in a sandboxed/timeout-bounded way — a malformed or adversarial PDF should fail gracefully, not hang or crash the parsing service.
- **Anonymous abuse prevention (Path B) — not a usage cap:** Since analyses are fully unlimited by design, rate limiting exists solely to stop scraping/spam/bot abuse — set thresholds generously (e.g. 20+ requests/hour per IP) rather than as a monetization lever. A real job seeker running many legitimate analyses in a session should never hit the limit.
- **PDF extraction honesty:** PDF text extraction is inherently imperfect (multi-column layouts, tables, unusual fonts). Always show the user the extracted plain text before analysis so they can catch garbled parsing rather than silently getting a bad score from bad input.
- **Anonymous storage boundedness (new):** Since Path B is unlimited and requires no account, **never write a permanent database row per anonymous analysis** — with no login wall, this is an unbounded growth vector with no natural attribution or cleanup path (you can't tie rows to a user to expire them, and "delete old rows" jobs are a band-aid on a design that shouldn't need one). Persist Path B results client-side only (`localStorage`, keyed by a hash of resume-text + JD). If server-side caching is later added purely as a performance optimization (e.g. to skip re-running identical resume+JD pairs across different anonymous visitors), key it by content hash only — never by visitor/session identity — and apply a hard TTL (e.g. 24–72 hours) with a scheduled cleanup job, so the table self-limits regardless of traffic volume.

---

# PART 2: Phased Implementation Plan

## Phase 1 — Local AI Setup & Proof of Concept (POC)

**Goal:** Prove that a local model can reliably return the exact JSON shape you need, before writing a single line of integration code in either codebase (LoomCV or the new ATS Scorer site).

1. Install Ollama locally (`ollama.com` → install → `ollama pull llama3:8b` and `ollama pull mistral:7b` for comparison).
2. Run `ollama serve` and confirm `curl http://localhost:11434/api/tags` returns your pulled models.
3. Define the strict output contract as a **Zod schema first** — design the JSON shape before the prompt:
   ```ts
   const AtsResultSchema = z.object({
     matchScore: z.number().min(0).max(100),
     confidenceScore: z.number().min(0).max(100),
     matchedKeywords: z.array(z.string()),
     missingKeywords: z.array(z.string()),
     improvements: z.array(z.object({
       type: z.enum(["passive_voice", "weak_verb", "missing_keyword", "formatting"]),
       original: z.string(),
       suggestion: z.string(),
     })),
   });
   ```
4. Craft the system prompt with **explicit JSON-only instructions**, few-shot examples, and an instruction to never include markdown fences or prose outside the JSON object. Local models drift toward chattiness — be aggressive about constraining this.
5. Test via raw `curl`/Postman against `/api/generate` (or `/api/chat`) with `"format": "json"` — Ollama supports a `format: "json"` param that constrains output, use it.
6. Run 15–20 test cases (varied resume/JD pairs) manually, log failure modes: malformed JSON, hallucinated keywords, score inconsistency across identical inputs (temperature tuning — start at `temperature: 0.2` for consistency).
7. Compare Llama 3 8B vs Mistral 7B output quality and latency on your own dev machine; pick a documented "recommended" default model for the setup guide.
8. Document minimum hardware expectations (RAM, ideally GPU) to set correct user expectations in the onboarding card.
9. **New — resume parsing spike:** test PDF text extraction (e.g. `pdf-parse` or `pdfjs-dist` for Node) and DOCX extraction (e.g. `mammoth`, which you've already used on prior projects) against 10–15 real-world resume files with varied layouts (single-column, two-column, tables). Log extraction quality failures — this determines whether you need a "confirm the extracted text" step in the UI (recommended regardless, per NFRs).

**Exit criteria:** >90% of test runs return valid, schema-compliant JSON on the first attempt without retry.

## Phase 2 — Backend Integration & API Layer

**Goal:** Wire Ollama into the **new ATS Scorer codebase's** backend cleanly, and build the minimal handoff surface on the **LoomCV side**, with retries and graceful failure built in from day one.

**On the LoomCV side (small footprint — this is most of what LoomCV needs to ship):**
1. Add the "Check ATS Score" button + click handler that requests a signed handoff token from a new `POST /api/internal/ats-handoff` Server Action.
2. Implement the internal, versioned API endpoint `GET /api/internal/v1/resumes/:id` that verifies the handoff token and returns the resume's structured JSON (title, sections, bullet content) — this is the *only* new backend surface LoomCV needs for this feature.
3. Scope the JWT signing secret as a shared env var (`ATS_HANDOFF_SECRET`) present in both LoomCV's and the ATS Scorer's deployment environments.

**On the new ATS Scorer site (most of the engineering effort lives here):**
4. Scaffold the standalone app (recommend a lean Next.js app, or even Vite + React if you want a lighter footprint than full Next.js for a single-purpose tool).
5. Build the token verification + resume-fetch flow on load (calls back into LoomCV's internal API from step 2).
6. Decide the Ollama call path: **client-side fetch directly to `localhost:11434`** (simplest, keeps data fully local) is recommended — do JSON validation/retry orchestration in a client-side hook, not a server route, to preserve the "nothing leaves the device" guarantee for the actual AI inference.
6a. **New — build `POST /api/upload-resume`:** accepts PDF/DOCX, validates MIME type + size server-side, runs the parsing library chosen in Phase 1, returns normalized plain text. This endpoint has no auth requirement (Path B is anonymous) but must be rate-limited (NFRs).
7. Handle CORS: Ollama blocks cross-origin requests by default. Document the required env var for users: `OLLAMA_ORIGINS=https://ats.loomcv.app` (or `*` for local dev), set before running `ollama serve`. This is the #1 support-ticket risk — surface it prominently in the setup guide.
8. Build a `useAtsAnalysis` client hook: manages connectivity check, request lifecycle, streaming/polling state, Zod validation, and a single automatic re-prompt retry on schema failure.
9. Implement the connectivity check (`GET /api/tags`) as a lightweight probe run on page load, cached for the session.
10. Add a Prisma model (in the ATS Scorer's own database — decouples its schema/migrations from LoomCV's) to persist results **for Path A (authenticated, LoomCV-linked) users only**:
   ```prisma
   model AtsAnalysis {
     id          String   @id @default(cuid())
     resumeId    String   // foreign concept only — references LoomCV's resume, not a local FK
     userId      String
     jdHash      String
     matchScore  Int
     confidence  Int
     resultJson  Json
     createdAt   DateTime @default(now())
     @@unique([resumeId, jdHash])
   }
   ```
10a. **For Path B (anonymous),** skip this table entirely — persist the result client-side (`localStorage`, keyed by a content hash of resume-text + JD) so revisiting the tab still shows the last result, with zero server-side storage or attribution. This is a deliberate scope boundary, not a missing feature — see NFRs for why.
10b. **Optional, later:** if repeated identical resume+JD pairs across *different* anonymous visitors turn out to be common enough to justify a cache (unlikely early on, worth deferring), add a separate `AnalysisCache` table keyed purely by content hash — no visitor identity — with a TTL/cleanup job. Don't build this speculatively in MVP.
11. Implement the hard client-side timeout (120s) with abort-controller-based cancellation of the fetch.
12. **New — add rate-limiting middleware** (e.g. Upstash Redis or a simple in-memory/IP-based limiter if starting lean) on both `/api/upload-resume` and the analysis-save endpoint. Set thresholds generously — this is a bot/scraping guard, not a usage cap, since analysis itself is unlimited by design.

**Exit criteria:** End-to-end flow works from clicking the button in LoomCV → landing authenticated on the ATS Scorer site with the correct resume loaded → local Ollama → validated JSON → saved result, with connectivity failure, expired-token, and inference timeout all handled without a broken/blank page.

## Phase 3 — Frontend UI & UX Development

**Goal:** Build the standalone ATS Scorer site's UI, plus the one small piece of UI that stays in LoomCV.

**In LoomCV (minimal):**
1. Add the "Check ATS Score" button to the editor toolbar, styled consistently with LoomCV's existing design system, opening the ATS Scorer site in a new tab.
2. Add responsive handling: hide/disable this button below `md` breakpoint with a tooltip ("ATS Scoring requires desktop + local AI setup").

**On the ATS Scorer site (the bulk of Phase 3):**
3. Build the two-pane layout: resume preview pane (left) + JD input/results pane (right) — this recreates the "side-by-side" feel entirely within the new site, since it no longer shares a DOM with LoomCV's live editor. **The left pane has two states:** read-only LoomCV-sourced preview (Path A) or file dropzone + extracted-text confirmation view (Path B).
3a. **New — build the upload dropzone component:** drag-and-drop + click-to-browse, accepts `.pdf`/`.docx` only, shows upload progress, then renders the extracted plain text with an "Looks right? / Try a different file" confirmation step before enabling analysis.
4. Build a **visual theme that reads as "part of the LoomCV family"** even though it's a separate deploy — reuse LoomCV's color tokens/fonts/component styles so the redirect doesn't feel jarring or like leaving to a third-party tool. This matters more now than it would for an in-app drawer, precisely because it *is* a separate site.
5. Build the JD textarea input with character-count validation and a disabled "Analyze" button until the 100-char minimum is met.
6. Build the **onboarding/setup card** for when Ollama isn't detected: step-by-step install instructions, a copy-pastable `OLLAMA_ORIGINS` command, and a "Retry connection" button.
7. Build the multi-stage loading skeleton (fake but honest staged messaging, per NFRs).
8. Build the results view:
   - Circular/radial score badge (green ≥80, amber 50–79, red <50) with the confidence score as a smaller secondary badge — visually de-emphasized (e.g., outlined, muted color) when confidence is low.
   - Two-column keyword chip layout (matched = green outline, missing = red outline).
   - Improvements list as expandable cards: original phrasing struck through or muted, suggested rewrite highlighted.
   - The "Edit this resume in LoomCV" deep link (Section 5, step 9) placed prominently near the improvements list.
9. Wire "Re-analyze" to preserve the previous result in a dimmed state during the new fetch (avoid layout collapse).
10. Build a token-expired/invalid state (e.g., user bookmarks the ATS Scorer URL and returns after the 5-minute token window) that prompts them to go back to LoomCV and click the button again, rather than showing a raw error.

**Exit criteria:** A user with Ollama running locally can click the button in LoomCV, land on a correctly-themed ATS Scorer page with their resume already loaded, and complete the full flow with no console errors and no jarring layout shifts.

## Phase 4 — Optimization, Polish & Monetization

**Goal:** Harden the feature and connect it to your existing Stripe subscription logic — now across two domains.

1. Add comprehensive error boundaries around the ATS Scorer's core view so a malformed response or crashed fetch never takes down the whole page.
1a. Include the user's **subscription tier** as a claim inside the handoff JWT (Section 3.1a) so the ATS Scorer site knows immediately on load whether to show Premium-gated UI, without a separate round-trip to LoomCV's billing system.
2. Add telemetry (privacy-respecting — no resume/JD content, just event counts): analysis started, completed, failed, timed out, model used — to understand real-world reliability across model families.
3. Gate **Premium-only** sub-features behind your existing Stripe subscription check (reuse the pattern already in LoomCV's billing logic):
   - Cloud fallback toggle (skip local Ollama, use Gemini).
   - AI rewrite button on each flagged improvement.
   - JD file upload.
4. Add a "Recommended model" selector in Settings so power users can switch between Llama 3 / Mistral / other pulled models without code changes.
5. Add caching by `(resumeId, jdHash)` so identical re-analysis requests skip inference entirely and just read Prisma.
6. Write the public-facing setup documentation (README section or in-app help) covering: install Ollama, pull a model, set `OLLAMA_ORIGINS`, verify with `curl`. This doubles as your open-source contribution-friendly docs.
7. Load-test the JSON retry logic against intentionally malformed model outputs to confirm the UI degrades to a clear error state rather than a silent hang.

**Exit criteria:** Feature is production-ready, monetization hooks are live, and a new user can go from "never heard of Ollama" to "seeing an ATS score" using only in-app guidance.

---

## Quick-Start Guide (for your README / in-app onboarding card)

```bash
# 1. Install Ollama
# macOS/Linux:
curl -fsSL https://ollama.com/install.sh | sh
# Windows: download installer from ollama.com

# 2. Pull the recommended model
ollama pull llama3:8b

# 3. Allow LoomCV's domain to talk to your local Ollama instance
# macOS/Linux:
export OLLAMA_ORIGINS="http://localhost:3000,https://your-loomcv-domain.com"
ollama serve

# 4. Verify it's running
curl http://localhost:11434/api/tags
```

Once `ollama serve` is running with the correct `OLLAMA_ORIGINS`, the "Check ATS Score" button in LoomCV will detect it automatically.
