"use client";

/**
 * MobileNavToggle — hamburger/close button for sidebar on mobile.
 *
 * Used by both admin and student sidebars. Toggles a CSS class on
 * the sidebar element to show/hide it on mobile.
 *
 * Usage:
 *   <MobileNavToggle sidebarId="student-sidebar" />
 *
 * The sidebar element must have id={sidebarId} and CSS that responds
 * to [data-open="true"] on mobile breakpoints.
 */

import { useState, useCallback } from "react";
import { List, X } from "@phosphor-icons/react/dist/ssr";
import styles from "./MobileNavToggle.module.css";

export interface MobileNavToggleProps {
  /** ID of the sidebar element to toggle */
  sidebarId: string;
}

export function MobileNavToggle({ sidebarId }: MobileNavToggleProps) {
  const [open, setOpen] = useState(false);

  const toggle = useCallback(() => {
    const sidebar = document.getElementById(sidebarId);
    if (!sidebar) return;
    const next = !open;
    setOpen(next);
    sidebar.dataset.open = String(next);
    // Prevent body scroll when sidebar is open
    document.body.style.overflow = next ? "hidden" : "";
  }, [open, sidebarId]);

  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={toggle}
      aria-expanded={open}
      aria-controls={sidebarId}
      aria-label={open ? "Close navigation" : "Open navigation"}
    >
      {open ? <X size={20} weight="bold" /> : <List size={20} weight="bold" />}
    </button>
  );
}
