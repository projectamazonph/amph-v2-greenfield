/**
 * Card — Field Manual container.
 *
 * Per design spec §5: no shadow by default (the border is the elevation);
 * hover (interactive only) lifts + strengthens border; never nest cards
 * inside cards.
 *
 * Variants: default | interactive (hover lift) | compact (6px radius, smaller padding)
 * Padding: compact (12px) | default (16px) | comfortable (24px) | hero (32px)
 *
 * Server component (no client interactivity). Renders a <div> by default.
 */

import { type HTMLAttributes, type ReactNode } from "react";
import styles from "./Card.module.css";

export type CardVariant = "default" | "interactive" | "compact";
export type CardPadding = "tight" | "default" | "comfortable" | "hero";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: CardPadding;
  children: ReactNode;
}

export function Card({
  variant = "default",
  padding = "default",
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={[styles.card, styles[variant], styles[padding], className]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {children}
    </div>
  );
}
