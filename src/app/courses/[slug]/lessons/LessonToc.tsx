"use client";

/**
 * LessonToc — Table of Contents rail shown on the right side of lesson
 * pages at ≥1280 px viewport width.
 *
 * - Collects all h2 headings from the lesson prose.
 * - Highlights the currently-visible section as the user scrolls.
 * - Clicking an entry scrolls to that heading.
 * - Shows a scroll-progress bar pinned to the top of the page.
 *
 * Uses IntersectionObserver to track which h2 is in view.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { List, CaretDown } from "@phosphor-icons/react/dist/ssr";
import styles from "./LessonToc.module.css";

interface TocEntry {
  id: string;
  text: string;
  level: 2 | 3;
}

interface LessonTocProps {
  headings: TocEntry[];
  /** CSS selector for the prose container to observe */
  proseSelector?: string;
}

export function LessonToc({ headings, proseSelector = "[data-prose]" }: LessonTocProps) {
  const [activeId, setActiveId] = useState<string>("");
  const [scrollProgress, setScrollProgress] = useState(0);
  const [tocOpen, setTocOpen] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // ── Scroll progress ─────────────────────────────────────────
  const handleScroll = useCallback(() => {
    const doc = document.documentElement;
    const scrollTop = window.scrollY || doc.scrollTop;
    const scrollHeight = doc.scrollHeight - doc.clientHeight;
    if (scrollHeight <= 0) {
      setScrollProgress(0);
      return;
    }
    setScrollProgress(Math.min(100, Math.round((scrollTop / scrollHeight) * 100)));
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // ── Intersection observer for active heading ─────────────────
  useEffect(() => {
    if (headings.length === 0) return;

    // Clean up previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    const headingEls: HTMLElement[] = [];
    for (const { id } of headings) {
      const el = document.getElementById(id);
      if (el) headingEls.push(el);
    }

    if (headingEls.length === 0) return;

    // Pick the first heading in view as active; fall back to the first
    let fallback = headingEls[0]!.id;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        // Find the topmost visible heading
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible.length > 0) {
          const first = visible[0]!;
          setActiveId(first.target.id);
          fallback = first.target.id;
        } else {
          // None visible — use the last known
          setActiveId(fallback);
        }
      },
      {
        rootMargin: "-80px 0px -60% 0px",
        threshold: 0,
      },
    );

    for (const el of headingEls) {
      observerRef.current.observe(el);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [headings]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 96;
    window.scrollTo({ top, behavior: "smooth" });
    setTocOpen(false);
  };

  if (headings.length === 0) return null;

  return (
    <>
      {/* ── Scroll progress bar ─────────────────────────────── */}
      <div
        className={styles.progressBar}
        role="progressbar"
        aria-valuenow={scrollProgress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Reading progress"
      >
        <div className={styles.progressFill} style={{ width: `${scrollProgress}%` }} />
      </div>

      {/* ── Mobile TOC toggle ───────────────────────────────── */}
      <button
        className={styles.tocToggle}
        onClick={() => setTocOpen((v) => !v)}
        aria-expanded={tocOpen}
        aria-controls="lesson-toc-list"
      >
        <List size={16} aria-hidden />
        <span>In this lesson</span>
        <CaretDown
          size={14}
          className={`${styles.tocToggleIcon} ${tocOpen ? styles.tocToggleIconOpen : ""}`}
          aria-hidden
        />
      </button>

      {/* ── TOC list ───────────────────────────────────────── */}
      {tocOpen && (
        <nav id="lesson-toc-list" className={styles.tocList} aria-label="Lesson table of contents">
          {headings.map(({ id, text, level }) => (
            <button
              key={id}
              className={`${styles.tocItem} ${level === 3 ? styles.tocItemH3 : ""} ${
                activeId === id ? styles.tocItemActive : ""
              }`}
              onClick={() => scrollTo(id)}
              aria-current={activeId === id ? "location" : undefined}
            >
              {text}
            </button>
          ))}
        </nav>
      )}

      {/* ── Desktop TOC sidebar ──────────────────────────────── */}
      <aside className={styles.tocAside} aria-label="Table of contents">
        <p className={styles.tocAsideTitle}>In this lesson</p>
        <nav aria-label="Lesson table of contents (desktop)">
          <ul className={styles.tocAsideList} role="list">
            {headings.map(({ id, text, level }) => (
              <li key={id}>
                <button
                  className={`${styles.tocAsideItem} ${
                    level === 3 ? styles.tocAsideItemH3 : ""
                  } ${activeId === id ? styles.tocAsideItemActive : ""}`}
                  onClick={() => scrollTo(id)}
                  aria-current={activeId === id ? "location" : undefined}
                >
                  {text}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </>
  );
}
