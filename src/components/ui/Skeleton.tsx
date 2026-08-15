/**
 * Skeleton — shared loading placeholder.
 *
 * Composable primitives for building page-level loading states.
 * Uses the Field Manual pulse animation (opacity 0.4 → 1 → 0.4).
 *
 * Usage:
 *   <SkeletonBlock width="100%" height="2rem" />
 *   <SkeletonRow columns={4} />
 *   <SkeletonCard />
 */

import styles from "./Skeleton.module.css";

/* ------------------------------------------------------------------ */
/*  Block — single animated rectangle                                  */
/* ------------------------------------------------------------------ */

export interface SkeletonBlockProps {
  width?: string;
  height?: string;
  borderRadius?: string;
  variant?: "text" | "rect" | "circle";
  className?: string;
}

export function SkeletonBlock({
  width = "100%",
  height = "1rem",
  borderRadius,
  variant = "rect",
  className,
}: SkeletonBlockProps) {
  const br =
    borderRadius ??
    (variant === "circle" ? "50%" : variant === "text" ? "var(--radius-sm)" : "var(--radius-md)");

  return (
    <div
      className={`${styles.pulse} ${className ?? ""}`}
      style={{ width, height, borderRadius: br }}
      aria-hidden="true"
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Text — a multi-line text skeleton                                  */
/* ------------------------------------------------------------------ */

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div
      className={className}
      aria-busy="true"
      aria-live="polite"
      role="status"
      aria-label="Loading text"
    >
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBlock
          key={i}
          width={i === lines - 1 ? "60%" : "100%"}
          height="0.875rem"
          variant="text"
          className={styles.textLine}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Row — a table row skeleton                                         */
/* ------------------------------------------------------------------ */

export function SkeletonRow({ columns = 4 }: { columns?: number }) {
  return (
    <div
      className={styles.row}
      aria-busy="true"
      aria-live="polite"
      role="status"
      aria-label="Loading row"
    >
      {Array.from({ length: columns }).map((_, i) => (
        <SkeletonBlock key={i} width={i === 0 ? "40%" : "20%"} height="0.75rem" variant="text" />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Card — a rectangular card skeleton with optional header lines      */
/* ------------------------------------------------------------------ */

export function SkeletonCard({ lines = 2, className }: { lines?: number; className?: string }) {
  return (
    <div
      className={`${styles.card} ${className ?? ""}`}
      aria-busy="true"
      aria-live="polite"
      role="status"
      aria-label="Loading content"
    >
      <SkeletonBlock width="60%" height="1rem" variant="text" />
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBlock
          key={i}
          width={i === lines - 1 ? "40%" : "100%"}
          height="0.75rem"
          variant="text"
          className={styles.textLine}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Table — a full table skeleton with header + rows                   */
/* ------------------------------------------------------------------ */

export function SkeletonTable({ columns = 4, rows = 5 }: { columns?: number; rows?: number }) {
  // L10 fix: the region wrapper signals to assistive tech that content
  // is loading. The inner skeleton blocks use aria-hidden so they don't
  // create noise; the region announces the busy state instead.
  return (
    <div className={styles.table} aria-busy="true" aria-live="polite" role="status">
      <div className={styles.tableHeader}>
        {Array.from({ length: columns }).map((_, i) => (
          <SkeletonBlock key={i} width="20%" height="0.625rem" variant="text" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} columns={columns} />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  StatTile — a dashboard stat tile skeleton                          */
/* ------------------------------------------------------------------ */

export function SkeletonStatTile({ className }: { className?: string }) {
  return (
    <div
      className={`${styles.statTile} ${className ?? ""}`}
      aria-busy="true"
      aria-live="polite"
      role="status"
      aria-label="Loading metric"
    >
      <SkeletonBlock width="3rem" height="2rem" variant="rect" />
      <SkeletonBlock width="60%" height="0.75rem" variant="text" className={styles.textLine} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Form — a form skeleton with label + input pairs                    */
/* ------------------------------------------------------------------ */

export function SkeletonForm({ fields = 4 }: { fields?: number }) {
  return (
    <div className={styles.form} aria-busy="true" aria-live="polite" role="status">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className={styles.formField}>
          <SkeletonBlock width="25%" height="0.75rem" variant="text" />
          <SkeletonBlock width="100%" height="2.5rem" variant="rect" />
        </div>
      ))}
      <SkeletonBlock width="8rem" height="2.5rem" variant="rect" />
    </div>
  );
}
