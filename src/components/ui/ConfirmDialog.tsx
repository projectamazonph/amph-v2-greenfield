/**
 * ConfirmDialog — modal confirmation prompt built on the native <dialog>.
 *
 * Replaces raw form POSTs (like the student sign-out button) with a
 * confirmation step. Uses the native <dialog> element which provides:
 * - Built-in focus trap (the browser moves focus into the dialog on open)
 * - Built-in ESC handling (the dialog emits a `cancel` event)
 * - Inert-by-default behavior (page content behind the dialog is not focusable)
 * - ARIA-correct semantics (role="dialog" implicit)
 *
 * Pure presentation. The parent owns the `open` state and provides the
 * `onConfirm`/`onCancel` callbacks. No state mutation beyond toggling the
 * native dialog visibility.
 *
 * Usage:
 *   const [open, setOpen] = useState(false);
 *   <ConfirmDialog
 *     open={open}
 *     title="Sign out?"
 *     description="You will need to sign back in to continue."
 *     confirmLabel="Sign out"
 *     onConfirm={() => { setOpen(false); doSignOut(); }}
 *     onCancel={() => setOpen(false)}
 *   />
 */

"use client";

import { useEffect, useRef } from "react";
import styles from "./ConfirmDialog.module.css";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
    } else if (!open && el.open) {
      el.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      onCancel={(e) => {
        // Prevent the default close behavior and route the cancel
        // through onCancel so the parent can control its `open` state.
        e.preventDefault();
        onCancel();
      }}
      aria-labelledby="confirm-dialog-title"
      aria-describedby={description ? "confirm-dialog-desc" : undefined}
    >
      <div className={styles.body}>
        <h2 id="confirm-dialog-title" className={styles.title}>
          {title}
        </h2>
        {description ? (
          <p id="confirm-dialog-desc" className={styles.description}>
            {description}
          </p>
        ) : null}
        <div className={styles.actions}>
          <button
            type="button"
            onClick={onCancel}
            className={styles.cancelBtn}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={destructive ? styles.confirmDestructive : styles.confirmBtn}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}

// S-2 fix (audit 2026-08-20, umbrella #404, child #406): explicit
// displayName. See Button.tsx for the rationale.
ConfirmDialog.displayName = "ConfirmDialog";
