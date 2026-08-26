import { defineTheme } from "@astryxdesign/core/theme";
import { neutralTheme } from "@astryxdesign/theme-neutral";

/**
 * Amazon PH simulators palette. This adapter keeps Astryx components aligned
 * with the shared application tokens in src/app/globals.css.
 */
export const amphPalette = {
  navyDeep: "#0F1419",
  navy: "#131921",
  navySecondary: "#232F3E",
  navyTertiary: "#37475A",
  orange: "#FF9900",
  orangeHover: "#FFA41C",
  orangeDark: "#E47911",
  orangeSoft: "#FEF3E7",
  orangeTint: "#FCE3C2",
  surfaceBody: "#F7F8FA",
  surfaceMuted: "#EEF1F4",
  surfaceCard: "#FFFFFF",
  surfaceHover: "#FAFBFC",
  border: "#D5D9D9",
  borderSoft: "#E7E7E7",
  ink: "#0F1111",
  inkHeading: "#232F3E",
  inkSecondary: "#565959",
  inkDisabled: "#B1B6BC",
  success: "#067D62",
  successMuted: "#E6F4F0",
  warning: "#C45500",
  warningMuted: "#FFF4E5",
  error: "#B12704",
  errorMuted: "#FDEDED",
} as const;

export const amphTheme = defineTheme({
  name: "amazon-ph-simulators",
  extends: neutralTheme,
  color: {
    accent: amphPalette.orange,
    neutralStyle: "neutral",
  },
  typography: {
    body: {
      family: "PT Sans",
      fallbacks: "system-ui, -apple-system, sans-serif",
    },
    heading: {
      family: "Archivo",
      fallbacks: "system-ui, -apple-system, sans-serif",
    },
    code: {
      family: "IBM Plex Mono",
      fallbacks: "ui-monospace, Menlo, monospace",
    },
  },
  radius: { base: 6, multiplier: 1.5 },
  motion: {
    fast: 120,
    medium: 180,
    ratio: 0.65,
  },
  tokens: {
    "--color-accent": [amphPalette.orange, amphPalette.orangeHover],
    "--color-accent-muted": amphPalette.orangeSoft,
    "--color-on-accent": amphPalette.navy,
    "--color-background-body": amphPalette.surfaceBody,
    "--color-background-surface": amphPalette.surfaceCard,
    "--color-background-card": amphPalette.surfaceCard,
    "--color-background-popover": amphPalette.surfaceCard,
    "--color-background-muted": amphPalette.surfaceMuted,
    "--color-text-primary": amphPalette.ink,
    "--color-text-secondary": amphPalette.inkSecondary,
    "--color-text-disabled": amphPalette.inkDisabled,
    "--color-border": amphPalette.border,
    "--color-border-emphasized": amphPalette.navyTertiary,
    "--color-success": amphPalette.success,
    "--color-success-muted": amphPalette.successMuted,
    "--color-on-success": "#FFFFFF",
    "--color-warning": amphPalette.warning,
    "--color-warning-muted": amphPalette.warningMuted,
    "--color-on-warning": "#FFFFFF",
    "--color-error": amphPalette.error,
    "--color-error-muted": amphPalette.errorMuted,
    "--color-on-error": "#FFFFFF",
    "--spacing-1": "4px",
    "--spacing-2": "8px",
    "--spacing-3": "12px",
    "--spacing-4": "16px",
    "--spacing-5": "20px",
    "--spacing-6": "24px",
    "--spacing-8": "32px",
    "--spacing-10": "40px",
    "--spacing-12": "48px",
  },
});
