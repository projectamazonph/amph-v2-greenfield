"use client";

/**
 * ScrollToTop — fixed-position button that appears once the page has
 * been scrolled past a threshold and scrolls back to the top when
 * activated. Mounted once inside StudentShell so every authenticated
 * page gets it for free.
 *
 * Hidden until the user has actually scrolled so it doesn't cover
 * content on a short page. Uses row-major safe-area padding for the
 * bottom-right corner so it clears browser chrome on mobile.
 */

import { useEffect, useState } from "react";
import { ArrowUp } from "@phosphor-icons/react/dist/ssr";
import styles from "./ScrollToTop.module.css";

const SHOW_THRESHOLD_PX = 400;

export function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > SHOW_THRESHOLD_PX);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function handleClick() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Scroll to top"
      title="Scroll to top"
      className={`${styles.button} ${visible ? styles.visible : ""}`}
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
    >
      <ArrowUp size={20} weight="bold" aria-hidden />
    </button>
  );
}

// S-2 fix (audit 2026-08-20, umbrella #404, child #406): explicit
// displayName. See Button.tsx for the rationale.
ScrollToTop.displayName = "ScrollToTop";
