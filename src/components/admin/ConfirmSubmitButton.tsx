"use client";

/**
 * ConfirmSubmitButton — a submit button that shows an accessible Astryx Dialog
 * before letting the enclosing <form action={...}> (a server action) submit.
 *
 * Uses purpose="required" so the user must explicitly confirm or cancel.
 * WCAG 4.1.2 compliant (replaces the inaccessible native browser dialog).
 */

import { useState, useRef } from "react";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";

export function ConfirmSubmitButton({
  confirmMessage,
  className,
  children,
  ...rest
}: {
  confirmMessage: string;
  className?: string;
  children: React.ReactNode;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type">) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  function handleConfirm() {
    setIsOpen(false);
    const form = buttonRef.current?.closest?.("form");
    if (form) {
      form.requestSubmit();
    }
  }

  function handleCancel() {
    setIsOpen(false);
  }

  return (
    <>
      <button
        type="submit"
        className={className}
        ref={buttonRef}
        onClick={() => setIsOpen(true)}
        {...rest}
      >
        {children}
      </button>

      <Dialog
        isOpen={isOpen}
        onOpenChange={(open: boolean) => setIsOpen(open)}
        purpose="required"
        aria-describedby="confirm-submit-desc"
      >
        <DialogHeader
          title="Confirm action"
          onOpenChange={(open: boolean) => setIsOpen(open)}
        />
        <p id="confirm-submit-desc" style={{ margin: "var(--space-4) 0", fontFamily: "var(--font-body)", fontSize: "var(--text-sm)", color: "var(--ink-700)" }}>
          {confirmMessage}
        </p>
        <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "flex-end", padding: "var(--space-4)", borderTop: "1px solid var(--border)" }}>
          <button
            type="button"
            onClick={handleCancel}
            style={{
              padding: "var(--space-2) var(--space-4)",
              background: "transparent",
              color: "var(--ink-700)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-sm)",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            style={{
              padding: "var(--space-2) var(--space-4)",
              background: "var(--accent)",
              color: "var(--accent-text)",
              border: "none",
              borderRadius: "var(--radius-sm)",
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-sm)",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Confirm
          </button>
        </div>
      </Dialog>
    </>
  );
}
