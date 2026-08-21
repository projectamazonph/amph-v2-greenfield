"use client";

/**
 * PrintButton — a plain button that calls window.print().
 *
 * Bug fix: the certificate verification page put `onClick={() =>
 * window.print()}` directly on a <button> in a Server Component,
 * which crashed the whole page at runtime — "Event handlers cannot
 * be passed to Client Component props" — because Server Components
 * can't attach DOM event listeners. Only the click handler needs to
 * be a Client Component.
 */

export function PrintButton({
  className,
  style,
  children,
}: {
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <button type="button" onClick={() => window.print()} className={className} style={style}>
      {children}
    </button>
  );
}

// S-2 fix (audit 2026-08-20, umbrella #404, child #406): explicit
// displayName. See Button.tsx for the rationale.
PrintButton.displayName = "PrintButton";
