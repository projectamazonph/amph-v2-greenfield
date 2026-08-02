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

import { useState, useCallback, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { List, X } from "@phosphor-icons/react/dist/ssr";
import styles from "./MobileNavToggle.module.css";

export interface MobileNavToggleProps {
  /** ID of the sidebar element to toggle */
  sidebarId: string;
}

export function MobileNavToggle({ sidebarId }: MobileNavToggleProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const isFirstRender = useRef(true);

  const close = useCallback(() => {
    const sidebar = document.getElementById(sidebarId);
    if (sidebar) sidebar.dataset.open = "false";
    document.body.style.overflow = "";
    setOpen(false);
  }, [sidebarId]);

  // Close the drawer and unlock body scroll on route change. Necessary
  // both for persistent-layout sidebars (admin) whose instance survives
  // navigation, and as a safety net for per-page sidebars (student).
  // Skip the initial mount: nothing is open yet, and closing there would
  // race a drawer the user opens before this effect's first run flushes.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    close();
  }, [pathname, close]);

  // Student pages mount a fresh MobileNavToggle per page rather than
  // sharing one instance via a layout, so a route change unmounts this
  // instance before the effect above can run in the new one. Without
  // this cleanup, document.body.style.overflow: hidden (set while the
  // drawer was open) would survive the navigation and silently lock
  // scroll on whatever page the user lands on.
  useEffect(() => {
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

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
