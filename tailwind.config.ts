import type { Config } from "tailwindcss";

// Design language: "Overlap" — the tool's entire job is measuring the
// intersection between two documents (resume ∩ job description), so the
// visual system leans on overlap/intersection as its organizing idea rather
// than a generic dashboard-and-gauge look.
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F6F5F1", // cool paper, not the cream AI-default
        ink: "#181A1B",
        graphite: "#4A4E52",
        line: "#DEDBD1",
        signal: {
          DEFAULT: "#2A5CD6", // deep signal-blue — the "match" accent
          soft: "#E7ECFB",
        },
        match: {
          strong: "#1F8A4C",
          strongSoft: "#E5F3EA",
          mid: "#C77A16",
          midSoft: "#FBEEDD",
          weak: "#C2382B",
          weakSoft: "#FBEAE7",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        sm: "3px",
        DEFAULT: "6px",
        lg: "10px",
      },
    },
  },
  plugins: [],
} satisfies Config;
