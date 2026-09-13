"use client";

/**
 * useToast — state management for toast notifications.
 *
 * Usage:
 *   const { toasts, success, error, dismiss } = useToast();
 *
 *   // Show a toast:
 *   success('Changes saved!');
 *   error('Something went wrong');
 *
 *   // Render toasts:
 *   {toasts.map(t => <Toast key={t.id} {...t} onClose={() => dismiss(t.id)} />)}
 */

import { useState, useCallback, useRef, useEffect } from "react";
import type { ToastType } from "@/components/ui";

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

/** Maximum stacked toasts; older ones are replaced, never piled up. */
export const MAX_TOASTS = 3;

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counterRef = useRef(0);
  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const add = useCallback((type: ToastType, message: string) => {
    const id = `toast-${++counterRef.current}`;
    // Cap the stack: oldest toast is replaced so a burst of
    // errors can never cover the viewport.
    setToasts((prev) => [...prev.slice(-(MAX_TOASTS - 1)), { id, type, message }]);
    // Auto-remove after 4s; the timer is tracked so manual
    // dismiss or unmount never fires a stale removal.
    const timer = setTimeout(() => {
      timersRef.current.delete(id);
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
    timersRef.current.set(id, timer);
  }, []);

  const success = useCallback((msg: string) => add("success", msg), [add]);
  const error = useCallback((msg: string) => add("error", msg), [add]);
  const info = useCallback((msg: string) => add("info", msg), [add]);
  const warning = useCallback((msg: string) => add("warning", msg), [add]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
    };
  }, []);

  return { toasts, add, dismiss, success, error, info, warning };
}
