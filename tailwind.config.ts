import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: { DEFAULT: "var(--card)", foreground: "var(--card-foreground)" },
        popover: { DEFAULT: "var(--popover)", foreground: "var(--popover-foreground)" },
        primary: { DEFAULT: "var(--primary)", foreground: "var(--primary-foreground)" },
        secondary: { DEFAULT: "var(--secondary)", foreground: "var(--secondary-foreground)" },
        muted: { DEFAULT: "var(--muted)", foreground: "var(--muted-foreground)" },
        accent: { DEFAULT: "var(--accent)", foreground: "var(--accent-foreground)" },
        destructive: "var(--destructive)",
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        /* Decide semantic tokens */
        decide: {
          "surface-subtle": "var(--decide-surface-subtle)",
          "surface-warm":   "var(--decide-surface-warm)",
          "border":         "var(--decide-border)",
          "border-warm":    "var(--decide-border-warm)",
          "text-secondary": "var(--decide-text-secondary)",
          "text-tertiary":  "var(--decide-text-tertiary)",
          "text-muted":     "var(--decide-text-muted)",
          "text-faint":     "var(--decide-text-faint)",
          "accent":         "var(--decide-accent)",
          "accent-dark":    "var(--decide-accent-dark)",
        },
      },
      fontFamily: {
        sans:  ["var(--font-sans)"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
        mono:  ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        "2xs": ["11px", { lineHeight: "1.4" }],
        "xs":  ["12px", { lineHeight: "1.4" }],
        "sm":  ["13px", { lineHeight: "1.5" }],
        "base":["14px", { lineHeight: "1.6" }],
        "lg":  ["16px", { lineHeight: "1.5" }],
        "xl":  ["18px", { lineHeight: "1.3" }],
        "2xl": ["20px", { lineHeight: "1.3" }],
        "3xl": ["28px", { lineHeight: "1.15" }],
      },
      letterSpacing: {
        "tightest": "-0.025em",
        "tighter":  "-0.02em",
        "tight":    "-0.015em",
        "snug":     "-0.01em",
        "wide":     "0.08em",
        "wider":    "0.1em",
        "widest":   "0.12em",
      },
      borderRadius: {
        DEFAULT: "var(--radius)",
        sm: "calc(var(--radius) - 4px)",
        md: "calc(var(--radius) - 2px)",
        lg: "var(--radius)",
        xl: "calc(var(--radius) + 4px)",
        "2xl": "calc(var(--radius) + 8px)",
        full: "9999px",
      },
    },
  },
  plugins: [],
};
export default config;
