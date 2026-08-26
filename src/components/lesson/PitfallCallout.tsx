// src/components/lesson/PitfallCallout.tsx
/**
 * PitfallCallout - Amazon PH simulator callout: info | warning | pitfall.
 *
 * Server component. Renders <aside role="note"> with token-driven color and
 * a Phosphor icon (decorative). Not dismissible - these are part of the lesson.
 */

import type { ReactElement, ReactNode } from "react";
import { Info, Warning, Prohibit } from "@phosphor-icons/react/dist/ssr";
import styles from "./PitfallCallout.module.css";

export type PitfallVariant = "info" | "warning" | "pitfall";

export interface PitfallCalloutProps {
  id: string;
  variant?: PitfallVariant;
  title?: string;
  children: ReactNode;
}

function variantIcon(variant: PitfallVariant): ReactElement {
  switch (variant) {
    case "warning":
      return <Warning size={20} weight="fill" aria-hidden="true" />;
    case "pitfall":
      return <Prohibit size={20} weight="fill" aria-hidden="true" />;
    case "info":
    default:
      return <Info size={20} weight="fill" aria-hidden="true" />;
  }
}

export function PitfallCallout(props: PitfallCalloutProps): ReactElement {
  const { id, variant = "info", title, children } = props;
  return (
    <aside id={id} role="note" className={`${styles.callout} ${styles[variant]}`}>
      <span className={styles.iconSlot}>{variantIcon(variant)}</span>
      <div className={styles.body}>
        {title ? <h3 className={styles.title}>{title}</h3> : null}
        <div className={styles.content}>{children}</div>
      </div>
    </aside>
  );
}
