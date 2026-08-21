import type { ReactNode } from "react";
import styles from "./EmptyState.module.css";

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  headingLevel?: "h2" | "h3" | "h4";
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  headingLevel: Heading = "h3",
}: EmptyStateProps) {
  return (
    <div className={styles.wrapper}>
      {icon && <div className={styles.iconCircle}>{icon}</div>}
      <Heading className={styles.title}>{title}</Heading>
      {description && <p className={styles.description}>{description}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}

// S-2 fix (audit 2026-08-20, umbrella #404, child #406): explicit
// displayName. See Button.tsx for the rationale.
EmptyState.displayName = "EmptyState";
