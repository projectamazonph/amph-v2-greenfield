/**
 * src/themes/amph-theme.ts
 *
 * AMPH brand theme for Astryx.
 *
 * Built on top of @astryxdesign/theme-neutral so Astryx components get
 * the correct brand tokens without having to swizzle anything.
 *
 * Override order (last wins):
 *   neutralTheme defaults  →  defineTheme color/typography/radius scales
 *   → explicit tokens     →  AMPH token overrides
 *
 * Key AMPH design decisions baked in here:
 *   - Waybill Orange (#FF6B35) accent, not Astryx blue
 *   - Warm off-white body background (#FAFAF7), not cool gray
 *   - Space Grotesk + JetBrains Mono, not system fonts
 *   - Flat elevation: no shadow at rest (border = elevation signal)
 *   - Shadow tokens set to AMPH's light-touch values
 *   - Motion: 120ms fast / 220ms medium, AMPH easing curves
 */

import { defineTheme } from "@astryxdesign/core/theme";
import { neutralTheme } from "@astryxdesign/theme-neutral";

/**
 * The AMPH palette — single source of truth for every hex value.
 * Exported so other files (e.g. email templates) can reference it
 * without importing the full theme object.
 */
export const amphPalette = {
  // Surfaces
  surfacePaper: "#FAFAF7",
  surfaceCard: "#FFFFFF",
  surfaceSubtle: "#F4F3EE",
  surfaceDark: "#1A1A1A",
  // Ink
  inkPrimary: "#171717",
  inkSecondary: "#404040",
  inkTertiary: "#737373",
  inkDisabled: "#D4D4D4",
  inkInverse: "#FAFAF7",
  // Borders
  border: "#E5E5E0",
  borderStrong: "#A3A3A3",
  // Brand
  accent: "#FF6B35",
  accentHover: "#E55A2B",
  accentSoft: "#FFE5D9",
  accentInk: "#1A1A2E", // 6.0:1 contrast on --accent — use as button text
  // Semantic
  success: "#0E7C3A",
  successSoft: "#DCFCE7",
  successHover: "#0A6630",
  warning: "#B45309",
  warningSoft: "#FEF3C7",
  warningHover: "#93420A",
  danger: "#B91C1C",
  dangerSoft: "#FEE2E2",
  dangerHover: "#991313",
} as const;

export const amphTheme = defineTheme({
  name: "amph",
  extends: neutralTheme,

  // ── Color ────────────────────────────────────────────────────────────────
  // Accent + neutralStyle=neutral to avoid Astryx's blue generation.
  // AMPH surfaces (ink/warm) are set via explicit token overrides below.
  color: {
    accent: amphPalette.accent,
    neutralStyle: "neutral",
  },

  // ── Typography ────────────────────────────────────────────────────────────
  typography: {
    body: {
      family: "Space Grotesk",
      fallbacks: "system-ui, sans-serif",
    },
    heading: {
      family: "Space Grotesk",
      fallbacks: "system-ui, sans-serif",
    },
    code: {
      family: "JetBrains Mono",
      fallbacks: "ui-monospace, monospace",
    },
  },

  // ── Radius ───────────────────────────────────────────────────────────────
  // AMPH --radius-md = 6px. ratio=1.67 gives: 4px / 6px / 10px / 16px / 24px.
  radius: { base: 6, multiplier: 1.67 },

  // ── Motion ───────────────────────────────────────────────────────────────
  // fast/medium/ratio are valid defineTheme motion keys.
  // Note: they don't emit --duration-* vars — motion configures animation speeds
  // for components internally; duration tokens come from durationDefaults and
  // can be overridden in the tokens block using the exact names from tokens.stylex.d.ts.
  motion: {
    fast: 120,
    medium: 220,
    ratio: 0.65,
  },

  // ── Explicit token overrides ─────────────────────────────────────────────
  // These take precedence over everything above.
  // Only tokens whose names appear in Astryx's TokenName type are valid here.
  // Confirmed valid from @astryxdesign/core/dist/theme/tokens.stylex.d.ts:
  //   color:   --color-accent, --color-accent-muted, --color-on-accent,
  //            --color-background-{body,surface,muted,card,popover,...},
  //            --color-text-{primary,secondary,disabled},
  //            --color-border, --color-border-emphasized,
  //            --color-success*, --color-error*, --color-warning*,
  //            and the full blue/gray/green/orange/pink/purple/red/teal/yellow scales
  //   spacing: --spacing-0 through --spacing-12 (no -16 or -20)
  //   shadow:  --shadow-low, --shadow-med, --shadow-high,
  //            --shadow-inset-{hover,selected,success,warning,error}
  //   (NOT --shadow-sm/md/lg, NOT --spacing-16/20, NOT --color-info)
  tokens: {
    // Brand
    "--color-accent": [amphPalette.accent, amphPalette.accentHover],
    "--color-accent-muted": amphPalette.accentSoft,
    "--color-on-accent": amphPalette.accentInk,

    // AMPH surfaces — warm off-white, not cool gray
    "--color-background-body": amphPalette.surfacePaper,
    "--color-background-surface": amphPalette.surfaceCard,
    "--color-background-muted": amphPalette.surfaceSubtle,

    // AMPH ink ramp
    "--color-text-primary": amphPalette.inkPrimary,
    "--color-text-secondary": amphPalette.inkSecondary,
    "--color-text-disabled": amphPalette.inkDisabled,

    // Borders
    "--color-border": amphPalette.border,
    "--color-border-emphasized": amphPalette.borderStrong,

    // Semantic colors
    "--color-success": amphPalette.success,
    "--color-success-muted": amphPalette.successSoft,
    "--color-on-success": "#FFFFFF",

    "--color-warning": amphPalette.warning,
    "--color-warning-muted": amphPalette.warningSoft,
    "--color-on-warning": "#FFFFFF",

    "--color-error": amphPalette.danger,
    "--color-error-muted": amphPalette.dangerSoft,
    "--color-on-error": "#FFFFFF",

    // AMPH shadow overrides — flat elevation, no shadow at rest.
    // Uses Astryx's --shadow-low/med/high (NOT --shadow-sm/md/lg).
    // Original Astryx values are slightly heavier; these are more field-manual.
    "--shadow-low": "0 1px 2px rgba(0,0,0,0.04), 0 1px 1px rgba(0,0,0,0.02)",
    "--shadow-med": "0 2px 4px rgba(0,0,0,0.04), 0 4px 8px rgba(0,0,0,0.04)",
    "--shadow-high": "0 4px 8px rgba(0,0,0,0.04), 0 12px 24px rgba(0,0,0,0.06)",

    // AMPH spacing (4px base) — mirrors globals.css :root where it overlaps.
    // Astryx only provides --spacing-0 through --spacing-12.
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
