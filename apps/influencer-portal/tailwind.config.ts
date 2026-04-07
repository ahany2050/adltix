import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Apple HIG system colors
        apple: {
          blue: "#0071E3",
          green: "#34C759",
          red: "#FF3B30",
          orange: "#FF9F0A",
          yellow: "#FFCC00",
          purple: "#AF52DE",
          pink: "#FF2D55",
          teal: "#5AC8FA",
          indigo: "#5856D6",
        },
        // Semantic surfaces
        surface: {
          DEFAULT: "#F5F5F7",
          elevated: "#FFFFFF",
        },
        // Semantic text
        primary: "#1D1D1F",
        secondary: "#6E6E73",
        tertiary: "#AEAEB2",
        // Separator
        separator: "rgba(0,0,0,0.08)",
      },
      fontFamily: {
        display: [
          "SF Pro Display",
          "-apple-system",
          "BlinkMacSystemFont",
          "Inter",
          "Segoe UI",
          "sans-serif",
        ],
        sans: [
          "Inter",
          "SF Pro Text",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
        mono: [
          "SF Mono",
          "ui-monospace",
          "Fira Code",
          "monospace",
        ],
      },
      fontSize: {
        "large-title": ["34px", { lineHeight: "41px", fontWeight: "700" }],
        "title-1": ["28px", { lineHeight: "34px", fontWeight: "700" }],
        "title-2": ["22px", { lineHeight: "28px", fontWeight: "700" }],
        "title-3": ["20px", { lineHeight: "25px", fontWeight: "600" }],
        headline: ["17px", { lineHeight: "22px", fontWeight: "600" }],
        body: ["17px", { lineHeight: "22px", fontWeight: "400" }],
        callout: ["16px", { lineHeight: "21px", fontWeight: "400" }],
        subheadline: ["15px", { lineHeight: "20px", fontWeight: "400" }],
        footnote: ["13px", { lineHeight: "18px", fontWeight: "400" }],
        "caption-1": ["12px", { lineHeight: "16px", fontWeight: "400" }],
        "caption-2": ["11px", { lineHeight: "13px", fontWeight: "400" }],
      },
      borderRadius: {
        "apple-sm": "8px",
        "apple-md": "12px",
        "apple-lg": "18px",
        "apple-xl": "20px",
        pill: "980px",
      },
      boxShadow: {
        card: "0 2px 20px rgba(0,0,0,0.06)",
        "card-hover": "0 4px 24px rgba(0,0,0,0.1)",
        elevated: "0 8px 32px rgba(0,0,0,0.12)",
        focus: "0 0 0 4px rgba(0,113,227,0.25)",
      },
      spacing: {
        "apple-xs": "4px",
        "apple-sm": "8px",
        "apple-md": "12px",
        "apple-lg": "16px",
        "apple-xl": "20px",
        "apple-2xl": "24px",
        "apple-3xl": "32px",
        "apple-4xl": "40px",
        "apple-5xl": "48px",
      },
      transitionTimingFunction: {
        apple: "cubic-bezier(0.25, 0.1, 0.25, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
