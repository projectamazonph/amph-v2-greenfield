/**
 * src/app/providers.tsx
 *
 * Client component that wraps the application in Astryx's Theme provider.
 * Must be used in every page that uses Astryx components.
 *
 * The AMPH brand theme (Amazon Orange, Archivo and PT Sans, soft operational elevation)
 * is applied here so all child components pick it up automatically.
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
