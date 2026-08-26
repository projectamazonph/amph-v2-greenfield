/**
 * Card — Amazon PH simulator container.
 *
 * Per design spec §5: no shadow by default (the border is the elevation);
 * hover (interactive only) lifts + strengthens border; never nest cards
 * inside cards.
 *
 * Variants: default | interactive (hover lift) | compact (6px radius, smaller padding)
 * Padding: compact (12px) | default (16px) | comfortable (24px) | hero (32px)
 *
 * Server component (no client interactivity). Renders a <div> by default.
 *
 * L-03 fix (audit 2026-08-20, umbrella #404, child in this PR): the
 * previous prop type exposed the full DOM event-handler surface.
 * As a server component, an `onClick` on a Card would crash at
 * runtime ("Event handlers cannot be passed to Client Component
 * props"). The fix narrows the prop interface to a curated,
 * server-safe set: `id`, `className`, `style`, `role`, `aria-*`,
 * and `data-*`. If you need a clickable card, wrap the Card in a
 * `<button>` or `<a>`, or use a client-component wrapper.
 */

import { type AriaAttributes, type AriaRole, type ReactNode } from "react";
import styles from "./Card.module.css";

export type CardVariant = "default" | "interactive" | "compact";
export type CardPadding = "tight" | "default" | "comfortable" | "hero";

/**
 * Curated, server-safe subset of <div> props.
 *
 * Intentionally omits the full HTMLAttributes event-handler surface.
 * Server components can't pass event handlers to a Client Component,
 * so the type system now rejects them at compile time instead of
 * crashing at runtime.
 */
export interface CardProps {
  variant?: CardVariant;
  padding?: CardPadding;
  children: ReactNode;
  id?: string;
  className?: string;
  style?: React.CSSProperties;
  role?: AriaRole;
  "aria-label"?: AriaAttributes["aria-label"];
  "aria-labelledby"?: AriaAttributes["aria-labelledby"];
  "aria-describedby"?: AriaAttributes["aria-describedby"];
  "aria-hidden"?: AriaAttributes["aria-hidden"];
  "aria-live"?: AriaAttributes["aria-live"];
  /**
   * `data-*` attributes for CSS hooks and analytics. Indexed so
   * `data-foo="bar"` passes the type check.
   */
  [dataAttr: `data-${string}`]: string | number | boolean | undefined;
}

export function Card({
  variant = "default",
  padding = "default",
  className,
  children,
  id,
  style,
  role,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledby,
  "aria-describedby": ariaDescribedby,
  "aria-hidden": ariaHidden,
  "aria-live": ariaLive,
  ...dataAttrs
}: CardProps) {
  return (
    <div
      className={[styles.card, styles[variant], styles[padding], className]
        .filter(Boolean)
        .join(" ")}
      id={id}
      style={style}
      role={role}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledby}
      aria-describedby={ariaDescribedby}
      aria-hidden={ariaHidden}
      aria-live={ariaLive}
      {...dataAttrs}
    >
      {children}
    </div>
  );
}

// S-2 fix (audit 2026-08-20, umbrella #404, child #406): explicit
// displayName. See Button.tsx for the rationale.
Card.displayName = "Card";
