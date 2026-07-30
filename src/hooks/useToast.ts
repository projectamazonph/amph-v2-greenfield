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

import { useState, useCallback, useRef } from "react";
import type { ToastType } from "@/components/ui/Toast";

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counterRef = useRef(0);

  const add = useCallback((type: ToastType, message: string) => {
    const id = `toast-${++counterRef.current}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    // Auto-remove after 4s
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback((msg: string) => add("success", msg), [add]);
  const error = useCallback((msg: string) => add("error", msg), [add]);
  const info = useCallback((msg: string) => add("info", msg), [add]);
  const warning = useCallback((msg: string) => add("warning", msg), [add]);

  return { toasts, add, dismiss, success, error, info, warning };
}
