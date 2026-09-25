"use client";

/**
 * useUnsavedChanges — warns before navigating away when a form has changes.
 *
 * Usage:
 *   const { markDirty, markClean, LeaveDialog } = useUnsavedChanges();
 *
 *   // In your form onChange handler:
 *   onChange={() => markDirty()}
 *
 *   // After successful save:
 *   markClean()
 *
 *   // In your JSX (always rendered; it opens itself when a link
 *   // click is blocked while dirty):
 *   <LeaveDialog />
 *
 * The component uses an Astryx Dialog instead of window.confirm() for
 * accessibility (WCAG 4.1.2 / WebAIM 2023 dialog frustration survey).
 */

import { useEffect, useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";

const LEAVE_MESSAGE = "You have unsaved changes. Are you sure you want to leave?";

interface LeaveDialogProps {
  onConfirm: () => void;
  onCancel: () => void;
}

function LeaveDialog({ onConfirm, onCancel }: LeaveDialogProps) {
  const [isOpen, setIsOpen] = useState(true);

  function handleConfirm() {
    setIsOpen(false);
    onConfirm();
  }

  function handleCancel() {
    setIsOpen(false);
    onCancel();
  }

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={(open: boolean) => {
        setIsOpen(open);
        if (!open) onCancel();
      }}
      purpose="required"
      aria-describedby="unsaved-changes-desc"
    >
      <DialogHeader
        title="Unsaved changes"
        onOpenChange={(open: boolean) => {
          if (!open) onCancel();
        }}
      />
      <p
        id="unsaved-changes-desc"
        style={{
          margin: "var(--space-4) 0",
          fontFamily: "var(--font-body)",
          fontSize: "var(--text-sm)",
          color: "var(--ink-700)",
        }}
      >
        {LEAVE_MESSAGE}
      </p>
      <div
        style={{
          display: "flex",
          gap: "var(--space-3)",
          justifyContent: "flex-end",
          padding: "var(--space-4)",
          borderTop: "1px solid var(--border)",
        }}
      >
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
          Stay on page
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
          Leave page
        </button>
      </div>
    </Dialog>
  );
}

export function useUnsavedChanges() {
  const router = useRouter();
  const dirtyRef = useRef(false);
  const pendingCallbackRef = useRef<(() => void) | null>(null);
  // CLICK-PATH-002: dirtyRef alone never re-renders, so consumers could
  // never show a dialog after a click was blocked. blockedHref is the
  // reactive half: set on intercept, cleared on stay/leave/unmount.
  const [blockedHref, setBlockedHref] = useState<string | null>(null);

  const markDirty = useCallback(() => {
    dirtyRef.current = true;
  }, []);

  const markClean = useCallback(() => {
    dirtyRef.current = false;
    pendingCallbackRef.current = null;
    setBlockedHref(null);
  }, []);

  // Warn on tab close / refresh
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      e.preventDefault();
      // Chrome requires returnValue to be set
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  // Intercept link clicks — store the navigation intent and open the
  // LeaveDialog. Confirming runs router.push; cancelling drops the intent.
  // S11 fix: use an AbortController singleton so the listener is always
  // removed and re-registered when the router instance changes. This
  // prevents double-registration in React 18 strict mode (double-mount
  // → cleanup fires before the second mount, so without an AbortController
  // the second registration would pile on if the ref isn't cleared first).
  useEffect(() => {
    const ac = new AbortController();
    const handleClick = (e: MouseEvent) => {
      if (!dirtyRef.current) return;
      const target = e.target as HTMLElement;
      const anchor = target.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("http") || href.startsWith("#")) return;

      e.preventDefault();
      e.stopPropagation();

      pendingCallbackRef.current = () => {
        router.push(href);
      };
      setBlockedHref(href);
    };

    document.addEventListener("click", handleClick, true);
    return () => {
      ac.abort();
      document.removeEventListener("click", handleClick, true);
      setBlockedHref(null);
    };
  }, [router]);

  const handleLeaveConfirm = useCallback(() => {
    if (pendingCallbackRef.current) {
      pendingCallbackRef.current();
      pendingCallbackRef.current = null;
      dirtyRef.current = false;
    }
    setBlockedHref(null);
  }, []);

  const handleLeaveCancel = useCallback(() => {
    pendingCallbackRef.current = null;
    setBlockedHref(null);
  }, []);

  function executePendingNavigation() {
    if (pendingCallbackRef.current) {
      pendingCallbackRef.current();
      pendingCallbackRef.current = null;
      dirtyRef.current = false;
    }
    setBlockedHref(null);
  }

  // Stable identity: defining the gate inline without useCallback would
  // create a new component type on every parent render, remounting the
  // dialog (focus loss, isOpen reset) while it is open.
  const LeaveGate = useCallback(
    function LeaveGate({ onConfirm, onCancel }: Partial<LeaveDialogProps> = {}) {
      if (blockedHref === null) return null;
      return (
        <LeaveDialog
          onConfirm={() => {
            onConfirm?.();
            handleLeaveConfirm();
          }}
          onCancel={() => {
            onCancel?.();
            handleLeaveCancel();
          }}
        />
      );
    },
    [blockedHref, handleLeaveConfirm, handleLeaveCancel],
  );

  function showLeaveDialog(onConfirm: () => void) {
    pendingCallbackRef.current = onConfirm;
    setBlockedHref((current) => current ?? "");
  }

  return {
    markDirty,
    markClean,
    isDirty: dirtyRef.current,
    LeaveDialog: LeaveGate,
    showLeaveDialog,
    executePendingNavigation,
  };
}
