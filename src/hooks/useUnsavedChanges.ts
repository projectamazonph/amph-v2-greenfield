"use client";

/**
 * useUnsavedChanges — warns before navigating away when a form has changes.
 *
 * Usage:
 *   const { markDirty, markClean } = useUnsavedChanges();
 *
 *   // In your form onChange handler:
 *   onChange={() => markDirty()}
 *
 *   // After successful save:
 *   markClean()
 *
 * Uses the native `beforeunload` event for tab close/refresh,
 * and Next.js router events for client-side navigation.
 */

import { useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

export function useUnsavedChanges() {
  const router = useRouter();
  const dirtyRef = useRef(false);

  const markDirty = useCallback(() => {
    dirtyRef.current = true;
  }, []);

  const markClean = useCallback(() => {
    dirtyRef.current = false;
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

  // Warn on client-side navigation
  useEffect(() => {
    // Intercept link clicks
    const handleClick = (e: MouseEvent) => {
      if (!dirtyRef.current) return;
      const target = e.target as HTMLElement;
      const anchor = target.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("http") || href.startsWith("#")) return;

      // Allow navigation if user confirms
      const confirmed = window.confirm(
        "You have unsaved changes. Are you sure you want to leave?"
      );
      if (!confirmed) {
        e.preventDefault();
        e.stopPropagation();
      } else {
        dirtyRef.current = false;
      }
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [router]);

  return { markDirty, markClean, isDirty: dirtyRef.current };
}
