# LoomCV ATS Scorer

> Standalone, local-first ATS resume optimization engine acting as a privacy-preserving extension to LoomCV.

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-18.3-blue?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=for-the-badge&logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-336791?style=for-the-badge&logo=postgresql)
![Ollama](https://img.shields.io/badge/Ollama-Local%20AI-black?style=for-the-badge)
![Gemini AI](https://img.shields.io/badge/Google-Gemini%20AI-orange?style=for-the-badge&logo=google)
![Status](https://img.shields.io/badge/Status-LoomCV%20Satellite%20Service-purple?style=for-the-badge)

---

# Live Demo

| Resource | Link |
|---|---|
| ATS Scorer Service (Live App) | [Live Demo](https://ats-score-checker-loom-cv.vercel.app/) |

---

# About The Project

LoomCV ATS Scorer is an independent, companion micro-frontend and API service designed to extend LoomCV's core capabilities. It allows job seekers to instantly verify how well their resumes match target job descriptions (JDs) using advanced ATS parsing and LLM-based gap analysis.

To eliminate cloud inference costs and guarantee absolute data privacy, the primary scoring engine executes **locally on the user's device** using Ollama (Llama 3, Mistral, etc.).

For LoomCV Premium subscribers, the service unlocks serverless cloud-based analysis powered by Google Gemini Flash and a one-click AI-assisted bullet point rewrite utility.

The application handles two distinct user journeys:

- **Path A (LoomCV Handoff):** A JWT-authenticated redirect flow that retrieves resume JSON from the parent LoomCV instance and persists analysis results in a dedicated PostgreSQL database.
- **Path B (Direct/Anonymous Visit):** A standalone web portal where users upload PDF or DOCX resumes. Extracted text is processed server-side, and results are cached client-side in `localStorage` to avoid storing unauthenticated data.

---

# Project Type

| Attribute | Value |
|---|---|
| Category | ATS Scorer & Resume Optimizer (LoomCV Satellite) |
| Architecture | Independent Next.js App Router Micro-Service |
| Rendering Model | React Server Components + Client Components |
| AI Inference | Local Ollama API (Llama 3 / Mistral) + Gemini Cloud Fallback |
| Database Model | PostgreSQL via Prisma (Path A tracking only) |
| Integration | JWT-based cross-site secure handoff API |

---

# Project Status

**Production-Ready Companion Service**

The system is fully functional, supporting local Ollama checkups, PDF/DOCX uploads, serverless cloud analysis, and tokenized handoffs. It features a complete mobile gate, error boundaries, rate-limiting, and telemetry placeholders.

Several architectural choices and optimizations are documented throughout the codebase for transparency and learning purposes.

---

# Why I Built This

Adding complex AI resume scoring directly into the main `LoomCV` codebase would increase bundle size, add routing overhead, and complicate deployment cycles. More importantly, cloud-based LLM inference (e.g., GPT-4 or Gemini) for long resume+JD checks becomes highly expensive at scale.

By building the ATS Scorer as a separate satellite site, we achieved:

- **Zero-Cost Inference:** Leveraging the user's local machine (via Ollama) keeps computational costs at $0.
- **Privacy Genuineness:** The user's resume content and job description are analyzed completely on-device, never leaving their local network.
- **Decoupled Architecture:** We can release new templates, scoring systems, and features for the ATS Scorer without modifying the main resume builder.
- **Organic User Acquisition:** The direct upload path acts as a free SEO acquisition funnel for LoomCV.

---

# Features

## Core Features

- **Dual Entry Flows:** Secure handoff token validation (from LoomCV) vs. direct PDF/DOCX file upload dropzone.
- **Local LLM Connection Probe:** On-page-load checking for local Ollama instances with interactive onboarding.
- **Progress-Aware Skeleton:** Step-by-step loading UX ("Reading resume..." -> "Comparing..." -> "Scoring...") to manage user latency expectations.
- **Comprehensive ATS Scoring:** Overall match score (0-100) and AI confidence indicators.
- **Gap Analysis:** Inline keyword matching badge lists (Matched vs. Missing).
- **Actionable Improvements:** Flagging passive voice, weak verbs, and structural improvements with suggested changes.
- **Cloud Fallback & AI Rewrite:** Serverless Gemini-based scoring and rewrite utilities for Pro/Premium LoomCV tiers.

---

## Engineering Features

- **Zero-DB Anonymous Path:** No database rows created for anonymous runs, preventing database bloat.
- **Structured JSON Constraints:** Strict Zod-validated response schemas for local LLMs, avoiding raw text leaks.
- **Resilient Auto-Retry:** Client-side Zod-parsing retry system on malformed LLM responses.
- **PDF & DOCX Parsing:** Fast server-side text extraction from files.
- **Versioned Handoff API:** Secure v1 REST endpoints to communicate with LoomCV.

---

## Security Features

- **Short-Lived JWT Verification:** Token-based handoff expires in 5 minutes and is strictly single-resume scoped.
- **Sandbox File Parsing:** Server-side file checks (MIME-type validation, 5MB file-size limits) to handle adversarial uploads.
- **Local CORS Isolation:** Prominent config guidelines to bind Ollama to the specific ATS Scorer domain.
- **Rate Limiting:** IP-based sliding window rate-limiter to protect upload and analysis endpoints.

---

## Developer Experience Features

- **Unified Design System:** Stylistic alignment with shadcn/ui and custom dark/light theme options.
- **Error Boundaries:** Graceful fallback states for network issues, parsing fails, or local LLM offline modes.
- **Telemetry Stubs:** Consolidated telemetry layer for easy integration with PostHog or Plausible.

---

# Tech Stack

## Frontend

| Technology | Purpose |
|---|---|
| Next.js 15 | App Router framework |
| React 18.3 | Core UI library |
| TypeScript | Type safety |
| Tailwind CSS | Styling |
| Lucide React | Modern icons |

---

## Backend & APIs

| Technology | Purpose |
|---|---|
| Next.js Route Handlers | Serverless API endpoints |
| Jose | Secure JWT signing & verification |
| pdf-parse | Server-side PDF extraction |
| mammoth | Server-side Word/DOCX extraction |

---

## Database & Storage

| Technology | Purpose |
|---|---|
| PostgreSQL | Persisting Path A results |
| Prisma ORM | Type-safe database queries |

---

## Inference Engines

| Technology | Purpose |
|---|---|
| Ollama (Client-side) | Running local models (Llama 3 8B, Mistral 7B) |
| Google Gemini Flash | Cloud fallback & AI Rewrite for Premium users |

---

# Architecture

The ATS Scorer uses Next.js Route Handlers as a serverless backend API and runs local inference directly from the client's browser to their local Ollama server.

```text
                       [ Path A: Handoff Flow ]
  LoomCV Editor  ───(Clicks ATS Button)───► ATS Scorer (opens in new tab)
        │                                         │
        │                                         ▼
        │◄───(GET /api/internal/v1/resumes/:id)───┤  (Verifies token,
        │       Fetch Resume JSON data            │   fetches text)
        ▼                                         ▼
                                          [ Path B: Direct Visit ]
                                          Dropzone ──► PDF/DOCX Parser
                                                              │
                                                              ▼
                                                        Normalized Resume
                                                              │
                                                              ▼
                                              User pastes Job Description
                                                              │
                    ┌─────────────────────────────────────────┴─────────────────────────────────────────┐
                    ▼                                                                                   ▼
         [ Free Tier / Local LLM ]                                                            [ Premium / Cloud Tier ]
         Ping localhost:11434                                                                 Verify Premium claims in JWT
                    │                                                                                   │
                    ▼                                                                                   ▼
      Inference runs locally via Ollama                                                     Inference runs on Vercel
   (Llama 3 / Mistral) on visitor's device                                                      (Google Gemini Flash)
                    │                                                                                   │
                    ▼                                                                                   ▼
         Zod Schema Verification                                                             Zod Schema Verification
                    │                                                                                   │
                    └─────────────────────────────────────────┬─────────────────────────────────────────┘
                                                              ▼
                                                        Display UI &
                                                   Save results (DB / Local)
```

---

# Installation

## Prerequisites

- Node.js >= 18.17.0
- PostgreSQL database
- Ollama installed locally
- Google Gemini API key (optional, for Cloud fallback features)

---

## Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/Heramb1221/ATS-Score-Checker-LoomCV.git
   cd ATS-Score-Checker-LoomCV
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```
4. Run migrations/generate database:
   ```bash
   npx prisma generate
   npx prisma db push
   ```
5. Run the dev server:
   ```bash
   npm run dev
   ```

---

## Ollama Setup

1. Download and install Ollama from [ollama.com](https://ollama.com).
2. Download the recommended model (Llama 3 8B):
   ```bash
   ollama pull llama3:8b
   ```
3. Run the Ollama server with CORS enabled:
   ```powershell
   # Windows (PowerShell)
   $env:OLLAMA_ORIGINS="http://localhost:3000"
   ollama serve
   
   # Linux/macOS
   OLLAMA_ORIGINS="http://localhost:3000" ollama serve
   ```

---

## Wiring up LoomCV (Parent Repo)

1. Copy the integration components/routes from the `loomcv-integration/` directory in this repo into your LoomCV project:
   - `loomcv-integration/components/AtsScoreButton.tsx` -> `components/AtsScoreButton.tsx`
   - `loomcv-integration/app/api/internal/ats-handoff/route.ts` -> `app/api/internal/ats-handoff/route.ts`
   - `loomcv-integration/app/api/internal/v1/resumes/[id]/route.ts` -> `app/api/internal/v1/resumes/[id]/route.ts`
2. Set up the `ATS_HANDOFF_SECRET` environment variable in both `loomcv` and `ats-scorer` configurations to be the exact same string (e.g., generated via `openssl rand -base64 32`).
3. Add the `<AtsScoreButton resumeId={resume.id} />` to the editor toolbar in your LoomCV project.

---

# Environment Variables

Create a `.env.local` file:

```env
# Database
DATABASE_URL="postgresql://user:pass@host:port/dbname?sslmode=require"

# Gemini (Optional, for Cloud fallback)
GEMINI_API_KEY=""

# Integration Secrets
ATS_HANDOFF_SECRET=""
LOOMCV_BASE_URL="http://localhost:3000"

# App Settings
NEXT_PUBLIC_BASE_URL="http://localhost:3001"
NEXT_PUBLIC_OLLAMA_URL="http://localhost:11434"
```

---

# Usage

## Handoff Journey (Path A)

1. Click the **"Check ATS Score"** button on the LoomCV resume editor toolbar.
2. The browser redirects to the ATS Scorer site in a new tab with a signed token.
3. The ATS Scorer loads the resume details from the LoomCV API.
4. Paste the target Job Description in the text area and click **"Analyze"**.
5. View the score, confidence rating, gap analysis, and suggestions.
6. Click the deep link to go back to editing the resume in LoomCV.

---

## Anonymous Journey (Path B)

1. Land directly on the ATS Scorer site.
2. Drag and drop your resume file (PDF/DOCX) into the file zone.
3. Verify the extracted plain-text preview.
4. Paste the target Job Description in the text area and click **"Analyze"**.
5. Receive the results cached client-side.
6. View the LoomCV signup upsell CTA.

---

# API & Integration Documentation

## Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/verify-handoff` | POST | Verifies the signed JWT and checks permissions |
| `/api/upload-resume` | POST | Processes and extracts plain text from PDF/DOCX uploads |
| `/api/analyses` | POST / GET | Persists or fetches authenticated analysis reports |
| `/api/premium/cloud-analyze` | POST | Runs Gemini Flash-based cloud analysis (Premium only) |
| `/api/premium/rewrite` | POST | Runs Gemini-based bullet point rewrites (Premium only) |

---

# Performance Considerations

- **Local Inference Latency:** Running 8B models locally on CPU can take between 30-90 seconds. We address this with progressive progress skeletons and a friendly warning state if inference exceeds 120s.
- **Client-to-Local Network Calls:** Fetching directly from `localhost:11434` prevents server-side round trips and offloads CPU/network costs from Vercel to the client.
- **File Parsing Speeds:** Mammoth and pdf-parse run in serverless API contexts to extract text from files in under 200ms.

---

# Security Considerations

## Implemented

- **JWT Expiration:** A 5-minute single-use window is applied to handoff tokens to prevent replay attacks.
- **CORS Restraints:** Forcing users to bind `OLLAMA_ORIGINS` to the ATS Scorer URL prevents unauthorized sites from hijack-running models on the user's machine.
- **Sanitized Uploads:** Server-side MIME-type checks and a 5MB size limit protect the Node runtime from malformed/large file attacks.
- **PII Isolation:** Local Ollama analyses never send the resume or JD contents to external servers.

---

# Tradeoffs & Limitations

| Decision | Tradeoff |
|---|---|
| Local Ollama inference | $0 inference cost and complete privacy, but requires local setup and relies on user hardware |
| Client-side localhost fetches | Keeps data local, but introduces CORS configuration hurdles for non-technical users |
| Separate DB schema | Complete decoupling of migrations and schemas, but requires maintaining separate connections |
| No DB rows for Path B | Protects the DB from spam/bloat, but prevents cross-browser caching of anonymous results |

---

# Known Issues

- **`OLLAMA_ORIGINS` Setup Friction:** Users might struggle to launch Ollama with the correct environment variables. We mitigate this with an interactive walkthrough.
- **PDF Extraction Layouts:** Multi-column PDF layouts may sometimes parse out-of-order, affecting keywords. Showing the extracted plain text resolves this transparently.

---

# Technical Debt

- In-memory rate limiting (needs Upstash Redis before scaling to multi-region/serverless).
- Mock telemetry wrapper (`lib/telemetry.ts`).
- No automated unit test coverage for prompt configurations.

---

# Challenges Faced

- Tuning prompts for smaller local LLMs (e.g., Llama 3 8B) to output strict, schema-valid JSON without markdown wrapper blocks.
- Structuring and securing JWT cross-site handoffs safely.

---

# What I Learned

- Designing robust cross-domain secure token workflows.
- Managing client-to-local network calls and CORS configuration.
- Building interactive loader animations to make high-latency background operations feel fast.

---

# Future Scope

- **History Scanning:** Storing and graphing score history trends for Path A users.
- **IndexedDB Sync:** Local browser storage of Path B runs.
- **PDF Gap Exports:** Allowing users to download the gap analysis as a PDF checklist.

---

# Repository Philosophy

LoomCV ATS Scorer was built as a privacy-preserving, zero-cost-inference expansion to the LoomCV ecosystem.

The codebase documents and explores:
- Local LLM client-side inference patterns.
- Secure token-based micro-service orchestration.
- Sandboxed server-side text extraction.

to demonstrate a practical and cost-effective approach to full-stack AI engineering.

---

# License

Distributed under the MIT License. See `LICENSE` for details.

---

# Contact

**Heramb Chaudhari**

[![GitHub](https://img.shields.io/badge/GitHub-Heramb1221-black?style=for-the-badge&logo=github)](https://github.com/Heramb1221)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Heramb%20Chaudhari-blue?style=for-the-badge&logo=linkedin)](https://www.linkedin.com/in/heramb-chaudhari)
[![Email](https://img.shields.io/badge/Email-hchaudhari1221%40gmail.com-red?style=for-the-badge&logo=gmail)](mailto:hchaudhari1221@gmail.com)

---

Built as an extension to explore production-grade SaaS architecture with Next.js, Prisma, PostgreSQL, Ollama Local AI, and Google Gemini AI.
