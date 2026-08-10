/**
 * RouteError — shared error boundary for error.tsx route segments.
 *
 * Follows the same pattern as global-error.tsx but renders without
 * <html>/<body> (those are only valid in global-error). Reports to
 * Sentry and offers a retry button that calls reset() to re-render
 * the segment.
 *
 * Usage in any error.tsx:
 *   "use client";
 *   import { RouteError } from "@/components/ui/RouteError";
 *   export default function Error({ error, reset }) {
 *     return <RouteError error={error} reset={reset} />;
 *   }
 */

"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import styles from "./RouteError.module.css";

interface RouteErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export function RouteError({ error, reset }: RouteErrorProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <p className={styles.emoji} aria-hidden="true">
          !
        </p>
        <h2 className={styles.title}>Something went wrong</h2>
        <p className={styles.message}>We could not load this page. Please try again.</p>
        {error.digest && <p className={styles.digest}>Error ID: {error.digest}</p>}
        <button type="button" className={styles.retry} onClick={reset}>
          Try again
        </button>
      </div>
    </div>
  );
}
