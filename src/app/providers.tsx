/**
 * src/app/providers.tsx
 *
 * Client component that wraps the application in Astryx's Theme provider.
 * Must be used in every page that uses Astryx components.
 *
 * The AMPH brand theme (Waybill Orange, Space Grotesk, flat elevation)
 * is applied here so all child components pick it up automatically.
 *
 * mode="light" is explicit and load-bearing, not decorative. Astryx's
 * <Theme> defaults to mode="system", which resolves dark/light via
 * `prefers-color-scheme` independently of this app's own (unused)
 * `[data-theme="dark"]` block in globals.css. `amph-theme.ts`'s token
 * overrides only supply light-mode values (plain hex strings, not
 * light-dark() pairs) and never override `--color-background-card`, so
 * on a device with OS dark mode on, Astryx components (Card, Table,
 * Badge, ...) silently fell back to Astryx's own default dark palette
 * for backgrounds while text stayed pinned to the light-mode dark ink
 * color — near-black text on a near-black card, unreadable. Everything
 * else in the app (CSS-module-driven elements using var(--surface-1)
 * etc.) stayed light throughout, since nothing ever sets
 * `data-theme="dark"` — dark mode here is "a placeholder until the
 * dark-mode-toggle story lands" (see CLAUDE.md), not a live feature.
 * Pinning mode="light" stops Astryx from entering that unfinished,
 * broken dark mode on its own; building out a real dark palette is a
 * separate, deliberate future story, not a mobile-UI hotfix.
 *
 * Usage in layout.tsx:
 *   import { Providers } from "./providers";
 *   <Providers>{children}</Providers>
 */

"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Theme } from "@astryxdesign/core/theme";
import { LinkProvider } from "@astryxdesign/core/Link";
import { amphTheme } from "@/themes/amph-theme";

export interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <Theme theme={amphTheme} mode="light">
      <LinkProvider component={Link}>{children}</LinkProvider>
    </Theme>
  );
}
