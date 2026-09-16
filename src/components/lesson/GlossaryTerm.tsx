"use client";

import { useId, useState, useRef, useEffect } from "react";
import type { GlossaryTerm } from "@/lib/glossary";
import styles from "./GlossaryTerm.module.css";

interface GlossaryTermProps {
  readonly term: GlossaryTerm;
  readonly children: string;
}

/**
 * Inline term button. Clicking or focusing opens a popover with the
 * short definition; the long definition is in a details element
 * underneath. Pressing Escape closes the popover. The component is a
 * pure client island; the no-JavaScript fallback is the
 * parenthesised definition the lesson author already wrote in the
 * MDX body.
 */
export function GlossaryTermButton({ term, children }: GlossaryTermProps) {
  const [open, setOpen] = useState(false);
  const popoverId = useId();
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <span className={styles.wrapper}>
      <button
        ref={buttonRef}
        type="button"
        className={styles.button}
        aria-expanded={open}
        aria-describedby={popoverId}
        onClick={() => setOpen((current) => !current)}
      >
        {children}
      </button>
      {open ? (
        <span id={popoverId} role="tooltip" className={styles.popover}>
          <strong>{term.term}.</strong> {term.shortDefinition}
          <br />
          <span className={styles.long}>{term.longDefinition}</span>
        </span>
      ) : null}
    </span>
  );
}
