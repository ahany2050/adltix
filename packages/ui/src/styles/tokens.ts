export const tokens = {
  colors: {
    // Apple HIG system colors
    blue: "#0071E3",
    green: "#34C759",
    red: "#FF3B30",
    orange: "#FF9F0A",
    yellow: "#FFCC00",
    purple: "#AF52DE",
    pink: "#FF2D55",
    teal: "#5AC8FA",
    indigo: "#5856D6",

    // Backgrounds
    background: "#FFFFFF",
    backgroundDark: "#000000",
    surface: "#F5F5F7",
    surfaceDark: "#1C1C1E",
    surfaceElevated: "#FFFFFF",
    surfaceElevatedDark: "#2C2C2E",

    // Text
    textPrimary: "#1D1D1F",
    textPrimaryDark: "#F5F5F7",
    textSecondary: "#6E6E73",
    textSecondaryDark: "#98989D",
    textTertiary: "#AEAEB2",
    textTertiaryDark: "#636366",

    // Separators
    separator: "rgba(0,0,0,0.08)",
    separatorDark: "rgba(255,255,255,0.08)",
  },

  typography: {
    fontFamily: {
      display:
        '"SF Pro Display", -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif',
      text: '"SF Pro Text", -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif',
      rounded:
        '"SF Pro Rounded", -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif',
      mono: '"SF Mono", ui-monospace, "Fira Code", monospace',
    },
    sizes: {
      largeTitle: { size: "34px", weight: "700", lineHeight: "41px" },
      title1: { size: "28px", weight: "700", lineHeight: "34px" },
      title2: { size: "22px", weight: "700", lineHeight: "28px" },
      title3: { size: "20px", weight: "600", lineHeight: "25px" },
      headline: { size: "17px", weight: "600", lineHeight: "22px" },
      body: { size: "17px", weight: "400", lineHeight: "22px" },
      callout: { size: "16px", weight: "400", lineHeight: "21px" },
      subheadline: { size: "15px", weight: "400", lineHeight: "20px" },
      footnote: { size: "13px", weight: "400", lineHeight: "18px" },
      caption1: { size: "12px", weight: "400", lineHeight: "16px" },
      caption2: { size: "11px", weight: "400", lineHeight: "13px" },
    },
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

  radius: {
    sm: "8px",
    md: "12px",
    lg: "18px",
    xl: "20px",
    pill: "980px",
    full: "9999px",
  },

  shadows: {
    card: "0 2px 20px rgba(0,0,0,0.06)",
    cardHover: "0 4px 24px rgba(0,0,0,0.1)",
    elevated: "0 8px 32px rgba(0,0,0,0.12)",
    focus: "0 0 0 4px rgba(0,113,227,0.25)",
  },

  animation: {
    easing: "cubic-bezier(0.25, 0.1, 0.25, 1)",
    spring: { type: "spring" as const, stiffness: 300, damping: 30 },
    springBouncy: { type: "spring" as const, stiffness: 400, damping: 25 },
    duration: {
      fast: 0.15,
      normal: 0.25,
      slow: 0.4,
    },
  },
} as const;
