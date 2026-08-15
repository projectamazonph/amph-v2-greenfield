"use client";
import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";
import styles from "./Button.module.css";

export interface SubmitButtonProps {
  children: ReactNode;
  className?: string;
  variant?: "primary" | "ghost" | "danger";
  disabled?: boolean;
}

export function SubmitButton({
  children,
  className,
  variant = "primary",
  disabled,
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={[styles.btn, styles[variant], styles.md, className].filter(Boolean).join(" ")}
      disabled={disabled || pending}
      aria-busy={pending}
    >
      {pending ? "Saving..." : children}
    </button>
  );
}
