/**
 * Structural wrapper for landing-page sections.
 * Content stays visible in the server-rendered HTML without waiting for
 * hydration or an intersection observer.
 */

import type { ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  className?: string;
}

export function Reveal({ children, className }: RevealProps) {
  return <div className={className}>{children}</div>;
}
