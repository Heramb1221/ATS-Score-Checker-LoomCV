import type { Metadata } from "next";
import { Fraunces, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

// Type pairing: Fraunces (a characterful, slightly editorial serif) for
// display headings, Inter for body copy, IBM Plex Mono for the data/readout
// elements (scores, keyword counts, setup commands) — the mono face is what
// gives the score/analysis parts of the page their "instrument reading" feel.
const display = Fraunces({ subsets: ["latin"], variable: "--font-display", weight: ["500", "600"] });
const body = Inter({ subsets: ["latin"], variable: "--font-body" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["400", "500"] });

export const metadata: Metadata = {
  title: "ATS Scorer — LoomCV",
  description: "See how your resume matches a job description, scored locally on your own machine.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable} ${mono.variable} font-body`}>{children}</body>
    </html>
  );
}
