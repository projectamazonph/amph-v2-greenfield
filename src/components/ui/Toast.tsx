"use client";

/**
 * Toast — lightweight notification component.
 *
 * Renders a dismissible notification banner. Designed to be used
 * with React portals or as a simple inline component.
 *
 * Usage:
 *   <Toast type="success" message="Saved!" onClose={() => setShow(false)} />
 *
 * For a full toast system, use the useToast hook.
 */

import { useEffect, useCallback } from "react";
import { CheckCircle, XCircle, Info, Warning, X } from "@phosphor-icons/react/dist/ssr";
import styles from "./Toast.module.css";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastProps {
  type?: ToastType;
  message: string;
  onClose?: () => void;
  /** Auto-dismiss after ms. 0 = no auto-dismiss. Default 4000. */
  duration?: number;
}

const ICONS: Record<ToastType, typeof CheckCircle> = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
  warning: Warning,
};

export function Toast({ type = "info", message, onClose, duration = 4000 }: ToastProps) {
  const Icon = ICONS[type];

  const dismiss = useCallback(() => {
    onClose?.();
  }, [onClose]);

  useEffect(() => {
    if (duration <= 0) return;
    const timer = setTimeout(dismiss, duration);
    return () => clearTimeout(timer);
  }, [duration, dismiss]);

  return (
    <div className={`${styles.toast} ${styles[type]}`} role="alert" aria-live="polite">
      <span className={styles.icon} aria-hidden>
        <Icon size={18} weight="duotone" />
      </span>
      <span className={styles.message}>{message}</span>
      {onClose && (
        <button
          type="button"
          className={styles.close}
          onClick={dismiss}
          aria-label="Dismiss"
        >
          <X size={14} weight="bold" />
        </button>
      )}
    </div>
  );
}

// S-2 fix (audit 2026-08-20, umbrella #404, child #406): explicit
// displayName. See Button.tsx for the rationale.
Toast.displayName = "Toast";

export interface ToastContainerProps {
  children: React.ReactNode;
}

export function ToastContainer({ children }: ToastContainerProps) {
  return (
    <div style={{ position: 'fixed', top: 'var(--space-4)', right: 'var(--space-4)', zIndex: 9998, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', maxWidth: 400, width: '100%' }}>
      {children}
    </div>
  );
}

ToastContainer.displayName = "ToastContainer";
