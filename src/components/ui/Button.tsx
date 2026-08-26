/**
 * Button — Amazon PH simulator primary control.
 *
 * Per design spec §5: tactile -1px translateY on :active, ONE primary per
 * viewport, focus ring is 2px --accent with 2px offset. Default type is
 * "button" to prevent accidental form submission.
 *
 * Variants: primary | secondary | ghost | danger | success | info
 * Sizes: sm (28px) | md (36px, default) | lg (44px)
 *
 * Always a client component (uses onClick).
 */

"use client";

import { type ButtonHTMLAttributes, type ReactNode } from "react";
import styles from "./Button.module.css";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "success"
  | "info";

export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  type = "button",
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={[styles.btn, styles[variant], styles[size], className]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {children}
    </button>
  );
}

// S-2 fix (audit 2026-08-20, umbrella #404, child #406): explicit
// displayName so React DevTools shows `Button` instead of `Anonymous`
// or the inferred arg name. Applies to every primitive in this folder.
Button.displayName = "Button";
