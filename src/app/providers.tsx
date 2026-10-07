/**
 * src/app/providers.tsx
 *
 * Client component that wraps the application in Astryx's Theme provider.
 * Must be used in every page that uses Astryx components.
 *
 * The AMPH brand theme (Amazon Orange, Archivo and PT Sans, soft operational elevation)
 * is applied here so all child components pick it up automatically.
 *
 * The `mode` prop is wired to `useTheme()` so the user's theme toggle
 * actually flips Astryx surfaces — without this, the `<html data-theme>`
 * attribute set by useTheme gets overwritten by Astryx's own sync logic
 * (it writes `data-theme` to `<html>` on mount based on the `mode` prop).
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
import { useTheme } from "@/hooks/useTheme";

export interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const [theme] = useTheme();
  return (
    <Theme theme={amphTheme} mode={theme}>
      <LinkProvider component={Link}>{children}</LinkProvider>
    </Theme>
  );
}
