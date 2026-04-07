import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Adltix brand colors (from company deck)
        brand: {
          DEFAULT: "#E8602D",   // Primary orange
          light: "#F07040",
          dark: "#C94E20",
        },
        lime: {
          DEFAULT: "#CDFF00",   // Neon lime accent
          dark: "#B8E600",
        },
        accent: {
          red: "#E84B3A",       // Logo slash red
          orange: "#E8602D",    // Cards & highlights
        },
        // Dark theme surfaces
        surface: {
          DEFAULT: "#2D2D2D",   // Main background
          elevated: "#3A3A3A",  // Cards & elevated
          overlay: "#444444",   // Hover states
        },
        // Semantic text (dark theme)
        primary: "#FFFFFF",
        secondary: "#A0A0A0",
        tertiary: "#6B6B6B",
        // Separator
        separator: "rgba(255,255,255,0.1)",
        // Status colors
        success: "#34C759",
        warning: "#FF9F0A",
        error: "#FF3B30",
        info: "#CDFF00",
      },
      fontFamily: {
        display: [
          "Poppins",
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
        sans: [
          "Poppins",
          "Inter",
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
        sm: "8px",
        md: "12px",
        lg: "18px",
        xl: "20px",
        pill: "980px",
      },
      boxShadow: {
        card: "0 2px 20px rgba(0,0,0,0.3)",
        "card-hover": "0 4px 24px rgba(0,0,0,0.4)",
        elevated: "0 8px 32px rgba(0,0,0,0.5)",
        focus: "0 0 0 4px rgba(205,255,0,0.3)",
      },
      spacing: {
        xs: "4px",
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "20px",
        "2xl": "24px",
        "3xl": "32px",
        "4xl": "40px",
        "5xl": "48px",
      },
      transitionTimingFunction: {
        smooth: "cubic-bezier(0.25, 0.1, 0.25, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
