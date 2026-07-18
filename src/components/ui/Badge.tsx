/**
 * Badge — Field Manual status pill.
 *
 * Per design spec §5: variants neutral/success/warning/danger/info/accent.
 * Border-radius --radius-sm (4px) for status, --radius-full for count.
 * Height 20-24px, padding 0 --space-2, --text-xs, weight 500.
 *
 * Server component.
 */

import { type HTMLAttributes, type ReactNode } from "react";
import styles from "./Badge.module.css";

export type BadgeVariant =
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "accent";

export type BadgeShape = "square" | "pill";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  shape?: BadgeShape;
  children: ReactNode;
}

export function Badge({
  variant = "neutral",
  shape = "square",
  className,
  children,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={[styles.badge, styles[variant], styles[shape], className]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {children}
    </span>
  );
}
